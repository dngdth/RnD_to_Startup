from __future__ import annotations

import hashlib
import json
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from proofprint.domain.entities.collaboration import ChangeRequest, ChangeRequestStatus
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.review_access import GuestPrincipal
from proofprint.domain.entities.version import ReviewRound, ReviewRoundStatus, SpecificationVersion
from proofprint.domain.entities.workspace import WorkspaceSummary
from proofprint.domain.exceptions import (
    Conflict,
    PermissionDenied,
    PreconditionFailed,
    ResourceNotFound,
    ValidationFailed,
)
from proofprint.domain.interfaces.collaboration import CollaborationRepository
from proofprint.domain.interfaces.review_access import UnitOfWork

WorkspaceViewer = CurrentActor | GuestPrincipal
CREATE_OPERATION = "create-change-request"
REQUEST_CHANGES_OPERATION = "request-changes"


class CreateChangeRequest:
    def __init__(
        self, collaboration: CollaborationRepository, unit_of_work: UnitOfWork
    ) -> None:
        self.collaboration = collaboration
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        guest: GuestPrincipal,
        workspace_id: UUID,
        version_id: UUID,
        block_id: UUID,
        field_path: str | None,
        message: str,
        expected_revision: int,
        idempotency_key: str,
    ) -> tuple[ChangeRequest, int]:
        _authorize_guest(guest, workspace_id)
        idempotency_key = _idempotency_key(idempotency_key)
        normalized_message = _required_text(message, "message", 5000)
        normalized_path = _optional_text(field_path, "field_path", 500)
        fingerprint = _fingerprint(
            {
                "version_id": str(version_id),
                "block_id": str(block_id),
                "field_path": normalized_path,
                "message": normalized_message,
            }
        )
        workspace = self.collaboration.get_workspace_for_update(workspace_id)
        if workspace is None:
            raise ResourceNotFound("Workspace was not found")
        replay = self.collaboration.get_guest_idempotent_result(
            guest_session_id=guest.session_id,
            workspace_id=workspace_id,
            operation=CREATE_OPERATION,
            idempotency_key=idempotency_key,
        )
        if replay is not None:
            stored_fingerprint, payload = replay
            if stored_fingerprint != fingerprint:
                raise Conflict("Idempotency-Key was already used with another request")
            return _change_request_from_payload(payload), int(payload["workspace_revision"])

        _require_active_revision(workspace, expected_revision)
        if workspace.workflow_status != "IN_REVIEW" or workspace.latest_version_id != version_id:
            raise Conflict("Change requests can only target the Version currently in review")
        version = self.collaboration.get_version(workspace_id, version_id)
        if version is None:
            raise ResourceNotFound("Version was not found")
        block = _snapshot_block(version, block_id)
        if block is None:
            raise ValidationFailed("Block does not exist in the selected Version snapshot")
        if normalized_path is not None and not _field_path_exists(block, normalized_path):
            raise ValidationFailed("field_path does not exist in the selected block snapshot")
        review_round = self.collaboration.get_review_round_for_version(
            workspace_id, version_id
        )
        if review_round is None or review_round.status != ReviewRoundStatus.OPEN:
            raise Conflict("Version does not have an open Review Round")

        now = datetime.now(UTC)
        change_request = ChangeRequest(
            id=uuid4(),
            workspace_id=workspace_id,
            review_round_id=review_round.id,
            version_id=version_id,
            block_id=block_id,
            field_path=normalized_path,
            message=normalized_message,
            status=ChangeRequestStatus.REQUESTED,
            requested_by=None,
            requested_by_guest_session_id=guest.session_id,
            requester_username_snapshot=guest.username,
            acknowledged_by=None,
            resolved_in_version_id=None,
            parent_change_request_id=None,
            resolution_note=None,
            created_at=now,
            updated_at=now,
        )
        next_revision = expected_revision + 1
        try:
            self.collaboration.add_change_request(change_request)
            self.collaboration.bump_workspace_revision(
                workspace_id, revision=next_revision, updated_at=now
            )
            _audit_guest(
                self.collaboration,
                guest,
                change_request,
                "CHANGE_REQUEST_CREATED",
                next_revision,
            )
            self.collaboration.add_outbox_message(
                "CHANGE_REQUEST_CREATED",
                {
                    "workspace_id": str(workspace_id),
                    "version_id": str(version_id),
                    "change_request_id": str(change_request.id),
                },
            )
            payload = _change_request_payload(change_request, next_revision)
            self.collaboration.add_guest_idempotent_result(
                guest_session_id=guest.session_id,
                workspace_id=workspace_id,
                operation=CREATE_OPERATION,
                idempotency_key=idempotency_key,
                request_fingerprint=fingerprint,
                response_payload=payload,
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return change_request, next_revision


class ListChangeRequests:
    def __init__(self, collaboration: CollaborationRepository) -> None:
        self.collaboration = collaboration

    def execute(
        self, viewer: WorkspaceViewer, workspace_id: UUID
    ) -> list[ChangeRequest]:
        _authorize_viewer(viewer, self.collaboration, workspace_id)
        return self.collaboration.list_change_requests(workspace_id)


class GetChangeRequest:
    def __init__(self, collaboration: CollaborationRepository) -> None:
        self.collaboration = collaboration

    def execute(self, viewer: WorkspaceViewer, change_request_id: UUID) -> ChangeRequest:
        change_request = self.collaboration.get_change_request(change_request_id)
        if change_request is None:
            raise ResourceNotFound("Change request was not found")
        _authorize_viewer(viewer, self.collaboration, change_request.workspace_id)
        return change_request


class AcknowledgeChangeRequest:
    def __init__(
        self, collaboration: CollaborationRepository, unit_of_work: UnitOfWork
    ) -> None:
        self.collaboration = collaboration
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        actor: CurrentActor,
        change_request_id: UUID,
        expected_revision: int,
    ) -> tuple[ChangeRequest, int]:
        current = _find_change_request(self.collaboration, change_request_id)
        _authorize_designer(actor, self.collaboration, current.workspace_id, edit=True)
        workspace = self.collaboration.get_workspace_for_update(current.workspace_id)
        workspace = _require_active_revision(workspace, expected_revision)
        if workspace.workflow_status != "DRAFT":
            raise Conflict("Workspace must be in DRAFT before acknowledging requests")
        current = _lock_change_request(self.collaboration, change_request_id)
        if current.status != ChangeRequestStatus.REQUESTED:
            raise Conflict("Only a REQUESTED change request can be acknowledged")
        now = datetime.now(UTC)
        updated = replace(
            current,
            status=ChangeRequestStatus.ACKNOWLEDGED,
            acknowledged_by=actor.id,
            updated_at=now,
        )
        revision = _save_designer_transition(
            collaboration=self.collaboration,
            unit_of_work=self.unit_of_work,
            actor=actor,
            before=current,
            updated=updated,
            expected_revision=expected_revision,
            event_type="CHANGE_REQUEST_ACKNOWLEDGED",
            acknowledged_by=actor.id,
        )
        return updated, revision


class RejectChangeRequest:
    def __init__(
        self, collaboration: CollaborationRepository, unit_of_work: UnitOfWork
    ) -> None:
        self.collaboration = collaboration
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        actor: CurrentActor,
        change_request_id: UUID,
        resolution_note: str,
        expected_revision: int,
    ) -> tuple[ChangeRequest, int]:
        note = _required_text(resolution_note, "resolution_note", 5000)
        current = _find_change_request(self.collaboration, change_request_id)
        _authorize_designer(actor, self.collaboration, current.workspace_id, edit=True)
        workspace = self.collaboration.get_workspace_for_update(current.workspace_id)
        workspace = _require_active_revision(workspace, expected_revision)
        if workspace.workflow_status != "DRAFT":
            raise Conflict("Workspace must be in DRAFT before rejecting requests")
        current = _lock_change_request(self.collaboration, change_request_id)
        if current.status not in {
            ChangeRequestStatus.REQUESTED,
            ChangeRequestStatus.ACKNOWLEDGED,
        }:
            raise Conflict("Only a REQUESTED or ACKNOWLEDGED change request can be rejected")
        now = datetime.now(UTC)
        updated = replace(
            current,
            status=ChangeRequestStatus.REJECTED,
            resolution_note=note,
            updated_at=now,
        )
        revision = _save_designer_transition(
            collaboration=self.collaboration,
            unit_of_work=self.unit_of_work,
            actor=actor,
            before=current,
            updated=updated,
            expected_revision=expected_revision,
            event_type="CHANGE_REQUEST_REJECTED",
            resolution_note=note,
        )
        return updated, revision


class MarkChangeRequestUpdated:
    def __init__(
        self, collaboration: CollaborationRepository, unit_of_work: UnitOfWork
    ) -> None:
        self.collaboration = collaboration
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        actor: CurrentActor,
        change_request_id: UUID,
        resolved_in_version_id: UUID,
        expected_revision: int,
    ) -> tuple[ChangeRequest, int]:
        current = _find_change_request(self.collaboration, change_request_id)
        _authorize_designer(actor, self.collaboration, current.workspace_id, edit=True)
        workspace = self.collaboration.get_workspace_for_update(current.workspace_id)
        workspace = _require_active_revision(workspace, expected_revision)
        current = _lock_change_request(self.collaboration, change_request_id)
        if current.status != ChangeRequestStatus.ACKNOWLEDGED:
            raise Conflict("Only an ACKNOWLEDGED change request can be marked updated")
        original = self.collaboration.get_version(current.workspace_id, current.version_id)
        resolved = self.collaboration.get_version(
            current.workspace_id, resolved_in_version_id
        )
        if original is None or resolved is None:
            raise ResourceNotFound("Version was not found")
        if resolved.number <= original.number:
            raise ValidationFailed("Resolved Version must be newer than the requested Version")
        if (
            workspace.workflow_status != "IN_REVIEW"
            or workspace.latest_version_id != resolved.id
        ):
            raise Conflict("Resolved Version must be the Version currently in review")
        if _snapshot_block(resolved, current.block_id) is None:
            raise ValidationFailed("Resolved Version must contain the related block")
        now = datetime.now(UTC)
        updated = replace(
            current,
            status=ChangeRequestStatus.UPDATED,
            resolved_in_version_id=resolved.id,
            updated_at=now,
        )
        revision = _save_designer_transition(
            collaboration=self.collaboration,
            unit_of_work=self.unit_of_work,
            actor=actor,
            before=current,
            updated=updated,
            expected_revision=expected_revision,
            event_type="CHANGE_REQUEST_UPDATED",
            resolved_in_version_id=resolved.id,
        )
        return updated, revision


class ConfirmChangeRequest:
    def __init__(
        self, collaboration: CollaborationRepository, unit_of_work: UnitOfWork
    ) -> None:
        self.collaboration = collaboration
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        guest: GuestPrincipal,
        change_request_id: UUID,
        expected_revision: int,
    ) -> tuple[ChangeRequest, int]:
        current = _find_change_request(self.collaboration, change_request_id)
        _authorize_guest(guest, current.workspace_id)
        workspace = self.collaboration.get_workspace_for_update(current.workspace_id)
        _require_active_revision(workspace, expected_revision)
        current = _lock_change_request(self.collaboration, change_request_id)
        if current.status != ChangeRequestStatus.UPDATED:
            raise Conflict("Only an UPDATED change request can be confirmed")
        _require_guest_viewed_resolution(guest, current, self.collaboration)
        now = datetime.now(UTC)
        updated = replace(current, status=ChangeRequestStatus.CONFIRMED, updated_at=now)
        revision = _save_guest_transition(
            collaboration=self.collaboration,
            unit_of_work=self.unit_of_work,
            guest=guest,
            before=current,
            updated=updated,
            expected_revision=expected_revision,
            event_type="CHANGE_REQUEST_CONFIRMED",
        )
        return updated, revision


class ReopenChangeRequest:
    def __init__(
        self, collaboration: CollaborationRepository, unit_of_work: UnitOfWork
    ) -> None:
        self.collaboration = collaboration
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        guest: GuestPrincipal,
        change_request_id: UUID,
        message: str | None,
        expected_revision: int,
    ) -> tuple[ChangeRequest, ChangeRequest, int]:
        current = _find_change_request(self.collaboration, change_request_id)
        _authorize_guest(guest, current.workspace_id)
        workspace = self.collaboration.get_workspace_for_update(current.workspace_id)
        _require_active_revision(workspace, expected_revision)
        current = _lock_change_request(self.collaboration, change_request_id)
        if current.status != ChangeRequestStatus.UPDATED:
            raise Conflict("Only an UPDATED change request can be reopened")
        _require_guest_viewed_resolution(guest, current, self.collaboration)
        review_round = self.collaboration.get_open_review_round(current.workspace_id)
        if (
            review_round is None
            or current.resolved_in_version_id is None
            or review_round.version_id != current.resolved_in_version_id
        ):
            raise Conflict("The resolved Version must have the current open Review Round")
        version = self.collaboration.get_version(current.workspace_id, review_round.version_id)
        if version is None or _snapshot_block(version, current.block_id) is None:
            raise ValidationFailed("Current review Version does not contain the related block")
        child_message = (
            _required_text(message, "message", 5000)
            if message is not None
            else current.message
        )
        now = datetime.now(UTC)
        reopened = replace(current, status=ChangeRequestStatus.REOPENED, updated_at=now)
        child = ChangeRequest(
            id=uuid4(),
            workspace_id=current.workspace_id,
            review_round_id=review_round.id,
            version_id=review_round.version_id,
            block_id=current.block_id,
            field_path=current.field_path,
            message=child_message,
            status=ChangeRequestStatus.REQUESTED,
            requested_by=None,
            requested_by_guest_session_id=guest.session_id,
            requester_username_snapshot=guest.username,
            acknowledged_by=None,
            resolved_in_version_id=None,
            parent_change_request_id=current.id,
            resolution_note=None,
            created_at=now,
            updated_at=now,
        )
        next_revision = expected_revision + 1
        try:
            self.collaboration.update_change_request(
                current.id,
                status=ChangeRequestStatus.REOPENED,
                updated_at=now,
            )
            self.collaboration.add_change_request(child)
            self.collaboration.bump_workspace_revision(
                current.workspace_id, revision=next_revision, updated_at=now
            )
            _audit_guest(
                self.collaboration,
                guest,
                reopened,
                "CHANGE_REQUEST_REOPENED",
                next_revision,
                metadata={"child_change_request_id": str(child.id)},
            )
            self.collaboration.add_outbox_message(
                "CHANGE_REQUEST_REOPENED",
                {
                    "workspace_id": str(current.workspace_id),
                    "change_request_id": str(current.id),
                    "child_change_request_id": str(child.id),
                },
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return reopened, child, next_revision


class CancelChangeRequest:
    def __init__(
        self, collaboration: CollaborationRepository, unit_of_work: UnitOfWork
    ) -> None:
        self.collaboration = collaboration
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        guest: GuestPrincipal,
        change_request_id: UUID,
        expected_revision: int,
    ) -> tuple[ChangeRequest, int]:
        current = _find_change_request(self.collaboration, change_request_id)
        _authorize_guest(guest, current.workspace_id)
        if current.requested_by_guest_session_id != guest.session_id:
            raise PermissionDenied("Only the guest who created this request can cancel it")
        workspace = self.collaboration.get_workspace_for_update(current.workspace_id)
        _require_active_revision(workspace, expected_revision)
        current = _lock_change_request(self.collaboration, change_request_id)
        if current.status not in {
            ChangeRequestStatus.REQUESTED,
            ChangeRequestStatus.ACKNOWLEDGED,
        }:
            raise Conflict("Only a REQUESTED or ACKNOWLEDGED change request can be cancelled")
        now = datetime.now(UTC)
        updated = replace(current, status=ChangeRequestStatus.CANCELLED, updated_at=now)
        revision = _save_guest_transition(
            collaboration=self.collaboration,
            unit_of_work=self.unit_of_work,
            guest=guest,
            before=current,
            updated=updated,
            expected_revision=expected_revision,
            event_type="CHANGE_REQUEST_CANCELLED",
        )
        return updated, revision


class RequestChanges:
    def __init__(
        self, collaboration: CollaborationRepository, unit_of_work: UnitOfWork
    ) -> None:
        self.collaboration = collaboration
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        guest: GuestPrincipal,
        workspace_id: UUID,
        version_id: UUID,
        decision_note: str | None,
        expected_revision: int,
        idempotency_key: str,
    ) -> tuple[ReviewRound, int]:
        _authorize_guest(guest, workspace_id)
        idempotency_key = _idempotency_key(idempotency_key)
        normalized_note = _optional_text(decision_note, "decision_note", 2000)
        fingerprint = _fingerprint(
            {"version_id": str(version_id), "decision_note": normalized_note}
        )
        workspace = self.collaboration.get_workspace_for_update(workspace_id)
        if workspace is None:
            raise ResourceNotFound("Workspace was not found")
        replay = self.collaboration.get_guest_idempotent_result(
            guest_session_id=guest.session_id,
            workspace_id=workspace_id,
            operation=REQUEST_CHANGES_OPERATION,
            idempotency_key=idempotency_key,
        )
        if replay is not None:
            stored_fingerprint, payload = replay
            if stored_fingerprint != fingerprint:
                raise Conflict("Idempotency-Key was already used with another request")
            return _review_round_from_payload(payload), int(payload["workspace_revision"])

        _require_active_revision(workspace, expected_revision)
        if workspace.workflow_status != "IN_REVIEW" or workspace.latest_version_id != version_id:
            raise Conflict("Only the Version currently in review can request changes")
        review_round = self.collaboration.get_review_round_for_version(
            workspace_id, version_id
        )
        if review_round is None or review_round.status != ReviewRoundStatus.OPEN:
            raise Conflict("Version does not have an open Review Round")
        requested_count = self.collaboration.count_change_requests(
            review_round.id, status=ChangeRequestStatus.REQUESTED
        )
        if requested_count < 1:
            raise Conflict("At least one REQUESTED change request is required")

        now = datetime.now(UTC)
        closed_round = replace(
            review_round,
            status=ReviewRoundStatus.CHANGES_REQUESTED,
            closed_at=now,
            decision_note=normalized_note,
        )
        next_revision = expected_revision + 1
        try:
            self.collaboration.close_review_round_for_changes(
                review_round.id,
                closed_at=now,
                decision_note=normalized_note,
            )
            self.collaboration.bump_workspace_revision(
                workspace_id,
                revision=next_revision,
                updated_at=now,
                workflow_status="DRAFT",
            )
            self.collaboration.add_audit_event(
                workspace_id=workspace_id,
                guest_session_id=guest.session_id,
                actor_username_snapshot=guest.username,
                event_type="REVIEW_CHANGES_REQUESTED",
                entity_type="ReviewRound",
                entity_id=review_round.id,
                version_id=version_id,
                metadata={
                    "requested_count": requested_count,
                    "workspace_revision": next_revision,
                },
            )
            self.collaboration.add_outbox_message(
                "REVIEW_CHANGES_REQUESTED",
                {
                    "workspace_id": str(workspace_id),
                    "version_id": str(version_id),
                    "review_round_id": str(review_round.id),
                },
            )
            payload = _review_round_payload(closed_round, next_revision)
            self.collaboration.add_guest_idempotent_result(
                guest_session_id=guest.session_id,
                workspace_id=workspace_id,
                operation=REQUEST_CHANGES_OPERATION,
                idempotency_key=idempotency_key,
                request_fingerprint=fingerprint,
                response_payload=payload,
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return closed_round, next_revision


def _save_designer_transition(
    *,
    collaboration: CollaborationRepository,
    unit_of_work: UnitOfWork,
    actor: CurrentActor,
    before: ChangeRequest,
    updated: ChangeRequest,
    expected_revision: int,
    event_type: str,
    acknowledged_by: UUID | None = None,
    resolved_in_version_id: UUID | None = None,
    resolution_note: str | None = None,
) -> int:
    next_revision = expected_revision + 1
    try:
        collaboration.update_change_request(
            before.id,
            status=updated.status,
            updated_at=updated.updated_at,
            acknowledged_by=acknowledged_by,
            resolved_in_version_id=resolved_in_version_id,
            resolution_note=resolution_note,
        )
        collaboration.bump_workspace_revision(
            before.workspace_id,
            revision=next_revision,
            updated_at=updated.updated_at,
        )
        collaboration.add_audit_event(
            workspace_id=before.workspace_id,
            actor_id=actor.id,
            event_type=event_type,
            entity_type="ChangeRequest",
            entity_id=before.id,
            version_id=before.version_id,
            metadata={
                "from_status": before.status.value,
                "to_status": updated.status.value,
                "resolved_in_version_id": (
                    str(resolved_in_version_id) if resolved_in_version_id else None
                ),
                "workspace_revision": next_revision,
            },
        )
        collaboration.add_outbox_message(
            event_type,
            {
                "workspace_id": str(before.workspace_id),
                "change_request_id": str(before.id),
                "status": updated.status.value,
            },
        )
        unit_of_work.commit()
    except Exception:
        unit_of_work.rollback()
        raise
    return next_revision


def _save_guest_transition(
    *,
    collaboration: CollaborationRepository,
    unit_of_work: UnitOfWork,
    guest: GuestPrincipal,
    before: ChangeRequest,
    updated: ChangeRequest,
    expected_revision: int,
    event_type: str,
) -> int:
    next_revision = expected_revision + 1
    try:
        collaboration.update_change_request(
            before.id,
            status=updated.status,
            updated_at=updated.updated_at,
        )
        collaboration.bump_workspace_revision(
            before.workspace_id,
            revision=next_revision,
            updated_at=updated.updated_at,
        )
        _audit_guest(
            collaboration,
            guest,
            updated,
            event_type,
            next_revision,
            metadata={"from_status": before.status.value},
        )
        collaboration.add_outbox_message(
            event_type,
            {
                "workspace_id": str(before.workspace_id),
                "change_request_id": str(before.id),
                "status": updated.status.value,
            },
        )
        unit_of_work.commit()
    except Exception:
        unit_of_work.rollback()
        raise
    return next_revision


def _authorize_viewer(
    viewer: WorkspaceViewer,
    collaboration: CollaborationRepository,
    workspace_id: UUID,
) -> WorkspaceSummary:
    if isinstance(viewer, CurrentActor):
        _authorize_designer(viewer, collaboration, workspace_id, edit=False)
    else:
        _authorize_guest(viewer, workspace_id)
    workspace = collaboration.get_workspace(workspace_id)
    if workspace is None or workspace.record_status == "CANCELLED":
        raise ResourceNotFound("Workspace was not found")
    return workspace


def _authorize_designer(
    actor: CurrentActor,
    collaboration: CollaborationRepository,
    workspace_id: UUID,
    *,
    edit: bool,
) -> None:
    if actor.system_role != SystemRole.DESIGNER:
        raise PermissionDenied("Only designers can perform this action")
    grant = collaboration.get_active_grant(workspace_id, actor.id)
    if grant is None:
        raise ResourceNotFound("Workspace was not found")
    allowed = grant.can_edit if edit else grant.can_view
    if not allowed:
        raise PermissionDenied("You do not have permission for this workspace action")


def _authorize_guest(guest: GuestPrincipal, workspace_id: UUID) -> None:
    if guest.workspace_id != workspace_id:
        raise ResourceNotFound("Workspace was not found")


def _require_active_revision(
    workspace: WorkspaceSummary | None, expected_revision: int
) -> WorkspaceSummary:
    if workspace is None:
        raise ResourceNotFound("Workspace was not found")
    if workspace.revision != expected_revision:
        raise PreconditionFailed("Workspace revision does not match If-Match")
    if workspace.record_status != "ACTIVE":
        raise Conflict("Workspace must be ACTIVE for collaboration commands")
    return workspace


def _find_change_request(
    collaboration: CollaborationRepository, change_request_id: UUID
) -> ChangeRequest:
    change_request = collaboration.get_change_request(change_request_id)
    if change_request is None:
        raise ResourceNotFound("Change request was not found")
    return change_request


def _lock_change_request(
    collaboration: CollaborationRepository, change_request_id: UUID
) -> ChangeRequest:
    change_request = collaboration.get_change_request_for_update(change_request_id)
    if change_request is None:
        raise ResourceNotFound("Change request was not found")
    return change_request


def _snapshot_block(
    version: SpecificationVersion, block_id: UUID
) -> dict[str, Any] | None:
    return next(
        (item for item in version.snapshot if str(item.get("id")) == str(block_id)),
        None,
    )


def _field_path_exists(block: dict[str, Any], field_path: str) -> bool:
    current: Any = block
    for segment in field_path.split("."):
        if isinstance(current, dict) and segment in current:
            current = current[segment]
        elif isinstance(current, list) and segment.isdigit() and int(segment) < len(current):
            current = current[int(segment)]
        else:
            return False
    return True


def _require_guest_viewed_resolution(
    guest: GuestPrincipal,
    change_request: ChangeRequest,
    collaboration: CollaborationRepository,
) -> None:
    version_id = change_request.resolved_in_version_id
    if version_id is None or not collaboration.has_guest_viewed_version(
        guest.session_id, version_id
    ):
        raise Conflict("Guest must view the resolved Version before this decision")


def _audit_guest(
    collaboration: CollaborationRepository,
    guest: GuestPrincipal,
    change_request: ChangeRequest,
    event_type: str,
    workspace_revision: int,
    metadata: dict[str, Any] | None = None,
) -> None:
    event_metadata = {
        "status": change_request.status.value,
        "workspace_revision": workspace_revision,
        **(metadata or {}),
    }
    collaboration.add_audit_event(
        workspace_id=change_request.workspace_id,
        guest_session_id=guest.session_id,
        actor_username_snapshot=guest.username,
        event_type=event_type,
        entity_type="ChangeRequest",
        entity_id=change_request.id,
        version_id=change_request.version_id,
        metadata=event_metadata,
    )


def _required_text(value: str, field: str, max_length: int) -> str:
    normalized = value.strip()
    if not normalized or len(normalized) > max_length:
        raise ValidationFailed(f"{field} must contain 1 to {max_length} characters")
    return normalized


def _optional_text(value: str | None, field: str, max_length: int) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized or len(normalized) > max_length:
        raise ValidationFailed(f"{field} must contain 1 to {max_length} characters")
    return normalized


def _fingerprint(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(canonical).hexdigest()


def _idempotency_key(value: str) -> str:
    normalized = value.strip()
    if not normalized or len(normalized) > 200:
        raise ValidationFailed("Idempotency-Key must contain 1 to 200 characters")
    return normalized


def _change_request_payload(
    change_request: ChangeRequest, workspace_revision: int
) -> dict[str, Any]:
    return {
        "id": str(change_request.id),
        "workspace_id": str(change_request.workspace_id),
        "review_round_id": str(change_request.review_round_id),
        "version_id": str(change_request.version_id),
        "block_id": str(change_request.block_id),
        "field_path": change_request.field_path,
        "message": change_request.message,
        "status": change_request.status.value,
        "requested_by": (
            str(change_request.requested_by) if change_request.requested_by else None
        ),
        "requested_by_guest_session_id": (
            str(change_request.requested_by_guest_session_id)
            if change_request.requested_by_guest_session_id
            else None
        ),
        "requester_username_snapshot": change_request.requester_username_snapshot,
        "acknowledged_by": (
            str(change_request.acknowledged_by) if change_request.acknowledged_by else None
        ),
        "resolved_in_version_id": (
            str(change_request.resolved_in_version_id)
            if change_request.resolved_in_version_id
            else None
        ),
        "parent_change_request_id": (
            str(change_request.parent_change_request_id)
            if change_request.parent_change_request_id
            else None
        ),
        "resolution_note": change_request.resolution_note,
        "created_at": change_request.created_at.isoformat(),
        "updated_at": change_request.updated_at.isoformat(),
        "workspace_revision": workspace_revision,
    }


def _change_request_from_payload(payload: dict[str, Any]) -> ChangeRequest:
    return ChangeRequest(
        id=UUID(payload["id"]),
        workspace_id=UUID(payload["workspace_id"]),
        review_round_id=UUID(payload["review_round_id"]),
        version_id=UUID(payload["version_id"]),
        block_id=UUID(payload["block_id"]),
        field_path=payload.get("field_path"),
        message=payload["message"],
        status=ChangeRequestStatus(payload["status"]),
        requested_by=UUID(payload["requested_by"]) if payload.get("requested_by") else None,
        requested_by_guest_session_id=(
            UUID(payload["requested_by_guest_session_id"])
            if payload.get("requested_by_guest_session_id")
            else None
        ),
        requester_username_snapshot=payload.get("requester_username_snapshot"),
        acknowledged_by=(
            UUID(payload["acknowledged_by"]) if payload.get("acknowledged_by") else None
        ),
        resolved_in_version_id=(
            UUID(payload["resolved_in_version_id"])
            if payload.get("resolved_in_version_id")
            else None
        ),
        parent_change_request_id=(
            UUID(payload["parent_change_request_id"])
            if payload.get("parent_change_request_id")
            else None
        ),
        resolution_note=payload.get("resolution_note"),
        created_at=datetime.fromisoformat(payload["created_at"]),
        updated_at=datetime.fromisoformat(payload["updated_at"]),
    )


def _review_round_payload(
    review_round: ReviewRound, workspace_revision: int
) -> dict[str, Any]:
    return {
        "id": str(review_round.id),
        "workspace_id": str(review_round.workspace_id),
        "version_id": str(review_round.version_id),
        "status": review_round.status.value,
        "opened_at": review_round.opened_at.isoformat(),
        "closed_at": review_round.closed_at.isoformat() if review_round.closed_at else None,
        "decision_note": review_round.decision_note,
        "workspace_revision": workspace_revision,
    }


def _review_round_from_payload(payload: dict[str, Any]) -> ReviewRound:
    return ReviewRound(
        id=UUID(payload["id"]),
        workspace_id=UUID(payload["workspace_id"]),
        version_id=UUID(payload["version_id"]),
        status=ReviewRoundStatus(payload["status"]),
        opened_at=datetime.fromisoformat(payload["opened_at"]),
        closed_at=(
            datetime.fromisoformat(payload["closed_at"])
            if payload.get("closed_at")
            else None
        ),
        decision_note=payload.get("decision_note"),
    )

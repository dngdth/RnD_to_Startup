from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from uuid import UUID, uuid4

from proofprint.domain.entities.approval_production import Approval, ProductionSnapshot
from proofprint.domain.entities.collaboration import ChangeRequestStatus
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.review_access import GuestPrincipal
from proofprint.domain.entities.version import ReviewRoundStatus
from proofprint.domain.entities.workspace import WorkspaceSummary
from proofprint.domain.exceptions import (
    Conflict,
    PermissionDenied,
    PreconditionFailed,
    ResourceNotFound,
    ValidationFailed,
)
from proofprint.domain.interfaces.approval_production import ApprovalProductionRepository
from proofprint.domain.interfaces.review_access import UnitOfWork

APPROVE_OPERATION = "approve-version"
PRODUCTION_LOCK_OPERATION = "production-lock"


class ApproveVersion:
    def __init__(self, approvals: ApprovalProductionRepository, unit_of_work: UnitOfWork):
        self.approvals = approvals
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        guest: GuestPrincipal,
        workspace_id: UUID,
        version_id: UUID,
        expected_revision: int,
        idempotency_key: str,
    ) -> tuple[Approval, int]:
        _authorize_guest(guest, workspace_id)
        key = _idempotency_key(idempotency_key)
        fingerprint = _fingerprint(APPROVE_OPERATION, version_id)
        workspace = self.approvals.get_workspace_for_update(workspace_id)
        if workspace is None:
            raise ResourceNotFound("Workspace was not found")
        replay = self.approvals.get_idempotent_result(
            actor_id=None,
            guest_session_id=guest.session_id,
            workspace_id=workspace_id,
            operation=APPROVE_OPERATION,
            idempotency_key=key,
        )
        if replay is not None:
            stored_fingerprint, payload = replay
            if stored_fingerprint != fingerprint:
                raise Conflict("Idempotency-Key was already used with another request")
            approval = self.approvals.get_approval_for_version(workspace_id, version_id)
            if approval is None or str(approval.id) != payload["approval_id"]:
                raise Conflict("Stored approval result is no longer available")
            return approval, int(payload["workspace_revision"])

        if workspace.record_status != "ACTIVE":
            raise Conflict("Workspace must be ACTIVE")

        existing = self.approvals.get_approval_for_version(workspace_id, version_id)
        if existing is not None:
            # One Approval per Version: a repeat must never create a second decision.
            self._store_replay(guest, workspace_id, key, fingerprint, existing, workspace.revision)
            return existing, workspace.revision

        _require_active_revision(workspace, expected_revision)
        if workspace.workflow_status != "IN_REVIEW" or workspace.latest_version_id != version_id:
            raise Conflict("Only the Version currently in review can be approved")
        if self.approvals.get_version(workspace_id, version_id) is None:
            raise ResourceNotFound("Version was not found")
        review_round = self.approvals.get_review_round_for_version(workspace_id, version_id)
        if review_round is None or review_round.status != ReviewRoundStatus.OPEN:
            raise Conflict("Version does not have an open Review Round")

        requests = self.approvals.list_change_requests_for_update(workspace_id)
        blocking = {
            ChangeRequestStatus.REQUESTED,
            ChangeRequestStatus.ACKNOWLEDGED,
        }
        if any(item.status in blocking for item in requests):
            raise Conflict("Resolve all requested or acknowledged Change Requests first")
        mismatched = [
            item
            for item in requests
            if item.status == ChangeRequestStatus.UPDATED
            and item.resolved_in_version_id != version_id
        ]
        if mismatched:
            raise Conflict("Updated Change Requests must resolve in the Version being approved")

        now = datetime.now(UTC)
        approval = Approval(
            id=uuid4(),
            workspace_id=workspace_id,
            review_round_id=review_round.id,
            version_id=version_id,
            guest_session_id=guest.session_id,
            reviewer_username_snapshot=guest.username,
            review_link_version=guest.link_version,
            created_at=now,
        )
        next_revision = workspace.revision + 1
        try:
            for item in requests:
                if item.status == ChangeRequestStatus.UPDATED:
                    self.approvals.update_change_request_status(
                        item.id, ChangeRequestStatus.CONFIRMED, now
                    )
            self.approvals.add_approval(approval)
            self.approvals.close_review_round_approved(review_round.id, now)
            self.approvals.mark_workspace_approved(
                workspace_id, version_id, next_revision, now
            )
            self.approvals.add_audit_event(
                workspace_id=workspace_id,
                event_type="VERSION_APPROVED",
                entity_type="Approval",
                entity_id=approval.id,
                guest_session_id=guest.session_id,
                actor_username_snapshot=guest.username,
                version_id=version_id,
                metadata={
                    "review_round_id": str(review_round.id),
                    "workspace_revision": next_revision,
                },
            )
            self.approvals.add_outbox_message(
                "VERSION_APPROVED",
                {
                    "workspace_id": str(workspace_id),
                    "version_id": str(version_id),
                    "approval_id": str(approval.id),
                    "review_round_id": str(review_round.id),
                },
            )
            self._store_replay(
                guest, workspace_id, key, fingerprint, approval, next_revision, commit=False
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return approval, next_revision

    def _store_replay(
        self,
        guest: GuestPrincipal,
        workspace_id: UUID,
        key: str,
        fingerprint: str,
        approval: Approval,
        revision: int,
        *,
        commit: bool = True,
    ) -> None:
        try:
            self.approvals.add_idempotent_result(
                actor_id=None,
                guest_session_id=guest.session_id,
                workspace_id=workspace_id,
                operation=APPROVE_OPERATION,
                idempotency_key=key,
                request_fingerprint=fingerprint,
                response_payload={
                    "approval_id": str(approval.id),
                    "workspace_revision": revision,
                },
            )
            if commit:
                self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise


class LockProduction:
    def __init__(self, approvals: ApprovalProductionRepository, unit_of_work: UnitOfWork):
        self.approvals = approvals
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        actor: CurrentActor,
        workspace_id: UUID,
        version_id: UUID,
        expected_revision: int,
        idempotency_key: str,
    ) -> tuple[ProductionSnapshot, int]:
        _authorize_designer(actor, self.approvals, workspace_id, lock=True)
        key = _idempotency_key(idempotency_key)
        fingerprint = _fingerprint(PRODUCTION_LOCK_OPERATION, version_id)
        workspace = self.approvals.get_workspace_for_update(workspace_id)
        if workspace is None:
            raise ResourceNotFound("Workspace was not found")
        replay = self.approvals.get_idempotent_result(
            actor_id=actor.id,
            guest_session_id=None,
            workspace_id=workspace_id,
            operation=PRODUCTION_LOCK_OPERATION,
            idempotency_key=key,
        )
        if replay is not None:
            stored_fingerprint, payload = replay
            if stored_fingerprint != fingerprint:
                raise Conflict("Idempotency-Key was already used with another request")
            return self._snapshot(workspace_id, version_id, int(payload["workspace_revision"]))

        if workspace.record_status != "ACTIVE":
            raise Conflict("Workspace must be ACTIVE")

        if workspace.production_version_id == version_id:
            snapshot, revision = self._snapshot(workspace_id, version_id, workspace.revision)
            try:
                self._store_replay(actor, workspace_id, key, fingerprint, revision)
                self.unit_of_work.commit()
            except Exception:
                self.unit_of_work.rollback()
                raise
            return snapshot, revision

        _require_active_revision(workspace, expected_revision)
        if workspace.approved_version_id != version_id:
            raise Conflict("APPROVAL_VERSION_MISMATCH")
        if workspace.workflow_status != "APPROVED":
            raise Conflict("Workspace must be APPROVED before Production Lock")
        approval = self.approvals.get_approval_for_version(workspace_id, version_id)
        if approval is None:
            raise Conflict("Exact Version has no Approval")
        version = self.approvals.get_version(workspace_id, version_id)
        if version is None:
            raise ResourceNotFound("Version was not found")
        now = datetime.now(UTC)
        next_revision = workspace.revision + 1
        try:
            self.approvals.mark_workspace_production_locked(
                workspace_id, version_id, next_revision, now
            )
            self.approvals.add_audit_event(
                workspace_id=workspace_id,
                event_type="PRODUCTION_LOCKED",
                entity_type="SpecificationVersion",
                entity_id=version_id,
                actor_id=actor.id,
                version_id=version_id,
                metadata={
                    "approval_id": str(approval.id),
                    "workspace_revision": next_revision,
                },
            )
            self.approvals.add_outbox_message(
                "PRODUCTION_LOCKED",
                {
                    "workspace_id": str(workspace_id),
                    "version_id": str(version_id),
                    "approval_id": str(approval.id),
                },
            )
            self._store_replay(actor, workspace_id, key, fingerprint, next_revision)
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        snapshot = ProductionSnapshot(version, approval, next_revision)
        return snapshot, next_revision

    def _snapshot(
        self, workspace_id: UUID, version_id: UUID, revision: int
    ) -> tuple[ProductionSnapshot, int]:
        approval = self.approvals.get_approval_for_version(workspace_id, version_id)
        version = self.approvals.get_version(workspace_id, version_id)
        if approval is None or version is None:
            raise Conflict("Stored Production Snapshot is no longer available")
        return ProductionSnapshot(version, approval, revision), revision

    def _store_replay(
        self, actor: CurrentActor, workspace_id: UUID, key: str, fingerprint: str, revision: int
    ) -> None:
        self.approvals.add_idempotent_result(
            actor_id=actor.id,
            guest_session_id=None,
            workspace_id=workspace_id,
            operation=PRODUCTION_LOCK_OPERATION,
            idempotency_key=key,
            request_fingerprint=fingerprint,
            response_payload={"workspace_revision": revision},
        )


class GetProductionSnapshot:
    def __init__(self, approvals: ApprovalProductionRepository):
        self.approvals = approvals

    def execute(
        self, viewer: CurrentActor | GuestPrincipal, workspace_id: UUID
    ) -> ProductionSnapshot:
        workspace = _authorize_viewer(viewer, self.approvals, workspace_id)
        version_id = workspace.production_version_id
        if version_id is None:
            raise ResourceNotFound("Production Snapshot was not found")
        version = self.approvals.get_version(workspace_id, version_id)
        approval = self.approvals.get_approval_for_version(workspace_id, version_id)
        if version is None or approval is None:
            raise Conflict("Production Snapshot is incomplete")
        return ProductionSnapshot(version, approval, workspace.revision)


def _authorize_guest(guest: GuestPrincipal, workspace_id: UUID) -> None:
    if guest.workspace_id != workspace_id:
        raise ResourceNotFound("Workspace was not found")


def _authorize_designer(
    actor: CurrentActor,
    approvals: ApprovalProductionRepository,
    workspace_id: UUID,
    *,
    lock: bool = False,
) -> None:
    if actor.system_role != SystemRole.DESIGNER:
        raise ResourceNotFound("Workspace was not found")
    grant = approvals.get_active_grant(workspace_id, actor.id)
    if grant is None or not grant.can_view:
        raise ResourceNotFound("Workspace was not found")
    if lock and not grant.can_lock_production:
        raise PermissionDenied("Designer cannot lock production for this Workspace")


def _authorize_viewer(
    viewer: CurrentActor | GuestPrincipal,
    approvals: ApprovalProductionRepository,
    workspace_id: UUID,
) -> WorkspaceSummary:
    if isinstance(viewer, GuestPrincipal):
        _authorize_guest(viewer, workspace_id)
    else:
        _authorize_designer(viewer, approvals, workspace_id)
    workspace = approvals.get_workspace(workspace_id)
    if workspace is None:
        raise ResourceNotFound("Workspace was not found")
    return workspace


def _require_active_revision(workspace: WorkspaceSummary, expected_revision: int) -> None:
    if workspace.revision != expected_revision:
        raise PreconditionFailed("Workspace revision does not match If-Match")
    if workspace.record_status != "ACTIVE":
        raise Conflict("Workspace must be ACTIVE")


def _idempotency_key(value: str) -> str:
    normalized = value.strip()
    if not normalized or len(normalized) > 200:
        raise ValidationFailed("Idempotency-Key must contain 1 to 200 characters")
    return normalized


def _fingerprint(operation: str, version_id: UUID) -> str:
    return hashlib.sha256(f"{operation}:{version_id}".encode()).hexdigest()

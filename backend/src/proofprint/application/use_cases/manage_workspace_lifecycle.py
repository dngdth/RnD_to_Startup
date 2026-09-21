from dataclasses import replace
from datetime import UTC, datetime
from uuid import UUID

from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.domain.entities.workspace_lifecycle import WorkspaceAuditPage
from proofprint.domain.exceptions import (
    Conflict,
    PermissionDenied,
    PreconditionFailed,
    ResourceNotFound,
    ValidationFailed,
)
from proofprint.domain.interfaces.review_access import UnitOfWork
from proofprint.domain.interfaces.workspace_lifecycle import WorkspaceLifecycleRepository


class ListWorkspaceAuditEvents:
    def __init__(self, lifecycle: WorkspaceLifecycleRepository) -> None:
        self.lifecycle = lifecycle

    def execute(
        self,
        *,
        actor: CurrentActor,
        workspace_id: UUID,
        limit: int = 50,
        offset: int = 0,
        event_type: str | None = None,
        entity_type: str | None = None,
        actor_id: UUID | None = None,
        guest_session_id: UUID | None = None,
        created_from: datetime | None = None,
        created_to: datetime | None = None,
    ) -> WorkspaceAuditPage:
        _authorize(actor, self.lifecycle, workspace_id, edit=False)
        if self.lifecycle.get_workspace(workspace_id) is None:
            raise ResourceNotFound("Workspace was not found")
        if not 1 <= limit <= 100 or offset < 0:
            raise ValidationFailed("limit must be 1 to 100 and offset must not be negative")
        if created_from is not None and created_from.tzinfo is None:
            raise ValidationFailed("created_from must include a timezone")
        if created_to is not None and created_to.tzinfo is None:
            raise ValidationFailed("created_to must include a timezone")
        if created_from is not None and created_to is not None and created_from > created_to:
            raise ValidationFailed("created_from must not be after created_to")
        for name, value in (("event_type", event_type), ("entity_type", entity_type)):
            if value is not None and (not value.strip() or len(value) > 100):
                raise ValidationFailed(f"{name} must contain 1 to 100 characters")
        return self.lifecycle.list_audit_events(
            workspace_id,
            limit=limit,
            offset=offset,
            event_type=event_type.strip() if event_type is not None else None,
            entity_type=entity_type.strip() if entity_type is not None else None,
            actor_id=actor_id,
            guest_session_id=guest_session_id,
            created_from=created_from,
            created_to=created_to,
        )


class _RecordStatusCommand:
    def __init__(
        self, lifecycle: WorkspaceLifecycleRepository, unit_of_work: UnitOfWork
    ) -> None:
        self.lifecycle = lifecycle
        self.unit_of_work = unit_of_work

    def _execute(
        self,
        *,
        actor: CurrentActor,
        workspace_id: UUID,
        expected_revision: int,
        status: str,
        reason: str | None,
    ) -> WorkspaceSummary:
        _authorize(actor, self.lifecycle, workspace_id, edit=status != "ACTIVE")
        workspace = self.lifecycle.get_workspace_for_update(workspace_id)
        if workspace is None:
            raise ResourceNotFound("Workspace was not found")
        if status == "ACTIVE" and self.lifecycle.get_workspace_owner_id(workspace_id) != actor.id:
            raise PermissionDenied("Only the workspace owner can restore it")
        if workspace.revision != expected_revision:
            raise PreconditionFailed("Workspace revision does not match If-Match")
        if status == "ACTIVE":
            if workspace.record_status != "ARCHIVED":
                raise Conflict("Only an ARCHIVED workspace can be restored")
        else:
            if workspace.record_status != "ACTIVE":
                raise Conflict("Workspace must be ACTIVE")
            if status == "CANCELLED" and (
                workspace.workflow_status == "LOCKED_FOR_PRODUCTION"
                or workspace.production_version_id is not None
            ):
                raise Conflict("Production-locked workspace cannot be cancelled")
        normalized_reason = _normalize_reason(reason, required=status == "ARCHIVED")
        now = datetime.now(UTC)
        next_revision = workspace.revision + 1
        event_type = {
            "ARCHIVED": "WORKSPACE_ARCHIVED",
            "ACTIVE": "WORKSPACE_RESTORED",
            "CANCELLED": "WORKSPACE_CANCELLED",
        }[status]
        payload = {
            "workspace_id": str(workspace_id),
            "previous_record_status": workspace.record_status,
            "record_status": status,
            "workflow_status": workspace.workflow_status,
            "workspace_revision": next_revision,
            "reason": normalized_reason,
        }
        try:
            self.lifecycle.update_record_status(
                workspace_id,
                record_status=status,
                revision=next_revision,
                updated_at=now,
            )
            self.lifecycle.add_audit_event(
                workspace_id=workspace_id,
                actor_id=actor.id,
                event_type=event_type,
                entity_type="OrderWorkspace",
                entity_id=workspace_id,
                metadata=payload,
            )
            self.lifecycle.add_outbox_message(event_type, payload)
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return replace(workspace, record_status=status, revision=next_revision, updated_at=now)


class ArchiveWorkspace(_RecordStatusCommand):
    def execute(
        self,
        *,
        actor: CurrentActor,
        workspace_id: UUID,
        expected_revision: int,
        reason: str,
    ) -> WorkspaceSummary:
        return self._execute(
            actor=actor,
            workspace_id=workspace_id,
            expected_revision=expected_revision,
            status="ARCHIVED",
            reason=reason,
        )


class RestoreWorkspace(_RecordStatusCommand):
    def execute(
        self,
        *,
        actor: CurrentActor,
        workspace_id: UUID,
        expected_revision: int,
        reason: str | None = None,
    ) -> WorkspaceSummary:
        return self._execute(
            actor=actor,
            workspace_id=workspace_id,
            expected_revision=expected_revision,
            status="ACTIVE",
            reason=reason,
        )


class CancelWorkspace(_RecordStatusCommand):
    def execute(
        self,
        *,
        actor: CurrentActor,
        workspace_id: UUID,
        expected_revision: int,
        reason: str | None = None,
    ) -> WorkspaceSummary:
        return self._execute(
            actor=actor,
            workspace_id=workspace_id,
            expected_revision=expected_revision,
            status="CANCELLED",
            reason=reason,
        )


def _authorize(
    actor: CurrentActor,
    lifecycle: WorkspaceLifecycleRepository,
    workspace_id: UUID,
    *,
    edit: bool,
) -> WorkspaceGrant:
    if actor.system_role != SystemRole.DESIGNER:
        raise PermissionDenied("Only designers can access workspace lifecycle")
    grant = lifecycle.get_active_grant(workspace_id, actor.id)
    if grant is None:
        raise ResourceNotFound("Workspace was not found")
    if not grant.can_view or (edit and not grant.can_edit):
        raise PermissionDenied("You do not have permission for this workspace action")
    return grant


def _normalize_reason(reason: str | None, *, required: bool) -> str | None:
    normalized = reason.strip() if reason is not None else ""
    if required and len(normalized) < 3:
        raise ValidationFailed("reason must contain at least 3 characters")
    if len(normalized) > 500:
        raise ValidationFailed("reason must not exceed 500 characters")
    return normalized or None

from datetime import datetime
from typing import Any, Protocol
from uuid import UUID

from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary
from proofprint.domain.entities.workspace_lifecycle import WorkspaceAuditPage


class WorkspaceLifecycleRepository(Protocol):
    def get_workspace(self, workspace_id: UUID) -> WorkspaceSummary | None: ...

    def get_workspace_for_update(self, workspace_id: UUID) -> WorkspaceSummary | None: ...

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None: ...

    def get_workspace_owner_id(self, workspace_id: UUID) -> UUID | None: ...

    def list_audit_events(
        self,
        workspace_id: UUID,
        *,
        limit: int,
        offset: int,
        event_type: str | None,
        entity_type: str | None,
        actor_id: UUID | None,
        guest_session_id: UUID | None,
        created_from: datetime | None,
        created_to: datetime | None,
    ) -> WorkspaceAuditPage: ...

    def update_record_status(
        self,
        workspace_id: UUID,
        *,
        record_status: str,
        revision: int,
        updated_at: datetime,
    ) -> None: ...

    def add_audit_event(
        self,
        *,
        workspace_id: UUID,
        actor_id: UUID,
        event_type: str,
        entity_type: str,
        entity_id: UUID,
        metadata: dict[str, Any],
    ) -> None: ...

    def add_outbox_message(self, event_type: str, payload: dict[str, Any]) -> None: ...

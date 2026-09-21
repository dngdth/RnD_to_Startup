from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol
from uuid import UUID

from proofprint.domain.entities.approval_production import Approval
from proofprint.domain.entities.collaboration import ChangeRequest, ChangeRequestStatus
from proofprint.domain.entities.version import ReviewRound, SpecificationVersion
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary


class ApprovalProductionRepository(Protocol):
    def get_workspace(self, workspace_id: UUID) -> WorkspaceSummary | None: ...

    def get_workspace_for_update(self, workspace_id: UUID) -> WorkspaceSummary | None: ...

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None: ...

    def get_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> SpecificationVersion | None: ...

    def get_review_round_for_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> ReviewRound | None: ...

    def list_change_requests_for_update(self, workspace_id: UUID) -> list[ChangeRequest]: ...

    def update_change_request_status(
        self, change_request_id: UUID, status: ChangeRequestStatus, updated_at: datetime
    ) -> None: ...

    def get_approval_for_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> Approval | None: ...

    def add_approval(self, approval: Approval) -> None: ...

    def close_review_round_approved(self, review_round_id: UUID, closed_at: datetime) -> None: ...

    def mark_workspace_approved(
        self, workspace_id: UUID, version_id: UUID, revision: int, updated_at: datetime
    ) -> None: ...

    def mark_workspace_production_locked(
        self, workspace_id: UUID, version_id: UUID, revision: int, updated_at: datetime
    ) -> None: ...

    def get_idempotent_result(
        self,
        *,
        actor_id: UUID | None,
        guest_session_id: UUID | None,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
    ) -> tuple[str, dict[str, Any]] | None: ...

    def add_idempotent_result(
        self,
        *,
        actor_id: UUID | None,
        guest_session_id: UUID | None,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
        request_fingerprint: str,
        response_payload: dict[str, Any],
    ) -> None: ...

    def add_audit_event(
        self,
        *,
        workspace_id: UUID,
        event_type: str,
        entity_type: str,
        entity_id: UUID,
        actor_id: UUID | None = None,
        guest_session_id: UUID | None = None,
        actor_username_snapshot: str | None = None,
        version_id: UUID | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None: ...

    def add_outbox_message(self, event_type: str, payload: dict[str, Any]) -> None: ...

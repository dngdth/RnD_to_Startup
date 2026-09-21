from datetime import datetime
from typing import Any, Protocol
from uuid import UUID

from proofprint.domain.entities.collaboration import (
    ChangeRequest,
    ChangeRequestStatus,
    Comment,
)
from proofprint.domain.entities.version import ReviewRound, SpecificationVersion
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary


class CollaborationRepository(Protocol):
    def get_workspace(self, workspace_id: UUID) -> WorkspaceSummary | None: ...

    def get_workspace_for_update(self, workspace_id: UUID) -> WorkspaceSummary | None: ...

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None: ...

    def get_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> SpecificationVersion | None: ...

    def get_review_round_for_version(
        self, workspace_id: UUID, version_id: UUID
    ) -> ReviewRound | None: ...

    def get_open_review_round(self, workspace_id: UUID) -> ReviewRound | None: ...

    def add_comment(self, comment: Comment) -> None: ...

    def list_comments(
        self,
        workspace_id: UUID,
        *,
        version_id: UUID | None = None,
        block_id: UUID | None = None,
        change_request_id: UUID | None = None,
    ) -> list[Comment]: ...

    def add_change_request(self, change_request: ChangeRequest) -> None: ...

    def list_change_requests(self, workspace_id: UUID) -> list[ChangeRequest]: ...

    def get_change_request(self, change_request_id: UUID) -> ChangeRequest | None: ...

    def get_change_request_for_update(
        self, change_request_id: UUID
    ) -> ChangeRequest | None: ...

    def update_change_request(
        self,
        change_request_id: UUID,
        *,
        status: ChangeRequestStatus,
        updated_at: datetime,
        acknowledged_by: UUID | None = None,
        resolved_in_version_id: UUID | None = None,
        resolution_note: str | None = None,
    ) -> None: ...

    def count_change_requests(
        self,
        review_round_id: UUID,
        *,
        status: ChangeRequestStatus,
    ) -> int: ...

    def has_guest_viewed_version(self, guest_session_id: UUID, version_id: UUID) -> bool: ...

    def bump_workspace_revision(
        self,
        workspace_id: UUID,
        *,
        revision: int,
        updated_at: datetime,
        workflow_status: str | None = None,
    ) -> None: ...

    def close_review_round_for_changes(
        self,
        review_round_id: UUID,
        *,
        closed_at: datetime,
        decision_note: str | None,
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

    def get_guest_idempotent_result(
        self,
        *,
        guest_session_id: UUID,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
    ) -> tuple[str, dict[str, Any]] | None: ...

    def add_guest_idempotent_result(
        self,
        *,
        guest_session_id: UUID,
        workspace_id: UUID,
        operation: str,
        idempotency_key: str,
        request_fingerprint: str,
        response_payload: dict[str, Any],
    ) -> None: ...

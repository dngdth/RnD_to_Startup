from datetime import datetime
from typing import Any, Protocol
from uuid import UUID

from proofprint.domain.entities.review_access import WorkspaceGuestSession, WorkspaceReviewLink
from proofprint.domain.entities.workspace import WorkspaceGrant, WorkspaceSummary


class UnitOfWork(Protocol):
    def commit(self) -> None: ...

    def rollback(self) -> None: ...


class WorkspaceCommandRepository(Protocol):
    def customer_is_active(self, customer_id: UUID) -> bool: ...

    def designer_is_assigned(self, designer_id: UUID, customer_id: UUID) -> bool: ...

    def add_workspace(self, workspace: WorkspaceSummary, created_by: UUID) -> None: ...

    def add_membership(self, user_id: UUID, grant: WorkspaceGrant) -> None: ...

    def get_active_grant(self, workspace_id: UUID, user_id: UUID) -> WorkspaceGrant | None: ...

    def add_audit_event(
        self,
        *,
        workspace_id: UUID,
        event_type: str,
        entity_type: str,
        entity_id: UUID,
        actor_id: UUID | None = None,
        guest_session_id: UUID | None = None,
        actor_email_snapshot: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None: ...


class ReviewAccessRepository(Protocol):
    def add_link(self, link: WorkspaceReviewLink) -> None: ...

    def get_link(self, link_id: UUID) -> WorkspaceReviewLink | None: ...

    def get_active_link(self, workspace_id: UUID) -> WorkspaceReviewLink | None: ...

    def get_active_link_for_update(self, workspace_id: UUID) -> WorkspaceReviewLink | None: ...

    def disable_link(
        self,
        link_id: UUID,
        *,
        disabled_by: UUID,
        disabled_at: datetime,
        reason: str,
        replaced_by_link_id: UUID | None = None,
    ) -> None: ...

    def set_replacement(self, link_id: UUID, replacement_link_id: UUID) -> None: ...

    def revoke_sessions_for_link(self, link_id: UUID, revoked_at: datetime) -> int: ...

    def add_guest_session(self, session: WorkspaceGuestSession) -> None: ...

    def get_guest_session_by_token_hash(
        self, token_hash: str
    ) -> WorkspaceGuestSession | None: ...


class ReviewLinkTokenCodec(Protocol):
    def issue(self, link: WorkspaceReviewLink) -> str: ...

    def decode_link_id(self, token: str) -> UUID | None: ...

    def verify(self, token: str, link: WorkspaceReviewLink) -> bool: ...


class GuestSessionTokenService(Protocol):
    def issue(self) -> tuple[str, str]: ...

    def hash(self, token: str) -> str: ...

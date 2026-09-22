from datetime import UTC, datetime, timedelta
from uuid import uuid4

from proofprint.application.dtos import CreatedGuestSession
from proofprint.domain.entities.review_access import (
    GuestPrincipal,
    GuestSessionStatus,
    ReviewLinkStatus,
    WorkspaceGuestSession,
)
from proofprint.domain.entities.workspace import WorkspaceSummary
from proofprint.domain.exceptions import AuthenticationRequired, ResourceNotFound, ValidationFailed
from proofprint.domain.interfaces.review_access import (
    GuestSessionTokenService,
    ReviewAccessRepository,
    ReviewLinkTokenCodec,
    UnitOfWork,
    WorkspaceCommandRepository,
)
from proofprint.domain.interfaces.workspace import WorkspaceAccessRepository


class CreateGuestSession:
    def __init__(
        self,
        review_access: ReviewAccessRepository,
        workspaces: WorkspaceAccessRepository,
        commands: WorkspaceCommandRepository,
        links: ReviewLinkTokenCodec,
        sessions: GuestSessionTokenService,
        unit_of_work: UnitOfWork,
        ttl_hours: int,
    ) -> None:
        self.review_access = review_access
        self.workspaces = workspaces
        self.commands = commands
        self.links = links
        self.sessions = sessions
        self.unit_of_work = unit_of_work
        self.ttl = timedelta(hours=ttl_hours)

    def execute(self, *, review_token: str, username: str) -> CreatedGuestSession:
        link_id = self.links.decode_link_id(review_token)
        link = self.review_access.get_link(link_id) if link_id is not None else None
        if (
            link is None
            or link.status != ReviewLinkStatus.ACTIVE
            or not self.links.verify(review_token, link)
        ):
            raise ResourceNotFound("Review link was not found")

        workspace = self.workspaces.get(link.workspace_id)
        if workspace is None or workspace.record_status == "CANCELLED":
            raise ResourceNotFound("Review link was not found")

        normalized_username = " ".join(username.strip().split())
        if not normalized_username or len(normalized_username) > 100:
            raise ValidationFailed("username must contain 1 to 100 characters")
        raw_token, token_hash = self.sessions.issue()
        now = datetime.now(UTC)
        session = WorkspaceGuestSession(
            id=uuid4(),
            review_link_id=link.id,
            workspace_id=link.workspace_id,
            username=normalized_username,
            token_hash=token_hash,
            status=GuestSessionStatus.ACTIVE,
            created_at=now,
            expires_at=now + self.ttl,
        )
        try:
            self.review_access.add_guest_session(session)
            self.commands.add_audit_event(
                workspace_id=link.workspace_id,
                guest_session_id=session.id,
                actor_username_snapshot=normalized_username,
                event_type="GUEST_SESSION_CREATED",
                entity_type="WorkspaceGuestSession",
                entity_id=session.id,
                metadata={"review_link_id": str(link.id), "link_version": link.version},
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise

        return CreatedGuestSession(
            principal=GuestPrincipal(
                session_id=session.id,
                review_link_id=link.id,
                workspace_id=link.workspace_id,
                username=normalized_username,
                link_version=link.version,
            ),
            raw_session_token=raw_token,
            expires_at=session.expires_at,
        )


class ResolveGuestSession:
    def __init__(
        self,
        review_access: ReviewAccessRepository,
        sessions: GuestSessionTokenService,
    ) -> None:
        self.review_access = review_access
        self.sessions = sessions

    def execute(self, raw_session_token: str) -> GuestPrincipal:
        token_hash = self.sessions.hash(raw_session_token)
        session = self.review_access.get_guest_session_by_token_hash(token_hash)
        now = datetime.now(UTC)
        if (
            session is None
            or session.status != GuestSessionStatus.ACTIVE
            or session.expires_at <= now
        ):
            raise AuthenticationRequired("Guest session is invalid or expired")
        link = self.review_access.get_link(session.review_link_id)
        if link is None or link.status != ReviewLinkStatus.ACTIVE:
            raise AuthenticationRequired("Guest session is no longer valid")
        return GuestPrincipal(
            session_id=session.id,
            review_link_id=link.id,
            workspace_id=session.workspace_id,
            username=session.username,
            link_version=link.version,
        )


class GetGuestWorkspace:
    def __init__(self, workspaces: WorkspaceAccessRepository) -> None:
        self.workspaces = workspaces

    def execute(self, guest: GuestPrincipal) -> WorkspaceSummary:
        workspace = self.workspaces.get(guest.workspace_id)
        if workspace is None or workspace.record_status == "CANCELLED":
            raise ResourceNotFound("Workspace was not found")
        return workspace

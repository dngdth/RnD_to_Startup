from datetime import UTC, datetime
from uuid import UUID, uuid4

from proofprint.application.dtos import ReviewLinkView
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.review_access import ReviewLinkStatus, WorkspaceReviewLink
from proofprint.domain.exceptions import PermissionDenied, ResourceNotFound
from proofprint.domain.interfaces.review_access import (
    ReviewAccessRepository,
    ReviewLinkTokenCodec,
    UnitOfWork,
    WorkspaceCommandRepository,
)


class ReviewLinkManager:
    def __init__(
        self,
        commands: WorkspaceCommandRepository,
        review_access: ReviewAccessRepository,
        links: ReviewLinkTokenCodec,
        unit_of_work: UnitOfWork,
        review_base_url: str,
    ) -> None:
        self.commands = commands
        self.review_access = review_access
        self.links = links
        self.unit_of_work = unit_of_work
        self.review_base_url = review_base_url.rstrip("/")

    def get(self, actor: CurrentActor, workspace_id: UUID) -> ReviewLinkView:
        self._authorize(actor, workspace_id)
        link = self.review_access.get_active_link(workspace_id)
        if link is None:
            raise ResourceNotFound("Active review link was not found")
        return self._view(link)

    def disable(self, actor: CurrentActor, workspace_id: UUID, reason: str) -> None:
        self._authorize(actor, workspace_id)
        link = self.review_access.get_active_link_for_update(workspace_id)
        if link is None:
            raise ResourceNotFound("Active review link was not found")
        now = datetime.now(UTC)
        try:
            revoked = self.review_access.revoke_sessions_for_link(link.id, now)
            self.review_access.disable_link(
                link.id, disabled_by=actor.id, disabled_at=now, reason=reason.strip()
            )
            self.commands.add_audit_event(
                workspace_id=workspace_id,
                actor_id=actor.id,
                event_type="REVIEW_LINK_DISABLED",
                entity_type="WorkspaceReviewLink",
                entity_id=link.id,
                metadata={"reason": reason.strip(), "revoked_sessions": revoked},
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise

    def rotate(self, actor: CurrentActor, workspace_id: UUID, reason: str) -> ReviewLinkView:
        self._authorize(actor, workspace_id)
        current = self.review_access.get_active_link_for_update(workspace_id)
        if current is None:
            raise ResourceNotFound("Active review link was not found")
        now = datetime.now(UTC)
        replacement = WorkspaceReviewLink(
            id=uuid4(),
            workspace_id=workspace_id,
            version=current.version + 1,
            status=ReviewLinkStatus.ACTIVE,
            created_by=actor.id,
            created_at=now,
        )
        try:
            revoked = self.review_access.revoke_sessions_for_link(current.id, now)
            self.review_access.disable_link(
                current.id, disabled_by=actor.id, disabled_at=now, reason=reason.strip()
            )
            self.review_access.add_link(replacement)
            self.review_access.set_replacement(current.id, replacement.id)
            self.commands.add_audit_event(
                workspace_id=workspace_id,
                actor_id=actor.id,
                event_type="REVIEW_LINK_ROTATED",
                entity_type="WorkspaceReviewLink",
                entity_id=replacement.id,
                metadata={
                    "previous_link_id": str(current.id),
                    "link_version": replacement.version,
                    "reason": reason.strip(),
                    "revoked_sessions": revoked,
                },
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return self._view(replacement)

    def _authorize(self, actor: CurrentActor, workspace_id: UUID) -> None:
        if actor.system_role == SystemRole.ADMIN:
            return
        grant = self.commands.get_active_grant(workspace_id, actor.id)
        if grant is None:
            raise ResourceNotFound("Workspace was not found")
        if actor.system_role != SystemRole.DESIGNER or grant.role != SystemRole.DESIGNER:
            raise PermissionDenied("Only a designer or admin can manage the review link")

    def _view(self, link: WorkspaceReviewLink) -> ReviewLinkView:
        token = self.links.issue(link)
        return ReviewLinkView(link=link, review_url=f"{self.review_base_url}/review/{token}")

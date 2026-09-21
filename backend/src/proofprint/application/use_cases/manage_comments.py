from datetime import UTC, datetime
from uuid import UUID, uuid4

from proofprint.domain.entities.collaboration import Comment
from proofprint.domain.entities.identity import CurrentActor, SystemRole
from proofprint.domain.entities.review_access import GuestPrincipal
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

CommentAuthor = CurrentActor | GuestPrincipal


class CreateComment:
    def __init__(
        self, collaboration: CollaborationRepository, unit_of_work: UnitOfWork
    ) -> None:
        self.collaboration = collaboration
        self.unit_of_work = unit_of_work

    def execute(
        self,
        *,
        author: CommentAuthor,
        workspace_id: UUID,
        body: str,
        version_id: UUID | None,
        block_id: UUID | None,
        change_request_id: UUID | None,
        expected_revision: int,
    ) -> tuple[Comment, int]:
        _authorize_viewer(author, self.collaboration, workspace_id)
        workspace = self.collaboration.get_workspace_for_update(workspace_id)
        _require_active_revision(workspace, expected_revision)
        normalized_body = body.strip()
        if not normalized_body or len(normalized_body) > 5000:
            raise ValidationFailed("Comment body must contain 1 to 5000 characters")

        change_request = None
        if change_request_id is not None:
            change_request = self.collaboration.get_change_request(change_request_id)
            if change_request is None or change_request.workspace_id != workspace_id:
                raise ResourceNotFound("Change request was not found")
            if version_id is not None and version_id != change_request.version_id:
                raise ValidationFailed("Comment version must match its change request")
            if block_id is not None and block_id != change_request.block_id:
                raise ValidationFailed("Comment block must match its change request")
            version_id = change_request.version_id
            block_id = change_request.block_id

        version = None
        if version_id is not None:
            version = self.collaboration.get_version(workspace_id, version_id)
            if version is None:
                raise ResourceNotFound("Version was not found")
        if block_id is not None:
            if version is None:
                raise ValidationFailed("version_id is required when block_id is provided")
            if not _snapshot_has_block(version.snapshot, block_id):
                raise ValidationFailed("Block does not exist in the selected Version snapshot")

        now = datetime.now(UTC)
        comment = Comment(
            id=uuid4(),
            workspace_id=workspace_id,
            version_id=version_id,
            block_id=block_id,
            change_request_id=change_request_id,
            body=normalized_body,
            author_id=author.id if isinstance(author, CurrentActor) else None,
            guest_session_id=(
                author.session_id if isinstance(author, GuestPrincipal) else None
            ),
            author_username_snapshot=(
                author.username if isinstance(author, GuestPrincipal) else None
            ),
            created_at=now,
        )
        next_revision = expected_revision + 1
        try:
            self.collaboration.add_comment(comment)
            self.collaboration.bump_workspace_revision(
                workspace_id, revision=next_revision, updated_at=now
            )
            self.collaboration.add_audit_event(
                workspace_id=workspace_id,
                event_type="COMMENT_CREATED",
                entity_type="Comment",
                entity_id=comment.id,
                version_id=version_id,
                actor_id=author.id if isinstance(author, CurrentActor) else None,
                guest_session_id=(
                    author.session_id if isinstance(author, GuestPrincipal) else None
                ),
                actor_username_snapshot=(
                    author.username if isinstance(author, GuestPrincipal) else None
                ),
                metadata={
                    "block_id": str(block_id) if block_id else None,
                    "change_request_id": (
                        str(change_request_id) if change_request_id else None
                    ),
                    "workspace_revision": next_revision,
                },
            )
            self.collaboration.add_outbox_message(
                "COMMENT_CREATED",
                {
                    "workspace_id": str(workspace_id),
                    "comment_id": str(comment.id),
                    "version_id": str(version_id) if version_id else None,
                },
            )
            self.unit_of_work.commit()
        except Exception:
            self.unit_of_work.rollback()
            raise
        return comment, next_revision


class ListComments:
    def __init__(self, collaboration: CollaborationRepository) -> None:
        self.collaboration = collaboration

    def execute(
        self,
        viewer: CommentAuthor,
        workspace_id: UUID,
        *,
        version_id: UUID | None = None,
        block_id: UUID | None = None,
        change_request_id: UUID | None = None,
    ) -> list[Comment]:
        _authorize_viewer(viewer, self.collaboration, workspace_id)
        return self.collaboration.list_comments(
            workspace_id,
            version_id=version_id,
            block_id=block_id,
            change_request_id=change_request_id,
        )


def _authorize_viewer(
    viewer: CommentAuthor,
    collaboration: CollaborationRepository,
    workspace_id: UUID,
) -> WorkspaceSummary:
    if isinstance(viewer, CurrentActor):
        if viewer.system_role != SystemRole.DESIGNER:
            raise PermissionDenied("Only designers can access workspace collaboration")
        grant = collaboration.get_active_grant(workspace_id, viewer.id)
        if grant is None:
            raise ResourceNotFound("Workspace was not found")
        if not grant.can_view:
            raise PermissionDenied("You do not have permission to view this workspace")
    elif viewer.workspace_id != workspace_id:
        raise ResourceNotFound("Workspace was not found")
    workspace = collaboration.get_workspace(workspace_id)
    if workspace is None or workspace.record_status == "CANCELLED":
        raise ResourceNotFound("Workspace was not found")
    return workspace


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


def _snapshot_has_block(snapshot: list[dict[str, object]], block_id: UUID) -> bool:
    return any(str(item.get("id")) == str(block_id) for item in snapshot)

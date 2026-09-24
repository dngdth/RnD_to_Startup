from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from proofprint.infrastructure.models.base import Base


class CommentRow(Base):
    __tablename__ = "comments"
    __table_args__ = (
        CheckConstraint(
            "(author_id IS NOT NULL AND guest_session_id IS NULL) OR "
            "(author_id IS NULL AND guest_session_id IS NOT NULL)",
            name="ck_comments_exactly_one_actor",
        ),
        ForeignKeyConstraint(
            ["version_id", "workspace_id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_comments_version_same_workspace",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["change_request_id", "workspace_id"],
            ["change_requests.id", "change_requests.workspace_id"],
            name="fk_comments_change_request_same_workspace",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["resolved_in_version_id", "workspace_id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_comments_resolved_version_same_workspace",
            ondelete="RESTRICT",
        ),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("order_workspaces.id"), nullable=False
    )
    version_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    block_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    change_request_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    request_batch_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    resolved_in_version_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    author_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    guest_session_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("workspace_guest_sessions.id", ondelete="RESTRICT")
    )
    author_username_snapshot: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

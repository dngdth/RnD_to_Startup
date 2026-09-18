from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, ForeignKeyConstraint, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from proofprint.infrastructure.models.base import Base


class CommentRow(Base):
    __tablename__ = "comments"
    __table_args__ = (
        ForeignKeyConstraint(
            ["version_id", "workspace_id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_comments_version_same_workspace",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["block_id", "workspace_id"],
            ["specification_blocks.id", "specification_blocks.workspace_id"],
            name="fk_comments_block_same_workspace",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["change_request_id", "workspace_id"],
            ["change_requests.id", "change_requests.workspace_id"],
            name="fk_comments_change_request_same_workspace",
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
    body: Mapped[str] = mapped_column(Text, nullable=False)
    author_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


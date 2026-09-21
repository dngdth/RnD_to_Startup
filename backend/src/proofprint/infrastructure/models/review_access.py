from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from proofprint.infrastructure.models.base import Base


class WorkspaceReviewLinkRow(Base):
    __tablename__ = "workspace_review_links"
    __table_args__ = (
        CheckConstraint("version > 0", name="ck_workspace_review_links_version"),
        CheckConstraint(
            "status IN ('ACTIVE', 'DISABLED')", name="ck_workspace_review_links_status"
        ),
        CheckConstraint(
            "(status = 'ACTIVE' AND disabled_at IS NULL AND disabled_by IS NULL) OR "
            "(status = 'DISABLED' AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL)",
            name="ck_workspace_review_links_disabled_fields",
        ),
        UniqueConstraint("workspace_id", "version", name="uq_workspace_review_links_version"),
        UniqueConstraint("id", "workspace_id", name="uq_workspace_review_links_id_workspace"),
        Index(
            "uq_workspace_review_links_one_active",
            "workspace_id",
            unique=True,
            postgresql_where=text("status = 'ACTIVE'"),
        ),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("order_workspaces.id", ondelete="RESTRICT"),
        nullable=False,
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    disabled_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT")
    )
    disabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    disabled_reason: Mapped[str | None] = mapped_column(Text)
    replaced_by_link_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("workspace_review_links.id", ondelete="RESTRICT")
    )


class WorkspaceGuestSessionRow(Base):
    __tablename__ = "workspace_guest_sessions"
    __table_args__ = (
        CheckConstraint(
            "status IN ('ACTIVE', 'REVOKED', 'EXPIRED')",
            name="ck_workspace_guest_sessions_status",
        ),
        CheckConstraint(
            "(status = 'ACTIVE' AND revoked_at IS NULL) OR "
            "(status <> 'ACTIVE' AND revoked_at IS NOT NULL)",
            name="ck_workspace_guest_sessions_revoked_at",
        ),
        ForeignKeyConstraint(
            ["review_link_id", "workspace_id"],
            ["workspace_review_links.id", "workspace_review_links.workspace_id"],
            name="fk_workspace_guest_sessions_link_same_workspace",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("token_hash", name="uq_workspace_guest_sessions_token_hash"),
        Index("ix_workspace_guest_sessions_workspace_username", "workspace_id", "username"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    review_link_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    workspace_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

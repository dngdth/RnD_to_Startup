from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from proofprint.infrastructure.models.base import Base

if TYPE_CHECKING:
    from proofprint.infrastructure.models.workspace import WorkspaceRow


class ReviewRoundRow(Base):
    __tablename__ = "review_rounds"
    __table_args__ = (
        CheckConstraint(
            "status IN ('OPEN', 'APPROVED', 'CHANGES_REQUESTED', 'CANCELLED')",
            name="ck_review_rounds_status",
        ),
        CheckConstraint(
            "(status = 'OPEN' AND closed_at IS NULL) OR "
            "(status <> 'OPEN' AND closed_at IS NOT NULL)",
            name="ck_review_rounds_closed_at",
        ),
        ForeignKeyConstraint(
            ["version_id", "workspace_id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_review_rounds_version_same_workspace",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("version_id", name="uq_review_rounds_version"),
        UniqueConstraint("id", "workspace_id", name="uq_review_rounds_id_workspace"),
        Index(
            "uq_review_rounds_one_open_per_workspace",
            "workspace_id",
            unique=True,
            postgresql_where=text("status = 'OPEN'"),
        ),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    version_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decided_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT")
    )
    decision_note: Mapped[str | None] = mapped_column(Text)


class ApprovalRow(Base):
    __tablename__ = "approvals"
    __table_args__ = (
        UniqueConstraint("version_id", name="uq_approvals_version"),
        UniqueConstraint("id", "workspace_id", name="uq_approvals_id_workspace"),
        ForeignKeyConstraint(
            ["review_round_id", "workspace_id"],
            ["review_rounds.id", "review_rounds.workspace_id"],
            name="fk_approvals_review_same_workspace",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["version_id", "workspace_id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_approvals_version_same_workspace",
            ondelete="RESTRICT",
        ),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("order_workspaces.id", ondelete="RESTRICT"),
        nullable=False,
    )
    review_round_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    version_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("specification_versions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    approver_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    workspace: Mapped[WorkspaceRow] = relationship(
        back_populates="approvals", foreign_keys=[workspace_id]
    )


class ChangeRequestRow(Base):
    __tablename__ = "change_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ('REQUESTED', 'ACKNOWLEDGED', 'UPDATED', 'CONFIRMED', "
            "'REOPENED', 'REJECTED', 'CANCELLED')",
            name="ck_change_requests_status",
        ),
        CheckConstraint(
            "status <> 'UPDATED' OR resolved_in_version_id IS NOT NULL",
            name="ck_change_requests_updated_has_version",
        ),
        ForeignKeyConstraint(
            ["review_round_id", "workspace_id"],
            ["review_rounds.id", "review_rounds.workspace_id"],
            name="fk_change_requests_review_same_workspace",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["version_id", "workspace_id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_change_requests_version_same_workspace",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["block_id", "workspace_id"],
            ["specification_blocks.id", "specification_blocks.workspace_id"],
            name="fk_change_requests_block_same_workspace",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["resolved_in_version_id", "workspace_id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_change_requests_resolution_version_same_workspace",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("id", "workspace_id", name="uq_change_requests_id_workspace"),
        Index("ix_change_requests_review_status", "review_round_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    review_round_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    version_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    block_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    field_path: Mapped[str | None] = mapped_column(String(500))
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    requested_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    acknowledged_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    resolved_in_version_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    parent_change_request_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("change_requests.id", ondelete="RESTRICT")
    )
    resolution_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


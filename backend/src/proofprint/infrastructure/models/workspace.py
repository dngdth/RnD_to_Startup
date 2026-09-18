from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    false,
    func,
    true,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from proofprint.infrastructure.models.base import Base

if TYPE_CHECKING:
    from proofprint.infrastructure.models.review import ApprovalRow
    from proofprint.infrastructure.models.specification import (
        SpecificationBlockRow,
        SpecificationVersionRow,
    )


class WorkspaceRow(Base):
    __tablename__ = "order_workspaces"
    __table_args__ = (
        CheckConstraint(
            "workflow_status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'LOCKED_FOR_PRODUCTION')",
            name="ck_order_workspaces_workflow_status",
        ),
        CheckConstraint(
            "record_status IN ('ACTIVE', 'ARCHIVED', 'CANCELLED')",
            name="ck_order_workspaces_record_status",
        ),
        CheckConstraint("revision >= 0", name="ck_order_workspaces_revision"),
        ForeignKeyConstraint(
            ["latest_version_id", "id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_order_workspaces_latest_version_id_same_workspace",
            ondelete="RESTRICT",
            use_alter=True,
        ),
        ForeignKeyConstraint(
            ["approved_version_id", "id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_order_workspaces_approved_version_id_same_workspace",
            ondelete="RESTRICT",
            use_alter=True,
        ),
        ForeignKeyConstraint(
            ["production_version_id", "id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_order_workspaces_production_version_id_same_workspace",
            ondelete="RESTRICT",
            use_alter=True,
        ),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    customer_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False
    )
    product_type: Mapped[str] = mapped_column(String(80), nullable=False)
    workflow_status: Mapped[str] = mapped_column(String(40), nullable=False)
    record_status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="ACTIVE"
    )
    latest_version_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    approved_version_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    production_version_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    blocks: Mapped[list[SpecificationBlockRow]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan", lazy="selectin"
    )
    versions: Mapped[list[SpecificationVersionRow]] = relationship(
        back_populates="workspace",
        cascade="all, delete-orphan",
        lazy="selectin",
        foreign_keys="SpecificationVersionRow.workspace_id",
    )
    approvals: Mapped[list[ApprovalRow]] = relationship(
        back_populates="workspace",
        cascade="all, delete-orphan",
        lazy="selectin",
        foreign_keys="ApprovalRow.workspace_id",
    )


class WorkspaceMembershipRow(Base):
    __tablename__ = "workspace_memberships"
    __table_args__ = (
        CheckConstraint(
            "role IN ('ADMIN', 'DESIGNER', 'CUSTOMER')", name="ck_workspace_memberships_role"
        ),
        CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE')", name="ck_workspace_memberships_status"
        ),
    )

    workspace_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("order_workspaces.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    can_view: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=true())
    can_edit: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=false())
    can_review: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=false())
    can_approve: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=false())
    can_lock_production: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=false()
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="ACTIVE")

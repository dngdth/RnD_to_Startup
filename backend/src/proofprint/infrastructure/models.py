from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    false,
    func,
    text,
    true,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class UserRow(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "system_role IN ('ADMIN', 'DESIGNER', 'CUSTOMER')", name="ck_users_system_role"
        ),
        CheckConstraint("status IN ('ACTIVE', 'DISABLED')", name="ck_users_status"),
        UniqueConstraint("email", name="uq_users_email"),
        Index("uq_users_email_ci", text("lower(email)"), unique=True),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    system_role: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class UserCredentialRow(Base):
    __tablename__ = "user_credentials"

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    must_change_password: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=false()
    )
    password_changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class CustomerRow(Base):
    __tablename__ = "customers"
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE', 'ARCHIVED')", name="ck_customers_status"),
        UniqueConstraint("code", name="uq_customers_code"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class CustomerUserRow(Base):
    __tablename__ = "customer_users"
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_customer_users_status"),
        UniqueConstraint("customer_id", "user_id", name="uq_customer_users_pair"),
    )

    customer_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="ACTIVE")


class DesignerCustomerAssignmentRow(Base):
    __tablename__ = "designer_customer_assignments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE')", name="ck_designer_customer_assignments_status"
        ),
        UniqueConstraint(
            "designer_id", "customer_id", name="uq_designer_customer_assignments_pair"
        ),
    )

    designer_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    customer_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), primary_key=True
    )
    assigned_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class OrderRow(Base):
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

    blocks: Mapped[list[BlockRow]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan", lazy="selectin"
    )
    versions: Mapped[list[VersionRow]] = relationship(
        back_populates="workspace",
        cascade="all, delete-orphan",
        lazy="selectin",
        foreign_keys="VersionRow.workspace_id",
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
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_memberships_pair"),
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


class BlockRow(Base):
    __tablename__ = "specification_blocks"
    __table_args__ = (
        CheckConstraint("position >= 0", name="ck_specification_blocks_position"),
        CheckConstraint("schema_version > 0", name="ck_specification_blocks_schema_version"),
        UniqueConstraint("id", "workspace_id", name="uq_specification_blocks_id_workspace"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("order_workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    block_type: Mapped[str] = mapped_column(String(80), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    created_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    updated_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    workspace: Mapped[OrderRow] = relationship(back_populates="blocks")


class VersionRow(Base):
    __tablename__ = "specification_versions"
    __table_args__ = (
        UniqueConstraint("workspace_id", "number"),
        UniqueConstraint("id", "workspace_id", name="uq_specification_versions_id_workspace"),
        CheckConstraint("number > 0", name="ck_specification_versions_number"),
        CheckConstraint("schema_version > 0", name="ck_specification_versions_schema_version"),
        ForeignKeyConstraint(
            ["previous_version_id", "workspace_id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_specification_versions_previous_same_workspace",
            ondelete="RESTRICT",
        ),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("order_workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    previous_version_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    snapshot: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    created_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    workspace: Mapped[OrderRow] = relationship(
        back_populates="versions", foreign_keys=[workspace_id]
    )


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

    workspace: Mapped[OrderRow] = relationship(
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


class AssetRow(Base):
    __tablename__ = "assets"
    __table_args__ = (
        CheckConstraint("size_bytes >= 0", name="ck_assets_size_bytes"),
        CheckConstraint(
            "status IN ('UPLOADING', 'READY', 'REJECTED')", name="ck_assets_status"
        ),
        UniqueConstraint("storage_key", name="uq_assets_storage_key"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("order_workspaces.id", ondelete="RESTRICT"),
        nullable=False,
    )
    storage_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    uploaded_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class AuditEventRow(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_events_workspace_created_at", "workspace_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("order_workspaces.id", ondelete="RESTRICT"),
        nullable=False,
    )
    actor_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    version_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("specification_versions.id", ondelete="RESTRICT")
    )
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, server_default="{}"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class OutboxMessageRow(Base):
    __tablename__ = "outbox_messages"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')",
            name="ck_outbox_messages_status",
        ),
        Index(
            "ix_outbox_messages_pending",
            "created_at",
            postgresql_where=text("status IN ('PENDING', 'FAILED')"),
        ),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="PENDING")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

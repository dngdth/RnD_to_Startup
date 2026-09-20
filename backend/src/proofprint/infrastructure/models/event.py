from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from proofprint.infrastructure.models.base import Base


class AuditEventRow(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        CheckConstraint(
            "(actor_id IS NOT NULL AND guest_session_id IS NULL) OR "
            "(actor_id IS NULL AND guest_session_id IS NOT NULL)",
            name="ck_audit_events_exactly_one_actor",
        ),
        Index("ix_audit_events_workspace_created_at", "workspace_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("order_workspaces.id", ondelete="RESTRICT"),
        nullable=False,
    )
    actor_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT")
    )
    guest_session_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("workspace_guest_sessions.id", ondelete="RESTRICT"),
    )
    actor_username_snapshot: Mapped[str | None] = mapped_column(String(100))
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

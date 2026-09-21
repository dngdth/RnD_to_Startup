from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from proofprint.infrastructure.models.base import Base


class IdempotencyRecordRow(Base):
    __tablename__ = "idempotency_records"
    __table_args__ = (
        CheckConstraint(
            "(actor_id IS NOT NULL AND guest_session_id IS NULL) OR "
            "(actor_id IS NULL AND guest_session_id IS NOT NULL)",
            name="ck_idempotency_records_exactly_one_actor",
        ),
        Index(
            "uq_idempotency_records_user_scope_key",
            "actor_id",
            "workspace_id",
            "operation",
            "idempotency_key",
            unique=True,
            postgresql_where=text("actor_id IS NOT NULL"),
        ),
        Index(
            "uq_idempotency_records_guest_scope_key",
            "guest_session_id",
            "workspace_id",
            "operation",
            "idempotency_key",
            unique=True,
            postgresql_where=text("guest_session_id IS NOT NULL"),
        ),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    actor_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT")
    )
    guest_session_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("workspace_guest_sessions.id", ondelete="RESTRICT"),
    )
    workspace_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("order_workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    operation: Mapped[str] = mapped_column(String(100), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(200), nullable=False)
    request_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    response_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

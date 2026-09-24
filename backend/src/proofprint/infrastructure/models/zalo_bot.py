"""Manually verified Zalo Bot chats for ProofPrint notification recipients."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from proofprint.infrastructure.models.base import Base


class ZaloBotBindingRow(Base):
    __tablename__ = "zalo_bot_bindings"
    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL AND customer_phone IS NULL) OR "
            "(user_id IS NULL AND customer_phone IS NOT NULL)",
            name="ck_zalo_bot_bindings_one_recipient",
        ),
        UniqueConstraint("user_id", name="uq_zalo_bot_bindings_user"),
        UniqueConstraint("customer_phone", name="uq_zalo_bot_bindings_customer_phone"),
        UniqueConstraint("chat_id", name="uq_zalo_bot_bindings_chat"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    customer_phone: Mapped[str | None] = mapped_column(String(40))
    chat_id: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now())

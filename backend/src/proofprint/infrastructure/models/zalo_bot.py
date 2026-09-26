"""Verified Zalo private chats and short-lived account-link codes."""

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
            "(user_id IS NOT NULL AND customer_id IS NULL) OR "
            "(user_id IS NULL AND customer_id IS NOT NULL)",
            name="ck_zalo_bot_bindings_one_recipient",
        ),
        UniqueConstraint("user_id", name="uq_zalo_bot_bindings_user"),
        UniqueConstraint("customer_id", name="uq_zalo_bot_bindings_customer"),
        UniqueConstraint("chat_id", name="uq_zalo_bot_bindings_chat"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    customer_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE")
    )
    chat_id: Mapped[str] = mapped_column(String(128), nullable=False)
    zalo_display_name: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ZaloLinkTokenRow(Base):
    __tablename__ = "zalo_link_tokens"
    __table_args__ = (
        CheckConstraint(
            "(principal_type = 'DESIGNER' AND user_id IS NOT NULL AND customer_id IS NULL) OR "
            "(principal_type = 'CUSTOMER' AND user_id IS NULL AND customer_id IS NOT NULL)",
            name="ck_zalo_link_tokens_principal",
        ),
        CheckConstraint(
            "principal_type IN ('DESIGNER', 'CUSTOMER')",
            name="ck_zalo_link_tokens_principal_type",
        ),
        UniqueConstraint("token_hash", name="uq_zalo_link_tokens_hash"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    principal_type: Mapped[str] = mapped_column(String(20), nullable=False)
    user_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    customer_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE")
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

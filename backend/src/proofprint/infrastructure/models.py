from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class OrderRow(Base):
    __tablename__ = "order_workspaces"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    customer_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    product_type: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    approved_version_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    production_version_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))

    blocks: Mapped[list[BlockRow]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )
    versions: Mapped[list[VersionRow]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )
    approvals: Mapped[list[ApprovalRow]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )


class BlockRow(Base):
    __tablename__ = "specification_blocks"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    order_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("order_workspaces.id", ondelete="CASCADE"), nullable=False
    )
    block_type: Mapped[str] = mapped_column(String(80), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    order: Mapped[OrderRow] = relationship(back_populates="blocks")


class VersionRow(Base):
    __tablename__ = "specification_versions"
    __table_args__ = (UniqueConstraint("order_id", "number"),)

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    order_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("order_workspaces.id", ondelete="CASCADE"), nullable=False
    )
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    order: Mapped[OrderRow] = relationship(back_populates="versions")


class ApprovalRow(Base):
    __tablename__ = "approvals"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    order_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("order_workspaces.id", ondelete="CASCADE"), nullable=False
    )
    version_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("specification_versions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    approver_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    order: Mapped[OrderRow] = relationship(back_populates="approvals")

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from proofprint.infrastructure.models.base import Base

if TYPE_CHECKING:
    from proofprint.infrastructure.models.workspace import WorkspaceRow


class SpecificationBlockRow(Base):
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

    workspace: Mapped[WorkspaceRow] = relationship(back_populates="blocks")


class SpecificationVersionRow(Base):
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

    workspace: Mapped[WorkspaceRow] = relationship(
        back_populates="versions", foreign_keys=[workspace_id]
    )


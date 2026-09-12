"""Initial order, specification, version and approval tables.

Revision ID: 0001_initial
Revises:
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "order_workspaces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_type", sa.String(80), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("approved_version_id", postgresql.UUID(as_uuid=True)),
        sa.Column("production_version_id", postgresql.UUID(as_uuid=True)),
    )
    op.create_table(
        "specification_blocks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("order_workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("block_type", sa.String(80), nullable=False),
        sa.Column("label", sa.String(200), nullable=False),
        sa.Column("content", postgresql.JSONB, nullable=False),
        sa.Column("position", sa.Integer, nullable=False),
    )
    op.create_table(
        "specification_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("order_workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("number", sa.Integer, nullable=False),
        sa.Column("snapshot", postgresql.JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("order_id", "number"),
    )
    op.create_table(
        "approvals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("order_workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("specification_versions.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("approver_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("approvals")
    op.drop_table("specification_versions")
    op.drop_table("specification_blocks")
    op.drop_table("order_workspaces")

"""Support guest collaboration and historical snapshot block references.

Revision ID: 0007_phase3_collaboration
Revises: 0006_phase2_idempotency
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0007_phase3_collaboration"
down_revision: str | None = "0006_phase2_idempotency"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        "uq_idempotency_records_scope_key", "idempotency_records", type_="unique"
    )
    op.alter_column("idempotency_records", "actor_id", nullable=True)
    op.add_column(
        "idempotency_records",
        sa.Column("guest_session_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_idempotency_records_guest_session",
        "idempotency_records",
        "workspace_guest_sessions",
        ["guest_session_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_check_constraint(
        "ck_idempotency_records_exactly_one_actor",
        "idempotency_records",
        "(actor_id IS NOT NULL AND guest_session_id IS NULL) OR "
        "(actor_id IS NULL AND guest_session_id IS NOT NULL)",
    )
    op.create_index(
        "uq_idempotency_records_user_scope_key",
        "idempotency_records",
        ["actor_id", "workspace_id", "operation", "idempotency_key"],
        unique=True,
        postgresql_where=sa.text("actor_id IS NOT NULL"),
    )
    op.create_index(
        "uq_idempotency_records_guest_scope_key",
        "idempotency_records",
        ["guest_session_id", "workspace_id", "operation", "idempotency_key"],
        unique=True,
        postgresql_where=sa.text("guest_session_id IS NOT NULL"),
    )

    op.drop_constraint(
        "fk_change_requests_block_same_workspace", "change_requests", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_comments_block_same_workspace", "comments", type_="foreignkey"
    )

    op.create_table(
        "guest_version_views",
        sa.Column(
            "guest_session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspace_guest_sessions.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("version_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("viewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["version_id", "workspace_id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_guest_version_views_version_same_workspace",
            ondelete="CASCADE",
        ),
    )


def downgrade() -> None:
    op.drop_table("guest_version_views")
    op.create_foreign_key(
        "fk_comments_block_same_workspace",
        "comments",
        "specification_blocks",
        ["block_id", "workspace_id"],
        ["id", "workspace_id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_change_requests_block_same_workspace",
        "change_requests",
        "specification_blocks",
        ["block_id", "workspace_id"],
        ["id", "workspace_id"],
        ondelete="RESTRICT",
    )

    op.drop_index(
        "uq_idempotency_records_guest_scope_key", table_name="idempotency_records"
    )
    op.drop_index(
        "uq_idempotency_records_user_scope_key", table_name="idempotency_records"
    )
    op.drop_constraint(
        "ck_idempotency_records_exactly_one_actor",
        "idempotency_records",
        type_="check",
    )
    op.drop_constraint(
        "fk_idempotency_records_guest_session",
        "idempotency_records",
        type_="foreignkey",
    )
    op.execute("DELETE FROM idempotency_records WHERE actor_id IS NULL")
    op.drop_column("idempotency_records", "guest_session_id")
    op.alter_column("idempotency_records", "actor_id", nullable=False)
    op.create_unique_constraint(
        "uq_idempotency_records_scope_key",
        "idempotency_records",
        ["actor_id", "workspace_id", "operation", "idempotency_key"],
    )

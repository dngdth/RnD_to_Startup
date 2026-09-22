"""Store idempotent workspace creation responses.

Revision ID: 0008_workspace_creation
Revises: 0007_phase3_collaboration
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0008_workspace_creation"
down_revision = "0007_phase3_collaboration"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workspace_creation_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("idempotency_key", sa.String(200), nullable=False),
        sa.Column("request_fingerprint", sa.String(64), nullable=False),
        sa.Column("response_payload", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("actor_id", "idempotency_key", name="uq_workspace_creation_actor_key"),
    )


def downgrade() -> None:
    op.drop_table("workspace_creation_requests")

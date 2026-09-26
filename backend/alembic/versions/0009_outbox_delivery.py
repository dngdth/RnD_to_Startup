"""Track outbox claims and delivery attempts.

Revision ID: 0009_outbox_delivery
Revises: 0008_workspace_creation
"""

import sqlalchemy as sa

from alembic import op

revision = "0009_outbox_delivery"
down_revision = "0008_workspace_creation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("outbox_messages", sa.Column("locked_at", sa.DateTime(timezone=True)))
    op.add_column(
        "outbox_messages",
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("outbox_messages", sa.Column("last_error", sa.String(500)))


def downgrade() -> None:
    op.drop_column("outbox_messages", "last_error")
    op.drop_column("outbox_messages", "attempt_count")
    op.drop_column("outbox_messages", "locked_at")

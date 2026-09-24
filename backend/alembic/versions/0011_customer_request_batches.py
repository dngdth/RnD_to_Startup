"""Tag draft comments submitted as block request batches.

Revision ID: 0011_customer_request_batches
Revises: 0010_zalo_bot_bindings
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0011_customer_request_batches"
down_revision = "0010_zalo_bot_bindings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "comments",
        sa.Column("request_batch_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_comments_request_batch_id", "comments", ["request_batch_id"])


def downgrade() -> None:
    op.drop_index("ix_comments_request_batch_id", table_name="comments")
    op.drop_column("comments", "request_batch_id")

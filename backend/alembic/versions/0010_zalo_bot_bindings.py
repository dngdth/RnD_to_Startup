"""Store manually verified Zalo Bot chat bindings.

Revision ID: 0010_zalo_bot_bindings
Revises: 0009_outbox_delivery
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0010_zalo_bot_bindings"
down_revision = "0009_outbox_delivery"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "zalo_bot_bindings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("customer_phone", sa.String(40)),
        sa.Column("chat_id", sa.String(128), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "(user_id IS NOT NULL AND customer_phone IS NULL) OR "
            "(user_id IS NULL AND customer_phone IS NOT NULL)",
            name="ck_zalo_bot_bindings_one_recipient",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_zalo_bot_bindings_user"),
        sa.UniqueConstraint(
            "customer_phone", name="uq_zalo_bot_bindings_customer_phone"
        ),
        sa.UniqueConstraint("chat_id", name="uq_zalo_bot_bindings_chat"),
    )


def downgrade() -> None:
    op.drop_table("zalo_bot_bindings")

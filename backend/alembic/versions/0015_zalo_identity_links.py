"""Link Zalo chats to stable Designer and Customer identities.

Revision ID: 0015_zalo_identity_links
Revises: 0014_asset_image_data
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0015_zalo_identity_links"
down_revision = "0014_asset_image_data"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(40)))
    op.create_index(
        "uq_users_phone_not_null", "users", ["phone"], unique=True,
        postgresql_where=sa.text("phone IS NOT NULL"),
    )

    op.add_column(
        "order_workspaces",
        sa.Column("assigned_designer_id", postgresql.UUID(as_uuid=True)),
    )
    op.execute("UPDATE order_workspaces SET assigned_designer_id = created_by")
    op.alter_column("order_workspaces", "assigned_designer_id", nullable=False)
    op.create_foreign_key(
        "fk_order_workspaces_assigned_designer", "order_workspaces", "users",
        ["assigned_designer_id"], ["id"], ondelete="RESTRICT",
    )
    op.create_index(
        "ix_order_workspaces_assigned_designer_id", "order_workspaces",
        ["assigned_designer_id"],
    )

    op.drop_constraint(
        "ck_zalo_bot_bindings_one_recipient", "zalo_bot_bindings", type_="check"
    )
    op.drop_constraint(
        "uq_zalo_bot_bindings_customer_phone", "zalo_bot_bindings", type_="unique"
    )
    op.add_column(
        "zalo_bot_bindings", sa.Column("customer_id", postgresql.UUID(as_uuid=True))
    )
    op.add_column(
        "zalo_bot_bindings", sa.Column("zalo_display_name", sa.String(200))
    )
    op.execute(
        """
        UPDATE zalo_bot_bindings AS binding
        SET customer_id = (
            SELECT customer.id FROM customers AS customer
            WHERE customer.phone = binding.customer_phone
            ORDER BY customer.created_at ASC, customer.id ASC LIMIT 1
        )
        WHERE binding.user_id IS NULL
        """
    )
    op.execute(
        "DELETE FROM zalo_bot_bindings WHERE user_id IS NULL AND customer_id IS NULL"
    )
    op.create_foreign_key(
        "fk_zalo_bot_bindings_customer", "zalo_bot_bindings", "customers",
        ["customer_id"], ["id"], ondelete="CASCADE",
    )
    op.create_unique_constraint(
        "uq_zalo_bot_bindings_customer", "zalo_bot_bindings", ["customer_id"]
    )
    op.create_check_constraint(
        "ck_zalo_bot_bindings_one_recipient", "zalo_bot_bindings",
        "(user_id IS NOT NULL AND customer_id IS NULL) OR "
        "(user_id IS NULL AND customer_id IS NOT NULL)",
    )
    op.drop_column("zalo_bot_bindings", "customer_phone")

    op.create_table(
        "zalo_link_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("principal_type", sa.String(20), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True)),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "principal_type IN ('DESIGNER', 'CUSTOMER')",
            name="ck_zalo_link_tokens_principal_type",
        ),
        sa.CheckConstraint(
            "(principal_type = 'DESIGNER' AND user_id IS NOT NULL AND customer_id IS NULL) OR "
            "(principal_type = 'CUSTOMER' AND user_id IS NULL AND customer_id IS NOT NULL)",
            name="ck_zalo_link_tokens_principal",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash", name="uq_zalo_link_tokens_hash"),
    )
    op.create_index("ix_zalo_link_tokens_user_id", "zalo_link_tokens", ["user_id"])
    op.create_index(
        "ix_zalo_link_tokens_customer_id", "zalo_link_tokens", ["customer_id"]
    )
    op.create_index(
        "ix_zalo_link_tokens_expires_at", "zalo_link_tokens", ["expires_at"]
    )


def downgrade() -> None:
    op.drop_table("zalo_link_tokens")
    op.add_column("zalo_bot_bindings", sa.Column("customer_phone", sa.String(40)))
    op.execute(
        """
        UPDATE zalo_bot_bindings AS binding
        SET customer_phone = customer.phone
        FROM customers AS customer
        WHERE binding.customer_id = customer.id
        """
    )
    op.drop_constraint(
        "ck_zalo_bot_bindings_one_recipient", "zalo_bot_bindings", type_="check"
    )
    op.drop_constraint(
        "uq_zalo_bot_bindings_customer", "zalo_bot_bindings", type_="unique"
    )
    op.drop_constraint(
        "fk_zalo_bot_bindings_customer", "zalo_bot_bindings", type_="foreignkey"
    )
    op.drop_column("zalo_bot_bindings", "zalo_display_name")
    op.drop_column("zalo_bot_bindings", "customer_id")
    op.create_unique_constraint(
        "uq_zalo_bot_bindings_customer_phone", "zalo_bot_bindings", ["customer_phone"]
    )
    op.create_check_constraint(
        "ck_zalo_bot_bindings_one_recipient", "zalo_bot_bindings",
        "(user_id IS NOT NULL AND customer_phone IS NULL) OR "
        "(user_id IS NULL AND customer_phone IS NOT NULL)",
    )

    op.drop_index(
        "ix_order_workspaces_assigned_designer_id", table_name="order_workspaces"
    )
    op.drop_constraint(
        "fk_order_workspaces_assigned_designer", "order_workspaces", type_="foreignkey"
    )
    op.drop_column("order_workspaces", "assigned_designer_id")
    op.drop_index("uq_users_phone_not_null", table_name="users")
    op.drop_column("users", "phone")

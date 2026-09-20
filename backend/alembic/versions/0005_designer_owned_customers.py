"""Make customers designer-owned and identify guest reviewers by username.

Revision ID: 0005_designer_owned_customers
Revises: 0004_guest_review_access
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0005_designer_owned_customers"
down_revision: str | None = "0004_guest_review_access"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NIL_UUID = "00000000-0000-0000-0000-000000000000"


def upgrade() -> None:
    op.add_column("customers", sa.Column("email", sa.String(320)))
    op.add_column("customers", sa.Column("phone", sa.String(40)))
    op.add_column("customers", sa.Column("created_by", postgresql.UUID(as_uuid=True)))
    op.execute(
        """
        UPDATE customers AS customer
        SET created_by = COALESCE(
            (
                SELECT workspace.created_by
                FROM order_workspaces AS workspace
                WHERE workspace.customer_id = customer.id
                ORDER BY workspace.created_at, workspace.id
                LIMIT 1
            ),
            CAST('00000000-0000-0000-0000-000000000000' AS uuid)
        )
        """
    )
    op.alter_column("customers", "created_by", nullable=False)
    op.create_foreign_key(
        "fk_customers_created_by",
        "customers",
        "users",
        ["created_by"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_table("designer_customer_assignments")
    op.drop_table("customer_users")
    op.execute("DELETE FROM workspace_memberships WHERE role <> 'DESIGNER'")
    op.drop_constraint(
        "ck_workspace_memberships_role", "workspace_memberships", type_="check"
    )
    op.create_check_constraint(
        "ck_workspace_memberships_role",
        "workspace_memberships",
        "role = 'DESIGNER'",
    )

    op.drop_index(
        "ix_workspace_guest_sessions_workspace_email",
        table_name="workspace_guest_sessions",
    )
    op.alter_column(
        "workspace_guest_sessions",
        "email",
        new_column_name="username",
        existing_type=sa.String(320),
    )
    op.alter_column(
        "workspace_guest_sessions",
        "username",
        type_=sa.String(100),
        existing_type=sa.String(320),
        postgresql_using="left(username, 100)",
    )
    op.create_index(
        "ix_workspace_guest_sessions_workspace_username",
        "workspace_guest_sessions",
        ["workspace_id", "username"],
    )

    _rename_snapshot("approvals", "reviewer_email_snapshot", "reviewer_username_snapshot")
    _rename_snapshot("comments", "author_email_snapshot", "author_username_snapshot")
    _rename_snapshot(
        "change_requests", "requester_email_snapshot", "requester_username_snapshot"
    )
    _rename_snapshot("audit_events", "actor_email_snapshot", "actor_username_snapshot")


def downgrade() -> None:
    _rename_snapshot("audit_events", "actor_username_snapshot", "actor_email_snapshot", 320)
    _rename_snapshot(
        "change_requests", "requester_username_snapshot", "requester_email_snapshot", 320
    )
    _rename_snapshot("comments", "author_username_snapshot", "author_email_snapshot", 320)
    _rename_snapshot(
        "approvals", "reviewer_username_snapshot", "reviewer_email_snapshot", 320
    )

    op.drop_index(
        "ix_workspace_guest_sessions_workspace_username",
        table_name="workspace_guest_sessions",
    )
    op.alter_column(
        "workspace_guest_sessions",
        "username",
        type_=sa.String(320),
        existing_type=sa.String(100),
    )
    op.alter_column(
        "workspace_guest_sessions",
        "username",
        new_column_name="email",
        existing_type=sa.String(320),
    )
    op.create_index(
        "ix_workspace_guest_sessions_workspace_email",
        "workspace_guest_sessions",
        ["workspace_id", "email"],
    )

    op.drop_constraint(
        "ck_workspace_memberships_role", "workspace_memberships", type_="check"
    )
    op.create_check_constraint(
        "ck_workspace_memberships_role",
        "workspace_memberships",
        "role IN ('ADMIN', 'DESIGNER', 'CUSTOMER')",
    )

    op.create_table(
        "customer_users",
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("customers.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.CheckConstraint("status IN ('ACTIVE', 'INACTIVE')", name="ck_customer_users_status"),
        sa.UniqueConstraint("customer_id", "user_id", name="uq_customer_users_pair"),
    )
    op.create_table(
        "designer_customer_assignments",
        sa.Column(
            "designer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("customers.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "assigned_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE')",
            name="ck_designer_customer_assignments_status",
        ),
        sa.UniqueConstraint(
            "designer_id", "customer_id", name="uq_designer_customer_assignments_pair"
        ),
    )

    op.drop_constraint("fk_customers_created_by", "customers", type_="foreignkey")
    op.drop_column("customers", "created_by")
    op.drop_column("customers", "phone")
    op.drop_column("customers", "email")


def _rename_snapshot(
    table: str, old_name: str, new_name: str, target_length: int = 100
) -> None:
    existing_length = 100 if target_length == 320 else 320
    op.alter_column(
        table,
        old_name,
        new_column_name=new_name,
        existing_type=sa.String(existing_length),
    )
    op.alter_column(
        table,
        new_name,
        type_=sa.String(target_length),
        existing_type=sa.String(existing_length),
        postgresql_using=(
            f"left({new_name}, {target_length})" if target_length < existing_length else None
        ),
    )

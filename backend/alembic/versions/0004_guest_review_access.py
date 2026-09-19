"""Add rotatable workspace review links and guest reviewer sessions.

Revision ID: 0004_guest_review_access
Revises: 0003_authentication
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004_guest_review_access"
down_revision: str | None = "0003_authentication"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workspace_review_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("order_workspaces.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "disabled_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
        ),
        sa.Column("disabled_at", sa.DateTime(timezone=True)),
        sa.Column("disabled_reason", sa.Text()),
        sa.Column("replaced_by_link_id", postgresql.UUID(as_uuid=True)),
        sa.CheckConstraint("version > 0", name="ck_workspace_review_links_version"),
        sa.CheckConstraint(
            "status IN ('ACTIVE', 'DISABLED')", name="ck_workspace_review_links_status"
        ),
        sa.CheckConstraint(
            "(status = 'ACTIVE' AND disabled_at IS NULL AND disabled_by IS NULL) OR "
            "(status = 'DISABLED' AND disabled_at IS NOT NULL AND disabled_by IS NOT NULL)",
            name="ck_workspace_review_links_disabled_fields",
        ),
        sa.UniqueConstraint(
            "workspace_id", "version", name="uq_workspace_review_links_version"
        ),
        sa.UniqueConstraint(
            "id", "workspace_id", name="uq_workspace_review_links_id_workspace"
        ),
    )
    op.create_foreign_key(
        "fk_workspace_review_links_replacement",
        "workspace_review_links",
        "workspace_review_links",
        ["replaced_by_link_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "uq_workspace_review_links_one_active",
        "workspace_review_links",
        ["workspace_id"],
        unique=True,
        postgresql_where=sa.text("status = 'ACTIVE'"),
    )

    op.create_table(
        "workspace_guest_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("review_link_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "status IN ('ACTIVE', 'REVOKED', 'EXPIRED')",
            name="ck_workspace_guest_sessions_status",
        ),
        sa.CheckConstraint(
            "(status = 'ACTIVE' AND revoked_at IS NULL) OR "
            "(status <> 'ACTIVE' AND revoked_at IS NOT NULL)",
            name="ck_workspace_guest_sessions_revoked_at",
        ),
        sa.ForeignKeyConstraint(
            ["review_link_id", "workspace_id"],
            ["workspace_review_links.id", "workspace_review_links.workspace_id"],
            name="fk_workspace_guest_sessions_link_same_workspace",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("token_hash", name="uq_workspace_guest_sessions_token_hash"),
    )
    op.create_index(
        "ix_workspace_guest_sessions_workspace_email",
        "workspace_guest_sessions",
        ["workspace_id", "email"],
    )

    op.add_column("approvals", sa.Column("guest_session_id", postgresql.UUID(as_uuid=True)))
    op.add_column("approvals", sa.Column("reviewer_email_snapshot", sa.String(320)))
    op.add_column("approvals", sa.Column("review_link_version", sa.Integer()))
    op.alter_column("approvals", "approver_id", existing_type=postgresql.UUID(), nullable=True)
    op.create_foreign_key(
        "fk_approvals_guest_session",
        "approvals",
        "workspace_guest_sessions",
        ["guest_session_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_check_constraint(
        "ck_approvals_exactly_one_actor",
        "approvals",
        "(approver_id IS NOT NULL AND guest_session_id IS NULL) OR "
        "(approver_id IS NULL AND guest_session_id IS NOT NULL)",
    )
    op.create_check_constraint(
        "ck_approvals_guest_snapshot",
        "approvals",
        "guest_session_id IS NULL OR "
        "(reviewer_email_snapshot IS NOT NULL AND review_link_version IS NOT NULL)",
    )

    op.add_column("comments", sa.Column("guest_session_id", postgresql.UUID(as_uuid=True)))
    op.add_column("comments", sa.Column("author_email_snapshot", sa.String(320)))
    op.alter_column("comments", "author_id", existing_type=postgresql.UUID(), nullable=True)
    op.create_foreign_key(
        "fk_comments_guest_session",
        "comments",
        "workspace_guest_sessions",
        ["guest_session_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_check_constraint(
        "ck_comments_exactly_one_actor",
        "comments",
        "(author_id IS NOT NULL AND guest_session_id IS NULL) OR "
        "(author_id IS NULL AND guest_session_id IS NOT NULL)",
    )

    op.add_column(
        "change_requests",
        sa.Column("requested_by_guest_session_id", postgresql.UUID(as_uuid=True)),
    )
    op.add_column("change_requests", sa.Column("requester_email_snapshot", sa.String(320)))
    op.alter_column(
        "change_requests", "requested_by", existing_type=postgresql.UUID(), nullable=True
    )
    op.create_foreign_key(
        "fk_change_requests_guest_session",
        "change_requests",
        "workspace_guest_sessions",
        ["requested_by_guest_session_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_check_constraint(
        "ck_change_requests_exactly_one_requester",
        "change_requests",
        "(requested_by IS NOT NULL AND requested_by_guest_session_id IS NULL) OR "
        "(requested_by IS NULL AND requested_by_guest_session_id IS NOT NULL)",
    )

    op.add_column("audit_events", sa.Column("guest_session_id", postgresql.UUID(as_uuid=True)))
    op.add_column("audit_events", sa.Column("actor_email_snapshot", sa.String(320)))
    op.alter_column("audit_events", "actor_id", existing_type=postgresql.UUID(), nullable=True)
    op.create_foreign_key(
        "fk_audit_events_guest_session",
        "audit_events",
        "workspace_guest_sessions",
        ["guest_session_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_check_constraint(
        "ck_audit_events_exactly_one_actor",
        "audit_events",
        "(actor_id IS NOT NULL AND guest_session_id IS NULL) OR "
        "(actor_id IS NULL AND guest_session_id IS NOT NULL)",
    )


def downgrade() -> None:
    op.execute("DELETE FROM audit_events WHERE actor_id IS NULL")
    op.drop_constraint("ck_audit_events_exactly_one_actor", "audit_events", type_="check")
    op.drop_constraint("fk_audit_events_guest_session", "audit_events", type_="foreignkey")
    op.alter_column("audit_events", "actor_id", existing_type=postgresql.UUID(), nullable=False)
    op.drop_column("audit_events", "actor_email_snapshot")
    op.drop_column("audit_events", "guest_session_id")

    op.execute("DELETE FROM change_requests WHERE requested_by IS NULL")
    op.drop_constraint(
        "ck_change_requests_exactly_one_requester", "change_requests", type_="check"
    )
    op.drop_constraint(
        "fk_change_requests_guest_session", "change_requests", type_="foreignkey"
    )
    op.alter_column(
        "change_requests", "requested_by", existing_type=postgresql.UUID(), nullable=False
    )
    op.drop_column("change_requests", "requester_email_snapshot")
    op.drop_column("change_requests", "requested_by_guest_session_id")

    op.execute("DELETE FROM comments WHERE author_id IS NULL")
    op.drop_constraint("ck_comments_exactly_one_actor", "comments", type_="check")
    op.drop_constraint("fk_comments_guest_session", "comments", type_="foreignkey")
    op.alter_column("comments", "author_id", existing_type=postgresql.UUID(), nullable=False)
    op.drop_column("comments", "author_email_snapshot")
    op.drop_column("comments", "guest_session_id")

    op.execute("DELETE FROM approvals WHERE approver_id IS NULL")
    op.drop_constraint("ck_approvals_guest_snapshot", "approvals", type_="check")
    op.drop_constraint("ck_approvals_exactly_one_actor", "approvals", type_="check")
    op.drop_constraint("fk_approvals_guest_session", "approvals", type_="foreignkey")
    op.alter_column("approvals", "approver_id", existing_type=postgresql.UUID(), nullable=False)
    op.drop_column("approvals", "review_link_version")
    op.drop_column("approvals", "reviewer_email_snapshot")
    op.drop_column("approvals", "guest_session_id")

    op.drop_index(
        "ix_workspace_guest_sessions_workspace_email",
        table_name="workspace_guest_sessions",
    )
    op.drop_table("workspace_guest_sessions")
    op.drop_index("uq_workspace_review_links_one_active", table_name="workspace_review_links")
    op.drop_constraint(
        "fk_workspace_review_links_replacement",
        "workspace_review_links",
        type_="foreignkey",
    )
    op.drop_table("workspace_review_links")

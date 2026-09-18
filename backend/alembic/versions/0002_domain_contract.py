"""Align the database schema with the approved ProofPrint domain contract.

Revision ID: 0002_domain_contract
Revises: 0001_initial
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002_domain_contract"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NIL_UUID = "00000000-0000-0000-0000-000000000000"


def _uuid(name: str) -> sa.Column:
    return sa.Column(name, postgresql.UUID(as_uuid=True))


def upgrade() -> None:
    # Identity and authorization tables are created first so legacy business rows can
    # be backfilled before their new foreign keys are enabled.
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("system_role", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "system_role IN ('ADMIN', 'DESIGNER', 'CUSTOMER')",
            name="ck_users_system_role",
        ),
        sa.CheckConstraint("status IN ('ACTIVE', 'DISABLED')", name="ck_users_status"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("code", sa.String(80), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("status IN ('ACTIVE', 'ARCHIVED')", name="ck_customers_status"),
        sa.UniqueConstraint("code", name="uq_customers_code"),
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
            "status IN ('ACTIVE', 'INACTIVE')", name="ck_designer_customer_assignments_status"
        ),
        sa.UniqueConstraint(
            "designer_id", "customer_id", name="uq_designer_customer_assignments_pair"
        ),
    )

    # A deterministic migration actor preserves NOT NULL/FK guarantees for rows
    # created before authentication existed.
    op.execute(
        sa.text(
            """
            INSERT INTO users (id, email, display_name, system_role, status)
            VALUES (CAST(:id AS uuid), 'migration@proofprint.invalid',
                    'Legacy migration actor', 'ADMIN', 'DISABLED')
            ON CONFLICT (id) DO NOTHING
            """
        ).bindparams(id=NIL_UUID)
    )
    op.execute(
        """
        INSERT INTO users (id, email, display_name, system_role, status)
        SELECT DISTINCT approver_id,
               'legacy-' || replace(approver_id::text, '-', '') || '@proofprint.invalid',
               'Legacy customer reviewer', 'CUSTOMER', 'DISABLED'
        FROM approvals
        WHERE approver_id IS NOT NULL
        ON CONFLICT (id) DO NOTHING
        """
    )
    op.execute(
        """
        INSERT INTO customers (id, name, code, status)
        SELECT DISTINCT customer_id,
               'Legacy customer ' || left(customer_id::text, 8),
               'legacy-' || replace(customer_id::text, '-', ''),
               'ACTIVE'
        FROM order_workspaces
        ON CONFLICT (id) DO NOTHING
        """
    )

    op.alter_column("order_workspaces", "status", new_column_name="workflow_status")
    op.execute("UPDATE order_workspaces SET workflow_status = upper(workflow_status)")
    op.add_column(
        "order_workspaces",
        sa.Column("record_status", sa.String(20), nullable=False, server_default="ACTIVE"),
    )
    op.add_column("order_workspaces", _uuid("latest_version_id"))
    op.add_column(
        "order_workspaces",
        sa.Column("revision", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "order_workspaces",
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=NIL_UUID,
        ),
    )
    op.add_column(
        "order_workspaces",
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.add_column(
        "order_workspaces",
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_check_constraint(
        "ck_order_workspaces_workflow_status",
        "order_workspaces",
        "workflow_status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'LOCKED_FOR_PRODUCTION')",
    )
    op.create_check_constraint(
        "ck_order_workspaces_record_status",
        "order_workspaces",
        "record_status IN ('ACTIVE', 'ARCHIVED', 'CANCELLED')",
    )
    op.create_check_constraint(
        "ck_order_workspaces_revision", "order_workspaces", "revision >= 0"
    )
    op.create_foreign_key(
        "fk_order_workspaces_customer",
        "order_workspaces",
        "customers",
        ["customer_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_order_workspaces_created_by",
        "order_workspaces",
        "users",
        ["created_by"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.alter_column("order_workspaces", "created_by", server_default=None)

    op.alter_column("specification_blocks", "order_id", new_column_name="workspace_id")
    op.add_column(
        "specification_blocks",
        sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"),
    )
    for column_name in ("created_by", "updated_by"):
        op.add_column(
            "specification_blocks",
            sa.Column(
                column_name,
                postgresql.UUID(as_uuid=True),
                nullable=False,
                server_default=NIL_UUID,
            ),
        )
        op.create_foreign_key(
            f"fk_specification_blocks_{column_name}",
            "specification_blocks",
            "users",
            [column_name],
            ["id"],
            ondelete="RESTRICT",
        )
    for column_name in ("created_at", "updated_at"):
        op.add_column(
            "specification_blocks",
            sa.Column(
                column_name,
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
        )
    for column_name in ("created_by", "updated_by"):
        op.alter_column("specification_blocks", column_name, server_default=None)
    op.create_check_constraint(
        "ck_specification_blocks_position", "specification_blocks", "position >= 0"
    )
    op.create_check_constraint(
        "ck_specification_blocks_schema_version", "specification_blocks", "schema_version > 0"
    )
    op.create_unique_constraint(
        "uq_specification_blocks_id_workspace", "specification_blocks", ["id", "workspace_id"]
    )

    op.alter_column("specification_versions", "order_id", new_column_name="workspace_id")
    op.add_column("specification_versions", _uuid("previous_version_id"))
    op.add_column(
        "specification_versions", sa.Column("content_hash", sa.String(64), nullable=True)
    )
    op.add_column(
        "specification_versions",
        sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "specification_versions",
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=NIL_UUID,
        ),
    )
    op.execute(
        """
        WITH numbered AS (
            SELECT id,
                   lag(id) OVER (PARTITION BY workspace_id ORDER BY number) AS previous_id
            FROM specification_versions
        )
        UPDATE specification_versions AS version
        SET previous_version_id = numbered.previous_id,
            content_hash = encode(sha256(convert_to(version.snapshot::text, 'UTF8')), 'hex')
        FROM numbered
        WHERE numbered.id = version.id
        """
    )
    op.alter_column("specification_versions", "content_hash", nullable=False)
    op.create_check_constraint(
        "ck_specification_versions_number", "specification_versions", "number > 0"
    )
    op.create_check_constraint(
        "ck_specification_versions_schema_version",
        "specification_versions",
        "schema_version > 0",
    )
    op.create_unique_constraint(
        "uq_specification_versions_id_workspace",
        "specification_versions",
        ["id", "workspace_id"],
    )
    op.create_foreign_key(
        "fk_specification_versions_previous_same_workspace",
        "specification_versions",
        "specification_versions",
        ["previous_version_id", "workspace_id"],
        ["id", "workspace_id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_specification_versions_created_by",
        "specification_versions",
        "users",
        ["created_by"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.alter_column("specification_versions", "created_by", server_default=None)
    op.execute(
        """
        UPDATE order_workspaces AS workspace
        SET latest_version_id = latest.id
        FROM (
            SELECT DISTINCT ON (workspace_id) workspace_id, id
            FROM specification_versions
            ORDER BY workspace_id, number DESC
        ) AS latest
        WHERE latest.workspace_id = workspace.id
        """
    )
    for column_name in ("latest_version_id", "approved_version_id", "production_version_id"):
        op.create_foreign_key(
            f"fk_order_workspaces_{column_name}_same_workspace",
            "order_workspaces",
            "specification_versions",
            [column_name, "id"],
            ["id", "workspace_id"],
            ondelete="RESTRICT",
        )

    op.create_table(
        "workspace_memberships",
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("order_workspaces.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("can_view", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("can_edit", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("can_review", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("can_approve", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "can_lock_production", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.CheckConstraint(
            "role IN ('ADMIN', 'DESIGNER', 'CUSTOMER')", name="ck_workspace_memberships_role"
        ),
        sa.CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE')", name="ck_workspace_memberships_status"
        ),
        sa.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_memberships_pair"),
    )

    op.create_table(
        "review_rounds",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True)),
        sa.Column("decided_by", postgresql.UUID(as_uuid=True)),
        sa.Column("decision_note", sa.Text()),
        sa.CheckConstraint(
            "status IN ('OPEN', 'APPROVED', 'CHANGES_REQUESTED', 'CANCELLED')",
            name="ck_review_rounds_status",
        ),
        sa.CheckConstraint(
            "(status = 'OPEN' AND closed_at IS NULL) OR "
            "(status <> 'OPEN' AND closed_at IS NOT NULL)",
            name="ck_review_rounds_closed_at",
        ),
        sa.ForeignKeyConstraint(
            ["version_id", "workspace_id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_review_rounds_version_same_workspace",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["decided_by"], ["users.id"], name="fk_review_rounds_decided_by", ondelete="RESTRICT"
        ),
        sa.UniqueConstraint("version_id", name="uq_review_rounds_version"),
        sa.UniqueConstraint("id", "workspace_id", name="uq_review_rounds_id_workspace"),
    )
    op.create_index(
        "uq_review_rounds_one_open_per_workspace",
        "review_rounds",
        ["workspace_id"],
        unique=True,
        postgresql_where=sa.text("status = 'OPEN'"),
    )
    op.execute(
        """
        INSERT INTO review_rounds
            (id, workspace_id, version_id, status, opened_at, closed_at, decided_by,
             decision_note)
        SELECT (
                   substr(md5('review-round:' || version.id::text), 1, 8) || '-' ||
                   substr(md5('review-round:' || version.id::text), 9, 4) || '-' ||
                   substr(md5('review-round:' || version.id::text), 13, 4) || '-' ||
                   substr(md5('review-round:' || version.id::text), 17, 4) || '-' ||
                   substr(md5('review-round:' || version.id::text), 21, 12)
               )::uuid,
               version.workspace_id,
               version.id,
               CASE
                   WHEN approval.id IS NOT NULL THEN 'APPROVED'
                   WHEN workspace.workflow_status = 'IN_REVIEW'
                        AND workspace.latest_version_id = version.id THEN 'OPEN'
                   ELSE 'CANCELLED'
               END,
               version.created_at,
               CASE
                   WHEN approval.id IS NOT NULL THEN approval.created_at
                   WHEN workspace.workflow_status = 'IN_REVIEW'
                        AND workspace.latest_version_id = version.id THEN NULL
                   ELSE version.created_at
               END,
               approval.approver_id,
               'Backfilled by 0002_domain_contract'
        FROM specification_versions AS version
        JOIN order_workspaces AS workspace ON workspace.id = version.workspace_id
        LEFT JOIN LATERAL (
            SELECT id, approver_id, created_at
            FROM approvals
            WHERE version_id = version.id
            ORDER BY created_at, id
            LIMIT 1
        ) AS approval ON true
        """
    )

    op.alter_column("approvals", "order_id", new_column_name="workspace_id")
    op.drop_constraint("approvals_order_id_fkey", "approvals", type_="foreignkey")
    op.add_column("approvals", _uuid("review_round_id"))
    op.execute(
        """
        UPDATE approvals AS approval
        SET review_round_id = review.id
        FROM review_rounds AS review
        WHERE review.version_id = approval.version_id
        """
    )
    op.alter_column("approvals", "review_round_id", nullable=False)
    op.create_unique_constraint("uq_approvals_version", "approvals", ["version_id"])
    op.create_unique_constraint(
        "uq_approvals_id_workspace", "approvals", ["id", "workspace_id"]
    )
    op.create_foreign_key(
        "fk_approvals_workspace",
        "approvals",
        "order_workspaces",
        ["workspace_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_approvals_review_same_workspace",
        "approvals",
        "review_rounds",
        ["review_round_id", "workspace_id"],
        ["id", "workspace_id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_approvals_version_same_workspace",
        "approvals",
        "specification_versions",
        ["version_id", "workspace_id"],
        ["id", "workspace_id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_approvals_approver",
        "approvals",
        "users",
        ["approver_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.create_table(
        "change_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("review_round_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("block_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_path", sa.String(500)),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("acknowledged_by", postgresql.UUID(as_uuid=True)),
        sa.Column("resolved_in_version_id", postgresql.UUID(as_uuid=True)),
        sa.Column("parent_change_request_id", postgresql.UUID(as_uuid=True)),
        sa.Column("resolution_note", sa.Text()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "status IN ('REQUESTED', 'ACKNOWLEDGED', 'UPDATED', 'CONFIRMED', "
            "'REOPENED', 'REJECTED', 'CANCELLED')",
            name="ck_change_requests_status",
        ),
        sa.CheckConstraint(
            "status <> 'UPDATED' OR resolved_in_version_id IS NOT NULL",
            name="ck_change_requests_updated_has_version",
        ),
        sa.ForeignKeyConstraint(
            ["review_round_id", "workspace_id"],
            ["review_rounds.id", "review_rounds.workspace_id"],
            name="fk_change_requests_review_same_workspace",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["version_id", "workspace_id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_change_requests_version_same_workspace",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["block_id", "workspace_id"],
            ["specification_blocks.id", "specification_blocks.workspace_id"],
            name="fk_change_requests_block_same_workspace",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["resolved_in_version_id", "workspace_id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_change_requests_resolution_version_same_workspace",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["requested_by"], ["users.id"], name="fk_change_requests_requested_by"
        ),
        sa.ForeignKeyConstraint(
            ["acknowledged_by"], ["users.id"], name="fk_change_requests_acknowledged_by"
        ),
        sa.ForeignKeyConstraint(
            ["parent_change_request_id"],
            ["change_requests.id"],
            name="fk_change_requests_parent",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("id", "workspace_id", name="uq_change_requests_id_workspace"),
    )
    op.create_index(
        "ix_change_requests_review_status", "change_requests", ["review_round_id", "status"]
    )

    op.create_table(
        "comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_id", postgresql.UUID(as_uuid=True)),
        sa.Column("block_id", postgresql.UUID(as_uuid=True)),
        sa.Column("change_request_id", postgresql.UUID(as_uuid=True)),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["order_workspaces.id"], name="fk_comments_workspace"
        ),
        sa.ForeignKeyConstraint(
            ["version_id", "workspace_id"],
            ["specification_versions.id", "specification_versions.workspace_id"],
            name="fk_comments_version_same_workspace",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["block_id", "workspace_id"],
            ["specification_blocks.id", "specification_blocks.workspace_id"],
            name="fk_comments_block_same_workspace",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["change_request_id", "workspace_id"],
            ["change_requests.id", "change_requests.workspace_id"],
            name="fk_comments_change_request_same_workspace",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], name="fk_comments_author"),
    )

    op.create_table(
        "assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("order_workspaces.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("storage_key", sa.String(1024), nullable=False),
        sa.Column("original_filename", sa.String(500), nullable=False),
        sa.Column("content_type", sa.String(255), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("checksum", sa.String(128), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column(
            "uploaded_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("size_bytes >= 0", name="ck_assets_size_bytes"),
        sa.CheckConstraint(
            "status IN ('UPLOADING', 'READY', 'REJECTED')", name="ck_assets_status"
        ),
        sa.UniqueConstraint("storage_key", name="uq_assets_storage_key"),
    )

    op.create_table(
        "audit_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("order_workspaces.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "actor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("specification_versions.id", ondelete="RESTRICT"),
        ),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_audit_events_workspace_created_at", "audit_events", ["workspace_id", "created_at"]
    )

    op.create_table(
        "outbox_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("processed_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')",
            name="ck_outbox_messages_status",
        ),
    )
    op.create_index(
        "ix_outbox_messages_pending",
        "outbox_messages",
        ["created_at"],
        postgresql_where=sa.text("status IN ('PENDING', 'FAILED')"),
    )


def downgrade() -> None:
    op.drop_index("ix_outbox_messages_pending", table_name="outbox_messages")
    op.drop_table("outbox_messages")
    op.drop_index("ix_audit_events_workspace_created_at", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_table("assets")
    op.drop_table("comments")
    op.drop_index("ix_change_requests_review_status", table_name="change_requests")
    op.drop_table("change_requests")

    op.drop_constraint("fk_approvals_approver", "approvals", type_="foreignkey")
    op.drop_constraint("fk_approvals_version_same_workspace", "approvals", type_="foreignkey")
    op.drop_constraint("fk_approvals_review_same_workspace", "approvals", type_="foreignkey")
    op.drop_constraint("fk_approvals_workspace", "approvals", type_="foreignkey")
    op.drop_constraint("uq_approvals_id_workspace", "approvals", type_="unique")
    op.drop_constraint("uq_approvals_version", "approvals", type_="unique")
    op.drop_column("approvals", "review_round_id")
    op.alter_column("approvals", "workspace_id", new_column_name="order_id")
    op.create_foreign_key(
        "approvals_order_id_fkey",
        "approvals",
        "order_workspaces",
        ["order_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_index("uq_review_rounds_one_open_per_workspace", table_name="review_rounds")
    op.drop_table("review_rounds")
    op.drop_table("workspace_memberships")

    for column_name in ("latest_version_id", "approved_version_id", "production_version_id"):
        op.drop_constraint(
            f"fk_order_workspaces_{column_name}_same_workspace",
            "order_workspaces",
            type_="foreignkey",
        )
    op.drop_constraint(
        "fk_specification_versions_created_by", "specification_versions", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_specification_versions_previous_same_workspace",
        "specification_versions",
        type_="foreignkey",
    )
    op.drop_constraint(
        "uq_specification_versions_id_workspace", "specification_versions", type_="unique"
    )
    op.drop_constraint(
        "ck_specification_versions_schema_version", "specification_versions", type_="check"
    )
    op.drop_constraint(
        "ck_specification_versions_number", "specification_versions", type_="check"
    )
    op.drop_column("specification_versions", "created_by")
    op.drop_column("specification_versions", "schema_version")
    op.drop_column("specification_versions", "content_hash")
    op.drop_column("specification_versions", "previous_version_id")
    op.alter_column("specification_versions", "workspace_id", new_column_name="order_id")

    op.drop_constraint(
        "uq_specification_blocks_id_workspace", "specification_blocks", type_="unique"
    )
    op.drop_constraint(
        "ck_specification_blocks_schema_version", "specification_blocks", type_="check"
    )
    op.drop_constraint(
        "ck_specification_blocks_position", "specification_blocks", type_="check"
    )
    for column_name in ("created_by", "updated_by"):
        op.drop_constraint(
            f"fk_specification_blocks_{column_name}",
            "specification_blocks",
            type_="foreignkey",
        )
    for column_name in ("updated_at", "created_at", "updated_by", "created_by", "schema_version"):
        op.drop_column("specification_blocks", column_name)
    op.alter_column("specification_blocks", "workspace_id", new_column_name="order_id")

    op.drop_constraint("fk_order_workspaces_created_by", "order_workspaces", type_="foreignkey")
    op.drop_constraint("fk_order_workspaces_customer", "order_workspaces", type_="foreignkey")
    op.drop_constraint("ck_order_workspaces_revision", "order_workspaces", type_="check")
    op.drop_constraint("ck_order_workspaces_record_status", "order_workspaces", type_="check")
    op.drop_constraint(
        "ck_order_workspaces_workflow_status", "order_workspaces", type_="check"
    )
    for column_name in (
        "updated_at",
        "created_at",
        "created_by",
        "revision",
        "latest_version_id",
        "record_status",
    ):
        op.drop_column("order_workspaces", column_name)
    op.execute("UPDATE order_workspaces SET workflow_status = lower(workflow_status)")
    op.alter_column("order_workspaces", "workflow_status", new_column_name="status")

    op.drop_table("designer_customer_assignments")
    op.drop_table("customer_users")
    op.drop_table("customers")
    op.drop_table("users")

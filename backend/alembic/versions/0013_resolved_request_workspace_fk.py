"""Keep a resolved request linked to a version of its workspace.

Revision ID: 0013_resolved_request_fk
Revises: 0012_resolved_draft_requests
"""

from alembic import op

revision = "0013_resolved_request_fk"
down_revision = "0012_resolved_draft_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("fk_comments_resolved_in_version", "comments", type_="foreignkey")
    op.create_foreign_key(
        "fk_comments_resolved_version_same_workspace",
        "comments",
        "specification_versions",
        ["resolved_in_version_id", "workspace_id"],
        ["id", "workspace_id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_comments_resolved_version_same_workspace", "comments", type_="foreignkey"
    )
    op.create_foreign_key(
        "fk_comments_resolved_in_version",
        "comments",
        "specification_versions",
        ["resolved_in_version_id"],
        ["id"],
        ondelete="RESTRICT",
    )

"""Record the version that resolves each draft customer request.

Revision ID: 0012_resolved_draft_requests
Revises: 0011_customer_request_batches
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0012_resolved_draft_requests"
down_revision = "0011_customer_request_batches"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "comments",
        sa.Column("resolved_in_version_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_comments_resolved_in_version",
        "comments",
        "specification_versions",
        ["resolved_in_version_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint("fk_comments_resolved_in_version", "comments", type_="foreignkey")
    op.drop_column("comments", "resolved_in_version_id")

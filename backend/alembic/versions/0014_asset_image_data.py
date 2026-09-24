"""Store designer uploaded image bytes for workspace previews.

Revision ID: 0014_asset_image_data
Revises: 0013_resolved_request_fk
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0014_asset_image_data"
down_revision = "0013_resolved_request_fk"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "asset_image_data",
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("asset_id"),
    )


def downgrade() -> None:
    op.drop_table("asset_image_data")

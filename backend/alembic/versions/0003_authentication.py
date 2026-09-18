"""Add password credentials for first-party authentication.

Revision ID: 0003_authentication
Revises: 0002_domain_contract
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003_authentication"
down_revision: str | None = "0002_domain_contract"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "uq_users_email_ci",
        "users",
        [sa.text("lower(email)")],
        unique=True,
    )
    op.create_table(
        "user_credentials",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column(
            "must_change_password", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column(
            "password_changed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )


def downgrade() -> None:
    op.drop_table("user_credentials")
    op.drop_index("uq_users_email_ci", table_name="users")

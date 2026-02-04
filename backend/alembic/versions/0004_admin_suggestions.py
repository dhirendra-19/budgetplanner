"""add admin and suggestions

Revision ID: 0004_admin_suggestions
Revises: 0003_income_sources_limits
Create Date: 2026-02-02
"""

from alembic import op
import sqlalchemy as sa

revision = "0004_admin_suggestions"
down_revision = "0003_income_sources_limits"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="0"))

    op.create_table(
        "suggestions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )


def downgrade() -> None:
    op.drop_table("suggestions")
    op.drop_column("users", "is_admin")

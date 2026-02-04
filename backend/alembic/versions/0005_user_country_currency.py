"""add country and currency to users

Revision ID: 0005_user_country_currency
Revises: 0004_admin_suggestions
Create Date: 2026-02-02
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_user_country_currency"
down_revision = "0004_admin_suggestions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("country", sa.String(length=40), nullable=False, server_default="USA"))
    op.add_column("users", sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"))


def downgrade() -> None:
    op.drop_column("users", "currency")
    op.drop_column("users", "country")

"""add other income to budget months

Revision ID: 0002_add_other_income
Revises: 0001_create_tables
Create Date: 2026-01-31
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_add_other_income"
down_revision = "0001_create_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("budget_months", sa.Column("other_income", sa.Float(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("budget_months", "other_income")

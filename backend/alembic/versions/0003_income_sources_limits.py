"""add income sources and category limits

Revision ID: 0003_income_sources_limits
Revises: 0002_add_other_income
Create Date: 2026-01-31
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_income_sources_limits"
down_revision = "0002_add_other_income"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "budget_income_sources",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("budget_month_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["budget_month_id"], ["budget_months.id"]),
    )

    op.create_table(
        "category_limits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("monthly_limit", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
    )


def downgrade() -> None:
    op.drop_table("category_limits")
    op.drop_table("budget_income_sources")

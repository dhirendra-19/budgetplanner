"""add password reset requests

Revision ID: 0006_password_resets
Revises: 0005_user_country_currency
Create Date: 2026-02-02
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_password_resets"
down_revision = "0005_user_country_currency"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "password_reset_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )


def downgrade() -> None:
    op.drop_table("password_reset_requests")

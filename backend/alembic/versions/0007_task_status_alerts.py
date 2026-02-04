"""add task status and alerts

Revision ID: 0007_task_status_alerts
Revises: 0006_password_resets
Create Date: 2026-02-04
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0007_task_status_alerts"
down_revision = "0006_password_resets"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("tasks", sa.Column("status", sa.String(length=20), server_default="pending", nullable=False))
    op.add_column("tasks", sa.Column("alert_offset_minutes", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("alert_channel", sa.String(length=20), server_default="app", nullable=False))
    op.add_column("tasks", sa.Column("alert_email", sa.String(length=200), nullable=True))
    op.add_column("tasks", sa.Column("alert_phone", sa.String(length=40), nullable=True))
    op.add_column("tasks", sa.Column("last_alerted_at", sa.DateTime(), nullable=True))

    op.execute("UPDATE tasks SET status = 'completed' WHERE is_completed = 1")
    op.execute("UPDATE tasks SET status = 'pending' WHERE is_completed = 0")

    op.alter_column("tasks", "status", server_default=None)
    op.alter_column("tasks", "alert_channel", server_default=None)


def downgrade():
    op.drop_column("tasks", "last_alerted_at")
    op.drop_column("tasks", "alert_phone")
    op.drop_column("tasks", "alert_email")
    op.drop_column("tasks", "alert_channel")
    op.drop_column("tasks", "alert_offset_minutes")
    op.drop_column("tasks", "status")

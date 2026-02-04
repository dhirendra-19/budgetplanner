"""add task alert time

Revision ID: 0008_task_alert_time
Revises: 0007_task_status_alerts
Create Date: 2026-02-04
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0008_task_alert_time"
down_revision = "0007_task_status_alerts"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("tasks", sa.Column("alert_time", sa.Time(), nullable=True))


def downgrade():
    op.drop_column("tasks", "alert_time")

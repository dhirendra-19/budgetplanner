from __future__ import annotations

from datetime import datetime, time, timedelta

from app import models
from app.db import SessionLocal

VALID_STATUSES = {"pending", "in_progress", "completed", "overdue"}


def process_task_alerts(db, user_id: int | None = None, now: datetime | None = None) -> int:
    now = now or datetime.utcnow()
    today = now.date()
    sent_count = 0

    query = db.query(models.Task)
    if user_id is not None:
        query = query.filter(models.Task.user_id == user_id)

    tasks = (
        query.filter(models.Task.due_date.isnot(None))
        .filter(models.Task.status != "completed")
        .all()
    )

    for task in tasks:
        if task.status not in VALID_STATUSES:
            task.status = "pending"

        if task.due_date and task.due_date < today and task.status != "overdue":
            task.status = "overdue"
            task.is_completed = False

        if task.alert_offset_minutes is None:
            continue

        base_time = task.alert_time or time(hour=9, minute=0)
        notify_at = datetime.combine(task.due_date, base_time) - timedelta(
            minutes=task.alert_offset_minutes
        )
        if now < notify_at:
            continue
        if task.last_alerted_at and task.last_alerted_at >= notify_at:
            continue

        message = f"Task alert: '{task.title}' due {task.due_date}"
        alert = models.Alert(
            user_id=task.user_id,
            category_id=None,
            year=task.due_date.year if task.due_date else today.year,
            month=task.due_date.month if task.due_date else today.month,
            code="TASK_ALERT",
            level="warning" if task.status == "overdue" else "info",
            message=message,
        )
        db.add(alert)
        task.last_alerted_at = now
        sent_count += 1

    db.commit()
    return sent_count


def run_task_alerts() -> None:
    db = SessionLocal()
    try:
        process_task_alerts(db)
    finally:
        db.close()

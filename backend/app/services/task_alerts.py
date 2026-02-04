from __future__ import annotations

from datetime import datetime, time, timedelta

from app import models
from app.core.config import get_settings
from app.db import SessionLocal
from app.services.notifications import send_email, send_sms

VALID_STATUSES = {"pending", "in_progress", "completed", "overdue"}


def process_task_alerts(db, user_id: int | None = None, now: datetime | None = None) -> int:
    now = now or datetime.utcnow()
    today = now.date()
    settings = get_settings()
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

        notify_at = datetime.combine(task.due_date, time.min) - timedelta(
            minutes=task.alert_offset_minutes
        )
        if now < notify_at:
            continue
        if task.last_alerted_at and task.last_alerted_at >= notify_at:
            continue

        channel = task.alert_channel or "app"
        destination = ""
        sent = False
        if channel == "sms" and task.alert_phone:
            result = send_sms(task.alert_phone, f"Task reminder: {task.title} due {task.due_date}")
            sent = result.sent
            destination = f" via SMS to {task.alert_phone}"
        elif channel == "email" and task.alert_email:
            result = send_email(
                task.alert_email,
                "Task reminder",
                f"Your task '{task.title}' is due {task.due_date}.",
            )
            sent = result.sent
            destination = f" via email to {task.alert_email}"
        elif channel != "app":
            destination = " (delivery not configured)"

        level = "warning" if task.status == "overdue" else "info"
        message = f"Task alert: '{task.title}' due {task.due_date}{destination}"
        alert = models.Alert(
            user_id=task.user_id,
            category_id=None,
            year=task.due_date.year if task.due_date else today.year,
            month=task.due_date.month if task.due_date else today.month,
            code="TASK_ALERT",
            level=level,
            message=message,
        )
        db.add(alert)
        task.last_alerted_at = now
        if channel in {"sms", "email"}:
            task.is_completed = task.status == "completed"
        sent_count += 1 if sent else 0

    db.commit()
    return sent_count


def run_task_alerts() -> None:
    db = SessionLocal()
    try:
        process_task_alerts(db)
    finally:
        db.close()

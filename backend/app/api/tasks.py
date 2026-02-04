from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user
from app.db import get_db
from app.schemas import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])
VALID_STATUSES = {"pending", "in_progress", "completed", "overdue"}


@router.get("", response_model=list[TaskOut])
def list_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tasks = (
        db.query(models.Task)
        .filter(models.Task.user_id == current_user.id)
        .order_by(models.Task.created_at.desc())
        .all()
    )
    now = datetime.utcnow()
    today = now.date()
    changed = False
    for task in tasks:
        if task.status == "completed" or task.is_completed:
            if task.status != "completed":
                task.status = "completed"
                changed = True
            if not task.is_completed:
                task.is_completed = True
                changed = True
            continue

        if task.due_date and task.due_date < today and task.status != "overdue":
            task.status = "overdue"
            task.is_completed = False
            changed = True

        if task.due_date and task.alert_offset_minutes is not None:
            notify_at = datetime.combine(task.due_date, time.min) - timedelta(
                minutes=task.alert_offset_minutes
            )
            if now >= notify_at and (not task.last_alerted_at or task.last_alerted_at < notify_at):
                channel = task.alert_channel or "app"
                destination = ""
                if channel == "sms" and task.alert_phone:
                    destination = f" via SMS to {task.alert_phone}"
                elif channel == "email" and task.alert_email:
                    destination = f" via email to {task.alert_email}"
                elif channel != "app":
                    destination = " (delivery not configured)"
                level = "warning" if task.status == "overdue" else "info"
                message = f"Task alert: '{task.title}' due {task.due_date}{destination}"
                alert = models.Alert(
                    user_id=current_user.id,
                    category_id=None,
                    year=task.due_date.year if task.due_date else today.year,
                    month=task.due_date.month if task.due_date else today.month,
                    code="TASK_ALERT",
                    level=level,
                    message=message,
                )
                db.add(alert)
                task.last_alerted_at = now
                changed = True

    if changed:
        db.commit()
    return tasks


@router.post("", response_model=TaskOut)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    task_data = payload.model_dump()
    if task_data.get("status") == "completed":
        task_data["is_completed"] = True
    task = models.Task(user_id=current_user.id, **task_data)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = (
        db.query(models.Task)
        .filter(models.Task.user_id == current_user.id, models.Task.id == task_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    updates = payload.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")

    for field, value in updates.items():
        setattr(task, field, value)

    if task.status == "completed" or task.is_completed:
        task.status = "completed"
        task.is_completed = True
    else:
        task.is_completed = False
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = (
        db.query(models.Task)
        .filter(models.Task.user_id == current_user.id, models.Task.id == task_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"status": "ok"}

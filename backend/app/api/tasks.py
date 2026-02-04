from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user
from app.db import get_db
from app.schemas import TaskCreate, TaskOut, TaskUpdate
from app.services.task_alerts import process_task_alerts

router = APIRouter(prefix="/tasks", tags=["tasks"])
VALID_STATUSES = {"pending", "in_progress", "completed", "overdue"}


@router.get("", response_model=list[TaskOut])
def list_tasks(
    year: int | None = Query(default=None),
    month: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    process_task_alerts(db, user_id=current_user.id)
    query = db.query(models.Task).filter(models.Task.user_id == current_user.id)

    if year and month:
        month_start = date(year, month, 1)
        if month == 12:
            next_month = date(year + 1, 1, 1)
        else:
            next_month = date(year, month + 1, 1)
        query = query.filter(
            or_(
                and_(models.Task.due_date >= month_start, models.Task.due_date < next_month),
                models.Task.due_date < month_start,
            )
        ).filter(models.Task.status != "completed")

    return query.order_by(models.Task.created_at.desc()).all()


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

from calendar import monthrange
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user
from app.db import get_db
from app.schemas import ExpenseCreate, ExpenseOut
from app.services.alerts import maybe_create_alerts
from app.services.budget import ensure_uncategorized, get_month_context

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("", response_model=list[ExpenseOut])
def list_expenses(
    year: int | None = None,
    month: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    year, month = get_month_context(year, month)
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])

    expenses = (
        db.query(models.Expense)
        .filter(
            models.Expense.user_id == current_user.id,
            models.Expense.date >= start,
            models.Expense.date <= end,
        )
        .order_by(models.Expense.date.desc())
        .all()
    )
    return expenses


@router.post("", response_model=ExpenseOut)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    category_id = payload.category_id
    if category_id:
        category = (
            db.query(models.Category)
            .filter(
                models.Category.user_id == current_user.id,
                models.Category.id == category_id,
                models.Category.is_active.is_(True),
            )
            .first()
        )
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    else:
        category = ensure_uncategorized(db, current_user.id)
        category_id = category.id

    expense = models.Expense(
        user_id=current_user.id,
        category_id=category_id,
        amount=payload.amount,
        date=payload.date,
        note=payload.note,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    year, month = get_month_context(payload.date.year, payload.date.month)
    maybe_create_alerts(db, current_user.id, year, month)
    return expense


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    expense = (
        db.query(models.Expense)
        .filter(models.Expense.user_id == current_user.id, models.Expense.id == expense_id)
        .first()
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()
    return {"status": "ok"}


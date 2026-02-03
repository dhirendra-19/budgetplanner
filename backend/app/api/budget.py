from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user
from app.db import get_db
from app.schemas import (
    BudgetCurrentOut,
    BudgetLimitsIn,
    BudgetMonthOut,
    BudgetSalaryIn,
    BudgetSummary,
)
from app.services.budget import (
    compute_budget_summary,
    compute_suggested_debt_payment,
    get_month_context,
    upsert_salary,
    replace_income_sources_for_month,
)
from app.services.alerts import maybe_create_alerts
from app.services.category_limits import get_monthly_limits, upsert_category_limit

router = APIRouter(prefix="/budget", tags=["budget"])


@router.post("/salary", response_model=BudgetMonthOut)
def set_salary(
    payload: BudgetSalaryIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    year, month = get_month_context(payload.year, payload.month)
    record = upsert_salary(
        db, current_user.id, year, month, payload.salary, payload.other_income
    )
    replace_income_sources_for_month(db, record.id, payload.income_sources)
    maybe_create_alerts(db, current_user.id, year, month)
    return record


@router.get("/summary", response_model=BudgetSummary)
def get_summary(
    year: int | None = None,
    month: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    year, month = get_month_context(year, month)
    summary = compute_budget_summary(db, current_user.id, year, month)
    summary["planned_debt_payment"] = compute_suggested_debt_payment(
        db, current_user.id, summary["planned_debt_payment"]
    )
    return summary


@router.get("/current", response_model=BudgetCurrentOut)
def get_current_budget(
    year: int | None = None,
    month: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    year, month = get_month_context(year, month)
    summary = compute_budget_summary(db, current_user.id, year, month)
    salary = summary["salary"]
    other_income = summary["other_income"]
    budget_month = (
        db.query(models.BudgetMonth)
        .filter(
            models.BudgetMonth.user_id == current_user.id,
            models.BudgetMonth.year == year,
            models.BudgetMonth.month == month,
        )
        .first()
    )
    income_sources = budget_month.income_sources if budget_month else []
    categories = (
        db.query(models.Category)
        .filter(models.Category.user_id == current_user.id, models.Category.is_active.is_(True))
        .all()
    )
    limit_map = get_monthly_limits(db, current_user.id, year, month, [c.id for c in categories])
    for category in categories:
        if category.id in limit_map:
            category.monthly_limit = limit_map[category.id]
    debts = (
        db.query(models.Debt)
        .filter(models.Debt.user_id == current_user.id, models.Debt.is_active.is_(True))
        .all()
    )
    return {
        "year": year,
        "month": month,
        "salary": salary,
        "other_income": other_income,
        "income_sources": income_sources,
        "categories": categories,
        "debts": debts,
    }


@router.post("/limits")
def set_monthly_limits(
    payload: BudgetLimitsIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    for item in payload.limits:
        upsert_category_limit(
            db, current_user.id, item.category_id, payload.year, payload.month, item.monthly_limit
        )
    db.commit()
    maybe_create_alerts(db, current_user.id, payload.year, payload.month)
    return {"status": "ok"}


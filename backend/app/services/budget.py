from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime
from typing import Dict, List, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.services.category_limits import get_monthly_limits, upsert_category_limit
from app.services.income_sources import replace_income_sources

DEFAULT_CATEGORIES = [
    {"name": "Rent/Mortgage", "tag": "regular"},
    {"name": "Utilities", "tag": "regular"},
    {"name": "Groceries", "tag": "regular"},
    {"name": "Dining", "tag": "regular"},
    {"name": "Transportation", "tag": "regular"},
    {"name": "Insurance", "tag": "regular"},
    {"name": "Subscriptions", "tag": "regular"},
    {"name": "Kids", "tag": "regular"},
    {"name": "Savings", "tag": "savings"},
    {"name": "Debt Payment", "tag": "debt"},
]


def ensure_default_categories(db: Session, user_id: int) -> None:
    existing = db.query(models.Category).filter(models.Category.user_id == user_id).count()
    if existing:
        return

    uncategorized = models.Category(
        user_id=user_id,
        name="Uncategorized",
        monthly_limit=0,
        tag="uncategorized",
        is_system=True,
        is_active=True,
    )
    db.add(uncategorized)

    for item in DEFAULT_CATEGORIES:
        db.add(
            models.Category(
                user_id=user_id,
                name=item["name"],
                monthly_limit=0,
                tag=item["tag"],
                is_system=False,
                is_active=True,
            )
        )

    db.commit()


def get_month_context(year: int | None, month: int | None) -> Tuple[int, int]:
    today = date.today()
    return year or today.year, month or today.month


def get_salary_for_month(db: Session, user_id: int, year: int, month: int) -> tuple[float, float]:
    record = (
        db.query(models.BudgetMonth)
        .filter(
            models.BudgetMonth.user_id == user_id,
            models.BudgetMonth.year == year,
            models.BudgetMonth.month == month,
        )
        .first()
    )
    if not record:
        return 0.0, 0.0
    return float(record.salary or 0), float(record.other_income or 0)


def get_income_sources_total(db: Session, user_id: int, year: int, month: int) -> float:
    record = (
        db.query(models.BudgetMonth)
        .filter(
            models.BudgetMonth.user_id == user_id,
            models.BudgetMonth.year == year,
            models.BudgetMonth.month == month,
        )
        .first()
    )
    if not record:
        return 0.0
    total = sum(source.amount or 0 for source in record.income_sources)
    return float(total)


def get_spent_by_category(db: Session, user_id: int, year: int, month: int) -> Dict[int, float]:
    start = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    end = date(year, month, last_day)

    rows = (
        db.query(models.Expense.category_id, func.sum(models.Expense.amount))
        .filter(
            models.Expense.user_id == user_id,
            models.Expense.date >= start,
            models.Expense.date <= end,
        )
        .group_by(models.Expense.category_id)
        .all()
    )
    return {row[0] or 0: float(row[1] or 0) for row in rows}


def compute_budget_summary(db: Session, user_id: int, year: int, month: int):
    categories = (
        db.query(models.Category)
        .filter(models.Category.user_id == user_id, models.Category.is_active.is_(True))
        .all()
    )
    salary, other_income = get_salary_for_month(db, user_id, year, month)
    income_sources_total = get_income_sources_total(db, user_id, year, month)
    total_income = salary + other_income + income_sources_total
    spent_map = get_spent_by_category(db, user_id, year, month)
    limit_map = get_monthly_limits(db, user_id, year, month, [c.id for c in categories])

    planned_savings = 0.0
    planned_debt_payment = 0.0
    fixed_total = 0.0
    total_limits = 0.0
    category_summaries = []

    for category in categories:
        limit_amount = float(limit_map.get(category.id, category.monthly_limit or 0))
        total_limits += limit_amount
        if category.tag == "savings":
            planned_savings += limit_amount
        elif category.tag == "debt":
            planned_debt_payment += limit_amount
        else:
            fixed_total += limit_amount

        spent = float(spent_map.get(category.id, 0))
        percent = (spent / limit_amount * 100) if limit_amount > 0 else 0.0
        status = "ok"
        if limit_amount > 0 and spent >= limit_amount:
            status = "over"
        elif limit_amount > 0 and spent >= 0.8 * limit_amount:
            status = "warning"

        category_summaries.append(
            {
                "category_id": category.id,
                "name": category.name,
                "monthly_limit": limit_amount,
                "spent": spent,
                "percent": round(percent, 2),
                "status": status,
                "tag": category.tag,
            }
        )

    remaining_flex = total_income - total_limits
    total_spent = sum(spent_map.values())

    today = date.today()
    days_in_month = monthrange(year, month)[1]
    if today.year == year and today.month == month:
        day_of_month = max(1, today.day)
    else:
        day_of_month = days_in_month

    projected_total = (total_spent / day_of_month) * days_in_month if day_of_month else 0

    suggestions: List[str] = []
    if remaining_flex < 0:
        sorted_cats = sorted(
            [c for c in category_summaries if c["monthly_limit"] > 0],
            key=lambda c: c["monthly_limit"],
            reverse=True,
        )
        deficit = abs(remaining_flex)
        for cat in sorted_cats[:3]:
            cut = min(deficit, cat["monthly_limit"] * 0.2)
            if cut > 0:
                suggestions.append(
                    f"Reduce {cat['name']} by ${cut:,.2f} to close the gap."
                )
                deficit -= cut
    else:
        if planned_savings <= 0 and total_income > 0:
            suggestions.append("Add a Savings category at 10% of salary.")
        suggestions.append("Allocate extra toward Savings.")
        suggestions.append("Increase Debt Payment for faster payoff.")
        suggestions.append("Create or grow a Flex category.")

    return {
        "salary": salary,
        "other_income": other_income,
        "total_income": total_income,
        "fixed_total": fixed_total,
        "planned_savings": planned_savings,
        "planned_debt_payment": planned_debt_payment,
        "remaining_flex": remaining_flex,
        "total_spent": total_spent,
        "projected_total": projected_total,
        "over_budget": remaining_flex < 0,
        "suggestions": suggestions,
        "categories": category_summaries,
    }


def ensure_uncategorized(db: Session, user_id: int) -> models.Category:
    uncategorized = (
        db.query(models.Category)
        .filter(
            models.Category.user_id == user_id,
            models.Category.tag == "uncategorized",
            models.Category.is_system.is_(True),
        )
        .first()
    )
    if uncategorized:
        return uncategorized

    uncategorized = models.Category(
        user_id=user_id,
        name="Uncategorized",
        monthly_limit=0,
        tag="uncategorized",
        is_system=True,
        is_active=True,
    )
    db.add(uncategorized)
    db.commit()
    db.refresh(uncategorized)
    return uncategorized


def upsert_salary(
    db: Session, user_id: int, year: int, month: int, salary: float, other_income: float
) -> models.BudgetMonth:
    record = (
        db.query(models.BudgetMonth)
        .filter(
            models.BudgetMonth.user_id == user_id,
            models.BudgetMonth.year == year,
            models.BudgetMonth.month == month,
        )
        .first()
    )
    if record:
        record.salary = salary
        record.other_income = other_income
    else:
        record = models.BudgetMonth(
            user_id=user_id, year=year, month=month, salary=salary, other_income=other_income
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record


def set_category_limits_for_month(
    db: Session, user_id: int, year: int, month: int, categories: list[models.Category]
) -> None:
    for category in categories:
        upsert_category_limit(db, user_id, category.id, year, month, category.monthly_limit)
    db.commit()


def replace_income_sources_for_month(
    db: Session, budget_month_id: int, sources: list
) -> None:
    replace_income_sources(db, budget_month_id, sources)
    db.commit()


def get_debt_minimum_total(db: Session, user_id: int) -> float:
    rows = (
        db.query(func.sum(models.Debt.minimum_monthly_payment))
        .filter(models.Debt.user_id == user_id, models.Debt.is_active.is_(True))
        .first()
    )
    return float(rows[0] or 0)


def compute_suggested_debt_payment(db: Session, user_id: int, planned_debt_payment: float) -> float:
    if planned_debt_payment > 0:
        return planned_debt_payment
    return get_debt_minimum_total(db, user_id)


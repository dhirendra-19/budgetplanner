from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app import models
from app.services.budget import compute_budget_summary


def _alert_exists(db: Session, user_id: int, code: str, year: int, month: int) -> bool:
    return (
        db.query(models.Alert)
        .filter(
            models.Alert.user_id == user_id,
            models.Alert.code == code,
            models.Alert.year == year,
            models.Alert.month == month,
        )
        .first()
        is not None
    )


def _create_alert(
    db: Session,
    user_id: int,
    code: str,
    level: str,
    message: str,
    year: int,
    month: int,
    category_id: int | None = None,
) -> None:
    if _alert_exists(db, user_id, code, year, month):
        return

    alert = models.Alert(
        user_id=user_id,
        category_id=category_id,
        year=year,
        month=month,
        code=code,
        level=level,
        message=message,
    )
    db.add(alert)


def maybe_create_alerts(db: Session, user_id: int, year: int, month: int) -> None:
    summary = compute_budget_summary(db, user_id, year, month)
    for cat in summary["categories"]:
        limit_amount = cat["monthly_limit"]
        if limit_amount <= 0:
            continue
        spent = cat["spent"]
        if spent >= limit_amount:
            _create_alert(
                db,
                user_id,
                f"cat-{cat['category_id']}-100-{year}-{month}",
                "alert",
                f"{cat['name']} is over the monthly limit.",
                year,
                month,
                category_id=cat["category_id"],
            )
        elif spent >= 0.8 * limit_amount:
            _create_alert(
                db,
                user_id,
                f"cat-{cat['category_id']}-80-{year}-{month}",
                "warning",
                f"{cat['name']} reached 80% of the monthly limit.",
                year,
                month,
                category_id=cat["category_id"],
            )

    projected_total = summary["projected_total"]
    total_income = summary["total_income"]
    planned_savings = summary["planned_savings"]
    threshold = total_income - planned_savings if planned_savings else total_income
    if threshold > 0 and projected_total > threshold:
        _create_alert(
            db,
            user_id,
            f"pace-{year}-{month}",
            "alert",
            "Overall spending pace is projected to exceed the budget.",
            year,
            month,
        )

    db.commit()


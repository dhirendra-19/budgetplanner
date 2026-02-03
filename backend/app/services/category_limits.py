from typing import Dict

from sqlalchemy import and_, desc
from sqlalchemy.orm import Session

from app import models


def upsert_category_limit(
    db: Session, user_id: int, category_id: int, year: int, month: int, monthly_limit: float
) -> None:
    record = (
        db.query(models.CategoryLimit)
        .filter(
            models.CategoryLimit.user_id == user_id,
            models.CategoryLimit.category_id == category_id,
            models.CategoryLimit.year == year,
            models.CategoryLimit.month == month,
        )
        .first()
    )
    if record:
        record.monthly_limit = monthly_limit
    else:
        db.add(
            models.CategoryLimit(
                user_id=user_id,
                category_id=category_id,
                year=year,
                month=month,
                monthly_limit=monthly_limit,
            )
        )


def get_monthly_limits(
    db: Session, user_id: int, year: int, month: int, category_ids: list[int]
) -> Dict[int, float]:
    limits: Dict[int, float] = {}
    for category_id in category_ids:
        record = (
            db.query(models.CategoryLimit)
            .filter(
                models.CategoryLimit.user_id == user_id,
                models.CategoryLimit.category_id == category_id,
                and_(
                    (models.CategoryLimit.year < year)
                    | ((models.CategoryLimit.year == year) & (models.CategoryLimit.month <= month))
                ),
            )
            .order_by(desc(models.CategoryLimit.year), desc(models.CategoryLimit.month))
            .first()
        )
        if record:
            limits[category_id] = float(record.monthly_limit or 0)

    return limits

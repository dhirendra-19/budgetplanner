from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user
from app.db import get_db
from app.schemas import CategoryCreate, CategoryOut, CategoryUpdate, CategoryDeleteRequest
from app.services.alerts import maybe_create_alerts
from app.services.budget import ensure_uncategorized, get_month_context
from app.services.category_limits import upsert_category_limit

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Category)
        .filter(models.Category.user_id == current_user.id, models.Category.is_active.is_(True))
        .all()
    )


@router.post("", response_model=CategoryOut)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    category = models.Category(
        user_id=current_user.id,
        name=payload.name,
        monthly_limit=payload.monthly_limit,
        tag=payload.tag,
        is_active=payload.is_active,
        is_system=False,
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    year, month = get_month_context(None, None)
    upsert_category_limit(db, current_user.id, category.id, year, month, category.monthly_limit)
    db.commit()

    year, month = get_month_context(None, None)
    maybe_create_alerts(db, current_user.id, year, month)
    return category


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    category = (
        db.query(models.Category)
        .filter(models.Category.user_id == current_user.id, models.Category.id == category_id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if payload.name is not None:
        category.name = payload.name
    if payload.monthly_limit is not None:
        category.monthly_limit = payload.monthly_limit
    if payload.tag is not None:
        category.tag = payload.tag
    if payload.is_active is not None:
        category.is_active = payload.is_active

    category.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(category)

    year, month = get_month_context(None, None)
    upsert_category_limit(db, current_user.id, category.id, year, month, category.monthly_limit)
    db.commit()
    maybe_create_alerts(db, current_user.id, year, month)
    return category


@router.post("/{category_id}/delete")
def delete_category(
    category_id: int,
    payload: CategoryDeleteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    category = (
        db.query(models.Category)
        .filter(models.Category.user_id == current_user.id, models.Category.id == category_id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if category.is_system or category.tag == "uncategorized":
        raise HTTPException(status_code=400, detail="System category cannot be deleted")

    replacement_id = payload.replacement_category_id
    if replacement_id:
        replacement = (
            db.query(models.Category)
            .filter(models.Category.user_id == current_user.id, models.Category.id == replacement_id)
            .first()
        )
        if not replacement:
            raise HTTPException(status_code=404, detail="Replacement category not found")
    else:
        replacement = ensure_uncategorized(db, current_user.id)

    db.query(models.Expense).filter(
        models.Expense.user_id == current_user.id,
        models.Expense.category_id == category.id,
    ).update({models.Expense.category_id: replacement.id})

    category.is_active = False
    db.commit()

    year, month = get_month_context(None, None)
    maybe_create_alerts(db, current_user.id, year, month)

    return {"status": "ok", "moved_to": replacement.id}


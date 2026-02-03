from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user
from app.db import get_db
from app.schemas import AlertOut
from app.services.budget import get_month_context

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
def list_alerts(
    year: int | None = None,
    month: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    year, month = get_month_context(year, month)
    return (
        db.query(models.Alert)
        .filter(
            models.Alert.user_id == current_user.id,
            models.Alert.year == year,
            models.Alert.month == month,
        )
        .order_by(models.Alert.created_at.desc())
        .all()
    )


@router.patch("/{alert_id}")
def mark_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    alert = (
        db.query(models.Alert)
        .filter(models.Alert.user_id == current_user.id, models.Alert.id == alert_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    db.commit()
    return {"status": "ok"}


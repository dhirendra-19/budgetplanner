from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user
from app.db import get_db
from app.schemas import DebtCreate, DebtOut, DebtUpdate, DebtSimulationRequest, DebtSimulationResult
from app.services.debt import DebtItem, DebtSimulationError, simulate_payoff

router = APIRouter(prefix="/debts", tags=["debts"])


@router.get("", response_model=list[DebtOut])
def list_debts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Debt)
        .filter(models.Debt.user_id == current_user.id, models.Debt.is_active.is_(True))
        .all()
    )


@router.post("", response_model=DebtOut)
def create_debt(
    payload: DebtCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    debt = models.Debt(user_id=current_user.id, **payload.model_dump())
    db.add(debt)
    db.commit()
    db.refresh(debt)
    return debt


@router.put("/{debt_id}", response_model=DebtOut)
def update_debt(
    debt_id: int,
    payload: DebtUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    debt = (
        db.query(models.Debt)
        .filter(models.Debt.user_id == current_user.id, models.Debt.id == debt_id)
        .first()
    )
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(debt, field, value)
    db.commit()
    db.refresh(debt)
    return debt


@router.delete("/{debt_id}")
def delete_debt(
    debt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    debt = (
        db.query(models.Debt)
        .filter(models.Debt.user_id == current_user.id, models.Debt.id == debt_id)
        .first()
    )
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    debt.is_active = False
    db.commit()
    return {"status": "ok"}


@router.post("/simulate", response_model=DebtSimulationResult)
def simulate(
    payload: DebtSimulationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    debts = (
        db.query(models.Debt)
        .filter(models.Debt.user_id == current_user.id, models.Debt.is_active.is_(True))
        .all()
    )
    items = [
        DebtItem(
            id=d.id,
            name=d.debt_name,
            balance=float(d.total_balance),
            apr=float(d.apr or 0),
            minimum=float(d.minimum_monthly_payment),
            extra=float(d.extra_monthly_payment or 0),
        )
        for d in debts
    ]
    try:
        result = simulate_payoff(items, payload.strategy, payload.extra_monthly_payment)
    except DebtSimulationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return result


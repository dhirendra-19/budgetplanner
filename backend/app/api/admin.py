from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user, require_admin
from app.core.security import create_access_token, hash_password
from app.db import get_db
from app.schemas import (
    AdminImpersonateRequest,
    AdminResetPassword,
    AdminUpdateUser,
    AdminUserOut,
    PasswordResetRequestOut,
    SuggestionOut,
)
from app.services.currency import get_currency

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[AdminUserOut])
def list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


@router.post("/impersonate")
def impersonate(
    payload: AdminImpersonateRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    token = create_access_token(user.username)
    return {"access_token": token}


@router.get("/suggestions", response_model=list[SuggestionOut])
def list_suggestions(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return db.query(models.Suggestion).order_by(models.Suggestion.created_at.desc()).all()


@router.patch("/users/{user_id}", response_model=AdminUserOut)
def update_user(
    user_id: int,
    payload: AdminUpdateUser,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.country:
        user.country = payload.country
        user.currency = get_currency(payload.country)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.query(models.PasswordResetRequest).filter(
        models.PasswordResetRequest.user_id == user_id
    ).delete()
    db.query(models.Suggestion).filter(models.Suggestion.user_id == user_id).delete()
    db.query(models.CategoryLimit).filter(models.CategoryLimit.user_id == user_id).delete()
    db.query(models.Expense).filter(models.Expense.user_id == user_id).delete()
    db.query(models.Alert).filter(models.Alert.user_id == user_id).delete()
    db.query(models.Task).filter(models.Task.user_id == user_id).delete()
    db.query(models.Debt).filter(models.Debt.user_id == user_id).delete()
    db.query(models.Category).filter(models.Category.user_id == user_id).delete()
    budgets = db.query(models.BudgetMonth).filter(models.BudgetMonth.user_id == user_id).all()
    for budget in budgets:
        db.query(models.BudgetIncomeSource).filter(
            models.BudgetIncomeSource.budget_month_id == budget.id
        ).delete()
    db.query(models.BudgetMonth).filter(models.BudgetMonth.user_id == user_id).delete()

    db.delete(user)
    db.commit()
    return {"status": "ok"}


@router.get("/password-resets", response_model=list[PasswordResetRequestOut])
def list_password_resets(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return (
        db.query(models.PasswordResetRequest)
        .order_by(models.PasswordResetRequest.created_at.desc())
        .all()
    )


@router.post("/password-resets/{request_id}/reset")
def admin_reset_password(
    request_id: int,
    payload: AdminResetPassword,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    req = db.query(models.PasswordResetRequest).filter(models.PasswordResetRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    req.status = "closed"
    db.commit()
    return {"status": "ok"}

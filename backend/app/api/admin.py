from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user, require_admin
from app.core.security import create_access_token
from app.db import get_db
from app.schemas import AdminImpersonateRequest, AdminUserOut, SuggestionOut

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
        return {"error": "User not found"}
    token = create_access_token(user.username)
    return {"access_token": token}


@router.get("/suggestions", response_model=list[SuggestionOut])
def list_suggestions(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    return db.query(models.Suggestion).order_by(models.Suggestion.created_at.desc()).all()

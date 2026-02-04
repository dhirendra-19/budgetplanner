from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db import get_db
from app import models
from app.schemas import (
    AuthLogin,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    TokenResponse,
    UserCreate,
    UserOut,
)
from app.services.budget import ensure_default_categories
from app.services.currency import get_currency

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    exists = db.query(models.User).filter(models.User.username == payload.username).first()
    if exists:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = models.User(
        username=payload.username,
        full_name=payload.full_name,
        gender=payload.gender,
        country=payload.country,
        currency=get_currency(payload.country),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    ensure_default_categories(db, user.id)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: AuthLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    settings = get_settings()
    token = create_access_token(user.username)
    max_age = int(timedelta(minutes=settings.access_token_expire_minutes).total_seconds())
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
        max_age=max_age,
    )

    return TokenResponse(access_token=token)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"status": "ok"}


@router.get("/me", response_model=UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "ok"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    req = models.PasswordResetRequest(user_id=user.id, reason=payload.reason)
    db.add(req)
    db.commit()
    return {"status": "ok"}

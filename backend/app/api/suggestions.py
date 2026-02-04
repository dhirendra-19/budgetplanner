from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user
from app.db import get_db
from app.schemas import SuggestionCreate, SuggestionOut

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


@router.get("", response_model=list[SuggestionOut])
def list_my_suggestions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Suggestion)
        .filter(models.Suggestion.user_id == current_user.id)
        .order_by(models.Suggestion.created_at.desc())
        .all()
    )


@router.post("", response_model=SuggestionOut)
def create_suggestion(
    payload: SuggestionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    suggestion = models.Suggestion(user_id=current_user.id, message=payload.message)
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)
    return suggestion

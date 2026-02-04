from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, budget, categories, debts, expenses, alerts, tasks, suggestions, admin
from app.core.config import get_settings
from app.core.security import hash_password
from app.db import SessionLocal
from app import models

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(budget.router)
app.include_router(expenses.router)
app.include_router(debts.router)
app.include_router(alerts.router)
app.include_router(tasks.router)
app.include_router(suggestions.router)
app.include_router(admin.router)


@app.on_event("startup")
def ensure_admin_user():
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.is_admin.is_(True)).first()
        if existing:
            return
        admin = models.User(
            username=settings.admin_username,
            full_name="Administrator",
            gender="N/A",
            password_hash=hash_password(settings.admin_password),
            is_admin=True,
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {"status": "ok", "service": settings.app_name}

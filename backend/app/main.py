from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, budget, categories, debts, expenses, alerts, tasks
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(budget.router)
app.include_router(expenses.router)
app.include_router(debts.router)
app.include_router(alerts.router)
app.include_router(tasks.router)


@app.get("/")
def root():
    return {"status": "ok", "service": settings.app_name}


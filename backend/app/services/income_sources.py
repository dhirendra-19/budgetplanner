from sqlalchemy.orm import Session

from app import models
from app.schemas import IncomeSourceIn


def replace_income_sources(
    db: Session, budget_month_id: int, sources: list[IncomeSourceIn]
) -> None:
    db.query(models.BudgetIncomeSource).filter(
        models.BudgetIncomeSource.budget_month_id == budget_month_id
    ).delete()

    for source in sources:
        db.add(
            models.BudgetIncomeSource(
                budget_month_id=budget_month_id,
                name=source.name,
                amount=source.amount,
            )
        )

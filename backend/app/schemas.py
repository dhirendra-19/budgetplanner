from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field
from pydantic import ConfigDict


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    gender: str = Field(min_length=1, max_length=30)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    gender: str
    is_admin: bool = False
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CategoryBase(BaseModel):
    name: str
    monthly_limit: float = 0
    tag: str = "regular"
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    monthly_limit: Optional[float] = None
    tag: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_system: bool
    created_at: datetime
    updated_at: datetime


class BudgetSalaryIn(BaseModel):
    salary: float
    other_income: float = 0
    income_sources: List["IncomeSourceIn"] = []
    year: Optional[int] = None
    month: Optional[int] = None


class BudgetMonthOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    year: int
    month: int
    salary: float
    other_income: float


class DebtBase(BaseModel):
    debt_name: str
    total_balance: float
    apr: Optional[float] = None
    minimum_monthly_payment: float
    extra_monthly_payment: float = 0
    is_active: bool = True


class DebtCreate(DebtBase):
    pass


class DebtUpdate(BaseModel):
    debt_name: Optional[str] = None
    total_balance: Optional[float] = None
    apr: Optional[float] = None
    minimum_monthly_payment: Optional[float] = None
    extra_monthly_payment: Optional[float] = None
    is_active: Optional[bool] = None


class DebtOut(DebtBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class ExpenseCreate(BaseModel):
    amount: float
    category_id: Optional[int] = None
    date: date
    note: Optional[str] = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount: float
    category_id: Optional[int]
    date: date
    note: Optional[str]
    created_at: datetime


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: Optional[int]
    year: int
    month: int
    code: str
    level: str
    message: str
    is_read: bool
    created_at: datetime


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    priority: str = "medium"
    is_completed: bool = False


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[str] = None
    is_completed: Optional[bool] = None


class TaskOut(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class CategorySpend(BaseModel):
    category_id: int
    name: str
    monthly_limit: float
    spent: float
    percent: float
    status: str
    tag: str


class BudgetSummary(BaseModel):
    salary: float
    other_income: float
    total_income: float
    fixed_total: float
    planned_savings: float
    planned_debt_payment: float
    remaining_flex: float
    total_spent: float
    projected_total: float
    over_budget: bool
    suggestions: List[str]
    categories: List[CategorySpend]


class DebtSimulationResult(BaseModel):
    total_months: int
    payoff_schedule: List[dict]


class DebtSimulationRequest(BaseModel):
    strategy: str = Field(default="avalanche")
    extra_monthly_payment: float = 0


class AuthLogin(BaseModel):
    username: str
    password: str


class CategoryDeleteRequest(BaseModel):
    replacement_category_id: Optional[int] = None
    move_to_uncategorized: bool = True


class BudgetCurrentOut(BaseModel):
    year: int
    month: int
    salary: float
    other_income: float
    income_sources: List["IncomeSourceOut"]
    categories: List[CategoryOut]
    debts: List[DebtOut]


class IncomeSourceIn(BaseModel):
    name: str
    amount: float


class IncomeSourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    amount: float
    created_at: datetime


class CategoryLimitIn(BaseModel):
    category_id: int
    monthly_limit: float


class BudgetLimitsIn(BaseModel):
    year: int
    month: int
    limits: List[CategoryLimitIn]


class SuggestionCreate(BaseModel):
    message: str


class SuggestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    message: str
    status: str
    created_at: datetime


class AdminImpersonateRequest(BaseModel):
    user_id: int


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    gender: str
    is_admin: bool
    created_at: datetime


BudgetSalaryIn.model_rebuild()
BudgetCurrentOut.model_rebuild()

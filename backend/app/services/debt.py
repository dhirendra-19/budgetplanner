from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass
class DebtItem:
    id: int
    name: str
    balance: float
    apr: float
    minimum: float
    extra: float


class DebtSimulationError(ValueError):
    pass


def simulate_payoff(debts: List[DebtItem], strategy: str, extra_monthly_payment: float):
    if not debts:
        return {"total_months": 0, "payoff_schedule": []}

    strategy = strategy.lower().strip()
    if strategy not in {"avalanche", "snowball"}:
        raise DebtSimulationError("Strategy must be avalanche or snowball.")

    debts = [d for d in debts if d.balance > 0]
    if not debts:
        return {"total_months": 0, "payoff_schedule": []}

    payoff_months = {d.id: None for d in debts}
    month = 0
    rollover_next = 0.0

    while month < 1200:
        month += 1
        rollover_current = rollover_next
        rollover_next = 0.0

        for d in debts:
            if d.balance <= 0:
                continue
            monthly_rate = (d.apr or 0) / 100 / 12
            if monthly_rate > 0:
                d.balance += d.balance * monthly_rate

        ordered = sorted(
            debts,
            key=lambda d: (-d.apr, d.balance) if strategy == "avalanche" else (d.balance, -d.apr),
        )

        for d in debts:
            if d.balance <= 0:
                continue
            payment = min(d.balance, d.minimum + d.extra)
            d.balance -= payment
            if d.balance <= 0 and payoff_months[d.id] is None:
                payoff_months[d.id] = month
                rollover_next += d.minimum + d.extra

        extra_pool = extra_monthly_payment + rollover_current
        if extra_pool > 0:
            for d in ordered:
                if d.balance <= 0:
                    continue
                payment = min(d.balance, extra_pool)
                d.balance -= payment
                extra_pool -= payment
                if d.balance <= 0 and payoff_months[d.id] is None:
                    payoff_months[d.id] = month
                    rollover_next += d.minimum + d.extra
                if extra_pool <= 0:
                    break

        if all(d.balance <= 0 for d in debts):
            break

    payoff_schedule = []
    for d in debts:
        payoff_schedule.append(
            {
                "debt_id": d.id,
                "debt_name": d.name,
                "payoff_months": payoff_months[d.id] or month,
            }
        )

    total_months = max(item["payoff_months"] for item in payoff_schedule) if payoff_schedule else 0
    return {"total_months": total_months, "payoff_schedule": payoff_schedule}


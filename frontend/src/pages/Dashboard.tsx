import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import StatCard from "../components/StatCard";
import ProgressBar from "../components/ProgressBar";
import { formatCurrency } from "../utils/format";
import { useAuth } from "../context/AuthContext";

type CategorySpend = {
  category_id: number;
  name: string;
  monthly_limit: number;
  spent: number;
  percent: number;
  status: string;
  tag: string;
};

type BudgetSummary = {
  salary: number;
  other_income: number;
  total_income: number;
  fixed_total: number;
  planned_savings: number;
  planned_debt_payment: number;
  remaining_flex: number;
  total_spent: number;
  projected_total: number;
  over_budget: boolean;
  suggestions: string[];
  categories: CategorySpend[];
};

type AlertItem = {
  id: number;
  level: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

type DebtSimulation = {
  total_months: number;
  payoff_schedule: { debt_id: number; debt_name: string; payoff_months: number }[];
};

type TaskItem = {
  id: number;
  title: string;
  due_date?: string | null;
  status: string;
  priority: string;
};

export default function Dashboard() {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [debtPlan, setDebtPlan] = useState<DebtSimulation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const navigate = useNavigate();

  const monthOptions = Array.from({ length: 19 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6 + index);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const label = date.toLocaleString("en-US", { month: "long", year: "numeric" });
    return { value: `${year}-${month}`, label, year, month };
  });

  useEffect(() => {
    const query = `?year=${selectedMonth.year}&month=${selectedMonth.month}`;
    Promise.all([
      apiFetch<BudgetSummary>(`/budget/summary${query}`),
      apiFetch<AlertItem[]>(`/alerts${query}`),
      apiFetch<TaskItem[]>("/tasks")
    ])
      .then(async ([summaryData, alertData, taskData]) => {
        setSummary(summaryData);
        setAlerts(alertData);
        setTasks(taskData);
        if (!summaryData.salary) {
          navigate("/wizard");
        }
        if (summaryData.remaining_flex >= 0) {
          try {
            const plan = await apiFetch<DebtSimulation>("/debts/simulate", {
              method: "POST",
              body: JSON.stringify({
                strategy: "avalanche",
                extra_monthly_payment: summaryData.remaining_flex
              })
            });
            setDebtPlan(plan);
          } catch {
            setDebtPlan(null);
          }
        } else {
          setDebtPlan(null);
        }
      })
      .catch((err) => setError(err.message || "Failed to load summary"));
  }, [navigate, selectedMonth.year, selectedMonth.month]);

  if (!summary) {
    return (
      <div className="card bg-white/70 p-6">
        <p className="text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  const topTasks = tasks.slice(0, 5);

  return (
    <div className="space-y-10">
      {error && <div className="card bg-rose-50 p-4 text-rose-600">{error}</div>}

      {alerts.length > 0 && (
        <section className="card bg-amber-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Active alerts</p>
              <p className="section-title mt-2 text-lg text-ink">
                {alerts.filter((alert) => !alert.is_read).length} unread notifications
              </p>
            </div>
            <button
              onClick={() => navigate("/alerts")}
              className="rounded-full border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-700"
            >
              View all
            </button>
          </div>
          <div className="mt-4 space-y-2 text-sm text-amber-700">
            {alerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-amber-100 bg-white/70 px-4 py-2">
                {alert.message}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="card border p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Budget Month</p>
          <select
            value={`${selectedMonth.year}-${selectedMonth.month}`}
            onChange={(event) => {
              const [year, month] = event.target.value.split("-").map(Number);
              setSelectedMonth({ year, month });
            }}
            className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <StatCard
          title="Total Monthly Income"
          value={formatCurrency(summary.total_income, currency)}
          subtitle={`Salary ${formatCurrency(summary.salary, currency)} + Other ${formatCurrency(
            summary.other_income,
            currency
          )}`}
        />
        <StatCard
          title="Remaining Flex"
          value={formatCurrency(summary.remaining_flex, currency)}
          tone={summary.remaining_flex < 0 ? "alert" : "success"}
        />
        <StatCard
          title="Spent MTD"
          value={formatCurrency(summary.total_spent, currency)}
          subtitle={`Projected: ${formatCurrency(summary.projected_total, currency)}`}
          tone={summary.over_budget ? "alert" : "default"}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card bg-white/80 p-6">
          <div className="flex items-center justify-between">
            <h2 className="section-title text-xl text-ink">Category pacing</h2>
            {summary.over_budget && (
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
                Over budget
              </span>
            )}
          </div>
          <div className="mt-6 space-y-4">
            {summary.categories.map((cat) => (
              <div key={cat.category_id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{cat.name}</span>
                  <span className="text-slate-500">
                    {formatCurrency(cat.spent, currency)} / {formatCurrency(cat.monthly_limit, currency)}
                  </span>
                </div>
                <ProgressBar value={cat.percent} />
              </div>
            ))}
          </div>
        </div>

        <div className="card bg-white/90 p-6">
          <h2 className="section-title text-xl text-ink">Recommendations</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {summary.suggestions.map((item) => (
              <li key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card bg-white/90 p-6">
        <div className="flex items-center justify-between">
          <h2 className="section-title text-xl text-ink">Tasks snapshot</h2>
          <button
            onClick={() => navigate("/tasks")}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold"
          >
            Open tasks
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          {topTasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2">
              <div>
                <p className="font-semibold text-slate-700">{task.title}</p>
                <p className="text-xs text-slate-500">Due {task.due_date || "No due date"}</p>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {task.status.replace("_", " ")}
              </span>
            </div>
          ))}
          {!topTasks.length && <p className="text-sm text-slate-500">No tasks yet.</p>}
        </div>
      </section>

      {debtPlan && debtPlan.total_months > 0 && (
        <section className="card bg-white/90 p-6">
          <h2 className="section-title text-xl text-ink">Debt payoff plan (Avalanche)</h2>
          <p className="mt-2 text-sm text-slate-600">
            Uses remaining flex ({formatCurrency(summary.remaining_flex, currency)}) as extra monthly payment.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              Estimated payoff in <span className="font-semibold text-ink">{debtPlan.total_months}</span> months
            </div>
            {debtPlan.payoff_schedule.map((item) => (
              <div
                key={item.debt_id}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                {item.debt_name}: {item.payoff_months} months
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

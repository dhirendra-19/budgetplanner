import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../api/client";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/format";

const steps = ["Income", "Categories", "Debts", "Summary"];

type Category = {
  id?: number;
  name: string;
  monthly_limit: number;
  tag: string;
  is_system?: boolean;
};

type Debt = {
  id?: number;
  debt_name: string;
  total_balance: number;
  apr?: number | null;
  minimum_monthly_payment: number;
  extra_monthly_payment: number;
  is_active?: boolean;
};

type BudgetSummary = {
  salary: number;
  remaining_flex: number;
  over_budget: boolean;
  suggestions: string[];
};

export default function Wizard() {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [step, setStep] = useState(0);
  const [salary, setSalary] = useState(0);
  const [showSalary, setShowSalary] = useState(true);
  const [incomeSources, setIncomeSources] = useState<
    { local_id: number; name: string; amount: number }[]
  >([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const incomeId = useRef(1);

  useEffect(() => {
    apiFetch<{
      salary: number;
      other_income: number;
      income_sources: { name: string; amount: number }[];
      categories: Category[];
      debts: Debt[];
    }>(`/budget/current?year=${selectedMonth.year}&month=${selectedMonth.month}`)
      .then((data) => {
        setSalary(data.salary || 0);
        setIncomeSources(
          (data.income_sources || []).map((item) => ({
            local_id: incomeId.current++,
            name: item.name,
            amount: item.amount
          }))
        );
        setCategories((data.categories || []).filter((cat) => !cat.is_system));
        setDebts(data.debts || []);
        setShowSalary(data.salary > 0);
      })
      .catch((err) => setError(err.message || "Failed to load wizard data"));
  }, [selectedMonth.year, selectedMonth.month]);

  const stepLabel = useMemo(() => steps[step], [step]);

  const saveSalary = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/budget/salary", {
        method: "POST",
        body: JSON.stringify({
          salary: showSalary ? salary : 0,
          other_income: 0,
          income_sources: incomeSources.map((item) => ({ name: item.name, amount: item.amount })),
          year: selectedMonth.year,
          month: selectedMonth.month
        })
      });
      setStep(1);
    } catch (err: any) {
      setError(err.message || "Failed to save salary");
    } finally {
      setSaving(false);
    }
  };

  const saveCategories = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const category of categories) {
        const payload = {
          name: category.name,
          monthly_limit: category.monthly_limit,
          tag: category.tag,
          is_active: true
        };
        if (category.id) {
          await apiFetch(`/categories/${category.id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
        } else {
          const created = await apiFetch<Category>("/categories", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          category.id = created.id;
        }
      }
      await apiFetch("/budget/limits", {
        method: "POST",
        body: JSON.stringify({
          year: selectedMonth.year,
          month: selectedMonth.month,
          limits: categories
            .filter((cat) => cat.id)
            .map((cat) => ({ category_id: cat.id, monthly_limit: cat.monthly_limit }))
        })
      });
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to save categories");
    } finally {
      setSaving(false);
    }
  };

  const saveDebts = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const debt of debts) {
        const payload = {
          debt_name: debt.debt_name,
          total_balance: debt.total_balance,
          apr: debt.apr,
          minimum_monthly_payment: debt.minimum_monthly_payment,
          extra_monthly_payment: debt.extra_monthly_payment,
          is_active: true
        };
        if (debt.id) {
          await apiFetch(`/debts/${debt.id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
        } else {
          const created = await apiFetch<Debt>("/debts", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          debt.id = created.id;
        }
      }
      const summaryData = await apiFetch<BudgetSummary>("/budget/summary");
      setSummary(summaryData);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Failed to save debts");
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    setCategories((prev) => [
      ...prev,
      { name: "New Category", monthly_limit: 0, tag: "regular" }
    ]);
  };

  const addDebt = () => {
    setDebts((prev) => [
      ...prev,
      {
        debt_name: "New Debt",
        total_balance: 0,
        apr: 0,
        minimum_monthly_payment: 0,
        extra_monthly_payment: 0
      }
    ]);
  };

  const removeCategory = async (index: number) => {
    const target = categories[index];
    if (target?.id) {
      await apiFetch(`/categories/${target.id}/delete`, {
        method: "POST",
        body: JSON.stringify({ move_to_uncategorized: true })
      });
    }
    setCategories((prev) => prev.filter((_, idx) => idx !== index));
  };

  const removeDebt = (index: number) => {
    setDebts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const monthOptions = Array.from({ length: 19 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6 + index);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const label = date.toLocaleString("en-US", { month: "long", year: "numeric" });
    return { value: `${year}-${month}`, label, year, month };
  });

  return (
    <div className="space-y-8">
      <div className="card bg-white/80 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Budget setup</p>
            <h1 className="section-title mt-3 text-2xl text-ink">
              Step {step + 1}: {stepLabel}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Month</span>
            <select
              value={`${selectedMonth.year}-${selectedMonth.month}`}
              onChange={(event) => {
                const [year, month] = event.target.value.split("-").map(Number);
                setSelectedMonth({ year, month });
              }}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="card bg-rose-50 p-4 text-rose-600">{error}</div>}

      {step === 0 && (
        <div className="card bg-white/90 p-6 space-y-6">
          <div>
            <p className="text-sm text-slate-600">Income setup for the selected month.</p>
            {!showSalary && (
              <button
                onClick={() => setShowSalary(true)}
                className="mt-3 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold"
              >
                Add salary
              </button>
            )}
            {showSalary && (
              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  type="number"
                  value={salary}
                  onChange={(event) => setSalary(Number(event.target.value))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  placeholder="Net salary"
                />
                <button
                  onClick={() => {
                    setSalary(0);
                    setShowSalary(false);
                  }}
                  className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-500"
                >
                  Remove salary
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Other income sources</p>
              <button
                onClick={() =>
                  setIncomeSources((prev) => [
                    ...prev,
                    { local_id: incomeId.current++, name: "Side income", amount: 0 }
                  ])
                }
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold"
              >
                Add income source
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {incomeSources.map((source, idx) => (
                <div key={source.local_id} className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
                  <input
                    value={source.name}
                    onChange={(event) => {
                      const value = event.target.value;
                      setIncomeSources((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, name: value } : item))
                      );
                    }}
                    className="rounded-2xl border border-slate-200 px-4 py-3"
                    placeholder="Income name"
                  />
                  <input
                    type="number"
                    value={source.amount}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setIncomeSources((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, amount: value } : item))
                      );
                    }}
                    className="rounded-2xl border border-slate-200 px-4 py-3"
                    placeholder="Amount"
                  />
                  <button
                    onClick={() =>
                      setIncomeSources((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="rounded-2xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-500"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Total income: {formatCurrency((showSalary ? salary : 0) + incomeSources.reduce((sum, item) => sum + (item.amount || 0), 0), currency)}
            </div>
            <button
              onClick={saveSalary}
              disabled={saving}
              className="rounded-2xl bg-ink px-6 py-3 text-sm font-semibold text-white"
            >
              Save & Continue
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card bg-white/90 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Edit categories and monthly limits.</p>
            <button
              onClick={addCategory}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Add Category
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {categories.map((cat, idx) => (
              <div key={`${cat.name}-${idx}`} className="grid gap-3 md:grid-cols-[1.6fr_1fr_auto]">
                <input
                  value={cat.name}
                  onChange={(event) => {
                    const value = event.target.value;
                    setCategories((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, name: value } : item))
                    );
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                />
                <input
                  type="number"
                  value={cat.monthly_limit}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setCategories((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, monthly_limit: value } : item))
                    );
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                />
                <button
                  onClick={() => removeCategory(idx)}
                  className="rounded-2xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-500"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep(0)} className="text-sm text-slate-500">
              Back
            </button>
            <button
              onClick={saveCategories}
              disabled={saving}
              className="rounded-2xl bg-ink px-6 py-3 text-sm font-semibold text-white"
            >
              Save & Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card bg-white/90 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Add any debts you want to track.</p>
            <button
              onClick={addDebt}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Add Debt
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {debts.map((debt, idx) => (
              <div key={debt.id ?? idx} className="grid gap-3 md:grid-cols-5">
                <input
                  value={debt.debt_name}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDebts((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, debt_name: value } : item))
                    );
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                />
                <input
                  type="number"
                  value={debt.total_balance}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setDebts((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, total_balance: value } : item))
                    );
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                  placeholder="Balance"
                />
                <input
                  type="number"
                  value={debt.apr || 0}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setDebts((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, apr: value } : item))
                    );
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                  placeholder="APR"
                />
                <input
                  type="number"
                  value={debt.minimum_monthly_payment}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setDebts((prev) =>
                      prev.map((item, i) => (
                        i === idx ? { ...item, minimum_monthly_payment: value } : item
                      ))
                    );
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                  placeholder="Minimum"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={debt.extra_monthly_payment}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setDebts((prev) =>
                        prev.map((item, i) => (
                          i === idx ? { ...item, extra_monthly_payment: value } : item
                        ))
                      );
                    }}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                    placeholder="Extra"
                  />
                  <button
                    onClick={() => removeDebt(idx)}
                    className="rounded-2xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep(1)} className="text-sm text-slate-500">
              Back
            </button>
            <button
              onClick={saveDebts}
              disabled={saving}
              className="rounded-2xl bg-ink px-6 py-3 text-sm font-semibold text-white"
            >
              Save & Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card bg-white/90 p-6">
            <h2 className="section-title text-xl text-ink">Budget summary</h2>
            {summary && (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <StatCard title="Remaining Flex" value={formatCurrency(summary.remaining_flex, currency)} />
                <StatCard
                  title="Status"
                  value={summary.over_budget ? "Over budget" : "On track"}
                  tone={summary.over_budget ? "alert" : "success"}
                />
              </div>
            )}
          </div>
          <div className="card bg-white/90 p-6">
            <h2 className="section-title text-xl text-ink">Suggestions</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {(summary?.suggestions || []).map((item) => (
                <li key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setStep(0)}
              className="mt-6 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Edit again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

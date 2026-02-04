import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/format";

type Category = {
  id: number;
  name: string;
};

type Expense = {
  id: number;
  amount: number;
  category_id: number;
  date: string;
  note?: string;
};

export default function Expenses() {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState({
    amount: "",
    category_id: "",
    date: new Date().toISOString().slice(0, 10),
    note: ""
  });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [cats, exp] = await Promise.all([
      apiFetch<Category[]>("/categories"),
      apiFetch<Expense[]>("/expenses")
    ]);
    setCategories(cats);
    setExpenses(exp);
  };

  useEffect(() => {
    load().catch((err) => setError(err.message || "Failed to load expenses"));
  }, []);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((cat) => [cat.id, cat.name]));
  }, [categories]);

  const addExpense = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/expenses", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(form.amount),
          category_id: form.category_id ? Number(form.category_id) : null,
          date: form.date,
          note: form.note
        })
      });
      setForm((prev) => ({ ...prev, amount: "", note: "" }));
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to add expense");
    }
  };

  return (
    <div className="space-y-6">
      <div className="card bg-white/80 p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Expenses</p>
        <h1 className="section-title mt-3 text-2xl text-ink">Track spending</h1>
      </div>

      <div className="card bg-white/90 p-6">
        <h2 className="section-title text-lg text-ink">Add expense</h2>
        <form onSubmit={addExpense} className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            type="number"
            value={form.amount}
            onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            placeholder="Amount"
            className="rounded-2xl border border-slate-200 px-4 py-3"
            required
          />
          <select
            value={form.category_id}
            onChange={(event) => setForm((prev) => ({ ...prev, category_id: event.target.value }))}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          >
            <option value="">Uncategorized</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
          <input
            value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            placeholder="Note"
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
          <button
            type="submit"
            className="md:col-span-4 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white"
          >
            Add expense
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
      </div>

      <div className="card bg-white/95 p-6">
        <h2 className="section-title text-lg text-ink">This month</h2>
        <div className="mt-4 space-y-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {formatCurrency(expense.amount, currency)}
                </p>
                <p className="text-xs text-slate-500">
                  {categoryMap.get(expense.category_id) || "Uncategorized"} - {expense.note || "No note"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{expense.date}</span>
                <button
                  onClick={async () => {
                    await apiFetch(`/expenses/${expense.id}`, { method: "DELETE" });
                    await load();
                  }}
                  className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-500"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!expenses.length && <p className="text-sm text-slate-500">No expenses yet.</p>}
        </div>
      </div>
    </div>
  );
}

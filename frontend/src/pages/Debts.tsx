import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api/client";

export type Debt = {
  id: number;
  local_id?: number;
  debt_name: string;
  total_balance: number;
  apr?: number | null;
  minimum_monthly_payment: number;
  extra_monthly_payment: number;
};

type Simulation = {
  total_months: number;
  payoff_schedule: { debt_id: number; debt_name: string; payoff_months: number }[];
};

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [strategy, setStrategy] = useState("avalanche");
  const [extra, setExtra] = useState(0);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const localId = useRef(1);

  const load = () => {
    apiFetch<Debt[]>("/debts")
      .then((data) =>
        setDebts(
          data.map((item) => ({
            ...item,
            local_id: item.local_id ?? localId.current++
          }))
        )
      )
      .catch((err) => setError(err.message || "Failed to load debts"));
  };

  useEffect(() => {
    load();
  }, []);

  const addDebt = () => {
    setDebts((prev) => [
      ...prev,
      {
        id: 0,
        local_id: localId.current++,
        debt_name: "New Debt",
        total_balance: 0,
        apr: 0,
        minimum_monthly_payment: 0,
        extra_monthly_payment: 0
      }
    ]);
  };

  const saveAll = async () => {
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
          await apiFetch(`/debts`, {
            method: "POST",
            body: JSON.stringify(payload)
          });
        }
      }
      load();
    } catch (err: any) {
      setError(err.message || "Failed to save debts");
    }
  };

  const runSimulation = async () => {
    setError(null);
    try {
      const result = await apiFetch<Simulation>("/debts/simulate", {
        method: "POST",
        body: JSON.stringify({ strategy, extra_monthly_payment: extra })
      });
      setSimulation(result);
    } catch (err: any) {
      setError(err.message || "Failed to simulate");
    }
  };

  return (
    <div className="space-y-6">
      <div className="card bg-white/80 p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Debt planner</p>
        <h1 className="section-title mt-3 text-2xl text-ink">Debts & payoff</h1>
      </div>

      {error && <div className="card bg-rose-50 p-4 text-rose-600">{error}</div>}

      <div className="card bg-white/90 p-6">
        <div className="flex items-center justify-between">
          <h2 className="section-title text-lg text-ink">Debts</h2>
          <div className="flex gap-3">
            <button onClick={addDebt} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">
              Add
            </button>
            <button onClick={saveAll} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
              Save all
            </button>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <div className="grid gap-3 text-xs uppercase tracking-[0.2em] text-slate-400 md:grid-cols-6">
            <span>Debt name</span>
            <span>Balance</span>
            <span>APR</span>
            <span>Minimum</span>
            <span>Extra</span>
            <span>Action</span>
          </div>
          {debts.map((debt, idx) => (
            <div key={debt.local_id ?? `${debt.id}-${idx}`} className="grid gap-3 md:grid-cols-6">
              <input
                value={debt.debt_name}
                onChange={(event) => {
                  const value = event.target.value;
                  setDebts((prev) =>
                    prev.map((item, i) => (i === idx ? { ...item, debt_name: value } : item))
                  );
                }}
                className="rounded-2xl border border-slate-200 px-4 py-2"
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
                className="rounded-2xl border border-slate-200 px-4 py-2"
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
                className="rounded-2xl border border-slate-200 px-4 py-2"
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
                className="rounded-2xl border border-slate-200 px-4 py-2"
                placeholder="Minimum"
              />
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
                className="rounded-2xl border border-slate-200 px-4 py-2"
                placeholder="Extra"
              />
              <button
                onClick={async () => {
                  if (debt.id) {
                    await apiFetch(`/debts/${debt.id}`, { method: "DELETE" });
                  }
                  setDebts((prev) => prev.filter((_, i) => i !== idx));
                }}
                className="rounded-2xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-500"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card bg-white/90 p-6">
        <h2 className="section-title text-lg text-ink">Payoff simulator</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            value={strategy}
            onChange={(event) => setStrategy(event.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-2"
          >
            <option value="avalanche">Avalanche (highest APR)</option>
            <option value="snowball">Snowball (smallest balance)</option>
          </select>
          <input
            type="number"
            value={extra}
            onChange={(event) => setExtra(Number(event.target.value))}
            className="rounded-2xl border border-slate-200 px-4 py-2"
            placeholder="Extra monthly payment"
          />
          <button
            onClick={runSimulation}
            className="rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            Run simulation
          </button>
        </div>
        {simulation && (
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <p>
              Estimated payoff: <span className="font-semibold text-ink">{simulation.total_months}</span> months
            </p>
            {simulation.payoff_schedule.map((item) => (
              <div key={item.debt_id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                {item.debt_name}: {item.payoff_months} months
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

type Alert = {
  id: number;
  level: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    apiFetch<Alert[]>("/alerts")
      .then((data) => setAlerts(data))
      .catch((err) => setError(err.message || "Failed to load alerts"));
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: number) => {
    await apiFetch(`/alerts/${id}`, { method: "PATCH" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="card bg-white/80 p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Alerts</p>
        <h1 className="section-title mt-3 text-2xl text-ink">Notifications</h1>
      </div>
      {error && <div className="card bg-rose-50 p-4 text-rose-600">{error}</div>}
      <div className="card bg-white/95 p-6">
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">{alert.message}</p>
                <p className="text-xs text-slate-500">{new Date(alert.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${alert.level === "alert" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"}`}>
                  {alert.level}
                </span>
                {!alert.is_read && (
                  <button
                    onClick={() => markRead(alert.id)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
          {!alerts.length && <p className="text-sm text-slate-500">No alerts yet.</p>}
        </div>
      </div>
    </div>
  );
}


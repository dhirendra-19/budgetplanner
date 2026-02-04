import { useEffect, useState } from "react";
import { apiFetch, storeToken } from "../api/client";

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    Promise.all([apiFetch("/admin/users"), apiFetch("/admin/suggestions")])
      .then(([userData, suggestionData]: any) => {
        setUsers(userData);
        setSuggestions(suggestionData);
      })
      .catch((err) => setError(err.message || "Failed to load admin data"));
  };

  useEffect(() => {
    load();
  }, []);

  const impersonate = async (user: { id: number; full_name: string; username: string }) => {
    const adminToken =
      localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
    const adminStorage = localStorage.getItem("access_token") ? "local" : "session";
    if (adminToken) {
      localStorage.setItem("admin_access_token", adminToken);
      localStorage.setItem("admin_access_token_storage", adminStorage);
    }
    const result = await apiFetch<{ access_token: string }>("/admin/impersonate", {
      method: "POST",
      body: JSON.stringify({ user_id: user.id })
    });
    storeToken(result.access_token, true);
    localStorage.setItem("impersonated_user_id", String(user.id));
    localStorage.setItem(
      "impersonated_user_label",
      `${user.full_name} (@${user.username})`
    );
    window.location.href = "/dashboard";
  };

  return (
    <div className="space-y-6">
      <div className="card bg-white/80 p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Admin</p>
        <h1 className="section-title mt-3 text-2xl text-ink">User manager</h1>
      </div>
      {error && <div className="card bg-rose-50 p-4 text-rose-600">{error}</div>}

      <div className="card bg-white/90 p-6">
        <h2 className="section-title text-lg text-ink">Users</h2>
        <div className="mt-4 space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">{user.full_name}</p>
                <p className="text-xs text-slate-500">@{user.username}</p>
              </div>
              <button
                onClick={() => impersonate(user)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold"
              >
                Open
              </button>
            </div>
          ))}
          {!users.length && <p className="text-sm text-slate-500">No users yet.</p>}
        </div>
      </div>

      <div className="card bg-white/90 p-6">
        <h2 className="section-title text-lg text-ink">Suggestions</h2>
        <div className="mt-4 space-y-3">
          {suggestions.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 px-4 py-3">
              <p className="text-sm text-slate-700">{item.message}</p>
              <p className="text-xs text-slate-500">
                User #{item.user_id} - {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          {!suggestions.length && <p className="text-sm text-slate-500">No suggestions yet.</p>}
        </div>
      </div>
    </div>
  );
}

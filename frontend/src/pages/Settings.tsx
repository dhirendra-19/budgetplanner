import { FormEvent, useState } from "react";
import { apiFetch } from "../api/client";

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      setMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    }
  };

  const requestReset = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/suggestions/password-reset", {
        method: "POST",
        body: JSON.stringify({ reason })
      });
      setMessage("Reset request sent to admin.");
      setReason("");
    } catch (err: any) {
      setError(err.message || "Failed to send reset request");
    }
  };

  return (
    <div className="space-y-6">
      <div className="card bg-white/80 p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Settings</p>
        <h1 className="section-title mt-3 text-2xl text-ink">Account</h1>
      </div>

      {(error || message) && (
        <div className={`card p-4 ${error ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      )}

      <div className="card bg-white/90 p-6">
        <h2 className="section-title text-lg text-ink">Change password</h2>
        <form onSubmit={changePassword} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Current password"
            className="rounded-2xl border border-slate-200 px-4 py-3"
            required
          />
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
            className="rounded-2xl border border-slate-200 px-4 py-3"
            required
          />
          <button
            type="submit"
            className="md:col-span-2 rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            Update password
          </button>
        </form>
      </div>

      <div className="card bg-white/90 p-6">
        <h2 className="section-title text-lg text-ink">Forgot password</h2>
        <p className="mt-2 text-sm text-slate-600">
          Send a reset request to the admin. They will set a temporary password for you.
        </p>
        <form onSubmit={requestReset} className="mt-4 space-y-3">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Reason or context"
            rows={3}
          />
          <button
            type="submit"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Send reset request
          </button>
        </form>
      </div>
    </div>
  );
}

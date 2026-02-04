import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

export default function Suggestions() {
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<
    { id: number; message: string; status: string; created_at: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    apiFetch("/suggestions")
      .then((data: any) => setItems(data))
      .catch((err) => setError(err.message || "Failed to load suggestions"));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/suggestions", {
        method: "POST",
        body: JSON.stringify({ message })
      });
      setMessage("");
      load();
    } catch (err: any) {
      setError(err.message || "Failed to send suggestion");
    }
  };

  return (
    <div className="space-y-6">
      <div className="card bg-white/80 p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Suggestions</p>
        <h1 className="section-title mt-3 text-2xl text-ink">Share feedback</h1>
      </div>

      <div className="card bg-white/90 p-6">
        <form onSubmit={submit} className="space-y-3">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Tell us what you want improved"
            rows={4}
            required
          />
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button
            type="submit"
            className="rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            Send suggestion
          </button>
        </form>
      </div>

      <div className="card bg-white/95 p-6">
        <h2 className="section-title text-lg text-ink">Your suggestions</h2>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 px-4 py-3">
              <p className="text-sm text-slate-700">{item.message}</p>
              <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
            </div>
          ))}
          {!items.length && <p className="text-sm text-slate-500">No suggestions yet.</p>}
        </div>
      </div>
    </div>
  );
}

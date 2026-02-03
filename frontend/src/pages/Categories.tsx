import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

export type Category = {
  id: number;
  name: string;
  monthly_limit: number;
  tag: string;
  is_system: boolean;
};

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [replacementId, setReplacementId] = useState<string>("uncat");

  const load = () => {
    apiFetch<Category[]>("/categories")
      .then((data) => setCategories(data))
      .catch((err) => setError(err.message || "Failed to load categories"));
  };

  useEffect(() => {
    load();
  }, []);

  const addCategory = () => {
    setCategories((prev) => [
      ...prev,
      { id: 0, name: "New Category", monthly_limit: 0, tag: "regular", is_system: false }
    ]);
  };

  const saveAll = async () => {
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
          await apiFetch(`/categories`, {
            method: "POST",
            body: JSON.stringify(payload)
          });
        }
      }
      load();
    } catch (err: any) {
      setError(err.message || "Failed to save categories");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const body = {
      replacement_category_id: replacementId === "uncat" ? null : Number(replacementId),
      move_to_uncategorized: replacementId === "uncat"
    };
    await apiFetch(`/categories/${deleteTarget.id}/delete`, {
      method: "POST",
      body: JSON.stringify(body)
    });
    setDeleteTarget(null);
    setReplacementId("uncat");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="card bg-white/80 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Budget categories</p>
            <h1 className="section-title mt-3 text-2xl text-ink">Manage categories</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addCategory}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Add
            </button>
            <button
              onClick={saveAll}
              disabled={saving}
              className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white"
            >
              Save all
            </button>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}
      </div>

      <div className="grid gap-4">
        {categories
          .filter((cat) => !(cat.is_system && cat.tag === "uncategorized"))
          .map((cat, idx) => (
          <div key={`${cat.id}-${idx}`} className="card bg-white/90 p-5">
            <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_0.7fr_auto]">
              <input
                value={cat.name}
                onChange={(event) => {
                  const value = event.target.value;
                  setCategories((prev) =>
                    prev.map((item, i) => (i === idx ? { ...item, name: value } : item))
                  );
                }}
                className="rounded-2xl border border-slate-200 px-4 py-2"
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
                className="rounded-2xl border border-slate-200 px-4 py-2"
              />
              <select
                value={cat.tag}
                onChange={(event) => {
                  const value = event.target.value;
                  setCategories((prev) =>
                    prev.map((item, i) => (i === idx ? { ...item, tag: value } : item))
                  );
                }}
                className="rounded-2xl border border-slate-200 px-4 py-2"
              >
                <option value="regular">Regular</option>
                <option value="savings">Savings</option>
                <option value="debt">Debt</option>
                {cat.is_system && <option value="uncategorized">Uncategorized</option>}
              </select>
              <button
                onClick={() => setDeleteTarget(cat)}
                disabled={cat.is_system}
                className="rounded-2xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-500 disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <div className="card bg-white/95 p-6">
          <h2 className="section-title text-lg text-ink">Move expenses from {deleteTarget.name}</h2>
          <p className="mt-2 text-sm text-slate-600">
            Choose a replacement category or move expenses to Uncategorized.
          </p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <select
              value={replacementId}
              onChange={(event) => setReplacementId(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-2"
            >
              <option value="uncat">Uncategorized</option>
              {categories
                .filter((cat) => cat.id && cat.id !== deleteTarget.id)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


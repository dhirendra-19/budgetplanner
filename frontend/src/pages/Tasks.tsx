import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../api/client";

const STATUS_OPTIONS = ["pending", "in_progress", "completed", "overdue"] as const;

const CHANNEL_OPTIONS = [
  { value: "app", label: "In-app alert" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" }
];

type Task = {
  id: number;
  title: string;
  description?: string;
  due_date?: string | null;
  priority: string;
  status: string;
  alert_offset_minutes?: number | null;
  alert_channel?: string;
  alert_email?: string | null;
  alert_phone?: string | null;
};

type TaskForm = {
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
  alert_value: string;
  alert_unit: "hours" | "days";
  alert_channel: string;
  alert_email: string;
  alert_phone: string;
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<TaskForm>({
    title: "",
    description: "",
    due_date: "",
    priority: "medium",
    status: "pending",
    alert_value: "",
    alert_unit: "hours",
    alert_channel: "app",
    alert_email: "",
    alert_phone: ""
  });
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    apiFetch<Task[]>("/tasks")
      .then((data) => setTasks(data))
      .catch((err) => setError(err.message || "Failed to load tasks"));
  };

  useEffect(() => {
    load();
  }, []);

  const computeOffsetMinutes = () => {
    const raw = Number(form.alert_value);
    if (!raw || Number.isNaN(raw)) {
      return null;
    }
    return form.alert_unit === "days" ? raw * 24 * 60 : raw * 60;
  };

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          due_date: form.due_date || null,
          priority: form.priority,
          status: form.status,
          alert_offset_minutes: computeOffsetMinutes(),
          alert_channel: form.alert_channel,
          alert_email: form.alert_channel === "email" ? form.alert_email : null,
          alert_phone: form.alert_channel === "sms" ? form.alert_phone : null
        })
      });
      setForm({
        title: "",
        description: "",
        due_date: "",
        priority: "medium",
        status: "pending",
        alert_value: "",
        alert_unit: "hours",
        alert_channel: "app",
        alert_email: "",
        alert_phone: ""
      });
      load();
    } catch (err: any) {
      setError(err.message || "Failed to add task");
    }
  };

  const updateStatus = async (task: Task, status: string) => {
    await apiFetch(`/tasks/${task.id}`, {
      method: "PUT",
      body: JSON.stringify({ status })
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="card bg-white/80 p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Task planner</p>
        <h1 className="section-title mt-3 text-2xl text-ink">Tasks</h1>
      </div>

      <div className="card bg-white/90 p-6">
        <h2 className="section-title text-lg text-ink">Add task</h2>
        <form onSubmit={addTask} className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Task title"
            className="rounded-2xl border border-slate-200 px-4 py-2 md:col-span-2"
            required
          />
          <input
            type="date"
            value={form.due_date}
            onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))}
            className="rounded-2xl border border-slate-200 px-4 py-2"
          />
          <select
            value={form.priority}
            onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
            className="rounded-2xl border border-slate-200 px-4 py-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            className="rounded-2xl border border-slate-200 px-4 py-2"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Notes"
            className="rounded-2xl border border-slate-200 px-4 py-2 md:col-span-4"
          />

          <div className="md:col-span-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr]">
            <input
              type="number"
              min={0}
              value={form.alert_value}
              onChange={(event) => setForm((prev) => ({ ...prev, alert_value: event.target.value }))}
              placeholder="Alert before"
              className="rounded-2xl border border-slate-200 px-4 py-2"
            />
            <select
              value={form.alert_unit}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, alert_unit: event.target.value as "hours" | "days" }))
              }
              className="rounded-2xl border border-slate-200 px-4 py-2"
            >
              <option value="hours">Hours before</option>
              <option value="days">Days before</option>
            </select>
            <select
              value={form.alert_channel}
              onChange={(event) => setForm((prev) => ({ ...prev, alert_channel: event.target.value }))}
              className="rounded-2xl border border-slate-200 px-4 py-2"
            >
              {CHANNEL_OPTIONS.map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-500">
              Leave blank to skip alerts. Email/SMS are stored as reminders; delivery requires integration.
            </div>
          </div>

          {form.alert_channel === "email" && (
            <input
              type="email"
              value={form.alert_email}
              onChange={(event) => setForm((prev) => ({ ...prev, alert_email: event.target.value }))}
              placeholder="Email for alert"
              className="rounded-2xl border border-slate-200 px-4 py-2 md:col-span-2"
              required
            />
          )}
          {form.alert_channel === "sms" && (
            <input
              type="tel"
              value={form.alert_phone}
              onChange={(event) => setForm((prev) => ({ ...prev, alert_phone: event.target.value }))}
              placeholder="Phone for alert"
              className="rounded-2xl border border-slate-200 px-4 py-2 md:col-span-2"
              required
            />
          )}

          <button
            type="submit"
            className="md:col-span-4 rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            Add task
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
      </div>

      <div className="card bg-white/95 p-6">
        <h2 className="section-title text-lg text-ink">All tasks</h2>
        <div className="mt-4 space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className={`text-sm font-semibold ${task.status === "completed" ? "line-through text-slate-400" : "text-slate-700"}`}>
                  {task.title}
                </p>
                <p className="text-xs text-slate-500">{task.description || "No notes"}</p>
                <p className="text-xs text-slate-400">
                  Due: {task.due_date || "No due date"} • Priority: {task.priority}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <select
                  value={task.status}
                  onChange={(event) => updateStatus(task, event.target.value)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    await apiFetch(`/tasks/${task.id}`, { method: "DELETE" });
                    load();
                  }}
                  className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-500"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!tasks.length && <p className="text-sm text-slate-500">No tasks yet.</p>}
        </div>
      </div>
    </div>
  );
}

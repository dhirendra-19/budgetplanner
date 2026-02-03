import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../api/client";

type Task = {
  id: number;
  title: string;
  description?: string;
  due_date?: string | null;
  priority: string;
  is_completed: boolean;
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "medium"
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

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          due_date: form.due_date || null
        })
      });
      setForm({ title: "", description: "", due_date: "", priority: "medium" });
      load();
    } catch (err: any) {
      setError(err.message || "Failed to add task");
    }
  };

  const toggleTask = async (task: Task) => {
    await apiFetch(`/tasks/${task.id}`, {
      method: "PUT",
      body: JSON.stringify({ is_completed: !task.is_completed })
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
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Notes"
            className="rounded-2xl border border-slate-200 px-4 py-2 md:col-span-4"
          />
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
            <div key={task.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
              <div>
                <p className={`text-sm font-semibold ${task.is_completed ? "line-through text-slate-400" : "text-slate-700"}`}>
                  {task.title}
                </p>
                <p className="text-xs text-slate-500">{task.description || "No notes"}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{task.due_date || "No due date"}</span>
                <button
                  onClick={() => toggleTask(task)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold"
                >
                  {task.is_completed ? "Reopen" : "Done"}
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


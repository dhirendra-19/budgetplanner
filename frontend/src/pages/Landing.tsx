import { FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";

const genders = ["Female", "Male", "Non-binary", "Prefer not to say"];

export default function Landing() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);

  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    gender: genders[0]
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      if (isLogin) {
        await login(form.username, form.password, remember);
      } else {
        await register({
          username: form.username,
          password: form.password,
          full_name: form.full_name,
          gender: form.gender
        });
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.2fr_0.9fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Planner Toolkit</p>
          <h1 className="section-title mt-4 text-4xl text-ink md:text-5xl">
            Build a calm, repeatable money + task rhythm.
          </h1>
          <p className="mt-6 text-lg text-slate-600">
            Map your monthly budget, track expenses, and ship your most important tasks. Every
            calculation is deterministic and rule-based - no AI and no surprises.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              "Monthly budget wizard with editable categories",
              "Real-time alerts at 80% + 100% of limits",
              "Debt payoff simulator (avalanche + snowball)",
              "Tasks with priorities and due dates"
            ].map((item) => (
              <div key={item} className="card bg-white/70 p-4">
                <p className="text-sm font-semibold text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel card p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                {isLogin ? "Sign in" : "Sign up"}
              </p>
              <h2 className="section-title mt-2 text-2xl text-ink">
                {isLogin ? "Welcome back" : "Create your planner"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsLogin((prev) => !prev)}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              {isLogin ? "Need an account?" : "Have an account?"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!isLogin && (
              <div className="grid gap-3">
                <input
                  value={form.full_name}
                  onChange={(event) => handleChange("full_name", event.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  required
                />
                <select
                  value={form.gender}
                  onChange={(event) => handleChange("gender", event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                >
                  {genders.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <input
              value={form.username}
              onChange={(event) => handleChange("username", event.target.value)}
              placeholder="Username"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              required
            />
            <input
              type="password"
              value={form.password}
              onChange={(event) => handleChange("password", event.target.value)}
              placeholder="Password"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              required
            />
            {isLogin && (
              <label className="flex items-center gap-3 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Store token in localStorage (less secure; httpOnly cookie is preferred).
              </label>
            )}
            {error && <p className="text-sm text-rose-500">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {isLogin ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


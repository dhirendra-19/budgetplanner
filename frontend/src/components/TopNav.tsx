import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function TopNav() {
  const { logout, user } = useAuth();

  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/wizard", label: "Budget Wizard" },
    { to: "/expenses", label: "Expenses" },
    { to: "/categories", label: "Categories" },
    { to: "/debts", label: "Debts" },
    { to: "/tasks", label: "Tasks" },
    { to: "/alerts", label: "Alerts" },
    { to: "/suggestions", label: "Suggestions" }
  ];

  if (user?.is_admin) {
    navItems.push({ to: "/admin", label: "Admin" });
  }

  return (
    <div className="sticky top-0 z-40 w-full border-b border-white/60 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Budget + Task Planner</p>
          <p className="section-title text-lg text-ink">Welcome back, {user?.full_name || "Planner"}</p>
        </div>
        <button
          onClick={logout}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-ink"
        >
          Log out
        </button>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-3 overflow-x-auto px-6 pb-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-ink text-white shadow"
                  : "bg-white/80 text-slate-600 hover:text-ink"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

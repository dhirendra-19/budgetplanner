import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { storeToken } from "../api/client";

export default function TopNav() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const impersonatedUserId = localStorage.getItem("impersonated_user_id");
  const impersonatedLabel = localStorage.getItem("impersonated_user_label");

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
      {impersonatedUserId && (
        <div className="bg-amber-100 px-6 py-2 text-sm text-amber-700">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <span>
              Impersonating {impersonatedLabel || `User #${impersonatedUserId}`}
            </span>
            <button
              onClick={() => {
                const adminToken = localStorage.getItem("admin_access_token");
                const adminStorage =
                  localStorage.getItem("admin_access_token_storage") || "local";
                if (adminToken) {
                  storeToken(adminToken, adminStorage === "local");
                }
                localStorage.removeItem("admin_access_token");
                localStorage.removeItem("admin_access_token_storage");
                localStorage.removeItem("impersonated_user_id");
                localStorage.removeItem("impersonated_user_label");
                navigate("/admin");
              }}
              className="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700"
            >
              Return to Admin
            </button>
          </div>
        </div>
      )}
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

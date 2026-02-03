import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Wizard from "./pages/Wizard";
import Expenses from "./pages/Expenses";
import Categories from "./pages/Categories";
import Debts from "./pages/Debts";
import Tasks from "./pages/Tasks";
import Alerts from "./pages/Alerts";
import TopNav from "./components/TopNav";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/wizard"
        element={
          <ProtectedLayout>
            <Wizard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedLayout>
            <Expenses />
          </ProtectedLayout>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedLayout>
            <Categories />
          </ProtectedLayout>
        }
      />
      <Route
        path="/debts"
        element={
          <ProtectedLayout>
            <Debts />
          </ProtectedLayout>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedLayout>
            <Tasks />
          </ProtectedLayout>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedLayout>
            <Alerts />
          </ProtectedLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


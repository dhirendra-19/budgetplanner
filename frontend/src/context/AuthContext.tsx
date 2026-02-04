import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, storeToken } from "../api/client";

export type User = {
  id: number;
  username: string;
  full_name: string;
  gender: string;
  created_at: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  register: (payload: {
    username: string;
    password: string;
    full_name: string;
    gender: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<User>("/auth/me")
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string, remember: boolean) => {
    const result = await apiFetch<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    storeToken(result.access_token, remember);

    const profile = await apiFetch<User>("/auth/me");
    setUser(profile);
  };

  const register = async (payload: {
    username: string;
    password: string;
    full_name: string;
    gender: string;
  }) => {
    await apiFetch<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  };

  const logout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    storeToken(null, false);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}


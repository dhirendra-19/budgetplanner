const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export type ApiError = {
  status: number;
  message: string;
};

function getToken() {
  return localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json();
      message = data.detail || data.message || message;
    } catch {
      message = response.statusText || message;
    }
    throw { status: response.status, message } as ApiError;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export function storeToken(token: string | null, persist: boolean) {
  if (!token) {
    localStorage.removeItem("access_token");
    sessionStorage.removeItem("access_token");
    return;
  }
  if (persist) {
    localStorage.setItem("access_token", token);
    sessionStorage.removeItem("access_token");
  } else {
    sessionStorage.setItem("access_token", token);
    localStorage.removeItem("access_token");
  }
}


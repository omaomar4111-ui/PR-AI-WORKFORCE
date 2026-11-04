export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: "owner" | "member";
  organization_id: string;
  organization_name: string;
  is_active: boolean;
}

export interface AuthSession {
  access_token: string;
  token_type: string;
  user: User;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pr_auth_token");
}

export function setStoredSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem("pr_auth_token", session.access_token);
  localStorage.setItem("pr_auth_user", JSON.stringify(session.user));
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const userJson = localStorage.getItem("pr_auth_user");
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("pr_auth_token");
  localStorage.removeItem("pr_auth_user");
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function loginUser(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Login failed");
  }
  
  setStoredSession(data);
  return data;
}

export async function fetchMe(): Promise<{ user: User }> {
  const token = getStoredToken();
  if (!token) throw new Error("No token stored");

  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    clearStoredSession();
    throw new Error(data.detail || "Failed to fetch user");
  }

  return data;
}

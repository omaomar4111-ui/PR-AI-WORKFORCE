export const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    const host = window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname;
    return `${window.location.protocol}//${host}:8000`;
  }
  return "http://127.0.0.1:8000";
};

export const getWsBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== "undefined") {
    const host = window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${host}:8000`;
  }
  return "ws://127.0.0.1:8000";
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000";

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

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  industry: string;
  brand_color: string;
  logo_url?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  assigned_to?: string | null;
  assigned_user_name?: string;
  created_at: string;
  updated_at: string;
  projects?: Project[];
}

export interface Project {
  id: string;
  organization_id: string;
  client_id: string;
  client_name?: string;
  client_brand_color?: string;
  client_industry?: string;
  name: string;
  description?: string;
  status: "active" | "paused" | "completed";
  retainer_amount: number;
  start_date?: string | null;
  end_date?: string | null;
  assigned_to?: string | null;
  progress_percentage?: number;
  task_count?: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus =
  | "pending"
  | "planning"
  | "assigned"
  | "in_progress"
  | "review"
  | "needs_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskEvent {
  id: string;
  task_id: string;
  event_type: string;
  actor_id?: string | null;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface TaskApproval {
  id: string;
  task_id: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  created_at: string;
}

export interface Task {
  id: string;
  org_id: string;
  project_id: string;
  project_name?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string | null;
  assigned_user_name?: string;
  due_date?: string | null;
  progress_percentage: number;
  dependencies?: string[];
  events?: TaskEvent[];
  approvals?: TaskApproval[];
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_clients: number;
  active_projects: number;
  total_projects: number;
  total_retainer: number;
  total_tasks: number;
  recent_clients: Client[];
  recent_projects: Project[];
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

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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
    headers: authHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    clearStoredSession();
    throw new Error(data.detail || "Failed to fetch user");
  }

  return data;
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/api/users`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load users");
  const data = await res.json();
  return data.users;
}

// ── Clients API ─────────────────────────────────────────────────────────────
export async function fetchClients(search?: string): Promise<Client[]> {
  const url = new URL(`${API_BASE_URL}/api/clients`);
  if (search) url.searchParams.set("search", search);

  const res = await fetch(url.toString(), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load clients");
  const data = await res.json();
  return data.clients;
}

export async function fetchClient(clientId: string): Promise<Client> {
  const res = await fetch(`${API_BASE_URL}/api/clients/${clientId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Client not found or access denied");
  }
  const data = await res.json();
  return data.client;
}

export async function createClient(payload: Partial<Client>): Promise<Client> {
  const res = await fetch(`${API_BASE_URL}/api/clients`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to create client");
  return data.client;
}

export async function updateClient(clientId: string, payload: Partial<Client>): Promise<Client> {
  const res = await fetch(`${API_BASE_URL}/api/clients/${clientId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update client");
  return data.client;
}

export async function deleteClient(clientId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/clients/${clientId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to delete client");
  }
}

// ── Projects API ────────────────────────────────────────────────────────────
export async function fetchProjects(params?: { client_id?: string; status?: string }): Promise<Project[]> {
  const url = new URL(`${API_BASE_URL}/api/projects`);
  if (params?.client_id) url.searchParams.set("client_id", params.client_id);
  if (params?.status) url.searchParams.set("status", params.status);

  const res = await fetch(url.toString(), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load projects");
  const data = await res.json();
  return data.projects;
}

export async function fetchProject(projectId: string): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Project not found or access denied");
  }
  const data = await res.json();
  return data.project;
}

export async function fetchProjectProgress(projectId: string): Promise<{
  project_id: string;
  total_tasks: number;
  completed_tasks: number;
  progress_percentage: number;
}> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/progress`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch project progress");
  const data = await res.json();
  return data.progress;
}

export async function createProject(payload: Partial<Project>): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to create project");
  return data.project;
}

export async function updateProject(projectId: string, payload: Partial<Project>): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update project");
  return data.project;
}

export async function deleteProject(projectId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to delete project");
  }
}

// ── Tasks API ───────────────────────────────────────────────────────────────
export async function fetchTasks(params?: {
  project_id?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
}): Promise<Task[]> {
  const url = new URL(`${API_BASE_URL}/api/tasks`);
  if (params?.project_id) url.searchParams.set("project_id", params.project_id);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.priority) url.searchParams.set("priority", params.priority);
  if (params?.assigned_to) url.searchParams.set("assigned_to", params.assigned_to);

  const res = await fetch(url.toString(), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load tasks");
  const data = await res.json();
  return data.tasks;
}

export async function fetchTask(taskId: string): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Task not found or access denied");
  }
  const data = await res.json();
  return data.task;
}

export async function createTask(payload: Partial<Task>): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to create task");
  return data.task;
}

export async function updateTask(taskId: string, payload: Partial<Task>): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update task");
  return data.task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to delete task");
  }
}

// ── Dashboard Stats API ─────────────────────────────────────────────────────
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load dashboard stats");
  const data = await res.json();
  return data.stats;
}

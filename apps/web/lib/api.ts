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

// ── Milestone 4: Agents & Deliverables Interfaces ───────────────────────────
export interface Agent {
  id: string;
  name: string;
  name_ar?: string;
  department: string;
  department_ar?: string;
  role: string;
  role_ar?: string;
  avatar?: string;
  system_prompt: string;
  tools: string[];
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  quality_criteria: string[];
  max_tokens: number;
  requires_approval_for: string[];
  sample_input?: Record<string, any>;
  status?: string;
}

export interface AgentStatus {
  agent_id: string;
  name: string;
  name_ar?: string;
  role: string;
  role_ar?: string;
  department: string;
  department_ar?: string;
  avatar?: string;
  status: "idle" | "working" | "blocked";
  current_task?: string | null;
  workflow_id?: string | null;
  updated_at: string;
}

export interface Deliverable {
  id: string;
  organization_id: string;
  project_id?: string | null;
  project_name?: string;
  client_id?: string | null;
  client_name?: string | null;
  task_id?: string | null;
  agent_id: string;
  agent_name: string;
  title: string;
  version?: number;
  parent_deliverable_id?: string | null;
  file_type: string;
  file_url: string;
  content_json: Record<string, any>;
  raw_content?: string;
  quality_score: number;
  status: "delivered" | "approved" | "rejected" | "in_review";
  created_at: string;
  updated_at: string;
}

// ── Milestone 6: Memory Interfaces ──────────────────────────────────────────
export type MemoryType = "organization" | "client" | "project" | "agent";

export interface Memory {
  id: string;
  org_id: string;
  type: MemoryType;
  reference_id: string;
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
  similarity?: number;
  similarity_percent?: number;
  cosine_distance?: number;
}

export interface AgentExecuteResult {
  deliverable: Deliverable;
  output: Record<string, any>;
  agent: {
    id: string;
    name: string;
    department: string;
  };
}

// ── Milestone 5: Workflows & Om Samah Interfaces ────────────────────────────
export type WorkflowStatus =
  | "planning"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type WorkflowStepStatus =
  | "pending"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "skipped";

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  task_id?: string | null;
  assigned_agent_id: string;
  assigned_agent_name: string;
  title: string;
  status: WorkflowStepStatus;
  depends_on: string[];
  input: Record<string, any>;
  output: Record<string, any>;
  quality_score: number;
  requires_approval: boolean;
  approval_status: "none" | "pending" | "approved" | "rejected";
  approval_notes?: string | null;
  retry_count: number;
  deliverable_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface Workflow {
  id: string;
  org_id: string;
  project_id?: string | null;
  project_name?: string;
  user_request: string;
  status: WorkflowStatus;
  compiled_deliverable_id?: string | null;
  created_at: string;
  completed_at?: string | null;
  steps: WorkflowStep[];
}

export interface ExecutionLog {
  id: string;
  workflow_id: string;
  step_id?: string | null;
  event_type: string;
  message: string;
  metadata: Record<string, any>;
  timestamp: string;
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
  document.cookie = `pr_auth_token=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
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
  document.cookie = "pr_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}


export const DEFAULT_TIMEOUT_MS = 12000;

// In-flight deduplication map for concurrent identical GET requests
const inflightGetRequests = new Map<string, Promise<Response>>();

export async function customFetch(url: string | URL, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const urlStr = url.toString();

  // Deduplicate identical in-flight GET requests
  const canDeduplicate = method === "GET" && !options.body;
  const headersObj = options.headers ? (options.headers as Record<string, string>) : {};
  const authHeader = (headersObj as any)?.Authorization || (headersObj as any)?.authorization || "";
  const cacheKey = canDeduplicate ? `${urlStr}::${authHeader}` : null;

  if (cacheKey && inflightGetRequests.has(cacheKey)) {
    const existingPromise = inflightGetRequests.get(cacheKey)!;
    const res = await existingPromise;
    return res.clone();
  }

  const signal = options.signal || (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    : undefined);

  const fetchPromise = (async () => {
    try {
      return await globalThis.fetch(url, { ...options, signal });
    } catch (error: any) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        throw new Error("انتهت مهلة الطلب (12 ثانية). الخادم لا يستجيب.");
      }
      throw error;
    } finally {
      if (cacheKey) {
        inflightGetRequests.delete(cacheKey);
      }
    }
  })();

  if (cacheKey) {
    inflightGetRequests.set(cacheKey, fetchPromise);
  }

  const response = await fetchPromise;
  return response.clone();
}

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchHealth() {
  const res = await customFetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function loginUser(email: string, password: string): Promise<AuthSession> {
  const res = await customFetch(`${API_BASE_URL}/api/auth/login`, {
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

  const res = await customFetch(`${API_BASE_URL}/api/auth/me`, {
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
  const res = await customFetch(`${API_BASE_URL}/api/users`, {
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

  const res = await customFetch(url.toString(), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load clients");
  const data = await res.json();
  return data.clients;
}

export async function fetchClient(clientId: string): Promise<Client> {
  const res = await customFetch(`${API_BASE_URL}/api/clients/${clientId}`, {
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
  const res = await customFetch(`${API_BASE_URL}/api/clients`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to create client");
  return data.client;
}

export async function updateClient(clientId: string, payload: Partial<Client>): Promise<Client> {
  const res = await customFetch(`${API_BASE_URL}/api/clients/${clientId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update client");
  return data.client;
}

export async function deleteClient(clientId: string): Promise<void> {
  const res = await customFetch(`${API_BASE_URL}/api/clients/${clientId}`, {
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

  const res = await customFetch(url.toString(), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load projects");
  const data = await res.json();
  return data.projects;
}

export async function fetchProject(projectId: string): Promise<Project> {
  const res = await customFetch(`${API_BASE_URL}/api/projects/${projectId}`, {
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
  const res = await customFetch(`${API_BASE_URL}/api/projects/${projectId}/progress`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch project progress");
  const data = await res.json();
  return data.progress;
}

export async function createProject(payload: Partial<Project>): Promise<Project> {
  const res = await customFetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to create project");
  return data.project;
}

export async function updateProject(projectId: string, payload: Partial<Project>): Promise<Project> {
  const res = await customFetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update project");
  return data.project;
}

export async function deleteProject(projectId: string): Promise<void> {
  const res = await customFetch(`${API_BASE_URL}/api/projects/${projectId}`, {
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

  const res = await customFetch(url.toString(), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load tasks");
  const data = await res.json();
  return data.tasks;
}

export async function fetchTask(taskId: string): Promise<Task> {
  const res = await customFetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
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
  const res = await customFetch(`${API_BASE_URL}/api/tasks`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to create task");
  return data.task;
}

export async function updateTask(taskId: string, payload: Partial<Task>): Promise<Task> {
  const res = await customFetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update task");
  return data.task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const res = await customFetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
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
  const res = await customFetch(`${API_BASE_URL}/api/dashboard/stats`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load dashboard stats");
  const data = await res.json();
  return data.stats;
}

// ── Milestone 4: Agents API ──────────────────────────────────────────────────
export async function fetchAgents(): Promise<Agent[]> {
  const res = await customFetch(`${API_BASE_URL}/api/agents`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load agents registry");
  const data = await res.json();
  return data.agents;
}

export async function fetchAgent(agentId: string): Promise<Agent> {
  const res = await customFetch(`${API_BASE_URL}/api/agents/${agentId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load agent profile");
  const data = await res.json();
  return data.agent;
}

export async function executeAgent(
  agentId: string,
  payload: {
    input: Record<string, any>;
    project_id?: string;
    task_id?: string;
    title?: string;
  }
): Promise<AgentExecuteResult> {
  const res = await customFetch(`${API_BASE_URL}/api/agents/${agentId}/execute`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Agent execution failed");
  return data;
}

export async function executeAgentStream(
  agentId: string,
  payload: {
    input: Record<string, any>;
    project_id?: string;
    task_id?: string;
    title?: string;
  },
  onToken: (token: string) => void,
  onDone: (result: AgentExecuteResult) => void,
  onError: (error: Error) => void
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/agents/${agentId}/execute/stream`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Streaming execution failed" }));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("ReadableStream not supported by browser");

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const jsonStr = trimmed.replace(/^data:\s*/, "");
      try {
        const event = JSON.parse(jsonStr);
        if (event.type === "token") {
          onToken(event.token);
        } else if (event.type === "done") {
          onDone({ deliverable: event.deliverable, output: event.output, agent: event.agent || event.deliverable.agent_id });
        } else if (event.type === "error") {
          onError(new Error(event.error));
        }
      } catch (e) {
        console.warn("Failed to parse SSE event", e);
      }
    }
  }
}

// ── Milestone 9: Virtual Office Status API ──────────────────────────────────
export async function fetchAgentStatuses(): Promise<AgentStatus[]> {
  const res = await customFetch(`${API_BASE_URL}/api/agents/status`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load agent statuses");
  const data = await res.json();
  return data.statuses;
}

export async function updateAgentStatus(
  agentId: string,
  payload: { status: "idle" | "working" | "blocked"; current_task?: string }
): Promise<AgentStatus> {
  const res = await customFetch(`${API_BASE_URL}/api/agents/${agentId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update agent status");
  return data.agent;
}

// ── Milestone 4 & 6: Deliverables API ────────────────────────────────────────
export async function fetchDeliverables(params?: {
  project_id?: string;
  client_id?: string;
  agent_id?: string;
  task_id?: string;
  type?: string;
}): Promise<Deliverable[]> {
  const url = new URL(`${API_BASE_URL}/api/deliverables`);
  if (params?.project_id) url.searchParams.set("project_id", params.project_id);
  if (params?.client_id) url.searchParams.set("client_id", params.client_id);
  if (params?.agent_id) url.searchParams.set("agent_id", params.agent_id);
  if (params?.task_id) url.searchParams.set("task_id", params.task_id);
  if (params?.type) url.searchParams.set("type", params.type);

  const res = await customFetch(url.toString(), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load deliverables");
  const data = await res.json();
  return data.deliverables;
}

export async function fetchDeliverable(deliverableId: string): Promise<Deliverable> {
  const res = await customFetch(`${API_BASE_URL}/api/deliverables/${deliverableId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load deliverable");
  const data = await res.json();
  return data.deliverable;
}

export async function createDeliverableVersion(
  deliverableId: string,
  payload: {
    title?: string;
    raw_content?: string;
    content_json?: Record<string, any>;
    quality_score?: number;
    status?: string;
  }
): Promise<Deliverable> {
  const res = await customFetch(`${API_BASE_URL}/api/deliverables/${deliverableId}/version`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to create new deliverable version");
  return data.deliverable;
}

export async function fetchDeliverableVersions(deliverableId: string): Promise<Deliverable[]> {
  const res = await customFetch(`${API_BASE_URL}/api/deliverables/${deliverableId}/versions`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load deliverable versions");
  const data = await res.json();
  return data.versions;
}

// ── Milestone 5: Workflows API ──────────────────────────────────────────────
export async function fetchWorkflows(params?: { project_id?: string }): Promise<Workflow[]> {
  const url = new URL(`${API_BASE_URL}/api/workflows`);
  if (params?.project_id) url.searchParams.set("project_id", params.project_id);

  const res = await customFetch(url.toString(), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load workflows");
  const data = await res.json();
  return data.workflows;
}

export async function fetchWorkflow(workflowId: string): Promise<Workflow> {
  const res = await customFetch(`${API_BASE_URL}/api/workflows/${workflowId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load workflow");
  const data = await res.json();
  return data.workflow;
}

export async function createWorkflow(payload: {
  user_request: string;
  project_id?: string;
}): Promise<Workflow> {
  const res = await customFetch(`${API_BASE_URL}/api/workflows`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to initiate workflow");
  return data.workflow;
}

export async function fetchWorkflowLogs(workflowId: string): Promise<ExecutionLog[]> {
  const res = await customFetch(`${API_BASE_URL}/api/workflows/${workflowId}/logs`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load workflow logs");
  const data = await res.json();
  return data.logs;
}

export async function approveWorkflowStep(
  workflowId: string,
  payload: { step_id: string; approved: boolean; notes?: string }
): Promise<WorkflowStep> {
  const res = await customFetch(`${API_BASE_URL}/api/workflows/${workflowId}/approve`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to approve workflow step");
  return data.step;
}

export async function cancelWorkflow(workflowId: string): Promise<void> {
  const res = await customFetch(`${API_BASE_URL}/api/workflows/${workflowId}/cancel`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to cancel workflow");
  }
}

// ── Milestone 6: Memory API ─────────────────────────────────────────────────
export async function fetchMemories(params?: {
  type?: string;
  reference_id?: string;
  limit?: number;
}): Promise<Memory[]> {
  const url = new URL(`${API_BASE_URL}/api/memories`);
  if (params?.type) url.searchParams.set("type", params.type);
  if (params?.reference_id) url.searchParams.set("reference_id", params.reference_id);
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());

  const res = await customFetch(url.toString(), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load memories");
  const data = await res.json();
  return data.memories;
}

export async function searchMemories(
  query: string,
  params?: {
    type?: string;
    reference_id?: string;
    limit?: number;
  }
): Promise<Memory[]> {
  const url = new URL(`${API_BASE_URL}/api/memories/search`);
  url.searchParams.set("q", query);
  if (params?.type) url.searchParams.set("type", params.type);
  if (params?.reference_id) url.searchParams.set("reference_id", params.reference_id);
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());

  const res = await customFetch(url.toString(), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to perform semantic search on memory");
  const data = await res.json();
  return data.memories;
}

export async function createMemory(payload: {
  type: MemoryType;
  reference_id: string;
  content: string;
  metadata?: Record<string, any>;
}): Promise<Memory> {
  const res = await customFetch(`${API_BASE_URL}/api/memories`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to save memory");
  return data.memory;
}

export async function deleteMemory(memoryId: string): Promise<void> {
  const res = await customFetch(`${API_BASE_URL}/api/memories/${memoryId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to delete memory");
  }
}

// ============================================================================
// Milestone 7: Approvals & Integrations
// ============================================================================

export interface ApprovalRequest {
  id: string;
  workflow_id: string;
  step_id?: string | null;
  task_id?: string | null;
  requested_by_agent_id: string;
  action_type: string;
  payload: Record<string, any>;
  status: "pending" | "approved" | "rejected" | "edited";
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id?: string;
  org_id?: string;
  provider: string;
  name: string;
  name_ar?: string;
  description?: string;
  category: "storage" | "docs" | "email" | "sheets" | "marketing" | "social" | "media";
  required_scopes?: string[];
  scopes?: string[];
  status: "connected" | "disconnected" | "error" | "requires_api_access";
  connected_at?: string | null;
  connected_by?: string | null;
  last_tested_at?: string | null;
  config_summary?: Record<string, any>;
}

export async function fetchApprovals(status?: string): Promise<ApprovalRequest[]> {
  const url = new URL(`${API_BASE_URL}/api/approvals`);
  if (status && status !== "all") url.searchParams.set("status", status);

  const res = await customFetch(url.toString(), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load approval requests");
  const data = await res.json();
  return data.approvals;
}

export async function fetchPendingApprovalsCount(): Promise<number> {
  const res = await customFetch(`${API_BASE_URL}/api/approvals/count`, {
    headers: authHeaders(),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count || 0;
}

export async function approveRequest(id: string, notes?: string): Promise<ApprovalRequest> {
  const res = await customFetch(`${API_BASE_URL}/api/approvals/${id}/approve`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ notes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to approve request");
  return data.approval;
}

export async function rejectRequest(id: string, notes?: string): Promise<ApprovalRequest> {
  const res = await customFetch(`${API_BASE_URL}/api/approvals/${id}/reject`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ notes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to reject request");
  return data.approval;
}

export async function editAndApproveRequest(
  id: string,
  editedPayload: Record<string, any>,
  notes?: string
): Promise<ApprovalRequest> {
  const res = await customFetch(`${API_BASE_URL}/api/approvals/${id}/edit`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ edited_payload: editedPayload, notes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to edit & approve request");
  return data.approval;
}

export async function fetchIntegrations(): Promise<Integration[]> {
  const res = await customFetch(`${API_BASE_URL}/api/integrations`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load integrations");
  const data = await res.json();
  return data.integrations;
}

export async function connectIntegration(
  provider: string,
  config: Record<string, any>
): Promise<any> {
  const res = await customFetch(`${API_BASE_URL}/api/integrations/${provider}/connect`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ config }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to connect integration");
  return data;
}

export async function disconnectIntegration(provider: string): Promise<any> {
  const res = await customFetch(`${API_BASE_URL}/api/integrations/${provider}/disconnect`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to disconnect integration");
  return data;
}

export async function testIntegration(provider: string): Promise<{ success: boolean; message: string; data?: any }> {
  const res = await customFetch(`${API_BASE_URL}/api/integrations/${provider}/test`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  return data;
}

// ── Milestone 10: Analytics & Cost Tracking ─────────────────────────────────
export interface AnalyticsSummary {
  total_tokens: number;
  total_prompt_tokens?: number;
  total_completion_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_cost_usd: number;
  total_executions: number;
  avg_latency_ms: number;
  avg_quality_score: number;
  cost_by_model?: Record<string, number>;
  model_breakdown?: Array<{
    model: string;
    tokens: number;
    cost_usd: number;
    count: number;
  }>;
  daily_costs?: Array<{
    date: string;
    cost_usd: number;
    total_tokens: number;
  }>;
}

export interface AiUsageLog {
  id: string;
  org_id: string;
  agent_id: string;
  project_id?: string | null;
  workflow_id?: string | null;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number;
  created_at: string;
}

export interface CostPerAgent {
  agent_id: string;
  agent_name: string;
  department: string;
  total_cost_usd: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  execution_count: number;
  avg_latency_ms: number;
}

export interface CostPerProject {
  project_id: string;
  project_name: string;
  total_cost_usd: number;
  total_tokens: number;
  execution_count: number;
}

export interface QualityTrendPoint {
  date: string;
  avg_quality_score: number;
  evaluations_count: number;
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await customFetch(`${API_BASE_URL}/api/analytics/summary`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load analytics summary");
  const data = await res.json();
  return data.summary;
}

export async function fetchAnalyticsUsage(params?: {
  start_date?: string;
  end_date?: string;
  agent_id?: string;
  project_id?: string;
}): Promise<AiUsageLog[]> {
  const url = new URL(`${API_BASE_URL}/api/analytics/usage`);
  if (params?.start_date) url.searchParams.set("start_date", params.start_date);
  if (params?.end_date) url.searchParams.set("end_date", params.end_date);
  if (params?.agent_id) url.searchParams.set("agent_id", params.agent_id);
  if (params?.project_id) url.searchParams.set("project_id", params.project_id);

  const res = await customFetch(url.toString(), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load AI usage logs");
  const data = await res.json();
  return data.logs;
}

export async function fetchCostPerAgent(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<CostPerAgent[]> {
  const url = new URL(`${API_BASE_URL}/api/analytics/costs/agents`);
  if (params?.start_date) url.searchParams.set("start_date", params.start_date);
  if (params?.end_date) url.searchParams.set("end_date", params.end_date);

  const res = await customFetch(url.toString(), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load agent cost breakdown");
  const data = await res.json();
  return data.costs_by_agent;
}

export async function fetchCostPerProject(): Promise<CostPerProject[]> {
  const res = await customFetch(`${API_BASE_URL}/api/analytics/costs/projects`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load project cost breakdown");
  const data = await res.json();
  return data.costs_by_project;
}

export async function fetchQualityTrend(days: number = 30): Promise<QualityTrendPoint[]> {
  const res = await customFetch(`${API_BASE_URL}/api/analytics/quality/trend?days=${days}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load quality score trends");
  const data = await res.json();
  return data.quality_trend;
}

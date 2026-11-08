"use client";

import React, { useEffect, useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";
import {
  CheckSquare,
  LayoutGrid,
  List,
  Plus,
  Filter,
  Calendar,
  Clock,
  UserCheck,
  AlertCircle,
  X,
  CheckCircle2,
  Trash2,
  GitBranch,
  History,
  Activity,
  Radio,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  Task,
  TaskStatus,
  TaskPriority,
  Project,
  User,
  fetchTasks,
  fetchTask,
  createTask,
  updateTask,
  deleteTask,
  fetchProjects,
  fetchUsers,
  getStoredUser,
  getWsBaseUrl,
  WS_BASE_URL,
} from "@/lib/api";

const KANBAN_COLUMNS: { id: string; status: TaskStatus; labelKey: string; color: string }[] = [
  { id: "pending", status: "pending", labelKey: "tasks.col_pending", color: "border-gray-700 bg-gray-800/20" },
  { id: "assigned", status: "assigned", labelKey: "tasks.col_assigned", color: "border-blue-500/30 bg-blue-500/10" },
  { id: "in_progress", status: "in_progress", labelKey: "tasks.col_in_progress", color: "border-[#8b5cf6]/40 bg-[#8b5cf6]/10" },
  { id: "review", status: "review", labelKey: "tasks.col_review", color: "border-amber-500/30 bg-amber-500/10" },
  { id: "completed", status: "completed", labelKey: "tasks.col_completed", color: "border-emerald-500/30 bg-emerald-500/10" },
];

export default function TasksPage() {
  const { t, isAr } = useI18n();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  // Filters
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // WebSocket Live Sync State
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // New Task Modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Task Detail Modal State
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Drag & drop state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const currentUser = getStoredUser();

  const loadData = async () => {
    try {
      const [tasksData, projectsData, usersData] = await Promise.all([
        fetchTasks({
          project_id: selectedProject || undefined,
          priority: selectedPriority || undefined,
        }),
        fetchProjects(),
        fetchUsers().catch(() => []),
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
      setUsers(usersData);
      if (projectsData.length > 0 && !projectId) {
        setProjectId(projectsData[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load tasks data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProject, selectedPriority]);

  // WebSocket Setup
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: any;

    const connectWebSocket = () => {
      try {
        const wsEndpoint = `${getWsBaseUrl()}/ws/tasks`;
        ws = new WebSocket(wsEndpoint);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          console.log("⚡ Live WebSocket Tasks connected");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "task_created" || data.type === "task_updated" || data.type === "task_deleted") {
              loadData();
              if (activeTask && data.task && data.task.id === activeTask.id) {
                setActiveTask(data.task);
              }
            }
          } catch (e) {
            console.error("WS message parse error:", e);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 4000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        setWsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, [activeTask]);

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggingTaskId(id);
  };

  const handleDrop = async (newStatus: TaskStatus) => {
    if (!draggingTaskId) return;
    const task = tasks.find((t) => t.id === draggingTaskId);
    if (!task || task.status === newStatus) {
      setDraggingTaskId(null);
      setDragOverCol(null);
      return;
    }

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === draggingTaskId ? { ...t, status: newStatus } : t))
    );

    try {
      await updateTask(draggingTaskId, { status: newStatus });
      await loadData();
    } catch (err: any) {
      alert("Failed to update status");
      await loadData();
    } finally {
      setDraggingTaskId(null);
      setDragOverCol(null);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    try {
      setSaving(true);
      await createTask({
        project_id: projectId,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assigned_to: assignedTo || undefined,
        due_date: dueDate || undefined,
        dependencies: dependencies.length > 0 ? dependencies : [],
      });

      setTitle("");
      setDescription("");
      setStatus("pending");
      setPriority("medium");
      setAssignedTo("");
      setDueDate("");
      setDependencies([]);
      setNewModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const openTaskDetail = async (taskId: string) => {
    try {
      setDetailLoading(true);
      const data = await fetchTask(taskId);
      setActiveTask(data);
    } catch (err: any) {
      alert("Failed to load task details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChangeInDetail = async (newStatus: TaskStatus) => {
    if (!activeTask) return;
    try {
      const updated = await updateTask(activeTask.id, { status: newStatus });
      setActiveTask(updated);
      await loadData();
    } catch (err: any) {
      alert("Failed to update task status");
    }
  };

  const handleDeleteTask = async (id: string, taskTitle: string) => {
    if (!confirm(`${t("tasks.delete_confirm")} (${taskTitle})`)) return;
    try {
      await deleteTask(id);
      if (activeTask?.id === id) setActiveTask(null);
      await loadData();
    } catch (err: any) {
      alert("Failed to delete task");
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(term);
      const matchProject = task.project_name?.toLowerCase().includes(term);
      if (!matchTitle && !matchProject) return false;
    }
    return true;
  });

  // Virtualization for high-volume tasks table (windowing when >100 records)
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredTasks.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - virtualRows[virtualRows.length - 1].end
      : 0;

  return (
    <AppShell>
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {t("tasks.title")}
            </h1>
            {/* Live WebSocket Status Pill */}
            <div
              data-testid="ws-status"
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                wsConnected
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-gray-800 text-gray-400 border border-gray-700"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`} />
              <span>{wsConnected ? t("tasks.live_sync") : "Connecting..."}</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {t("tasks.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-800 bg-[#14161f] p-1">
            <button
              data-testid="view-kanban-btn"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === "kanban"
                  ? "bg-[#8b5cf6] text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>{t("tasks.view_kanban")}</span>
            </button>
            <button
              data-testid="view-table-btn"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === "table"
                  ? "bg-[#8b5cf6] text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>{t("tasks.view_table")}</span>
            </button>
          </div>

          <button
            onClick={() => setNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#8b5cf6] px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/20 transition hover:bg-[#7c3aed]"
          >
            <Plus className="h-4 w-4" />
            <span>{t("tasks.new_button")}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-[#13151f] p-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[#8b5cf6]" />
          <span className="font-semibold text-gray-300">{t("tasks.filter_project")}</span>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded-lg border border-gray-800 bg-[#181a26] px-2.5 py-1.5 text-white focus:outline-none"
          >
            <option value="">{t("tasks.all_projects")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-300">{t("tasks.filter_priority")}</span>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="rounded-lg border border-gray-800 bg-[#181a26] px-2.5 py-1.5 text-white focus:outline-none"
          >
            <option value="">{t("tasks.all_priorities")}</option>
            <option value="low">{t("task_modal.priority_low")}</option>
            <option value="medium">{t("task_modal.priority_medium")}</option>
            <option value="high">{t("task_modal.priority_high")}</option>
            <option value="urgent">{t("task_modal.priority_urgent")}</option>
          </select>
        </div>

        <div className="ml-auto flex items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "بحث في المهام..." : "Search tasks..."}
            className="rounded-lg border border-gray-800 bg-[#181a26] px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ── KANBAN BOARD VIEW ────────────────────────────────────────────── */}
      {viewMode === "kanban" && (
        <div>
          <p className="mb-3 text-[11px] text-gray-400 italic flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-[#8b5cf6]" />
            <span>{t("tasks.drag_hint")}</span>
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter((t) => {
                if (col.status === "pending") return t.status === "pending" || t.status === "planning";
                if (col.status === "review") return t.status === "review" || t.status === "needs_approval";
                return t.status === col.status;
              });

              const isOver = dragOverCol === col.id;

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCol(col.id);
                  }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(col.status);
                  }}
                  className={`flex flex-col rounded-2xl border transition-all ${
                    isOver
                      ? "border-[#8b5cf6] bg-[#8b5cf6]/15 ring-2 ring-[#8b5cf6]/30"
                      : "border-gray-800/80 bg-[#13151f]/80"
                  } p-3 min-h-[500px]`}
                >
                  {/* Column Header */}
                  <div className="mb-3 flex items-center justify-between pb-2 border-b border-gray-800">
                    <span className="text-xs font-bold text-gray-200">
                      {t(col.labelKey)}
                    </span>
                    <span className="rounded-full bg-gray-800/80 px-2 py-0.5 text-[10px] font-extrabold text-gray-300">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Tasks in Column */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto">
                    {colTasks.length === 0 ? (
                      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-gray-800 text-[11px] text-gray-500">
                        {isAr ? "فارغ" : "Empty"}
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => openTaskDetail(task.id)}
                          className="group relative cursor-grab rounded-xl border border-gray-800 bg-[#181a26] p-3 shadow transition-all hover:border-[#8b5cf6]/60 hover:shadow-lg active:cursor-grabbing"
                        >
                          {/* Priority badge & Project Name */}
                          <div className="mb-2 flex items-center justify-between">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                task.priority === "urgent"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : task.priority === "high"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-gray-700/40 text-gray-300"
                              }`}
                            >
                              {task.priority}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
                              {task.project_name}
                            </span>
                          </div>

                          {/* Task Title */}
                          <h4 className="text-xs font-bold text-white group-hover:text-[#a78bfa] transition">
                            {task.title}
                          </h4>

                          {/* Progress Bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                              <span>{t("task_modal.progress")}</span>
                              <span className="font-bold text-[#a78bfa]">{task.progress_percentage}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#8b5cf6] to-indigo-500 transition-all duration-300"
                                style={{ width: `${task.progress_percentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Card Footer: Assignee & Due Date */}
                          <div className="mt-3 flex items-center justify-between border-t border-gray-800/60 pt-2 text-[10px] text-gray-400">
                            <span className="flex items-center gap-1">
                              <UserCheck className="h-2.5 w-2.5 text-[#8b5cf6]" />
                              <span className="truncate max-w-[90px]">
                                {task.assigned_user_name || "All Team"}
                              </span>
                            </span>

                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5 text-gray-500" />
                                <span>{task.due_date.slice(5, 10)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TABLE VIEW (Virtualized) ─────────────────────────────────── */}
      {viewMode === "table" && (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#13151f] shadow-sm">
          <div ref={tableContainerRef} className="max-h-[640px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-gray-800 bg-[#161824] text-[11px] uppercase tracking-wider text-gray-400 shadow-sm">
                <tr>
                  <th className="px-5 py-3.5">{t("task_modal.title")}</th>
                  <th className="px-5 py-3.5">{t("task_modal.project")}</th>
                  <th className="px-5 py-3.5">{t("task_modal.status")}</th>
                  <th className="px-5 py-3.5">{t("task_modal.priority")}</th>
                  <th className="px-5 py-3.5">{t("task_modal.progress")}</th>
                  <th className="px-5 py-3.5">{t("task_modal.assigned_to")}</th>
                  <th className="px-5 py-3.5 text-right">{t("clients.col_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      {t("tasks.empty")}
                    </td>
                  </tr>
                ) : (
                  <>
                    {paddingTop > 0 && (
                      <tr>
                        <td colSpan={7} style={{ height: `${paddingTop}px` }} />
                      </tr>
                    )}
                    {virtualRows.map((virtualRow) => {
                      const task = filteredTasks[virtualRow.index];
                      if (!task) return null;
                      return (
                        <tr
                          key={task.id}
                          onClick={() => openTaskDetail(task.id)}
                          className="cursor-pointer transition hover:bg-[#181a26]"
                        >
                          <td className="px-5 py-3.5 font-bold text-white hover:text-[#a78bfa]">
                            {task.title}
                          </td>
                          <td className="px-5 py-3.5 text-gray-300">{task.project_name}</td>
                          <td className="px-5 py-3.5">
                            <span className="rounded bg-[#8b5cf6]/10 px-2 py-0.5 text-[10px] font-bold text-[#c4b5fd] uppercase">
                              {task.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                task.priority === "urgent"
                                  ? "text-red-400 bg-red-500/10"
                                  : task.priority === "high"
                                  ? "text-amber-400 bg-amber-500/10"
                                  : "text-gray-300 bg-gray-800"
                              }`}
                            >
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-gray-800 overflow-hidden">
                                <div
                                  className="h-full bg-[#8b5cf6]"
                                  style={{ width: `${task.progress_percentage}%` }}
                                />
                              </div>
                              <span className="font-mono text-[10px] text-gray-400">
                                {task.progress_percentage}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-gray-300">
                            {task.assigned_user_name || "—"}
                          </td>
                          <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteTask(task.id, task.title)}
                              className="rounded-lg p-1 text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {paddingBottom > 0 && (
                      <tr>
                        <td colSpan={7} style={{ height: `${paddingBottom}px` }} />
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── NEW TASK MODAL ──────────────────────────────────────────────── */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-[#13151f] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="text-base font-bold text-white">
                {t("task_modal.title_new")}
              </h3>
              <button
                onClick={() => setNewModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              {/* Project Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t("task_modal.project")} *
                </label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t("task_modal.title")} *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Conduct Competitor PR Media Audit"
                  className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t("task_modal.description")}
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task instructions, deliverables, quality criteria..."
                  className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("task_modal.status")}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                  >
                    <option value="pending">{t("tasks.col_pending")}</option>
                    <option value="assigned">{t("tasks.col_assigned")}</option>
                    <option value="in_progress">{t("tasks.col_in_progress")}</option>
                    <option value="review">{t("tasks.col_review")}</option>
                    <option value="completed">{t("tasks.col_completed")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("task_modal.priority")}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                  >
                    <option value="low">{t("task_modal.priority_low")}</option>
                    <option value="medium">{t("task_modal.priority_medium")}</option>
                    <option value="high">{t("task_modal.priority_high")}</option>
                    <option value="urgent">{t("task_modal.priority_urgent")}</option>
                  </select>
                </div>
              </div>

              {/* Assignee & Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("task_modal.assigned_to")}
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                  >
                    <option value="">{t("task_modal.unassigned")}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("task_modal.due_date")}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Dependencies Selection */}
              {tasks.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("task_modal.dependencies")}
                  </label>
                  <select
                    multiple
                    value={dependencies}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                      setDependencies(selected);
                    }}
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] p-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none h-20"
                  >
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="rounded-lg border border-gray-800 bg-[#181a26] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#202333]"
                >
                  {t("task_modal.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#8b5cf6] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/20 hover:bg-[#7c3aed] disabled:opacity-50"
                >
                  {saving ? t("task_modal.saving") : t("task_modal.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TASK DETAIL & TIMELINE MODAL ─────────────────────────────────── */}
      {activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-gray-800 bg-[#13151f] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400">{activeTask.project_name} /</span>
                <span className="rounded bg-[#8b5cf6]/20 px-2 py-0.5 text-[10px] font-bold text-[#c4b5fd] uppercase">
                  {activeTask.priority}
                </span>
              </div>
              <button
                data-testid="detail-modal-close"
                onClick={() => setActiveTask(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-5">
              {/* Title & Description */}
              <div>
                <h2 className="text-lg font-bold text-white sm:text-xl">{activeTask.title}</h2>
                <p className="mt-2 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {activeTask.description || (isAr ? "لا توجد تفاصيل إضافية." : "No description provided.")}
                </p>
              </div>

              {/* Status Switcher & Progress bar */}
              <div className="rounded-xl border border-gray-800 bg-[#181a26] p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      {t("task_modal.status")}
                    </label>
                    <select
                      data-testid="detail-status-select"
                      value={activeTask.status}
                      onChange={(e) => handleStatusChangeInDetail(e.target.value as any)}
                      className="rounded-lg border border-gray-800 bg-[#13151f] px-3 py-1.5 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                    >
                      <option value="pending">⏳ Pending (0%)</option>
                      <option value="planning">📋 Planning (10%)</option>
                      <option value="assigned">👤 Assigned (20%)</option>
                      <option value="in_progress">⚡ In Progress (50%)</option>
                      <option value="review">🔍 Review (80%)</option>
                      <option value="needs_approval">🛡️ Needs Approval (90%)</option>
                      <option value="completed">✅ Completed (100%)</option>
                    </select>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-xs text-gray-400">{t("task_modal.progress")}: </span>
                    <span className="text-lg font-black text-[#a78bfa]">
                      {activeTask.progress_percentage}%
                    </span>
                    <div className="mt-1 h-2 w-36 rounded-full bg-gray-800 overflow-hidden sm:ml-auto">
                      <div
                        className="h-full bg-gradient-to-r from-[#8b5cf6] to-indigo-500"
                        style={{ width: `${activeTask.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Timeline (Audit Trail) */}
              <div>
                <h3 data-testid="audit-timeline" className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-[#8b5cf6]" />
                  <span>{t("task_modal.timeline")}</span>
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeTask.events?.length ? (
                    activeTask.events.map((evt) => (
                      <div
                        key={evt.id}
                        className="flex items-start gap-3 rounded-lg border border-gray-800/80 bg-[#181a26]/70 p-2.5 text-xs"
                      >
                        <span className="mt-0.5 h-2 w-2 rounded-full bg-[#8b5cf6] shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-white">
                            {evt.event_type === "status_change"
                              ? `Status changed from ${evt.metadata.old_status} to ${evt.metadata.new_status} (${evt.metadata.progress_percentage}%)`
                              : evt.event_type}
                          </p>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(evt.timestamp).toLocaleTimeString(isAr ? "ar-EG" : "en-US")} •{" "}
                            {new Date(evt.timestamp).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500">No events logged yet.</p>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <button
                  onClick={() => handleDeleteTask(activeTask.id, activeTask.title)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{t("clients.delete")}</span>
                </button>

                <button
                  onClick={() => setActiveTask(null)}
                  className="rounded-lg bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  {t("client_modal.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

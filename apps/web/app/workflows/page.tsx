"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Workflow as WorkflowIcon,
  Play,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  X,
  Bot,
  Sparkles,
  Layers,
  ChevronRight,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  Workflow,
  Project,
  Agent,
  fetchWorkflows,
  fetchProjects,
  fetchAgents,
  createWorkflow,
  deleteWorkflow,
  executeWorkflow,
} from "@/lib/api";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  planning: {
    label: "Planning DAG",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  running: {
    label: "Running ⚡",
    bg: "bg-purple-500/15",
    text: "text-[#c4b5fd]",
    border: "border-[#8b5cf6]/40",
  },
  waiting_approval: {
    label: "Needs Approval 🛡️",
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  completed: {
    label: "Completed ✅",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  failed: {
    label: "Failed ❌",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-gray-800",
    text: "text-gray-400",
    border: "border-gray-700",
  },
};

interface BuilderStep {
  id: string;
  title: string;
  assigned_agent_id: string;
  assigned_agent_name: string;
  input_prompt: string;
  requires_approval: boolean;
}

export default function WorkflowsPage() {
  const { t, isAr } = useI18n();
  const router = useRouter();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<"builder" | "om_samah">(
    "builder"
  );
  const [workflowTitle, setWorkflowTitle] = useState("");
  const [userRequest, setUserRequest] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [starting, setStarting] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Custom Step Builder State
  const [customSteps, setCustomSteps] = useState<BuilderStep[]>([
    {
      id: "step-1",
      title: "Market & Audience Research",
      assigned_agent_id: "dr-ibrahim",
      assigned_agent_name: "Dr. Ibrahim",
      input_prompt:
        "Gather target audience insights, competitors and market hooks",
      requires_approval: false,
    },
    {
      id: "step-2",
      title: "Viral Copywriting & Script",
      assigned_agent_id: "copywriter",
      assigned_agent_name: "Content Architect",
      input_prompt: "Draft high-converting ad copy and social posts",
      requires_approval: false,
    },
    {
      id: "step-3",
      title: "Quality Review & Human Approval",
      assigned_agent_id: "qa-lead",
      assigned_agent_name: "QA Lead",
      input_prompt: "Review output for compliance, tone, and brand safety",
      requires_approval: true,
    },
  ]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const [wfData, projData, agentData] = await Promise.all([
        fetchWorkflows(),
        fetchProjects(),
        fetchAgents(),
      ]);
      setWorkflows(wfData);
      setProjects(projData);
      setAgents(agentData);
      if (projData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projData[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load workflows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadSample = () => {
    setWorkflowTitle("Luxury Restaurant Cairo PR Campaign");
    setUserRequest(
      "Plan a full luxury marketing and PR campaign for a new high-end restaurant client in Cairo."
    );
    setError(null);
  };

  // Step Management
  const handleAddStep = () => {
    const defaultAgent = agents[0] || { id: "dr-ibrahim", name: "Dr. Ibrahim" };
    const newStep: BuilderStep = {
      id: `step-${Date.now()}`,
      title: `Step ${customSteps.length + 1}`,
      assigned_agent_id: defaultAgent.id,
      assigned_agent_name: defaultAgent.name,
      input_prompt: "",
      requires_approval: false,
    };
    setCustomSteps([...customSteps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    if (customSteps.length <= 1) return;
    setCustomSteps(customSteps.filter((_, i) => i !== index));
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= customSteps.length) return;
    const updated = [...customSteps];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setCustomSteps(updated);
  };

  // Drag and Drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...customSteps];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, moved);
    setDraggedIndex(index);
    setCustomSteps(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleStepChange = (
    index: number,
    field: keyof BuilderStep,
    value: any
  ) => {
    const updated = [...customSteps];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "assigned_agent_id") {
      const selected = agents.find(a => a.id === value);
      if (selected) {
        updated[index].assigned_agent_name = selected.name;
      }
    }
    setCustomSteps(updated);
  };

  const handleStartWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqText =
      userRequest.trim() ||
      workflowTitle.trim() ||
      "Execute multi-step agency workflow";
    if (!reqText) return;

    try {
      setStarting(true);
      setError(null);

      if (builderMode === "builder") {
        const stepsPayload = customSteps.map((step, idx) => ({
          assigned_agent_id: step.assigned_agent_id,
          assigned_agent_name: step.assigned_agent_name,
          title: step.title || `Step ${idx + 1}`,
          step_order: idx + 1,
          input: { instruction: step.input_prompt },
          requires_approval: step.requires_approval,
        }));

        const newWf = await createWorkflow({
          title: workflowTitle.trim() || reqText.slice(0, 50),
          user_request: reqText,
          project_id: selectedProjectId || undefined,
          steps: stepsPayload,
          auto_start: true,
        });
        setModalOpen(false);
        setUserRequest("");
        setWorkflowTitle("");
        router.push(`/workflows/${newWf.id}`);
      } else {
        const newWf = await createWorkflow({
          title: workflowTitle.trim() || reqText.slice(0, 50),
          user_request: reqText,
          project_id: selectedProjectId || undefined,
        });
        setModalOpen(false);
        setUserRequest("");
        setWorkflowTitle("");
        router.push(`/workflows/${newWf.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to start workflow");
    } finally {
      setStarting(false);
    }
  };

  const handleExecuteNow = async (e: React.MouseEvent, wfId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setExecutingId(wfId);
      await executeWorkflow(wfId);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Execution failed");
    } finally {
      setExecutingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, wfId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        isAr
          ? "هل أنت متأكد من حذف مسار العمل هذا وجميع خطواته وسجلاته؟"
          : "Are you sure you want to delete this workflow and all its steps?"
      )
    ) {
      return;
    }
    try {
      setDeletingId(wfId);
      await deleteWorkflow(wfId);
      setWorkflows(prev => prev.filter(w => w.id !== wfId));
    } catch (err: any) {
      alert(err.message || "Failed to delete workflow");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredWorkflows = workflows.filter(wf => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (wf.title || "").toLowerCase().includes(q);
    const reqMatch = (wf.user_request || "").toLowerCase().includes(q);
    const projMatch = (wf.project_name || "").toLowerCase().includes(q);
    return titleMatch || reqMatch || projMatch;
  });

  return (
    <AppShell>
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {isAr
                ? "منشئ مسارات العمل (Workflow Builder)"
                : t("workflows.title")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 px-2.5 py-0.5 text-xs font-bold text-[#c4b5fd]">
              <Layers className="h-3.5 w-3.5 text-[#8b5cf6]" />
              <span>
                {isAr ? "تسلسل الوكلاء والـ DAG" : "Visual DAG Sequencer"}
              </span>
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {isAr
              ? "ابنِ مسارات عمل مخصصة بسحب وإفلات خطوات الوكلاء، أو استخدم الذكاء الاصطناعي لتخطيط المهام وتشغيلها بالتوازي."
              : t("workflows.subtitle")}
          </p>
        </div>

        {/* Start Workflow CTA Button */}
        <div className="flex items-center gap-2">
          <button
            data-testid="start-workflow-cta"
            onClick={() => {
              setModalOpen(true);
              setError(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/25 hover:from-[#7c3aed] hover:to-indigo-500 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>
              {isAr ? "إنشاء مسار عمل جديد" : t("workflows.start_button")}
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={
              isAr
                ? "ابحث في مسارات العمل أو المشاريع..."
                : "Search workflows or projects..."
            }
            className="w-full rounded-xl border border-gray-800 bg-[#13151f] pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
          />
        </div>
        <div className="text-xs text-gray-400">
          {isAr ? "إجمالي المسارات:" : "Total Workflows:"}{" "}
          <span className="font-bold text-white">
            {filteredWorkflows.length}
          </span>
        </div>
      </div>

      {/* Workflows List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-[#13151f]/50 p-12 text-center">
          <WorkflowIcon className="h-12 w-12 text-[#8b5cf6]/40 mb-3" />
          <h3 className="text-sm font-bold text-white">
            {t("workflows.empty")}
          </h3>
          <p className="mt-1 text-xs text-gray-500 max-w-md">
            {isAr
              ? "أنشئ مسار عمل مخصص واجمع وكلاء الذكاء الاصطناعي في خطوات متسلسلة ومتوازية لتنفيذ مهام التسويق والـ PR تلقائياً."
              : "Om Samah autonomously analyzes complex briefs, breaks them into a DAG, assigns agents, executes parallel tasks, and delivers validated assets."}
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 rounded-xl bg-[#8b5cf6] px-4 py-2 text-xs font-bold text-white hover:bg-[#7c3aed] transition"
          >
            {isAr ? "إنشاء أول مسار عمل" : t("workflows.start_button")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWorkflows.map(wf => {
            const statusConfig =
              STATUS_CONFIG[wf.status] || STATUS_CONFIG.planning;
            const completedCount = wf.steps.filter(
              s => s.status === "completed"
            ).length;
            const totalSteps = wf.steps.length || 0;
            const isRunning = wf.status === "running";

            return (
              <div
                key={wf.id}
                data-testid={`workflow-item-${wf.id}`}
                className="group relative flex flex-col md:flex-row md:items-center justify-between rounded-2xl border border-gray-800 bg-[#13151f] p-5 shadow-lg transition duration-200 hover:border-[#8b5cf6]/60 hover:shadow-xl hover:shadow-[#8b5cf6]/5"
              >
                <Link
                  href={`/workflows/${wf.id}`}
                  className="flex-1 space-y-1.5 pr-4 cursor-pointer"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                    >
                      {statusConfig.label}
                    </span>
                    {wf.project_name && (
                      <span className="text-[11px] text-gray-400 font-medium">
                        • {wf.project_name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-[#c4b5fd] transition">
                    {wf.title || wf.user_request}
                  </h3>
                  {wf.title && wf.title !== wf.user_request && (
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {wf.user_request}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-[11px] text-gray-500 pt-1">
                    <span>
                      {isAr ? "الخطوات:" : "Steps:"} {completedCount} /{" "}
                      {totalSteps} {isAr ? "مكتملة" : "Completed"}
                    </span>
                    <span>
                      • {wf.created_at?.slice(0, 16).replace("T", " ")}
                    </span>
                  </div>
                </Link>

                <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3">
                  {/* Step status pills */}
                  <div className="flex items-center gap-1">
                    {wf.steps.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        title={`${s.assigned_agent_name || "Agent"}: ${s.status}`}
                        className={`h-2.5 w-6 rounded-full transition ${
                          s.status === "completed"
                            ? "bg-emerald-500"
                            : s.status === "running"
                              ? "bg-[#8b5cf6] animate-pulse"
                              : s.status === "waiting_approval"
                                ? "bg-amber-500 animate-pulse"
                                : "bg-gray-800"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!isRunning && (
                      <button
                        title={isAr ? "تشغيل الآن" : "Execute Now"}
                        onClick={e => handleExecuteNow(e, wf.id)}
                        disabled={executingId === wf.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition disabled:opacity-50"
                      >
                        {executingId === wf.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3 fill-current" />
                        )}
                        <span>{isAr ? "تشغيل" : "Run"}</span>
                      </button>
                    )}

                    <Link
                      href={`/workflows/${wf.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800/60 text-gray-300 hover:bg-[#8b5cf6] hover:text-white transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>

                    <button
                      title={isAr ? "حذف المسار" : "Delete Workflow"}
                      onClick={e => handleDelete(e, wf.id)}
                      disabled={deletingId === wf.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800/60 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition"
                    >
                      {deletingId === wf.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── WORKFLOW BUILDER MODAL ────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-gray-800 bg-[#12141e] p-6 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd]">
                  <WorkflowIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isAr
                      ? "إنشاء مسار عمل جديد (Workflow Builder)"
                      : t("workflows.modal_title")}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {isAr
                      ? "حدد خطوات تسلسل العمل وقم بتعيين الوكلاء المناسبين لكل خطوة."
                      : "Configure sequence steps and assign specialized agents."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="mt-4 flex rounded-xl border border-gray-800 bg-[#181a26] p-1">
              <button
                type="button"
                onClick={() => setBuilderMode("builder")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                  builderMode === "builder"
                    ? "bg-[#8b5cf6] text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>
                  {isAr
                    ? "منشئ الخطوات المخصص (Visual Sequencer)"
                    : "Custom Step Sequencer"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBuilderMode("om_samah")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                  builderMode === "om_samah"
                    ? "bg-[#8b5cf6] text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  {isAr
                    ? "التخطيط التلقائي (Om Samah AI)"
                    : "Autonomous Om Samah AI"}
                </span>
              </button>
            </div>

            <form onSubmit={handleStartWorkflow} className="mt-4 space-y-4">
              {/* Common Fields: Title & Project */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {isAr ? "عنوان مسار العمل" : "Workflow Title"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={workflowTitle}
                    onChange={e => setWorkflowTitle(e.target.value)}
                    placeholder={
                      isAr
                        ? "مثال: إطلاق حملة الـ PR الربعية"
                        : "e.g. Q4 Growth Launch"
                    }
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {isAr ? "المشروع المرتبط" : "Associated Project"}
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                  >
                    <option value="">
                      {isAr
                        ? "-- مسار عمل عام للوكالة --"
                        : "-- General Agency Workflow --"}
                    </option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.client_name || "Client"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mode A: Custom Step Sequencer */}
              {builderMode === "builder" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-300">
                      {isAr
                        ? "خطوات مسار العمل (اسحب لإعادة الترتيب):"
                        : "Workflow Steps (Drag to reorder):"}
                    </label>
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#a78bfa] hover:text-white"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{isAr ? "إضافة خطوة" : "Add Step"}</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {customSteps.map((step, index) => (
                      <div
                        key={step.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={e => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex flex-col gap-2 rounded-xl border p-3 bg-[#161825] transition ${
                          draggedIndex === index
                            ? "border-[#8b5cf6] opacity-75"
                            : "border-gray-800 hover:border-gray-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="cursor-grab text-gray-500 hover:text-gray-300">
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8b5cf6]/20 text-[10px] font-bold text-[#c4b5fd]">
                              {index + 1}
                            </span>
                            <input
                              type="text"
                              value={step.title}
                              onChange={e =>
                                handleStepChange(index, "title", e.target.value)
                              }
                              placeholder={isAr ? "اسم الخطوة" : "Step Title"}
                              className="flex-1 rounded-lg border border-gray-800 bg-[#12141e] px-2.5 py-1 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                            />
                          </div>

                          {/* Agent Picker */}
                          <select
                            value={step.assigned_agent_id}
                            onChange={e =>
                              handleStepChange(
                                index,
                                "assigned_agent_id",
                                e.target.value
                              )
                            }
                            className="w-48 rounded-lg border border-gray-800 bg-[#12141e] px-2 py-1 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                          >
                            {agents.map(ag => (
                              <option key={ag.id} value={ag.id}>
                                {ag.name} ({ag.role || ag.department || "Agent"}
                                )
                              </option>
                            ))}
                          </select>

                          {/* Reorder and Delete buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveStep(index, "up")}
                              disabled={index === 0}
                              title="Move Up"
                              className="p-1 text-gray-500 hover:text-white disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveStep(index, "down")}
                              disabled={index === customSteps.length - 1}
                              title="Move Down"
                              className="p-1 text-gray-500 hover:text-white disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(index)}
                              disabled={customSteps.length <= 1}
                              title="Delete Step"
                              className="p-1 text-gray-500 hover:text-red-400 disabled:opacity-30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Step Details & Approval Toggle */}
                        <div className="flex items-center gap-3 pl-7">
                          <input
                            type="text"
                            value={step.input_prompt}
                            onChange={e =>
                              handleStepChange(
                                index,
                                "input_prompt",
                                e.target.value
                              )
                            }
                            placeholder={
                              isAr
                                ? "توجيهات أو أهداف هذه الخطوة (اختياري)..."
                                : "Instructions / goals for this step (optional)..."
                            }
                            className="flex-1 rounded-lg border border-gray-800/80 bg-[#12141e] px-2.5 py-1 text-[11px] text-gray-300 placeholder-gray-600 focus:border-[#8b5cf6] focus:outline-none"
                          />
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-400 shrink-0 select-none">
                            <input
                              type="checkbox"
                              checked={step.requires_approval}
                              onChange={e =>
                                handleStepChange(
                                  index,
                                  "requires_approval",
                                  e.target.checked
                                )
                              }
                              className="rounded border-gray-700 bg-gray-800 text-[#8b5cf6] focus:ring-0"
                            />
                            <span>
                              {isAr
                                ? "موافقة بشرية مطلوبة"
                                : "Requires Approval"}
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Mode B: Om Samah AI Autonomous Request */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-300">
                      {t("workflows.request_label")} *
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="text-[10px] font-bold text-[#a78bfa] hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      {t("workflows.load_sample")}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    required={builderMode === "om_samah"}
                    data-testid="workflow-request-input"
                    value={userRequest}
                    onChange={e => setUserRequest(e.target.value)}
                    placeholder={t("workflows.request_placeholder")}
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] p-3 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit CTA */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-gray-800 bg-[#181a26] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#202333]"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={starting}
                  data-testid="submit-workflow-btn"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#8b5cf6] to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/20 hover:from-[#7c3aed] hover:to-indigo-500 disabled:opacity-50"
                >
                  {starting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>{t("workflows.initiating")}</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>
                        {builderMode === "builder"
                          ? isAr
                            ? "إنشاء وتشغيل المسار"
                            : "Create & Execute Workflow"
                          : t("workflows.start_now")}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

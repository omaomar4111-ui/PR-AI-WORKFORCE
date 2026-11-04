"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Workflow as WorkflowIcon,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Plus,
  RefreshCw,
  X,
  Bot,
  Sparkles,
  Layers,
  ChevronRight,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  Workflow,
  Project,
  fetchWorkflows,
  fetchProjects,
  createWorkflow,
} from "@/lib/api";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  planning: { label: "Planning DAG", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  running: { label: "Running ⚡", bg: "bg-purple-500/15", text: "text-[#c4b5fd]", border: "border-[#8b5cf6]/40" },
  waiting_approval: { label: "Needs Approval 🛡️", bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  completed: { label: "Completed ✅", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  failed: { label: "Failed ❌", bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  cancelled: { label: "Cancelled", bg: "bg-gray-800", text: "text-gray-400", border: "border-gray-700" },
};

export default function WorkflowsPage() {
  const { t, isAr } = useI18n();
  const router = useRouter();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // New Workflow Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [userRequest, setUserRequest] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [wfData, projData] = await Promise.all([
        fetchWorkflows(),
        fetchProjects(),
      ]);
      setWorkflows(wfData);
      setProjects(projData);
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
    setUserRequest("Plan a full luxury marketing and PR campaign for a new high-end restaurant client in Cairo.");
    setError(null);
  };

  const handleStartWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRequest.trim()) return;

    try {
      setStarting(true);
      setError(null);
      const newWf = await createWorkflow({
        user_request: userRequest.trim(),
        project_id: selectedProjectId || undefined,
      });
      setModalOpen(false);
      setUserRequest("");
      router.push(`/workflows/${newWf.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to start workflow");
    } finally {
      setStarting(false);
    }
  };

  return (
    <AppShell>
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {t("workflows.title")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 px-2.5 py-0.5 text-xs font-bold text-[#c4b5fd]">
              <Bot className="h-3.5 w-3.5 text-[#8b5cf6]" />
              <span>Om Samah (CEO)</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {t("workflows.subtitle")}
          </p>
        </div>

        {/* Start Workflow CTA Button */}
        <button
          data-testid="start-workflow-cta"
          onClick={() => {
            setModalOpen(true);
            setError(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/25 hover:from-[#7c3aed] hover:to-indigo-500 transition"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>{t("workflows.start_button")}</span>
        </button>
      </div>

      {/* Workflows List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-[#13151f]/50 p-12 text-center">
          <WorkflowIcon className="h-12 w-12 text-[#8b5cf6]/40 mb-3" />
          <h3 className="text-sm font-bold text-white">{t("workflows.empty")}</h3>
          <p className="mt-1 text-xs text-gray-500 max-w-md">
            Om Samah autonomously analyzes complex briefs, breaks them into a 5-step DAG, assigns agents, executes parallel tasks, and delivers validated assets.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 rounded-xl bg-[#8b5cf6] px-4 py-2 text-xs font-bold text-white hover:bg-[#7c3aed] transition"
          >
            {t("workflows.start_button")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => {
            const statusConfig = STATUS_CONFIG[wf.status] || STATUS_CONFIG.planning;
            const completedCount = wf.steps.filter((s) => s.status === "completed").length;
            const totalSteps = wf.steps.length || 5;

            return (
              <Link
                key={wf.id}
                href={`/workflows/${wf.id}`}
                data-testid={`workflow-item-${wf.id}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-gray-800 bg-[#13151f] p-5 shadow-lg transition duration-200 hover:border-[#8b5cf6]/60 hover:shadow-xl hover:shadow-[#8b5cf6]/5"
              >
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex items-center gap-2">
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
                    {wf.user_request}
                  </h3>
                  <div className="flex items-center gap-4 text-[11px] text-gray-500">
                    <span>Steps: {completedCount} / {totalSteps} Completed</span>
                    <span>• Started: {wf.created_at?.slice(0, 16).replace("T", " ")}</span>
                  </div>
                </div>

                <div className="mt-4 sm:mt-0 flex items-center gap-3">
                  {/* Step pills */}
                  <div className="flex items-center gap-1">
                    {wf.steps.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        title={`${s.assigned_agent_name}: ${s.status}`}
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

                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800/50 text-gray-400 group-hover:bg-[#8b5cf6] group-hover:text-white transition">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── START WORKFLOW MODAL ────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl border border-gray-800 bg-[#12141e] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd]">
                  <WorkflowIcon className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {t("workflows.modal_title")}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleStartWorkflow} className="mt-5 space-y-4">
              {/* Project Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Associated Client Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                >
                  <option value="">-- General Agency Workflow --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.client_name || "Client"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Request Brief */}
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
                  required
                  data-testid="workflow-request-input"
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  placeholder={t("workflows.request_placeholder")}
                  className="w-full rounded-lg border border-gray-800 bg-[#181a26] p-3 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                />
              </div>

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
                  Cancel
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
                      <span>{t("workflows.start_now")}</span>
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

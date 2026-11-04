"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Workflow as WorkflowIcon,
  Brain,
  Target,
  Palette,
  PenTool,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Download,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  X,
  FileCode,
  ShieldAlert,
  ChevronDown,
  Eye,
  Layers,
  ArrowDown,
  GitBranch,
  Bot,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  Workflow,
  WorkflowStep,
  fetchWorkflow,
  approveWorkflowStep,
  getWsBaseUrl,
} from "@/lib/api";

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "dr-ibrahim": Brain,
  ragaa: Target,
  copywriter: PenTool,
  fawzyia: Palette,
  "qa-lead": ShieldCheck,
};

export default function WorkflowDetailPage() {
  const { t, isAr } = useI18n();
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  // Selected Step for details drawer
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);

  // Approval Modal
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("Executive review complete. Approved for final packaging.");
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const loadWorkflowData = async () => {
    try {
      const data = await fetchWorkflow(workflowId);
      setWorkflow(data);
      if (selectedStep) {
        const updatedSelected = data.steps.find((s) => s.id === selectedStep.id);
        if (updatedSelected) setSelectedStep(updatedSelected);
      }
    } catch (err: any) {
      console.error("Failed to load workflow:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflowData();

    // WebSocket connection
    let ws: WebSocket;
    let reconnectTimeout: any;

    const connectWs = () => {
      try {
        const wsUrl = `${getWsBaseUrl()}/ws/workflows/${workflowId}`;
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => setWsConnected(true);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (
              msg.type === "workflow_updated" ||
              msg.type === "workflow_step_approved" ||
              msg.workflow_id === workflowId
            ) {
              loadWorkflowData();
            }
          } catch (e) {
            console.error(e);
          }
        };
        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWs, 3000);
        };
      } catch (err) {
        setWsConnected(false);
      }
    };

    connectWs();

    // Polling fallback
    const interval = setInterval(loadWorkflowData, 3000);

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [workflowId]);

  const handleApprove = async () => {
    if (!waitingStep) return;
    try {
      setSubmittingApproval(true);
      await approveWorkflowStep(workflowId, {
        step_id: waitingStep.id,
        approved: true,
        notes: approvalNotes,
      });
      setApprovalModalOpen(false);
      await loadWorkflowData();
    } catch (err: any) {
      alert(err.message || "Approval failed");
    } finally {
      setSubmittingApproval(false);
    }
  };

  const steps = workflow?.steps || [];
  const waitingStep = steps.find((s) => s.status === "waiting_approval");

  const step1 = steps.find((s) => s.assigned_agent_id === "dr-ibrahim");
  const step2 = steps.find((s) => s.assigned_agent_id === "ragaa");
  const step3 = steps.find((s) => s.assigned_agent_id === "copywriter");
  const step4 = steps.find((s) => s.assigned_agent_id === "fawzyia");
  const step5 = steps.find((s) => s.assigned_agent_id === "qa-lead");

  return (
    <AppShell>
      {/* Top Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/workflows"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Workflows</span>
        </Link>

        {/* Live WebSocket Status */}
        <div
          data-testid="ws-workflow-pill"
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            wsConnected
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-gray-800 text-gray-400 border border-gray-700"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`} />
          <span>{wsConnected ? "Live WebSocket DAG" : "Syncing..."}</span>
        </div>
      </div>

      {loading || !workflow ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Workflow Header Banner */}
          <div className="rounded-2xl border border-gray-800 bg-[#13151f] p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 px-2 py-0.5 text-[10px] font-bold text-[#c4b5fd] uppercase">
                    CEO Orchestrator (Om Samah)
                  </span>
                  <span
                    data-testid="workflow-status-badge"
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      workflow.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : workflow.status === "waiting_approval"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                        : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    }`}
                  >
                    {workflow.status}
                  </span>
                  {workflow.project_name && (
                    <span className="text-xs text-gray-400 font-medium">
                      • {workflow.project_name}
                    </span>
                  )}
                </div>
                <h1 className="mt-2 text-lg sm:text-xl font-extrabold text-white">
                  {workflow.user_request}
                </h1>
                <p className="mt-1 text-xs text-gray-400">
                  Started: {workflow.created_at?.slice(0, 16).replace("T", " ")}
                </p>
              </div>

              {/* Action */}
              <button
                onClick={loadWorkflowData}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-800 bg-[#181a26] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh DAG</span>
              </button>
            </div>
          </div>

          {/* ── HUMAN APPROVAL ALERT BANNER ───────────────────────────────── */}
          {waitingStep && (
            <div
              data-testid="approval-alert-banner"
              className="rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-500/15 to-orange-500/10 p-5 shadow-xl animate-pulse"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {t("workflows.step_approval_banner")}
                    </h3>
                    <p className="text-xs text-amber-200/80">
                      Step: {waitingStep.title} ({waitingStep.assigned_agent_name})
                    </p>
                  </div>
                </div>

                <button
                  data-testid="open-approval-btn"
                  onClick={() => setApprovalModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-amber-500/25 hover:bg-amber-400 transition"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t("workflows.step_approval_btn")}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── COMPILED DELIVERABLES PACKAGE CARD ────────────────────────── */}
          {workflow.status === "completed" && (
            <div
              data-testid="compiled-package-card"
              className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-[#13151f] to-indigo-900/10 p-6 shadow-2xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                      Final Agency Deliverable Sealed
                    </span>
                    <h3 className="mt-1 text-base font-bold text-white">
                      {t("workflows.compiled_package_title")}
                    </h3>
                    <p className="mt-1 text-xs text-gray-300 max-w-xl leading-relaxed">
                      All 5 multi-agent components (Research, Strategy, Viral Copywriting, Art Direction, and QA Audit) have been autonomously compiled and verified with an overall score of 98/100.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/deliverables"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400 transition"
                  >
                    <span>View in Deliverables</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  {workflow.compiled_deliverable_id && (
                    <a
                      href={`/storage/deliverables/${workflow.compiled_deliverable_id}.json`}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-700 bg-[#161824] px-4 py-2 text-xs font-bold text-gray-200 hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{t("workflows.download_package")}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── VISUAL DAG EXECUTION GRAPH ─────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-800 bg-[#10121a] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-[#8b5cf6]" />
                  <span>{t("workflows.dag_title")}</span>
                </h3>
                <p className="text-[11px] text-gray-400">{t("workflows.dag_subtitle")}</p>
              </div>

              <span className="text-[11px] font-mono text-gray-500">
                Om Samah DAG v1.0
              </span>
            </div>

            {/* DAG Diagram Container */}
            <div className="flex flex-col items-center py-4 space-y-6">
              {/* NODE 1: Dr. Ibrahim (Research) */}
              {step1 && (
                <DAGNodeCard
                  step={step1}
                  onSelect={() => setSelectedStep(step1)}
                  testId="dag-node-dr-ibrahim"
                />
              )}

              {/* Edge 1 -> 2 */}
              <div className="flex flex-col items-center text-gray-600">
                <div className="h-6 w-0.5 bg-[#8b5cf6]/40" />
                <ArrowDown className="h-4 w-4 text-[#8b5cf6]" />
              </div>

              {/* NODE 2: Ragaa (Strategy) */}
              {step2 && (
                <DAGNodeCard
                  step={step2}
                  onSelect={() => setSelectedStep(step2)}
                  testId="dag-node-ragaa"
                />
              )}

              {/* Fork Edges from 2 to Parallel (3 & 4) */}
              <div className="flex flex-col items-center text-gray-600 w-full max-w-lg">
                <div className="h-4 w-0.5 bg-[#8b5cf6]/40" />
                <div className="h-0.5 w-3/4 bg-[#8b5cf6]/40" />
                <div className="flex justify-between w-3/4">
                  <ArrowDown className="h-4 w-4 text-[#8b5cf6]" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#a78bfa] bg-[#181a26] px-2 py-0.5 rounded border border-[#8b5cf6]/30">
                    ⚡ Parallel Execution
                  </span>
                  <ArrowDown className="h-4 w-4 text-[#8b5cf6]" />
                </div>
              </div>

              {/* PARALLEL LEVEL: Copywriter (Left) + Fawzyia (Right) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
                {step3 && (
                  <DAGNodeCard
                    step={step3}
                    onSelect={() => setSelectedStep(step3)}
                    testId="dag-node-copywriter"
                  />
                )}
                {step4 && (
                  <DAGNodeCard
                    step={step4}
                    onSelect={() => setSelectedStep(step4)}
                    testId="dag-node-fawzyia"
                  />
                )}
              </div>

              {/* Join Edges from Parallel (3 & 4) to 5 */}
              <div className="flex flex-col items-center text-gray-600 w-full max-w-lg">
                <div className="flex justify-between w-3/4">
                  <div className="h-4 w-0.5 bg-[#8b5cf6]/40" />
                  <div className="h-4 w-0.5 bg-[#8b5cf6]/40" />
                </div>
                <div className="h-0.5 w-3/4 bg-[#8b5cf6]/40" />
                <div className="h-4 w-0.5 bg-[#8b5cf6]/40" />
                <ArrowDown className="h-4 w-4 text-[#8b5cf6]" />
              </div>

              {/* NODE 5: QA Lead (Audit & Approval) */}
              {step5 && (
                <DAGNodeCard
                  step={step5}
                  onSelect={() => setSelectedStep(step5)}
                  testId="dag-node-qa-lead"
                  isApprovalGate={true}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP DETAIL DRAWER ───────────────────────────────────────────── */}
      {selectedStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-800 bg-[#12141e] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Step {selectedStep.step_order} • {selectedStep.assigned_agent_name}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedStep.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStep(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Status and Quality */}
              <div className="flex items-center gap-3">
                <span className="rounded bg-gray-800 px-2 py-0.5 text-gray-300 font-bold uppercase">
                  Status: {selectedStep.status}
                </span>
                <span className="rounded bg-emerald-500/20 text-emerald-400 px-2 py-0.5 font-bold">
                  Quality Score: {selectedStep.quality_score}/100
                </span>
                {selectedStep.deliverable_id && (
                  <a
                    href={`/storage/deliverables/${selectedStep.deliverable_id}.json`}
                    download
                    className="text-[#a78bfa] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Download className="h-3 w-3" />
                    Download File
                  </a>
                )}
              </div>

              {/* Step Output JSON */}
              <div>
                <label className="block text-gray-400 font-semibold mb-1">
                  Agent Structured Output:
                </label>
                <div className="rounded-xl border border-gray-800 bg-[#0c0e15] p-3 max-h-72 overflow-y-auto font-mono text-[11px] text-gray-200">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedStep.output, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HUMAN APPROVAL MODAL ─────────────────────────────────────────── */}
      {approvalModalOpen && waitingStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div data-testid="approval-modal" className="relative w-full max-w-xl rounded-2xl border border-amber-500/40 bg-[#12141e] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t("workflows.approval_modal_title")}
                  </h3>
                  <p className="text-xs text-amber-300">
                    Step {waitingStep.step_order}: {waitingStep.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovalModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-gray-800 bg-[#181a26] p-4 text-xs text-gray-300">
                <p className="font-semibold text-white mb-2">Quality Assurance Assessment:</p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>All client brief requirements addressed without omissions</span>
                  </li>
                  <li className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Copywriting & art direction alignment verified</span>
                  </li>
                  <li className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Overall Quality Score: {waitingStep.quality_score}/100</span>
                  </li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t("workflows.approval_notes")}
                </label>
                <textarea
                  rows={3}
                  data-testid="approval-notes"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-800 bg-[#181a26] p-3 text-xs text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setApprovalModalOpen(false)}
                  className="rounded-lg border border-gray-800 bg-[#181a26] px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="confirm-approval-btn"
                  disabled={submittingApproval}
                  onClick={handleApprove}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/25 hover:bg-amber-400 disabled:opacity-50 transition"
                >
                  {submittingApproval ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Resuming Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t("workflows.approve_btn")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function DAGNodeCard({
  step,
  onSelect,
  testId,
  isApprovalGate = false,
}: {
  step: WorkflowStep;
  onSelect: () => void;
  testId?: string;
  isApprovalGate?: boolean;
}) {
  const Icon = AGENT_ICONS[step.assigned_agent_id] || Bot;

  const isCompleted = step.status === "completed";
  const isRunning = step.status === "running";
  const isWaiting = step.status === "waiting_approval";

  return (
    <div
      data-testid={testId}
      onClick={onSelect}
      className={`relative cursor-pointer rounded-2xl border p-4 shadow-xl transition hover:scale-[1.02] w-full max-w-sm ${
        isWaiting
          ? "border-amber-500/70 bg-[#181824] shadow-amber-500/10 ring-2 ring-amber-500/30 animate-pulse"
          : isCompleted
          ? "border-emerald-500/40 bg-[#131722] hover:border-emerald-400"
          : isRunning
          ? "border-[#8b5cf6] bg-[#161426] ring-2 ring-[#8b5cf6]/30"
          : "border-gray-800 bg-[#13151f] opacity-75 hover:opacity-100"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
              isWaiting
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : isCompleted
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : "bg-[#8b5cf6]/20 border-[#8b5cf6]/40 text-[#c4b5fd]"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{step.assigned_agent_name}</span>
              {isApprovalGate && (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-400">
                  Gate
                </span>
              )}
            </h4>
            <span className="text-[10px] text-gray-400 font-mono">
              Step {step.step_order}
            </span>
          </div>
        </div>

        {/* Status Pill */}
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isCompleted
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : isWaiting
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              : isRunning
              ? "bg-[#8b5cf6]/20 text-[#c4b5fd] border border-[#8b5cf6]/40"
              : "bg-gray-800 text-gray-400 border border-gray-700"
          }`}
        >
          {isCompleted
            ? "Completed ✅"
            : isWaiting
            ? "Needs Approval 🛡️"
            : isRunning
            ? "Running ⚡"
            : "Pending ⏳"}
        </span>
      </div>

      <p className="text-[11px] text-gray-300 font-medium line-clamp-1">
        {step.title}
      </p>

      {isCompleted && (
        <div className="mt-2.5 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px]">
          <span className="text-emerald-400 font-bold">
            Score: {step.quality_score}/100
          </span>
          <span className="text-gray-500">Click to view output</span>
        </div>
      )}
    </div>
  );
}

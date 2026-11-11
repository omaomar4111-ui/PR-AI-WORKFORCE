"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sliders,
  RefreshCw,
  Play,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Download,
  Bot,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  Agent,
  Project,
  Deliverable,
  executeAgent,
  executeAgentStream,
} from "@/lib/api";
import DeliverableFormattedViewer from "@/components/DeliverableFormattedViewer";

interface AgentExecutionModalProps {
  agent: Agent;
  onClose: () => void;
  projects: Project[];
  agentIcons?: Record<string, React.ComponentType<{ className?: string }>>;
  onExecutionSuccess?: (deliverable: Deliverable) => void;
}

export default function AgentExecutionModal({
  agent,
  onClose,
  projects,
  agentIcons = {},
  onExecutionSuccess,
}: AgentExecutionModalProps) {
  const { t, isAr } = useI18n();

  const [selectedProjectId, setSelectedProjectId] = useState(
    projects.length > 0 ? projects[0].id : ""
  );
  const [taskTitle, setTaskTitle] = useState(`${agent.name} - ${agent.role}`);
  const [inputJsonText, setInputJsonText] = useState(
    agent.sample_input ? JSON.stringify(agent.sample_input, null, 2) : "{}"
  );
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<{
    deliverable: Deliverable;
    output: Record<string, any>;
  } | null>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const [streamedText, setStreamedText] = useState<string>("");

  const handleLoadSample = () => {
    if (agent.sample_input) {
      setInputJsonText(JSON.stringify(agent.sample_input, null, 2));
      setExecError(null);
    }
  };

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();

    let parsedInput: Record<string, any>;
    try {
      parsedInput = JSON.parse(inputJsonText);
    } catch {
      setExecError("Invalid JSON input syntax. Please verify JSON format.");
      return;
    }

    try {
      setExecuting(true);
      setExecError(null);
      setExecResult(null);
      setStreamedText("");

      await executeAgentStream(
        agent.id,
        {
          project_id: selectedProjectId || undefined,
          title: taskTitle.trim() || undefined,
          input: parsedInput,
        },
        (token: string) => {
          setStreamedText(prev => prev + token);
        },
        result => {
          setExecResult(result);
          if (onExecutionSuccess && result.deliverable) {
            onExecutionSuccess(result.deliverable);
          }
          setExecuting(false);
        },
        err => {
          console.error("Streaming execution error:", err);
          setExecError(err.message || "Streaming failed. Server error.");
          setExecuting(false);
        }
      );
    } catch (err: any) {
      console.error("Execution failed:", err);
      setExecError(err.message || "Failed to execute agent. Server error.");
      setExecuting(false);
    }
  };

  const IconComponent = agentIcons[agent.id] || Bot;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl border border-gray-800 bg-[#12141e] p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd]">
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>
                  {isAr && agent.name_ar ? agent.name_ar : agent.name}
                </span>
                <span className="rounded bg-[#8b5cf6]/20 px-2 py-0.5 text-[10px] font-bold text-[#a78bfa] uppercase">
                  {agent.department}
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                {isAr && agent.role_ar ? agent.role_ar : agent.role}
              </p>
            </div>
          </div>
          <button
            data-testid="close-agent-console"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Two Columns */}
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column: Input Console */}
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-800 bg-[#181a26] p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-[#8b5cf6]" />
                <span>{t("agents.console_title")}</span>
              </h4>

              {/* Project Selector */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t("agents.select_project")}
                </label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full rounded-lg border border-gray-800 bg-[#13151f] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                >
                  <option value="">-- General Agency Task --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Title */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Task Reference Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-800 bg-[#13151f] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                />
              </div>

              {/* JSON Input Area */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-300">
                    {t("agents.input_brief")}
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="text-[11px] font-semibold text-[#a78bfa] hover:text-[#c4b5fd] flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t("agents.load_sample")}
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={inputJsonText}
                  onChange={e => setInputJsonText(e.target.value)}
                  className="w-full font-mono text-xs rounded-lg border border-gray-800 bg-[#0f1118] p-3 text-emerald-400 focus:border-[#8b5cf6] focus:outline-none"
                />
              </div>

              {/* Execute Button */}
              <div className="mt-4">
                <button
                  type="button"
                  data-testid="execute-agent-btn"
                  disabled={executing}
                  onClick={handleRunAgent}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/25 transition hover:brightness-110 disabled:opacity-50"
                >
                  {executing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>{t("agents.running")}</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>{t("agents.execute_now")}</span>
                    </>
                  )}
                </button>
              </div>

              {execError && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{execError}</span>
                </div>
              )}
            </div>

            {/* System Prompt & Quality Criteria */}
            <div className="rounded-xl border border-gray-800 bg-[#151722] p-4 text-xs text-gray-400 space-y-3">
              <div>
                <span className="font-semibold text-gray-300 block mb-1">
                  {t("agents.criteria_title")}
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-gray-400 text-[11px]">
                  {agent.quality_criteria?.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-gray-800">
                <span className="font-semibold text-gray-300 block mb-1">
                  {t("agents.system_prompt")}
                </span>
                <p className="line-clamp-3 text-[11px] text-gray-500 font-mono">
                  {agent.system_prompt}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Execution Output */}
          <div className="flex flex-col justify-between rounded-xl border border-gray-800 bg-[#181a26] p-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#8b5cf6]" />
                  <span>{t("agents.output_title")}</span>
                </h4>
                {execResult && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {execResult.deliverable.quality_score}/100 Score
                  </span>
                )}
              </div>

              {executing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
                    <Sparkles className="h-4 w-4 animate-spin text-[#8b5cf6]" />
                    <span>
                      {isAr
                        ? "جارٍ توليد المخرج بالذكاء الاصطناعي (تدفق مباشر SSE)..."
                        : "Streaming AI Output in Real-Time (SSE)..."}
                    </span>
                  </div>
                  <pre
                    data-testid="streaming-output-preview"
                    className="max-h-[340px] overflow-auto rounded-lg border border-[#8b5cf6]/40 bg-[#0d0e14] p-3 text-[11px] font-mono text-cyan-300 whitespace-pre-wrap"
                  >
                    {streamedText || "Connecting to stream..."}
                    <span className="inline-block w-2 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
                  </pre>
                </div>
              ) : execResult ? (
                <div className="space-y-4">
                  {/* Deliverable Meta */}
                  <div className="rounded-lg border border-gray-800 bg-[#12141e] p-3 text-xs">
                    <div className="font-bold text-white mb-1">
                      {execResult.deliverable.title}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span>
                        Status:{" "}
                        <strong className="text-emerald-400">
                          {execResult.deliverable.status}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Agent:{" "}
                        <strong className="text-[#a78bfa]">{agent.name}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Formatted Deliverable Output Viewer */}
                  <DeliverableFormattedViewer
                    content={execResult.output}
                    deliverable={execResult.deliverable}
                    agentName={agent.name}
                    agentRole={agent.role}
                    qualityScore={execResult.deliverable.quality_score}
                    onDownloadJson={() => {
                      const blob = new Blob(
                        [JSON.stringify(execResult.output, null, 2)],
                        {
                          type: "application/json",
                        }
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${agent.id}-deliverable.json`;
                      a.click();
                    }}
                  />
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-center text-gray-500">
                  <Bot className="h-10 w-10 text-gray-600 mb-2" />
                  <p className="text-xs">
                    {isAr
                      ? "قم بتشغيل الوكيل لمعاينة المخرجات المعتمدة هنا"
                      : "Run the agent to inspect the structured deliverable output here"}
                  </p>
                </div>
              )}
            </div>

            {execResult && (
              <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
                <Link
                  href="/deliverables"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8b5cf6] hover:text-[#a78bfa]"
                >
                  <span>{t("agents.view_deliverables")}</span>
                  <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Link>

                <button
                  onClick={() => {
                    const blob = new Blob(
                      [JSON.stringify(execResult.output, null, 2)],
                      {
                        type: "application/json",
                      }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${agent.id}-deliverable.json`;
                    a.click();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-700 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t("agents.download_json")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

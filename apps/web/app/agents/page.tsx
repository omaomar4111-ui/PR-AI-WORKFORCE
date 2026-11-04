"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  Brain,
  Target,
  Palette,
  PenTool,
  TrendingUp,
  Briefcase,
  Code,
  ShieldCheck,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Download,
  ExternalLink,
  X,
  FileCode,
  Layers,
  Wrench,
  ChevronRight,
  RefreshCw,
  Sliders,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  Agent,
  Project,
  fetchAgents,
  fetchProjects,
  executeAgent,
  Deliverable,
} from "@/lib/api";

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "dr-ibrahim": Brain,
  ragaa: Target,
  fawzyia: Palette,
  copywriter: PenTool,
  "media-buyer": TrendingUp,
  "sales-manager": Briefcase,
  mahmoud: Code,
  "qa-lead": ShieldCheck,
};

const DEPARTMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  research: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  marketing: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  design: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30" },
  content: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  performance: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  sales: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
  engineering: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" },
  quality: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
};

export default function AgentsPage() {
  const { t, isAr } = useI18n();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("all");

  // Execution Modal state
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [inputJsonText, setInputJsonText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<{
    deliverable: Deliverable;
    output: Record<string, any>;
  } | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [agentsData, projectsData] = await Promise.all([
          fetchAgents(),
          fetchProjects(),
        ]);
        setAgents(agentsData);
        setProjects(projectsData);
        if (projectsData.length > 0) {
          setSelectedProjectId(projectsData[0].id);
        }
      } catch (err: any) {
        console.error("Failed to load agents:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const openExecutionConsole = (agent: Agent) => {
    setActiveAgent(agent);
    setExecResult(null);
    setExecError(null);
    setTaskTitle(`${agent.name} - ${agent.role}`);
    if (agent.sample_input) {
      setInputJsonText(JSON.stringify(agent.sample_input, null, 2));
    } else {
      setInputJsonText("{}");
    }
  };

  const handleLoadSample = () => {
    if (activeAgent?.sample_input) {
      setInputJsonText(JSON.stringify(activeAgent.sample_input, null, 2));
      setExecError(null);
    }
  };

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAgent) return;

    let parsedInput: Record<string, any>;
    try {
      parsedInput = JSON.parse(inputJsonText);
    } catch (err: any) {
      setExecError("Invalid JSON input syntax. Please verify JSON format.");
      return;
    }

    try {
      setExecuting(true);
      setExecError(null);
      setExecResult(null);

      const result = await executeAgent(activeAgent.id, {
        input: parsedInput,
        project_id: selectedProjectId || undefined,
        title: taskTitle.trim() || undefined,
      });

      setExecResult({
        deliverable: result.deliverable,
        output: result.output,
      });
    } catch (err: any) {
      setExecError(err.message || "Agent execution failed");
    } finally {
      setExecuting(false);
    }
  };

  const departments = Array.from(new Set(agents.map((a) => a.department)));

  const filteredAgents =
    selectedDept === "all"
      ? agents
      : agents.filter((a) => a.department === selectedDept);

  return (
    <AppShell>
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {t("agents.title")}
            </h1>
            <span className="inline-flex items-center rounded-full bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 px-2.5 py-0.5 text-xs font-bold text-[#c4b5fd]">
              8 Agents Active
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">{t("agents.subtitle")}</p>
        </div>

        {/* View Deliverables Link */}
        <Link
          href="/deliverables"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-800 bg-[#14161f] px-3.5 py-2 text-xs font-semibold text-gray-300 hover:border-[#8b5cf6]/50 hover:text-white transition"
        >
          <Sparkles className="h-4 w-4 text-[#8b5cf6]" />
          <span>{t("deliverables.title")}</span>
        </Link>
      </div>

      {/* Department Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedDept("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            selectedDept === "all"
              ? "bg-[#8b5cf6] text-white shadow-md shadow-[#8b5cf6]/20"
              : "border border-gray-800 bg-[#13151f] text-gray-400 hover:text-white"
          }`}
        >
          {t("agents.all_departments")} (8)
        </button>
        {departments.map((dept) => {
          const colors = DEPARTMENT_COLORS[dept] || {
            bg: "bg-gray-800/30",
            text: "text-gray-300",
            border: "border-gray-700",
          };
          const count = agents.filter((a) => a.department === dept).length;
          return (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`capitalize rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedDept === dept
                  ? "bg-[#8b5cf6] text-white shadow"
                  : "border border-gray-800 bg-[#13151f] text-gray-400 hover:text-white"
              }`}
            >
              {dept} ({count})
            </button>
          );
        })}
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filteredAgents.map((agent) => {
            const Icon = AGENT_ICONS[agent.id] || Bot;
            const colors = DEPARTMENT_COLORS[agent.department] || {
              bg: "bg-gray-800/20",
              text: "text-gray-400",
              border: "border-gray-800",
            };

            return (
              <div
                key={agent.id}
                data-testid={`agent-card-${agent.id}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-gray-800 bg-[#13151f] p-5 shadow-lg transition duration-200 hover:border-[#8b5cf6]/60 hover:shadow-xl hover:shadow-[#8b5cf6]/5"
              >
                <div>
                  {/* Card Header: Avatar & Dept Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b5cf6]/20 to-indigo-500/10 border border-[#8b5cf6]/30 text-[#a78bfa] shadow-inner group-hover:scale-105 transition">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      {agent.department}
                    </span>
                  </div>

                  {/* Agent Name & Role */}
                  <h3 className="text-base font-bold text-white group-hover:text-[#c4b5fd] transition flex items-center gap-1.5">
                    <span>{isAr && agent.name_ar ? agent.name_ar : agent.name}</span>
                    <span className="text-[11px] text-gray-500 font-normal">
                      ({agent.id})
                    </span>
                  </h3>
                  <p className="mt-1 text-xs text-gray-400 leading-relaxed line-clamp-2">
                    {isAr && agent.role_ar ? agent.role_ar : agent.role}
                  </p>

                  {/* Tools List */}
                  <div className="mt-4 pt-3 border-t border-gray-800/80">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-2">
                      <span className="font-semibold flex items-center gap-1">
                        <Wrench className="h-3 w-3 text-[#8b5cf6]" />
                        {t("agents.tools_count")} ({agent.tools.length})
                      </span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {t("agents.status_ready")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {agent.tools.slice(0, 3).map((tool) => (
                        <span
                          key={tool}
                          className="rounded bg-[#1a1c29] border border-gray-800 px-1.5 py-0.5 text-[9px] font-mono text-gray-300"
                        >
                          {tool}
                        </span>
                      ))}
                      {agent.tools.length > 3 && (
                        <span className="rounded bg-[#1a1c29] px-1 py-0.5 text-[9px] text-gray-500 font-mono">
                          +{agent.tools.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-5 pt-3 border-t border-gray-800/60">
                  <button
                    data-testid={`deploy-agent-${agent.id}`}
                    onClick={() => openExecutionConsole(agent)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/40 py-2 text-xs font-bold text-[#c4b5fd] shadow transition hover:bg-[#8b5cf6] hover:text-white"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>{t("agents.run_button")}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── AGENT EXECUTION CONSOLE MODAL ─────────────────────────────────── */}
      {activeAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-gray-800 bg-[#12141e] p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd]">
                  {React.createElement(AGENT_ICONS[activeAgent.id] || Bot, { className: "h-5 w-5" })}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{isAr && activeAgent.name_ar ? activeAgent.name_ar : activeAgent.name}</span>
                    <span className="rounded bg-[#8b5cf6]/20 px-2 py-0.5 text-[10px] font-bold text-[#a78bfa] uppercase">
                      {activeAgent.department}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    {isAr && activeAgent.role_ar ? activeAgent.role_ar : activeAgent.role}
                  </p>
                </div>
              </div>
              <button
                data-testid="close-agent-console"
                onClick={() => setActiveAgent(null)}
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
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full rounded-lg border border-gray-800 bg-[#13151f] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                    >
                      <option value="">-- General Agency Task --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.client_name || "Client"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Task Title */}
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Q4 Competitor PR Audit"
                      className="w-full rounded-lg border border-gray-800 bg-[#13151f] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                    />
                  </div>

                  {/* Input JSON Editor */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-300">
                        {t("agents.input_brief")}
                      </label>
                      <button
                        type="button"
                        onClick={handleLoadSample}
                        className="text-[10px] font-bold text-[#a78bfa] hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        {t("agents.load_sample")}
                      </button>
                    </div>
                    <textarea
                      rows={8}
                      data-testid="agent-input-json"
                      value={inputJsonText}
                      onChange={(e) => setInputJsonText(e.target.value)}
                      className="w-full rounded-lg border border-gray-800 bg-[#10121a] p-3 text-xs font-mono text-emerald-400 placeholder-gray-600 focus:border-[#8b5cf6] focus:outline-none"
                    />
                  </div>

                  {/* Error banner */}
                  {execError && (
                    <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                      <span>{execError}</span>
                    </div>
                  )}

                  {/* Run Button */}
                  <div className="mt-4">
                    <button
                      type="button"
                      data-testid="execute-agent-btn"
                      onClick={handleRunAgent}
                      disabled={executing}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/25 transition hover:from-[#7c3aed] hover:to-indigo-500 disabled:opacity-50"
                    >
                      {executing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
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
                </div>

                {/* Quality Criteria Card */}
                <div className="rounded-xl border border-gray-800 bg-[#181a26]/60 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#8b5cf6]" />
                    <span>{t("agents.criteria_title")}</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    {activeAgent.quality_criteria.map((qc, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{qc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Column: Execution Output & Deliverable */}
              <div>
                <div className="rounded-xl border border-gray-800 bg-[#181a26] p-4 flex flex-col h-full min-h-[380px]">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{t("agents.output_title")}</span>
                    </h4>

                    {execResult && (
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          Score: {execResult.deliverable.quality_score}/100
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Output Display */}
                  <div className="flex-1 mt-3">
                    {execResult ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-gray-800 bg-[#10121a] p-3 text-xs font-mono text-gray-200 max-h-[340px] overflow-y-auto">
                          <pre data-testid="agent-output-json" className="whitespace-pre-wrap break-all">
                            {JSON.stringify(execResult.output, null, 2)}
                          </pre>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-2">
                          <a
                            href={execResult.deliverable.file_url}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-800 bg-[#13151f] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>{t("agents.download_json")}</span>
                          </a>

                          <Link
                            href="/deliverables"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 px-3 py-1.5 text-xs font-bold text-[#c4b5fd] hover:bg-[#8b5cf6] hover:text-white transition"
                          >
                            <span>{t("agents.view_deliverables")}</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center p-6 text-gray-500 border border-dashed border-gray-800 rounded-lg">
                        <Bot className="h-10 w-10 text-gray-600 mb-2" />
                        <p className="text-xs font-semibold text-gray-400">
                          Ready for agent deployment
                        </p>
                        <p className="mt-1 text-[11px] text-gray-600 max-w-xs">
                          Click "{t("agents.execute_now")}" to trigger neural execution. Output will be validated against {activeAgent.name}'s JSON contract and saved as a permanent deliverable.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

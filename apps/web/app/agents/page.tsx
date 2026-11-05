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
  Search,
  Video,
  Film,
  Terminal,
  Database,
  Server,
  Compass,
  BarChart3,
  UserCheck,
  Clock,
  Settings,
  Radio,
  FileText,
  Lock,
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
  // Research & Strategy
  "dr-ibrahim": Brain,
  "data-analyst": BarChart3,
  "ux-researcher": Compass,
  "market-researcher": Search,
  "competitor-analyst": Target,

  // Marketing & Strategy
  ragaa: Target,
  "media-buyer": TrendingUp,
  "seo-specialist": Search,
  "social-media-manager": Radio,
  "content-strategist": FileText,
  "growth-hacker": Sparkles,

  // Creative & Design
  fawzyia: Palette,
  copywriter: PenTool,
  "ui-ux-designer": Layers,
  "brand-identity-designer": Sparkles,
  "motion-designer": Video,
  illustrator: Palette,

  // Video Production
  "video-director": Video,
  scriptwriter: FileCode,
  "storyboard-artist": Layers,
  "video-editor": Film,
  "sound-designer": Radio,

  // Engineering & Tech
  mahmoud: Code,
  "frontend-dev": Terminal,
  "backend-dev": Database,
  "devops-engineer": Server,
  "qa-automation-engineer": CheckCircle2,
  "security-engineer": Lock,

  // Sales & CRM
  "sales-manager": Briefcase,
  "lead-qualifier": UserCheck,
  "account-executive": Briefcase,
  "crm-specialist": Database,

  // Operations
  "operations-lead": Settings,
  "project-manager": Clock,
  "resource-planner": Layers,

  // Quality Assurance
  "qa-lead": ShieldCheck,
  "qa-reviewer": CheckCircle2,
  "compliance-officer": ShieldCheck,
};

const DEPARTMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  marketing: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  creative: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30" },
  video: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  engineering: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" },
  research: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  sales: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
  operations: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  quality: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
};

const DEPARTMENT_NAMES: Record<string, { en: string; ar: string }> = {
  marketing: { en: "Marketing & Strategy", ar: "التسويق والاستراتيجية" },
  creative: { en: "Creative & Design", ar: "الإبداع والتصميم" },
  video: { en: "Video Production", ar: "الإنتاج المرئي" },
  engineering: { en: "Engineering & Tech", ar: "الهندسة والبرمجيات" },
  research: { en: "Research & Strategy", ar: "الأبحاث والاستراتيجية" },
  sales: { en: "Sales & CRM", ar: "المبيعات وإدارة العلاقات" },
  operations: { en: "Operations & PM", ar: "العمليات وإدارة المشاريع" },
  quality: { en: "Quality Assurance", ar: "ضمان الجودة والامتثال" },
};

const ORDERED_DEPARTMENTS = [
  "marketing",
  "creative",
  "video",
  "engineering",
  "research",
  "sales",
  "operations",
  "quality",
];

export default function AgentsPage() {
  const { t, isAr } = useI18n();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredAgents = agents.filter((a) => {
    const matchesDept = selectedDept === "all" || a.department === selectedDept;
    if (!matchesDept) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.name_ar && a.name_ar.toLowerCase().includes(q)) ||
      a.role.toLowerCase().includes(q) ||
      (a.role_ar && a.role_ar.toLowerCase().includes(q)) ||
      a.department.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      (a.tools && a.tools.some((tool) => tool.toLowerCase().includes(q)))
    );
  });

  return (
    <AppShell>
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {t("agents.title")}
            </h1>
            <span className="inline-flex items-center rounded-full bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 px-3 py-1 text-xs font-bold text-[#c4b5fd]">
              {agents.length} {t("agents.active_roster")}
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

      {/* Search and Filters Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 rtl:left-auto rtl:right-3.5" />
          <input
            type="text"
            data-testid="agents-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("agents.search_placeholder")}
            className="w-full rounded-xl border border-gray-800 bg-[#13151f] py-2.5 pl-10 pr-10 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] rtl:pl-10 rtl:pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white rtl:right-auto rtl:left-3.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-gray-400">
          {isAr
            ? `عرض ${filteredAgents.length} من إجمالي ${agents.length} موظف ذكي`
            : `Showing ${filteredAgents.length} of ${agents.length} AI Agents`}
        </div>
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
          {t("agents.all_departments")} ({agents.length})
        </button>
        {ORDERED_DEPARTMENTS.map((dept) => {
          const count = agents.filter((a) => a.department === dept).length;
          const deptNameObj = DEPARTMENT_NAMES[dept];
          const label = isAr && deptNameObj ? deptNameObj.ar : deptNameObj ? deptNameObj.en : dept;
          return (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedDept === dept
                  ? "bg-[#8b5cf6] text-white shadow"
                  : "border border-gray-800 bg-[#13151f] text-gray-400 hover:text-white"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-800 bg-[#13151f] p-12 text-center">
          <Bot className="h-12 w-12 text-gray-600 mb-3" />
          <h3 className="text-sm font-bold text-gray-300">{t("agents.no_results")}</h3>
          <p className="mt-1 text-xs text-gray-500">
            {isAr ? "جرّب تغيير عبارة البحث أو اختيار قسم مختلف" : "Try adjusting your search query or department filter"}
          </p>
          {(searchQuery || selectedDept !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedDept("all");
              }}
              className="mt-4 rounded-lg bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 px-3 py-1.5 text-xs font-semibold text-[#c4b5fd] hover:bg-[#8b5cf6] hover:text-white transition"
            >
              {isAr ? "إعادة ضبط التصفية" : "Reset Filters"}
            </button>
          )}
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
                      onChange={(e) => setTaskTitle(e.target.value)}
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
                      onChange={(e) => setInputJsonText(e.target.value)}
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

                {/* System Prompt & Quality Criteria Accordion/Card */}
                <div className="rounded-xl border border-gray-800 bg-[#151722] p-4 text-xs text-gray-400 space-y-3">
                  <div>
                    <span className="font-semibold text-gray-300 block mb-1">
                      {t("agents.criteria_title")}
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-gray-400 text-[11px]">
                      {activeAgent.quality_criteria.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-gray-800">
                    <span className="font-semibold text-gray-300 block mb-1">
                      {t("agents.system_prompt")}
                    </span>
                    <p className="line-clamp-3 text-[11px] text-gray-500 font-mono">
                      {activeAgent.system_prompt}
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

                  {execResult ? (
                    <div className="space-y-4">
                      {/* Deliverable Meta */}
                      <div className="rounded-lg border border-gray-800 bg-[#12141e] p-3 text-xs">
                        <div className="font-bold text-white mb-1">
                          {execResult.deliverable.title}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-gray-400">
                          <span>Status: <strong className="text-emerald-400">{execResult.deliverable.status}</strong></span>
                          <span>•</span>
                          <span>Agent: <strong className="text-[#a78bfa]">{activeAgent.name}</strong></span>
                        </div>
                      </div>

                      {/* Structured JSON Output Viewer */}
                      <div>
                        <span className="text-xs font-semibold text-gray-400 mb-1 block">
                          Structured JSON Deliverable Output:
                        </span>
                        <pre
                          data-testid="deliverable-json-output"
                          className="max-h-[340px] overflow-auto rounded-lg border border-gray-800 bg-[#0d0e14] p-3 text-[11px] font-mono text-cyan-300"
                        >
                          {JSON.stringify(execResult.output, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-64 flex-col items-center justify-center text-center text-gray-500">
                      <Bot className="h-10 w-10 text-gray-600 mb-2" />
                      <p className="text-xs">
                        {isAr ? "قم بتشغيل الوكيل لمعاينة المخرجات المعتمدة هنا" : "Run the agent to inspect the structured deliverable output here"}
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
                        const blob = new Blob([JSON.stringify(execResult.output, null, 2)], {
                          type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${activeAgent.id}-deliverable.json`;
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
      )}
    </AppShell>
  );
}

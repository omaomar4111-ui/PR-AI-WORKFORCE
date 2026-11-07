"use client";

import dynamic from "next/dynamic";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AvatarNode } from "@/components/AvatarNode";
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
  Wifi,
  Activity,
  CheckSquare,
  AlertTriangle,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  Agent,
  AgentStatus,
  Project,
  Deliverable,
  fetchAgents,
  fetchAgentStatuses,
  updateAgentStatus,
  fetchProjects,
  fetchDeliverables,
  executeAgent,
  getWsBaseUrl,
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

const DEPARTMENT_CONFIGS: Record<
  string,
  {
    name_en: string;
    name_ar: string;
    icon: React.ComponentType<{ className?: string }>;
    accentBorder: string;
    roomGlow: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  marketing: {
    name_en: "Marketing & Strategy War Room",
    name_ar: "غرفة عمليات التسويق والاستراتيجية",
    icon: Target,
    accentBorder: "border-purple-500/40",
    roomGlow: "from-purple-950/25 to-[#12131c]",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-400",
  },
  creative: {
    name_en: "Creative Direction & Art Studio",
    name_ar: "استوديو الإبداع والتصميم الفني",
    icon: Palette,
    accentBorder: "border-pink-500/40",
    roomGlow: "from-pink-950/25 to-[#12131c]",
    badgeBg: "bg-pink-500/15",
    badgeText: "text-pink-400",
  },
  video: {
    name_en: "Video & Audio Production Suite",
    name_ar: "جناح الإنتاج المرئي والمونتاج الصوتي",
    icon: Video,
    accentBorder: "border-rose-500/40",
    roomGlow: "from-rose-950/25 to-[#12131c]",
    badgeBg: "bg-rose-500/15",
    badgeText: "text-rose-400",
  },
  engineering: {
    name_en: "Engineering & Architecture Core",
    name_ar: "مركز الهندسة وتطوير النظم والبرمجيات",
    icon: Code,
    accentBorder: "border-indigo-500/40",
    roomGlow: "from-indigo-950/25 to-[#12131c]",
    badgeBg: "bg-indigo-500/15",
    badgeText: "text-indigo-400",
  },
  research: {
    name_en: "Research & Market Intelligence Lab",
    name_ar: "مختبر الأبحاث واستخبارات السوق",
    icon: Brain,
    accentBorder: "border-blue-500/40",
    roomGlow: "from-blue-950/25 to-[#12131c]",
    badgeBg: "bg-blue-500/15",
    badgeText: "text-blue-400",
  },
  sales: {
    name_en: "Commercial & B2B Sales Hub",
    name_ar: "مركز المبيعات وعلاقات كبار العملاء B2B",
    icon: Briefcase,
    accentBorder: "border-cyan-500/40",
    roomGlow: "from-cyan-950/25 to-[#12131c]",
    badgeBg: "bg-cyan-500/15",
    badgeText: "text-cyan-400",
  },
  operations: {
    name_en: "Operations & Resource Planning",
    name_ar: "إدارة العمليات وتخطيط الموارد",
    icon: Settings,
    accentBorder: "border-amber-500/40",
    roomGlow: "from-amber-950/25 to-[#12131c]",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-400",
  },
  quality: {
    name_en: "QA & Compliance Gate",
    name_ar: "بوابة ضمان الجودة والامتثال المؤسسي",
    icon: ShieldCheck,
    accentBorder: "border-emerald-500/40",
    roomGlow: "from-emerald-950/25 to-[#12131c]",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-400",
  },
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

const AgentExecutionModal = dynamic(() => import("@/components/AgentExecutionModal"), {
  ssr: false,
  loading: () => null,
});

export default function VirtualOfficePage() {
  const handleSelectAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
  }, []);
  const { t, isAr } = useI18n();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "idle" | "working" | "blocked">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer & Modal State
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentDeliverables, setAgentDeliverables] = useState<Deliverable[]>([]);
  const [loadingDeliverables, setLoadingDeliverables] = useState(false);
  const [activeConsoleAgent, setActiveConsoleAgent] = useState<Agent | null>(null);

  // Execution Modal state
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [inputJsonText, setInputJsonText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<{
    deliverable: Deliverable;
    output: Record<string, any>;
  } | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // 1. Initial Data Fetching
  useEffect(() => {
    async function loadInitial() {
      try {
        const [agentsData, statusesData, projectsData] = await Promise.all([
          fetchAgents(),
          fetchAgentStatuses(),
          fetchProjects(),
        ]);
        setAgents(agentsData);
        setProjects(projectsData);
        if (projectsData.length > 0) {
          setSelectedProjectId(projectsData[0].id);
        }

        const map: Record<string, AgentStatus> = {};
        statusesData.forEach((s) => {
          map[s.agent_id] = s;
        });
        setStatuses(map);
      } catch (err) {
        console.error("Failed to load Virtual Office data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
  }, []);

  // 2. Real-time WebSocket connection to /ws/agents/status
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    function connectWs() {
      try {
        const wsUrl = `${getWsBaseUrl()}/ws/agents/status`;
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setWsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "initial_status" && Array.isArray(data.statuses)) {
              const map: Record<string, AgentStatus> = {};
              data.statuses.forEach((s: AgentStatus) => {
                map[s.agent_id] = s;
              });
              setStatuses((prev) => ({ ...prev, ...map }));
            } else if (data.type === "agent_status_updated" && data.agent) {
              const updated: AgentStatus = data.agent;
              setStatuses((prev) => ({
                ...prev,
                [updated.agent_id]: updated,
              }));
            }
          } catch (e) {
            console.error("Failed to parse status WS event:", e);
          }
        };

        socket.onerror = () => {
          setWsConnected(false);
        };

        socket.onclose = () => {
          setWsConnected(false);
          // Auto-reconnect after 3s
          reconnectTimeout = setTimeout(connectWs, 3000);
        };
      } catch (err) {
        console.error("WebSocket setup error:", err);
        reconnectTimeout = setTimeout(connectWs, 3000);
      }
    }

    connectWs();

    return () => {
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // 3. Load Agent Deliverables when Drawer opens
  useEffect(() => {
    if (!selectedAgent) {
      setAgentDeliverables([]);
      return;
    }

    let isMounted = true;
    setLoadingDeliverables(true);
    fetchDeliverables({ agent_id: selectedAgent.id })
      .then((data) => {
        if (isMounted) setAgentDeliverables(data.slice(0, 5));
      })
      .catch((err) => console.error("Failed to load agent deliverables:", err))
      .finally(() => {
        if (isMounted) setLoadingDeliverables(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedAgent]);

  // Open Console Modal
  const openExecutionConsole = (agent: Agent) => {
    setActiveConsoleAgent(agent);
    setExecResult(null);
    setExecError(null);
    setTaskTitle(`${agent.name} - ${agent.role}`);
    if (agent.sample_input) {
      setInputJsonText(JSON.stringify(agent.sample_input, null, 2));
    } else {
      setInputJsonText("{}");
    }
  };

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsoleAgent) return;

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

      const result = await executeAgent(activeConsoleAgent.id, {
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

  // Quick Manual Status Simulation (For Demo & Testing) with Optimistic UI & Rollback
  const handleSimulateStatus = async (
    agentId: string,
    targetStatus: "idle" | "working" | "blocked"
  ) => {
    const previousStatus = statuses[agentId];
    const taskDescription =
      targetStatus === "working"
        ? "Live real-time operational simulation task"
        : targetStatus === "blocked"
        ? "Awaiting human review & approval sign-off"
        : undefined;

    // 1. Optimistic Update: immediately update UI state with zero perceived latency (< 16ms)
    setStatuses((prev) => {
      const current = prev[agentId];
      if (!current) return prev;
      return {
        ...prev,
        [agentId]: {
          ...current,
          status: targetStatus,
          current_task: taskDescription,
          updated_at: new Date().toISOString(),
        },
      };
    });

    // 2. Perform background network update with rollback on failure
    try {
      await updateAgentStatus(agentId, {
        status: targetStatus,
        current_task: taskDescription,
      });
    } catch (err: any) {
      console.error("Failed to update status manually (rolling back):", err);
      // Rollback to previous status snapshot
      if (previousStatus) {
        setStatuses((prev) => ({
          ...prev,
          [agentId]: previousStatus,
        }));
      }
    }
  };

  // Metric counts
  const totalAgents = agents.length;
  const workingCount = Object.values(statuses).filter((s) => s.status === "working").length;
  const blockedCount = Object.values(statuses).filter((s) => s.status === "blocked").length;
  const idleCount = Math.max(0, totalAgents - workingCount - blockedCount);

  // Filter agents by status and search
  const matchesAgentFilter = (agent: Agent): boolean => {
    const currentStatus = statuses[agent.id]?.status || "idle";
    if (statusFilter !== "all" && currentStatus !== statusFilter) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      agent.name.toLowerCase().includes(q) ||
      (agent.name_ar && agent.name_ar.toLowerCase().includes(q)) ||
      agent.role.toLowerCase().includes(q) ||
      (agent.role_ar && agent.role_ar.toLowerCase().includes(q)) ||
      agent.department.toLowerCase().includes(q) ||
      agent.id.toLowerCase().includes(q)
    );
  };

  return (
    <AppShell>
      {/* ── Virtual Office Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center gap-2">
              <span className="text-[#a78bfa]">🏢</span>
              <span>{t("virtual_office.title")}</span>
            </h1>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
              <span className={`h-2 w-2 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`} />
              <span>{wsConnected ? t("virtual_office.live_sync") : "WebSocket Connecting..."}</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-400">{t("virtual_office.subtitle")}</p>
        </div>

        {/* Live Status KPI Counters */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="rounded-xl border border-gray-800 bg-[#13151f] px-3.5 py-2 font-semibold text-gray-300">
            <span className="text-gray-500 mr-1.5">{isAr ? "إجمالي:" : "Total:"}</span>
            <strong className="text-white">{totalAgents}</strong>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 font-semibold text-emerald-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{idleCount} {t("virtual_office.status_idle")}</span>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 font-semibold text-amber-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span>{workingCount} {t("virtual_office.status_working")}</span>
          </div>
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 font-semibold text-rose-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span>{blockedCount} {t("virtual_office.status_blocked")}</span>
          </div>
        </div>
      </div>

      {/* ── Office Filters & Controls Bar ─────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "working", "blocked", "idle"] as const).map((filterKey) => {
            const isSelected = statusFilter === filterKey;
            return (
              <button
                key={filterKey}
                onClick={() => setStatusFilter(filterKey)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-[#8b5cf6] text-white shadow-md shadow-[#8b5cf6]/20"
                    : "border border-gray-800 bg-[#13151f] text-gray-400 hover:text-white"
                }`}
              >
                {filterKey === "all"
                  ? `${t("virtual_office.status_all")} (${totalAgents})`
                  : filterKey === "working"
                  ? `🟡 ${t("virtual_office.status_working")} (${workingCount})`
                  : filterKey === "blocked"
                  ? `🔴 ${t("virtual_office.status_blocked")} (${blockedCount})`
                  : `🟢 ${t("virtual_office.status_idle")} (${idleCount})`}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 rtl:left-auto rtl:right-3" />
          <input
            type="text"
            data-testid="virtual-office-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("virtual_office.search_placeholder")}
            className="w-full rounded-xl border border-gray-800 bg-[#13151f] py-2 pl-9 pr-8 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] rtl:pl-8 rtl:pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white rtl:right-auto rtl:left-2.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2D Interactive Floor Plan: 8 Department Studios ───────────────── */}
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {ORDERED_DEPARTMENTS.map((deptKey) => {
            const conf = DEPARTMENT_CONFIGS[deptKey] || DEPARTMENT_CONFIGS.marketing;
            const deptAgents = agents.filter((a) => a.department === deptKey);
            const visibleAgents = deptAgents.filter(matchesAgentFilter);
            const RoomIcon = conf.icon;

            // Room status calculation
            const deptWorking = deptAgents.filter((a) => statuses[a.id]?.status === "working").length;
            const deptBlocked = deptAgents.filter((a) => statuses[a.id]?.status === "blocked").length;

            return (
              <div
                key={deptKey}
                data-testid={`department-room-${deptKey}`}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border ${conf.accentBorder} bg-gradient-to-b ${conf.roomGlow} p-5 shadow-xl transition hover:border-[#8b5cf6]/70`}
              >
                {/* Room Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-gray-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 border border-gray-800 text-[#c4b5fd]">
                      <RoomIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{isAr ? conf.name_ar : conf.name_en}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${conf.badgeBg} ${conf.badgeText}`}>
                          {deptAgents.length} Agents
                        </span>
                      </h3>
                      <p className="text-[11px] text-gray-400 capitalize">{deptKey} Studio</p>
                    </div>
                  </div>

                  {/* Room status indicators */}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {deptWorking > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-bold text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                        {deptWorking} {isAr ? "نشط" : "Working"}
                      </span>
                    )}
                    {deptBlocked > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 font-bold text-rose-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                        {deptBlocked} {isAr ? "معلّق" : "Blocked"}
                      </span>
                    )}
                    {deptWorking === 0 && deptBlocked === 0 && (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-emerald-400 font-semibold">
                        Ready
                      </span>
                    )}
                  </div>
                </div>

                {/* Room Workspace Grid: Desks & Agent Avatars */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {visibleAgents.map((agent) => (
                    <AvatarNode
                      key={agent.id}
                      agent={agent}
                      status={statuses[agent.id]}
                      isAr={isAr}
                      onSelect={handleSelectAgent}
                      IconComponent={AGENT_ICONS[agent.id] || Bot}
                    />
                  ))}
                </div>

                {visibleAgents.length === 0 && (
                  <div className="mt-4 flex h-24 flex-col items-center justify-center text-center text-gray-500 border border-dashed border-gray-800/80 rounded-xl">
                    <p className="text-xs">No agents match current filters in this studio</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Agent Profile Side Drawer ─────────────────────────────────────── */}
      {selectedAgent && (
        <div
          data-testid="agent-profile-drawer"
          className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm rtl:justify-start"
        >
          <div className="relative flex h-full w-full max-w-md flex-col justify-between overflow-y-auto border-l border-gray-800 bg-[#11131c] p-6 shadow-2xl rtl:border-l-0 rtl:border-r">
            <div>
              {/* Drawer Close Button & Header */}
              <div className="flex items-start justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd]">
                    {React.createElement(AGENT_ICONS[selectedAgent.id] || Bot, { className: "h-6 w-6" })}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isAr && selectedAgent.name_ar ? selectedAgent.name_ar : selectedAgent.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {isAr && selectedAgent.role_ar ? selectedAgent.role_ar : selectedAgent.role}
                    </p>
                  </div>
                </div>

                <button
                  data-testid="close-profile-drawer"
                  onClick={() => setSelectedAgent(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Status Badge Card */}
              {(() => {
                const curSt = statuses[selectedAgent.id]?.status || "idle";
                const curTask = statuses[selectedAgent.id]?.current_task;
                return (
                  <div className="mt-4 rounded-xl border border-gray-800 bg-[#161824] p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Live Status
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          curSt === "working"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : curSt === "blocked"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            curSt === "working"
                              ? "bg-amber-400 animate-ping"
                              : curSt === "blocked"
                              ? "bg-rose-400"
                              : "bg-emerald-400"
                          }`}
                        />
                        <span className="capitalize">{curSt}</span>
                      </span>
                    </div>

                    {curTask && (
                      <div className="text-xs text-gray-300 bg-black/40 p-2 rounded-lg border border-gray-800/60 mt-1">
                        <strong className="text-amber-400 block text-[10px] uppercase mb-0.5">
                          {t("virtual_office.current_task")}
                        </strong>
                        <span>{curTask}</span>
                      </div>
                    )}

                    {/* Quick Simulator Buttons */}
                    <div className="mt-3 pt-2.5 border-t border-gray-800/80">
                      <span className="text-[10px] text-gray-400 block mb-1.5 font-semibold">
                        {t("virtual_office.simulate_status")}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          data-testid="simulate-status-idle"
                          onClick={() => handleSimulateStatus(selectedAgent.id, "idle")}
                          className={`flex-1 rounded-lg py-1 text-[11px] font-bold border transition ${
                            curSt === "idle"
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                              : "border-gray-800 bg-gray-900/60 text-gray-400 hover:text-white"
                          }`}
                        >
                          🟢 Idle
                        </button>
                        <button
                          data-testid="simulate-status-working"
                          onClick={() => handleSimulateStatus(selectedAgent.id, "working")}
                          className={`flex-1 rounded-lg py-1 text-[11px] font-bold border transition ${
                            curSt === "working"
                              ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                              : "border-gray-800 bg-gray-900/60 text-gray-400 hover:text-white"
                          }`}
                        >
                          🟡 Working
                        </button>
                        <button
                          data-testid="simulate-status-blocked"
                          onClick={() => handleSimulateStatus(selectedAgent.id, "blocked")}
                          className={`flex-1 rounded-lg py-1 text-[11px] font-bold border transition ${
                            curSt === "blocked"
                              ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                              : "border-gray-800 bg-gray-900/60 text-gray-400 hover:text-white"
                          }`}
                        >
                          🔴 Blocked
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* System Prompt Excerpt */}
              <div className="mt-4 rounded-xl border border-gray-800 bg-[#161824] p-3.5 text-xs">
                <span className="font-bold text-gray-300 block mb-1">
                  {t("agents.system_prompt")}
                </span>
                <p className="text-gray-400 line-clamp-3 text-[11px] leading-relaxed">
                  {selectedAgent.system_prompt}
                </p>
              </div>

              {/* Connected Tools */}
              <div className="mt-4 rounded-xl border border-gray-800 bg-[#161824] p-3.5 text-xs">
                <span className="font-bold text-gray-300 block mb-2 flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-[#8b5cf6]" />
                  <span>{t("agents.tools_count")} ({selectedAgent.tools.length})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.tools.map((tool) => (
                    <span
                      key={tool}
                      className="rounded bg-[#11131c] border border-gray-800 px-2 py-0.5 text-[10px] font-mono text-gray-300"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recent Deliverables */}
              <div className="mt-4 rounded-xl border border-gray-800 bg-[#161824] p-3.5 text-xs">
                <span className="font-bold text-gray-300 block mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#8b5cf6]" />
                    <span>{t("virtual_office.recent_deliverables")}</span>
                  </span>
                  <Link
                    href={`/deliverables?agent_id=${selectedAgent.id}`}
                    className="text-[10px] font-semibold text-[#a78bfa] hover:underline"
                  >
                    View All
                  </Link>
                </span>

                {loadingDeliverables ? (
                  <div className="py-4 text-center text-gray-500">Loading deliverables...</div>
                ) : agentDeliverables.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic py-2">
                    {t("virtual_office.no_deliverables")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {agentDeliverables.map((del) => (
                      <div
                        key={del.id}
                        className="rounded-lg border border-gray-800/80 bg-[#11131c] p-2.5 flex items-center justify-between"
                      >
                        <div className="truncate pr-2">
                          <h5 className="font-bold text-white text-[11px] truncate">{del.title}</h5>
                          <span className="text-[10px] text-gray-400">Score: {del.quality_score}/100</span>
                        </div>
                        <a
                          href={del.file_url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="rounded p-1 text-gray-400 hover:text-white"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Actions CTA */}
            <div className="mt-6 pt-4 border-t border-gray-800 space-y-2.5">
              <button
                data-testid="drawer-deploy-agent-btn"
                onClick={() => {
                  openExecutionConsole(selectedAgent);
                  setSelectedAgent(null);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/20 hover:brightness-110 transition"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{t("virtual_office.execute_cta")}</span>
              </button>

              <Link
                href={`/tasks?assigned_to=${selectedAgent.id}`}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-800 bg-[#161824] py-2 text-xs font-semibold text-gray-300 hover:border-gray-700 hover:text-white transition"
              >
                <CheckSquare className="h-4 w-4 text-[#8b5cf6]" />
                <span>{t("virtual_office.view_tasks")}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── AGENT EXECUTION CONSOLE MODAL (Dynamically Code-Split) ── */}
      {activeConsoleAgent && (
        <AgentExecutionModal
          agent={activeConsoleAgent}
          onClose={() => setActiveConsoleAgent(null)}
          projects={projects}
          agentIcons={AGENT_ICONS}
          onExecutionSuccess={() => {
            fetchAgentStatuses().then((statusesData) => {
              const map: Record<string, AgentStatus> = {};
              statusesData.forEach((s) => {
                map[s.agent_id] = s;
              });
              setStatuses(map);
            }).catch(() => {});
          }}
        />
      )}
    </AppShell>
  );
}

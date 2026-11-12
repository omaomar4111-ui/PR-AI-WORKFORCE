"use client";

import dynamic from "next/dynamic";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AgentCard } from "@/components/AgentCard";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";
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

const AGENT_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
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

const DEPARTMENT_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  marketing: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  creative: {
    bg: "bg-pink-500/10",
    text: "text-pink-400",
    border: "border-pink-500/30",
  },
  video: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  engineering: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
  },
  research: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  sales: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  operations: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  quality: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
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

const DEFAULT_DEPARTMENT_COLORS = {
  bg: "bg-gray-800/20",
  text: "text-gray-400",
  border: "border-gray-800",
};

const AgentExecutionModal = dynamic(
  () => import("@/components/AgentExecutionModal"),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function AgentsPage() {
  const { t, isAr } = useI18n();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Execution Modal state
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [agentsData, projectsData] = await Promise.all([
          fetchAgents(),
          fetchProjects(),
        ]);
        setAgents(agentsData);
        setProjects(projectsData);
      } catch (err: any) {
        console.error("Failed to load agents:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Stable callback ensures React.memo(AgentCard) is never broken on keystrokes
  const openExecutionConsole = useCallback((agent: Agent) => {
    setActiveAgent(agent);
  }, []);

  const closeExecutionConsole = useCallback(() => {
    setActiveAgent(null);
  }, []);

  // Memoize department agent counts so tabs don't filter 8 times on every keystroke
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const agent of agents) {
      counts[agent.department] = (counts[agent.department] || 0) + 1;
    }
    return counts;
  }, [agents]);

  // Memoize filtered agents list so 38 card filters only execute when query/dept changes
  const filteredAgents = useMemo(() => {
    return agents.filter(a => {
      const matchesDept =
        selectedDept === "all" || a.department === selectedDept;
      if (!matchesDept) return false;
      if (!debouncedSearch.trim()) return true;
      const q = debouncedSearch.toLowerCase().trim();
      return (
        a.name.toLowerCase().includes(q) ||
        (a.name_ar && a.name_ar.toLowerCase().includes(q)) ||
        a.role.toLowerCase().includes(q) ||
        (a.role_ar && a.role_ar.toLowerCase().includes(q)) ||
        a.department.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.tools && a.tools.some(tool => tool.toLowerCase().includes(q)))
      );
    });
  }, [agents, selectedDept, debouncedSearch]);

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
            onChange={e => setSearchQuery(e.target.value)}
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
        {ORDERED_DEPARTMENTS.map(dept => {
          const count = departmentCounts[dept] || 0;
          const deptNameObj = DEPARTMENT_NAMES[dept];
          const label =
            isAr && deptNameObj
              ? deptNameObj.ar
              : deptNameObj
                ? deptNameObj.en
                : dept;
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
          <h3 className="text-sm font-bold text-gray-300">
            {t("agents.no_results")}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            {isAr
              ? "جرّب تغيير عبارة البحث أو اختيار قسم مختلف"
              : "Try adjusting your search query or department filter"}
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
          {filteredAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isAr={isAr}
              colors={
                DEPARTMENT_COLORS[agent.department] || DEFAULT_DEPARTMENT_COLORS
              }
              IconComponent={AGENT_ICONS[agent.id] || Bot}
              onDeploy={openExecutionConsole}
              toolsCountLabel={t("agents.tools_count")}
              statusReadyLabel={t("agents.status_ready")}
              runButtonLabel={t("agents.run_button")}
            />
          ))}
        </div>
      )}

      {/* ── AGENT EXECUTION CONSOLE MODAL (Dynamically Code-Split) ── */}
      {activeAgent && (
        <AgentExecutionModal
          agent={activeAgent}
          onClose={closeExecutionConsole}
          projects={projects}
          agentIcons={AGENT_ICONS}
        />
      )}
    </AppShell>
  );
}

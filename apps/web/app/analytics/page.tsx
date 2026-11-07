"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  AnalyticsSummary,
  AiUsageLog,
  CostPerAgent,
  CostPerProject,
  QualityTrendPoint,
  Agent,
  Project,
  fetchAnalyticsSummary,
  fetchAnalyticsUsage,
  fetchCostPerAgent,
  fetchCostPerProject,
  fetchQualityTrend,
  fetchAgents,
  fetchProjects,
} from "@/lib/api";
import {
  TrendingUp,
  Cpu,
  DollarSign,
  Award,
  Timer,
  Download,
  Filter,
  RefreshCw,
  Layers,
  Sparkles,
  BarChart3,
  Calendar,
  Briefcase,
  Bot,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

export default function AnalyticsPage() {
  const { isAr, t } = useI18n();

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [usageLogs, setUsageLogs] = useState<AiUsageLog[]>([]);
  const [costsByAgent, setCostsByAgent] = useState<CostPerAgent[]>([]);
  const [costsByProject, setCostsByProject] = useState<CostPerProject[]>([]);
  const [qualityTrend, setQualityTrend] = useState<QualityTrendPoint[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterDays, setFilterDays] = useState<number>(30);

  // Virtualization for high-volume logs table
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: usageLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45,
    overscan: 5,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [sum, logs, agentCosts, projCosts, qualTrend, agList, prList] = await Promise.all([
        fetchAnalyticsSummary().catch((): AnalyticsSummary => ({
          total_tokens: 0,
          total_prompt_tokens: 0,
          total_completion_tokens: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_cost_usd: 0,
          avg_latency_ms: 0,
          avg_quality_score: 0,
          total_executions: 0,
          cost_by_model: {},
          model_breakdown: [],
          daily_costs: [],
        })),
        fetchAnalyticsUsage({
          agent_id: filterAgent !== "all" ? filterAgent : undefined,
          project_id: filterProject !== "all" ? filterProject : undefined,
        }).catch(() => []),
        fetchCostPerAgent().catch(() => []),
        fetchCostPerProject().catch(() => []),
        fetchQualityTrend(filterDays).catch(() => []),
        fetchAgents().catch(() => []),
        fetchProjects().catch(() => []),
      ]);

      setSummary(sum);
      setUsageLogs(logs);
      setCostsByAgent(agentCosts);
      setCostsByProject(projCosts);
      setQualityTrend(qualTrend);
      setAgents(agList);
      setProjects(prList);
    } catch (err) {
      console.error("Failed to load analytics data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterAgent, filterProject, filterDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Map agent id to name
  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    agents.forEach((a) => map.set(a.id, a));
    return map;
  }, [agents]);

  // Map project id to name
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // CSV Export
  const handleExportCsv = () => {
    if (!usageLogs || usageLogs.length === 0) {
      alert("No usage data available to export.");
      return;
    }

    const headers = [
      "ID",
      "Timestamp",
      "Agent ID",
      "Agent Name",
      "Project ID",
      "Project Name",
      "Model",
      "Prompt Tokens",
      "Completion Tokens",
      "Total Tokens",
      "Cost USD",
      "Latency MS",
    ];

    const rows = usageLogs.map((log) => {
      const ag = agentMap.get(log.agent_id);
      const pr = log.project_id ? projectMap.get(log.project_id) : undefined;
      return [
        log.id,
        log.created_at,
        log.agent_id,
        `"${ag ? ag.name : log.agent_id}"`,
        log.project_id || "",
        `"${pr ? pr.name : ""}"`,
        log.model,
        log.prompt_tokens,
        log.completion_tokens,
        log.total_tokens,
        log.estimated_cost_usd.toFixed(6),
        log.latency_ms,
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ai_usage_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Daily costs chart helpers
  const dailyCosts = summary?.daily_costs || [];
  const maxDailyCost = useMemo(() => {
    if (!dailyCosts.length) return 1;
    return Math.max(...dailyCosts.map((d) => d.cost_usd), 0.05);
  }, [dailyCosts]);

  // Top 10 agents
  const top10Agents = useMemo(() => {
    return [...costsByAgent].sort((a, b) => b.total_cost_usd - a.total_cost_usd).slice(0, 10);
  }, [costsByAgent]);

  const maxAgentCost = useMemo(() => {
    if (!top10Agents.length) return 1;
    return Math.max(...top10Agents.map((a) => a.total_cost_usd), 0.05);
  }, [top10Agents]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-cyan-600/30 to-blue-600/20 border border-cyan-500/30 rounded-xl text-cyan-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {t("analytics.title")}
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  {t("analytics.subtitle")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors border border-slate-700"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
              <span className="hidden sm:inline">{isAr ? "تحديث" : "Refresh"}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-cyan-950/50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{t("analytics.export_csv")}</span>
            </button>
          </div>
        </div>

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur h-32 animate-pulse flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 bg-slate-800 rounded" />
                  <div className="h-8 w-8 bg-slate-800/80 rounded-lg" />
                </div>
                <div>
                  <div className="h-6 w-28 bg-slate-800 rounded mb-1.5" />
                  <div className="h-3 w-36 bg-slate-800/60 rounded" />
                </div>
              </div>
            ))
          ) : (
            <>
          {/* Total Tokens */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur shadow-sm relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {t("analytics.kpi_tokens")}
              </span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {summary ? summary.total_tokens.toLocaleString() : "..."}
              </span>
              <span className="text-xs text-slate-400">tokens</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <span>Prompt: {summary?.prompt_tokens?.toLocaleString() || 0}</span>
              <span>•</span>
              <span>Completion: {summary?.completion_tokens?.toLocaleString() || 0}</span>
            </div>
          </div>

          {/* Total Cost ($ USD) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {t("analytics.kpi_cost")}
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                ${summary ? summary.total_cost_usd.toFixed(4) : "0.0000"}
              </span>
              <span className="text-xs text-emerald-400 font-medium">USD</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>≈ {summary ? (summary.total_cost_usd * 48.5).toFixed(2) : 0} EGP</span>
              <span className="text-slate-400">{summary?.total_executions || 0} runs</span>
            </div>
          </div>

          {/* Avg Quality Score */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {t("analytics.kpi_quality")}
              </span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {summary ? summary.avg_quality_score : 90}%
              </span>
              <span className="text-xs text-amber-400 font-medium flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3 inline" /> Enterprise
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {isAr ? "تقييم مؤشرات الأداء والدقة للمخرجات" : "Quality benchmark across all deliverables"}
            </div>
          </div>

          {/* Avg Latency */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {t("analytics.kpi_latency")}
              </span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Timer className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {summary ? summary.avg_latency_ms : 0}
              </span>
              <span className="text-xs text-slate-400">ms</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <span>≈ {summary ? (summary.avg_latency_ms / 1000).toFixed(2) : 0}s</span>
              <span>•</span>
              <span className="text-purple-400 font-mono">Parallel Async</span>
            </div>
          </div>
            </>
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Cost over time (Daily trend) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h2 className="text-base font-semibold text-white">
                  {t("analytics.chart_cost_trend")}
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                {isAr ? "آخر 30 يوم" : "Last 30 days"}
              </span>
            </div>

            {dailyCosts.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                {isAr ? "لا توجد بيانات استهلاك مسجلة بعد" : "No usage data recorded yet"}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 border-b border-slate-800">
                  {dailyCosts.map((day, idx) => {
                    const heightPercent = Math.max(8, Math.round((day.cost_usd / maxDailyCost) * 100));
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                      >
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-cyan-500/40 group-hover:bg-cyan-400 rounded-t transition-all cursor-pointer relative"
                        >
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                            <div className="bg-slate-950 text-white text-[10px] px-2 py-1 rounded border border-slate-700 shadow-xl whitespace-nowrap">
                              <p className="font-semibold text-cyan-300">${day.cost_usd.toFixed(4)}</p>
                              <p className="text-slate-400">{day.total_tokens.toLocaleString()} tok</p>
                              <p className="text-slate-500">{day.date}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 px-1">
                  <span>{dailyCosts[0]?.date || ""}</span>
                  <span>{dailyCosts[Math.floor(dailyCosts.length / 2)]?.date || ""}</span>
                  <span>{dailyCosts[dailyCosts.length - 1]?.date || ""}</span>
                </div>
              </div>
            )}
          </div>

          {/* Chart 2: Top Agents by Cost & Usage */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-400" />
                <h2 className="text-base font-semibold text-white">
                  {t("analytics.chart_top_agents")}
                </h2>
              </div>
              <span className="text-xs text-slate-400">Top 10 Agents</span>
            </div>

            {top10Agents.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                {isAr ? "لا توجد بيانات وكلاء مسجلة بعد" : "No agent cost data yet"}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {top10Agents.map((item, idx) => {
                  const ag = agentMap.get(item.agent_id);
                  const name = ag ? (isAr ? ag.name_ar || ag.name : ag.name) : item.agent_id;
                  const percent = Math.max(5, Math.round((item.total_cost_usd / maxAgentCost) * 100));

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200 truncate max-w-[200px]">
                          {idx + 1}. {name}
                        </span>
                        <div className="flex items-center gap-2 text-slate-400 font-mono">
                          <span>${item.total_cost_usd.toFixed(4)}</span>
                          <span className="text-[10px] text-slate-500">
                            ({item.total_tokens.toLocaleString()} tok)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chart 3: Cost by Model Distribution */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h2 className="text-base font-semibold text-white">
                  {t("analytics.chart_models")}
                </h2>
              </div>
              <span className="text-xs text-slate-400">LLM Matrix</span>
            </div>

            {summary?.cost_by_model && Object.keys(summary.cost_by_model).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(summary.cost_by_model).map(([model, cost], idx) => {
                  const total = summary.total_cost_usd || 1;
                  const pct = Math.round((cost / total) * 100) || 1;
                  const color =
                    model.includes("gemini") ? "from-cyan-500 to-blue-500" :
                    model.includes("gpt") ? "from-emerald-500 to-teal-500" :
                    "from-purple-500 to-indigo-500";

                  return (
                    <div key={idx} className="space-y-1 bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-medium text-slate-200">{model}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 font-semibold">{pct}%</span>
                          <span className="text-slate-400 font-mono">${cost.toFixed(4)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-700/50 h-2 rounded-full overflow-hidden mt-1">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full bg-gradient-to-r ${color} rounded-full`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
                {isAr ? "لا توجد توزيعات نماذج" : "No model breakdown yet"}
              </div>
            )}
          </div>

          {/* Chart 4: Quality Score Trend */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-semibold text-white">
                  {isAr ? "مسار تقييم جودة المخرجات" : "Quality Trend Over Time"}
                </h2>
              </div>
              <span className="text-xs text-amber-400 font-mono">
                Threshold: 85%+
              </span>
            </div>

            {qualityTrend.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
                {isAr ? "لا توجد تقييمات جودة مسجلة" : "No quality trend records yet"}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-36 flex items-end gap-2 pt-4 pb-2 border-b border-slate-800">
                  {qualityTrend.map((point, idx) => {
                    const heightPercent = Math.max(15, Math.min(100, Math.round(point.avg_quality_score)));
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                      >
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-amber-500/50 group-hover:bg-amber-400 rounded-t transition-all cursor-pointer relative"
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                            <div className="bg-slate-950 text-white text-[10px] px-2 py-1 rounded border border-slate-700 shadow-xl whitespace-nowrap">
                              <p className="font-semibold text-amber-300">{point.avg_quality_score}%</p>
                              <p className="text-slate-400">{point.evaluations_count} evals</p>
                              <p className="text-slate-500">{point.date}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 px-1">
                  <span>{qualityTrend[0]?.date || ""}</span>
                  <span>{qualityTrend[qualityTrend.length - 1]?.date || ""}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Usage Logs Section */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {t("analytics.table_title")}
              </h2>
              <p className="text-xs text-slate-400">
                {isAr
                  ? "سجل حي ومفصل لكل استدعاء نموذج ذكاء اصطناعي وتكلفته"
                  : "Detailed execution log of every AI prompt, completion, latency, and calculated cost"}
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Agent Filter */}
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">{t("analytics.filter_agent")}</span>
                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">
                    {t("analytics.all_agents")}
                  </option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id} className="bg-slate-900 text-white">
                      {isAr ? ag.name_ar || ag.name : ag.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Filter */}
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-400">{t("analytics.filter_project")}</span>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">
                    {t("analytics.all_projects")}
                  </option>
                  {projects.map((pr) => (
                    <option key={pr.id} value={pr.id} className="bg-slate-900 text-white">
                      {pr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Virtualized High-Performance Logs Table */}
          <div ref={parentRef} className="overflow-auto border border-slate-800 rounded-lg max-h-[500px]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="sticky top-0 z-10 bg-slate-900 uppercase text-[10px] text-slate-400 font-semibold border-b border-slate-800 shadow-md">
                <tr>
                  <th className="px-4 py-3">{t("analytics.col_time")}</th>
                  <th className="px-4 py-3">{t("analytics.col_agent")}</th>
                  <th className="px-4 py-3">{t("analytics.col_project")}</th>
                  <th className="px-4 py-3">{t("analytics.col_model")}</th>
                  <th className="px-4 py-3">{t("analytics.col_tokens")}</th>
                  <th className="px-4 py-3">{t("analytics.col_cost")}</th>
                  <th className="px-4 py-3">{t("analytics.col_latency")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-400 mb-1" />
                      <span>{isAr ? "جارٍ تحميل السجلات..." : "Loading usage logs..."}</span>
                    </td>
                  </tr>
                ) : usageLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      {t("analytics.empty")}
                    </td>
                  </tr>
                ) : (
                  <>
                    {paddingTop > 0 && (
                      <tr>
                        <td colSpan={7} style={{ height: `${paddingTop}px` }} />
                      </tr>
                    )}
                    {virtualItems.map((virtualRow) => {
                      const log = usageLogs[virtualRow.index];
                    const ag = agentMap.get(log.agent_id);
                    const pr = log.project_id ? projectMap.get(log.project_id) : undefined;
                    const dateFormatted = new Date(log.created_at).toLocaleString(
                      isAr ? "ar-EG" : "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      }
                    );

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {dateFormatted}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-medium text-white">
                            {ag ? (isAr ? ag.name_ar || ag.name : ag.name) : log.agent_id}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {pr ? (
                            <span className="text-slate-300">{pr.name}</span>
                          ) : (
                            <span className="text-slate-600 italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-cyan-300 border border-slate-700">
                            {log.model}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono">
                          <span className="text-white font-medium">
                            {log.total_tokens.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-1">
                            ({log.prompt_tokens}p / {log.completion_tokens}c)
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-emerald-400 font-semibold">
                          ${log.estimated_cost_usd.toFixed(5)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-400">
                          {log.latency_ms} ms
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
      </div>
    </AppShell>
  );
}

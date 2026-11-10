import React from "react";
import Link from "next/link";
import {
  Bot,
  Play,
  CheckSquare,
  Sparkles,
  Download,
  Wrench,
  X,
} from "lucide-react";
import { Agent, AgentStatus, Deliverable } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { AGENT_ICONS } from "./types";

interface AgentDrawerProps {
  selectedAgent: Agent;
  onClose: () => void;
  statuses: Record<string, AgentStatus>;
  agentDeliverables: Deliverable[];
  loadingDeliverables: boolean;
  onSimulateStatus: (
    agentId: string,
    targetStatus: "idle" | "working" | "blocked"
  ) => void;
  onOpenExecution: (agent: Agent) => void;
}

export const AgentDrawer = React.memo(function AgentDrawer({
  selectedAgent,
  onClose,
  statuses,
  agentDeliverables,
  loadingDeliverables,
  onSimulateStatus,
  onOpenExecution,
}: AgentDrawerProps) {
  const { t, isAr } = useI18n();
  const curSt = statuses[selectedAgent.id]?.status || "idle";
  const curTask = statuses[selectedAgent.id]?.current_task;
  const IconComp = AGENT_ICONS[selectedAgent.id] || Bot;

  return (
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
                <IconComp className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isAr && selectedAgent.name_ar
                    ? selectedAgent.name_ar
                    : selectedAgent.name}
                </h3>
                <p className="text-xs text-gray-400">
                  {isAr && selectedAgent.role_ar
                    ? selectedAgent.role_ar
                    : selectedAgent.role}
                </p>
              </div>
            </div>

            <button
              data-testid="close-profile-drawer"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Status Badge Card */}
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
                  onClick={() => onSimulateStatus(selectedAgent.id, "idle")}
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
                  onClick={() => onSimulateStatus(selectedAgent.id, "working")}
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
                  onClick={() => onSimulateStatus(selectedAgent.id, "blocked")}
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
              <span>
                {t("agents.tools_count")} ({selectedAgent.tools.length})
              </span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedAgent.tools.map(tool => (
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
              <div className="py-4 text-center text-gray-500">
                Loading deliverables...
              </div>
            ) : agentDeliverables.length === 0 ? (
              <p className="text-[11px] text-gray-500 italic py-2">
                {t("virtual_office.no_deliverables")}
              </p>
            ) : (
              <div className="space-y-2">
                {agentDeliverables.map(del => (
                  <div
                    key={del.id}
                    className="rounded-lg border border-gray-800/80 bg-[#11131c] p-2.5 flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <h5 className="font-bold text-white text-[11px] truncate">
                        {del.title}
                      </h5>
                      <span className="text-[10px] text-gray-400">
                        Score: {del.quality_score}/100
                      </span>
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
              onOpenExecution(selectedAgent);
              onClose();
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
  );
});

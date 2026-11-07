import React from "react";
import { useI18n } from "@/lib/i18n";

interface OfficeHeaderProps {
  wsConnected: boolean;
  totalAgents: number;
  idleCount: number;
  workingCount: number;
  blockedCount: number;
}

export const OfficeHeader = React.memo(function OfficeHeader({
  wsConnected,
  totalAgents,
  idleCount,
  workingCount,
  blockedCount,
}: OfficeHeaderProps) {
  const { t, isAr } = useI18n();

  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center gap-2">
            <span className="text-[#a78bfa]">🏢</span>
            <span>{t("virtual_office.title")}</span>
          </h1>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            <span
              className={`h-2 w-2 rounded-full ${
                wsConnected ? "bg-emerald-400 animate-pulse" : "bg-gray-500"
              }`}
            />
            <span>
              {wsConnected
                ? t("virtual_office.live_sync")
                : "WebSocket Connecting..."}
            </span>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {t("virtual_office.subtitle")}
        </p>
      </div>

      {/* Live Status KPI Counters */}
      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        <div className="rounded-xl border border-gray-800 bg-[#13151f] px-3.5 py-2 font-semibold text-gray-300">
          <span className="text-gray-500 mr-1.5">
            {isAr ? "إجمالي:" : "Total:"}
          </span>
          <strong className="text-white">{totalAgents}</strong>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 font-semibold text-emerald-400 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>
            {idleCount} {t("virtual_office.status_idle")}
          </span>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 font-semibold text-amber-400 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          <span>
            {workingCount} {t("virtual_office.status_working")}
          </span>
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 font-semibold text-rose-400 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          <span>
            {blockedCount} {t("virtual_office.status_blocked")}
          </span>
        </div>
      </div>
    </div>
  );
});

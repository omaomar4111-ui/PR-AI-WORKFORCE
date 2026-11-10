import React from "react";
import { Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface OfficeControlsProps {
  statusFilter: "all" | "working" | "blocked" | "idle";
  setStatusFilter: (filter: "all" | "working" | "blocked" | "idle") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalAgents: number;
  workingCount: number;
  blockedCount: number;
  idleCount: number;
}

export const OfficeControls = React.memo(function OfficeControls({
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  totalAgents,
  workingCount,
  blockedCount,
  idleCount,
}: OfficeControlsProps) {
  const { t } = useI18n();

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Status Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "working", "blocked", "idle"] as const).map(filterKey => {
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
          onChange={e => setSearchQuery(e.target.value)}
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
  );
});

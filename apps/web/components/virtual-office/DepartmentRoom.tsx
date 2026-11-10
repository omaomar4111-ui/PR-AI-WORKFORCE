"use client";

import React from "react";
import { Bot } from "lucide-react";
import { AvatarNode } from "./AvatarNode";
import { Agent, AgentStatus } from "@/lib/api";
import { AGENT_ICONS, DEPARTMENT_CONFIGS } from "./types";

export interface DepartmentRoomProps {
  deptKey: string;
  deptAgents: Agent[];
  visibleAgents: Agent[];
  statuses: Record<string, AgentStatus>;
  isAr: boolean;
  onSelectAgent: (agent: Agent) => void;
}

export const DepartmentRoom = React.memo(
  function DepartmentRoom({
    deptKey,
    deptAgents,
    visibleAgents,
    statuses,
    isAr,
    onSelectAgent,
  }: DepartmentRoomProps) {
    const conf = DEPARTMENT_CONFIGS[deptKey] || DEPARTMENT_CONFIGS.marketing;
    const RoomIcon = conf.icon;

    const deptWorking = deptAgents.filter(
      (a) => statuses[a.id]?.status === "working"
    ).length;
    const deptBlocked = deptAgents.filter(
      (a) => statuses[a.id]?.status === "blocked"
    ).length;

    return (
      <div
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
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${conf.badgeBg} ${conf.badgeText}`}
                >
                  {deptAgents.length} Agents
                </span>
              </h3>
              <p className="text-[11px] text-gray-400 capitalize">
                {deptKey} Studio
              </p>
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
              onSelect={onSelectAgent}
              IconComponent={AGENT_ICONS[agent.id] || Bot}
            />
          ))}
        </div>

        {visibleAgents.length === 0 && (
          <div className="mt-4 flex h-24 flex-col items-center justify-center text-center text-gray-500 border border-dashed border-gray-800/80 rounded-xl">
            <p className="text-xs">
              No agents match current filters in this studio
            </p>
          </div>
        )}
      </div>
    );
  }
);

export const DepartmentStudio = DepartmentRoom;
export default DepartmentRoom;

"use client";

import React from "react";
import { Agent, AgentStatus } from "@/lib/api";

interface AvatarNodeProps {
  agent: Agent;
  status: AgentStatus | undefined;
  isAr: boolean;
  onSelect: (agent: Agent) => void;
  IconComponent: React.ComponentType<{ className?: string }>;
}

export const AvatarNode = React.memo(function AvatarNode({
  agent,
  status,
  isAr,
  onSelect,
  IconComponent,
}: AvatarNodeProps) {
  const isWorking = status?.status === "working";
  const isBlocked = status?.status === "blocked";
  const currentTask = status?.current_task;

  return (
    <div
      data-testid={`avatar-${agent.id}`}
      onClick={() => onSelect(agent)}
      className={`group relative flex flex-col items-center justify-between rounded-xl border p-3 text-center transition cursor-pointer select-none hover:-translate-y-1 hover:shadow-lg ${
        isWorking
          ? "border-amber-500/60 bg-amber-500/10 shadow-amber-500/10"
          : isBlocked
          ? "border-rose-500/60 bg-rose-500/10 shadow-rose-500/10"
          : "border-gray-800 bg-[#161826]/70 hover:border-[#8b5cf6]/50 hover:bg-[#1a1d2e]"
      }`}
    >
      {/* Status Beacon Top Corner */}
      <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2 flex items-center">
        {isWorking ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
          </span>
        ) : isBlocked ? (
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
        )}
      </div>

      {/* Avatar Token with Gradient Ring */}
      <div
        className={`relative mb-2 flex h-11 w-11 items-center justify-center rounded-full border transition group-hover:scale-105 ${
          isWorking
            ? "border-amber-400 bg-amber-500/20 text-amber-300"
            : isBlocked
            ? "border-rose-400 bg-rose-500/20 text-rose-300"
            : "border-[#8b5cf6]/40 bg-[#8b5cf6]/15 text-[#c4b5fd]"
        }`}
      >
        <IconComponent className="h-5 w-5" />
      </div>

      {/* Agent Label */}
      <div className="w-full">
        <h4 className="text-xs font-bold text-white truncate group-hover:text-[#c4b5fd]">
          {isAr && agent.name_ar ? agent.name_ar : agent.name}
        </h4>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">
          {isAr && agent.role_ar ? agent.role_ar : agent.role}
        </p>
      </div>

      {/* Working Task Tooltip if active */}
      {currentTask && isWorking && (
        <div className="mt-2 text-[9px] font-mono text-amber-300/90 truncate w-full px-1 py-0.5 rounded bg-black/40 border border-amber-500/20">
          ⚡ {currentTask}
        </div>
      )}
    </div>
  );
});

export default AvatarNode;

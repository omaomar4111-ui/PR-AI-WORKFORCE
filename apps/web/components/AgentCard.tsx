"use client";

import React from "react";
import { Play, Wrench, Bot } from "lucide-react";
import { Agent } from "@/lib/api";

interface AgentCardProps {
  agent: Agent;
  isAr: boolean;
  colors: { bg: string; text: string; border: string };
  IconComponent: React.ComponentType<{ className?: string }>;
  onDeploy: (agent: Agent) => void;
  toolsCountLabel: string;
  statusReadyLabel: string;
  runButtonLabel: string;
}

export const AgentCard = React.memo(function AgentCard({
  agent,
  isAr,
  colors,
  IconComponent,
  onDeploy,
  toolsCountLabel,
  statusReadyLabel,
  runButtonLabel,
}: AgentCardProps) {
  return (
    <div
      data-testid={`agent-card-${agent.id}`}
      className="group relative flex flex-col justify-between rounded-2xl border border-gray-800 bg-[#13151f] p-5 shadow-lg transition duration-200 hover:border-[#8b5cf6]/60 hover:shadow-xl hover:shadow-[#8b5cf6]/5"
    >
      <div>
        {/* Card Header: Avatar & Dept Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b5cf6]/20 to-indigo-500/10 border border-[#8b5cf6]/30 text-[#a78bfa] shadow-inner group-hover:scale-105 transition">
            <IconComponent className="h-6 w-6" />
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
              {toolsCountLabel} ({agent.tools?.length || 0})
            </span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {statusReadyLabel}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {agent.tools?.slice(0, 3).map(tool => (
              <span
                key={tool}
                className="rounded bg-[#1a1c29] border border-gray-800 px-1.5 py-0.5 text-[9px] font-mono text-gray-300"
              >
                {tool}
              </span>
            ))}
            {agent.tools && agent.tools.length > 3 && (
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
          onClick={() => onDeploy(agent)}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/40 py-2 text-xs font-bold text-[#c4b5fd] shadow transition hover:bg-[#8b5cf6] hover:text-white"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>{runButtonLabel}</span>
        </button>
      </div>
    </div>
  );
});

export default AgentCard;

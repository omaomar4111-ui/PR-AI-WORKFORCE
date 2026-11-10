"use client";

import React, { useMemo } from "react";
import { Agent, AgentStatus } from "@/lib/api";
import { DepartmentRoom } from "./DepartmentRoom";
import { ORDERED_DEPARTMENTS } from "./types";

export interface FloorPlanGridProps {
  loading: boolean;
  agents: Agent[];
  statuses: Record<string, AgentStatus>;
  isAr: boolean;
  matchesAgentFilter: (agent: Agent) => boolean;
  onSelectAgent: (agent: Agent) => void;
}

export const FloorPlanGrid = React.memo(function FloorPlanGrid({
  loading,
  agents,
  statuses,
  isAr,
  matchesAgentFilter,
  onSelectAgent,
}: FloorPlanGridProps) {
  // Memoize department agent partition so we don't re-filter all agents on every render
  const deptAgentsMap = useMemo(() => {
    const map: Record<string, Agent[]> = {};
    for (const deptKey of ORDERED_DEPARTMENTS) {
      map[deptKey] = agents.filter((a) => a.department === deptKey);
    }
    return map;
  }, [agents]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {ORDERED_DEPARTMENTS.map((deptKey) => {
        const deptAgents = deptAgentsMap[deptKey] || [];
        const visibleAgents = deptAgents.filter(matchesAgentFilter);

        return (
          <DepartmentRoom
            key={deptKey}
            deptKey={deptKey}
            deptAgents={deptAgents}
            visibleAgents={visibleAgents}
            statuses={statuses}
            isAr={isAr}
            onSelectAgent={onSelectAgent}
          />
        );
      })}
    </div>
  );
});

export default FloorPlanGrid;

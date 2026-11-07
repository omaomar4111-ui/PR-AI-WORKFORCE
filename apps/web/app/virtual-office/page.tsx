"use client";

import dynamic from "next/dynamic";
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  getWsBaseUrl,
} from "@/lib/api";

import { OfficeHeader } from "@/components/virtual-office/OfficeHeader";
import { OfficeControls } from "@/components/virtual-office/OfficeControls";
import { DepartmentStudio } from "@/components/virtual-office/DepartmentStudio";
import { AgentDrawer } from "@/components/virtual-office/AgentDrawer";
import {
  ORDERED_DEPARTMENTS,
  AGENT_ICONS,
} from "@/components/virtual-office/types";

// Dynamically Code-Split Execution Console Modal for lean initial bundle
const AgentExecutionModal = dynamic(
  () => import("@/components/AgentExecutionModal"),
  { ssr: false }
);

export default function VirtualOfficePage() {
  const { isAr } = useI18n();

  // Core Data State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<
    "all" | "working" | "blocked" | "idle"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer & Execution Modal State
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [executingAgent, setExecutingAgent] = useState<Agent | null>(null);
  const [agentDeliverables, setAgentDeliverables] = useState<Deliverable[]>([]);
  const [loadingDeliverables, setLoadingDeliverables] = useState(false);

  // Live WebSocket State
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // 1. Initial Load: Agents, Statuses, Projects, Deliverables
  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);
        const [agentsData, statusesData, projectsData, deliverablesData] =
          await Promise.all([
            fetchAgents(),
            fetchAgentStatuses().catch(() => []),
            fetchProjects().catch(() => []),
            fetchDeliverables().catch(() => []),
          ]);

        setAgents(agentsData);
        setProjects(projectsData);
        setDeliverables(deliverablesData);

        const statusMap: Record<string, AgentStatus> = {};
        statusesData.forEach((s) => {
          statusMap[s.agent_id] = s;
        });
        setStatuses(statusMap);
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
            console.error("WebSocket message parse error:", e);
          }
        };

        socket.onerror = () => {
          setWsConnected(false);
        };

        socket.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWs, 3000);
        };
      } catch (e) {
        console.error("WebSocket setup error:", e);
      }
    }

    connectWs();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, []);

  // 3. Load Agent-Specific Deliverables when Drawer opens
  useEffect(() => {
    if (!selectedAgent) {
      setAgentDeliverables([]);
      return;
    }

    async function loadAgentDeliverables() {
      if (!selectedAgent) return;
      try {
        setLoadingDeliverables(true);
        const data = await fetchDeliverables({ agent_id: selectedAgent.id });
        setAgentDeliverables(data.slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch agent deliverables:", err);
      } finally {
        setLoadingDeliverables(false);
      }
    }

    loadAgentDeliverables();
  }, [selectedAgent]);

  // Handle Agent Selection Callback
  const handleSelectAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
  }, []);

  // Quick Manual Status Simulation with Optimistic UI & Rollback
  const handleSimulateStatus = useCallback(
    async (
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
        if (previousStatus) {
          setStatuses((prev) => ({
            ...prev,
            [agentId]: previousStatus,
          }));
        }
      }
    },
    [statuses]
  );

  // Metric counts
  const totalAgents = agents.length;
  const workingCount = Object.values(statuses).filter(
    (s) => s.status === "working"
  ).length;
  const blockedCount = Object.values(statuses).filter(
    (s) => s.status === "blocked"
  ).length;
  const idleCount = Math.max(0, totalAgents - workingCount - blockedCount);

  // Filter agents by status and search
  const matchesAgentFilter = useCallback(
    (agent: Agent): boolean => {
      const currentStatus = statuses[agent.id]?.status || "idle";
      if (statusFilter !== "all" && currentStatus !== statusFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        agent.name.toLowerCase().includes(q) ||
        (agent.name_ar && agent.name_ar.toLowerCase().includes(q)) ||
        agent.role.toLowerCase().includes(q) ||
        (agent.role_ar && agent.role_ar.toLowerCase().includes(q)) ||
        agent.id.toLowerCase().includes(q)
      );
    },
    [statuses, statusFilter, searchQuery]
  );

  return (
    <AppShell>
      {/* ── Virtual Office Header Component ── */}
      <OfficeHeader
        wsConnected={wsConnected}
        totalAgents={totalAgents}
        idleCount={idleCount}
        workingCount={workingCount}
        blockedCount={blockedCount}
      />

      {/* ── Office Filters & Controls Bar Component ── */}
      <OfficeControls
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalAgents={totalAgents}
        workingCount={workingCount}
        blockedCount={blockedCount}
        idleCount={idleCount}
      />

      {/* ── 2D Interactive Floor Plan: 8 Department Studios ── */}
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {ORDERED_DEPARTMENTS.map((deptKey) => {
            const deptAgents = agents.filter((a) => a.department === deptKey);
            const visibleAgents = deptAgents.filter(matchesAgentFilter);

            return (
              <DepartmentStudio
                key={deptKey}
                deptKey={deptKey}
                deptAgents={deptAgents}
                visibleAgents={visibleAgents}
                statuses={statuses}
                isAr={isAr}
                onSelectAgent={handleSelectAgent}
              />
            );
          })}
        </div>
      )}

      {/* ── Agent Profile Side Drawer Component ── */}
      {selectedAgent && (
        <AgentDrawer
          selectedAgent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          statuses={statuses}
          agentDeliverables={agentDeliverables}
          loadingDeliverables={loadingDeliverables}
          onSimulateStatus={handleSimulateStatus}
          onOpenExecution={(agent) => setExecutingAgent(agent)}
        />
      )}

      {/* ── Dynamic Agent Execution Console Modal ── */}
      {executingAgent && (
        <AgentExecutionModal
          agent={executingAgent}
          onClose={() => setExecutingAgent(null)}
          projects={projects}
          agentIcons={AGENT_ICONS}
          onExecutionSuccess={(newDeliverable) => {
            setDeliverables((prev) => [newDeliverable, ...prev]);
            setAgentDeliverables((prev) => [newDeliverable, ...prev]);
          }}
        />
      )}
    </AppShell>
  );
}

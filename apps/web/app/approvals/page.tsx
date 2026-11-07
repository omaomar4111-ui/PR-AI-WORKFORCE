"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  ApprovalRequest,
  fetchApprovals,
  approveRequest,
  rejectRequest,
  editAndApproveRequest,
  getWsBaseUrl,
} from "@/lib/api";
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Edit3,
  Bot,
  Zap,
  Radio,
  Clock,
  Sparkles,
  FileCode,
  AlertTriangle,
  Send,
  Share2,
  DollarSign,
  Info,
} from "lucide-react";

export default function ApprovalsPage() {
  const { isAr, t } = useI18n();

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [wsConnected, setWsConnected] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Edit & Approve modal state
  const [editingApproval, setEditingApproval] = useState<ApprovalRequest | null>(null);
  const [editPayloadJson, setEditPayloadJson] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    try {
      const data = await fetchApprovals(filterStatus);
      setApprovals(data);
    } catch (err) {
      console.error("Failed to load approvals", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // Live WebSocket Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const wsUrl = `${getWsBaseUrl()}/ws/approvals`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === "approval_created" || msg.event === "approval_updated") {
            loadApprovals();
          }
        } catch (e) {
          console.error("WS parse error", e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };
    } catch (e) {
      console.error("WS error", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [loadApprovals]);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    const previousApprovals = [...approvals];

    // Optimistic UI update: instantly reflect approved state with zero perceived latency
    setApprovals((prev) =>
      prev.map((appr) =>
        appr.id === id
          ? {
              ...appr,
              status: "approved",
              reviewed_at: new Date().toISOString(),
              reviewed_by: "Current User (Optimistic)",
            }
          : appr
      )
    );

    try {
      await approveRequest(id);
      await loadApprovals();
    } catch (err: any) {
      // Rollback to snapshot on failure
      setApprovals(previousApprovals);
      alert(err.message || "Approval failed. Reverting changes.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt(t("approvals.notes_placeholder")) || "Rejected by user";
    setActionLoadingId(id);
    const previousApprovals = [...approvals];

    // Optimistic UI update: instantly reflect rejected state
    setApprovals((prev) =>
      prev.map((appr) =>
        appr.id === id
          ? {
              ...appr,
              status: "rejected",
              notes: reason,
              reviewed_at: new Date().toISOString(),
              reviewed_by: "Current User (Optimistic)",
            }
          : appr
      )
    );

    try {
      await rejectRequest(id, reason);
      await loadApprovals();
    } catch (err: any) {
      // Rollback to snapshot on failure
      setApprovals(previousApprovals);
      alert(err.message || "Rejection failed. Reverting changes.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openEditModal = (approval: ApprovalRequest) => {
    setEditingApproval(approval);
    setEditPayloadJson(JSON.stringify(approval.payload || {}, null, 2));
    setEditNotes("");
    setJsonError(null);
  };

  const handleSaveAndApprove = async () => {
    if (!editingApproval) return;
    try {
      const parsed = JSON.parse(editPayloadJson);
      const targetId = editingApproval.id;
      const previousApprovals = [...approvals];

      // Optimistic UI update
      setApprovals((prev) =>
        prev.map((appr) =>
          appr.id === targetId
            ? {
                ...appr,
                status: "approved",
                payload: parsed,
                notes: editNotes,
                reviewed_at: new Date().toISOString(),
                reviewed_by: "Current User (Optimistic)",
              }
            : appr
        )
      );
      setEditingApproval(null);

      try {
        await editAndApproveRequest(targetId, parsed, editNotes);
        await loadApprovals();
      } catch (err: any) {
        // Rollback on failure
        setApprovals(previousApprovals);
        alert(err.message || "Save & Approve failed. Reverting changes.");
      }
    } catch (err: any) {
      setJsonError("Invalid JSON: " + err.message);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "send_email":
        return <Send className="h-4 w-4 text-sky-400" />;
      case "publish_post":
        return <Share2 className="h-4 w-4 text-emerald-400" />;
      case "start_ad_campaign":
        return <DollarSign className="h-4 w-4 text-amber-400" />;
      default:
        return <Zap className="h-4 w-4 text-[#a78bfa]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-400">
            <Clock className="h-3 w-3 animate-spin" />
            {t("approvals.tab_pending")}
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
            <CheckCircle className="h-3 w-3" />
            {t("approvals.tab_approved")}
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 text-xs font-bold text-red-400">
            <XCircle className="h-3 w-3" />
            {t("approvals.tab_rejected")}
          </span>
        );
      case "edited":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 text-xs font-bold text-purple-300">
            <Edit3 className="h-3 w-3" />
            {t("approvals.tab_edited")}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-md">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  {t("approvals.title")}
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t("approvals.subtitle")}
                </p>
              </div>
            </div>
          </div>

          {/* WebSocket Status Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                wsConnected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-gray-800 bg-[#171923] text-gray-400"
              }`}
            >
              <Radio
                className={`h-3.5 w-3.5 ${
                  wsConnected ? "text-emerald-400 animate-pulse" : "text-gray-500"
                }`}
              />
              <span>{wsConnected ? t("approvals.live_connected") : "WebSocket Offline"}</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-2">
          {[
            { id: "all", label: t("approvals.tab_all") },
            { id: "pending", label: t("approvals.tab_pending") },
            { id: "approved", label: t("approvals.tab_approved") },
            { id: "rejected", label: t("approvals.tab_rejected") },
            { id: "edited", label: t("approvals.tab_edited") },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                filterStatus === tab.id
                  ? "bg-[#8b5cf6] text-white shadow-sm shadow-[#8b5cf6]/30"
                  : "bg-[#171923] text-gray-400 hover:text-white hover:bg-[#1f2230]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Approvals List */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
          </div>
        ) : approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-[#12141c]/50 p-12 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500/50 mb-3" />
            <h3 className="text-sm font-semibold text-gray-300">
              {t("approvals.empty")}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              All agent execution boundaries are secure and compliant.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {approvals.map((req) => {
              const isPending = req.status === "pending";
              return (
                <div
                  key={req.id}
                  className={`rounded-xl border bg-[#12141c] p-5 transition shadow-sm ${
                    isPending
                      ? "border-amber-500/40 shadow-amber-500/5"
                      : "border-gray-800/80"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Request details */}
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171923] border border-gray-800 text-[#a78bfa] shrink-0">
                        {getActionIcon(req.action_type)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded">
                            {req.action_type}
                          </span>
                          <span className="text-xs text-gray-400">
                            by agent <span className="font-bold text-gray-200">@{req.requested_by_agent_id}</span>
                          </span>
                          {getStatusBadge(req.status)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          Workflow: {req.workflow_id} {req.step_id ? `| Step: ${req.step_id}` : ""}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Requested at {new Date(req.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions for pending requests */}
                    {isPending && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={actionLoadingId === req.id}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>{t("approvals.action_approve")}</span>
                        </button>
                        <button
                          onClick={() => openEditModal(req)}
                          disabled={actionLoadingId === req.id}
                          className="flex items-center gap-1.5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>{t("approvals.action_edit")}</span>
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={actionLoadingId === req.id}
                          className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-400 transition disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>{t("approvals.action_reject")}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Payload Details Box */}
                  <div className="mt-4 rounded-lg border border-gray-800 bg-[#0d0e12] p-3 text-xs">
                    <div className="flex items-center justify-between text-gray-400 pb-2 border-b border-gray-800/80 mb-2">
                      <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                        <FileCode className="h-3.5 w-3.5 text-purple-400" />
                        {t("approvals.col_payload")}
                      </span>
                      {req.reviewed_by && (
                        <span className="text-[11px] text-gray-500">
                          Reviewed by {req.reviewed_by} at {new Date(req.reviewed_at || "").toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <pre className="font-mono text-[11px] text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-40 scrollbar-thin">
                      {JSON.stringify(req.payload, null, 2)}
                    </pre>
                    {req.notes && (
                      <div className="mt-2 pt-2 border-t border-gray-800/80 text-[11px] text-amber-300/90 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>Notes: {req.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit & Approve Modal */}
        {editingApproval && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-[#12141c] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Edit3 className="h-5 w-5 text-[#8b5cf6]" />
                  <h3 className="text-base font-bold text-white">
                    {t("approvals.modal_edit_title")}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingApproval(null)}
                  className="rounded-lg p-1 text-gray-400 hover:text-white"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-gray-400">
                {t("approvals.modal_edit_desc")}
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Payload JSON
                </label>
                <textarea
                  value={editPayloadJson}
                  onChange={(e) => {
                    setEditPayloadJson(e.target.value);
                    setJsonError(null);
                  }}
                  rows={8}
                  className="w-full font-mono text-xs rounded-xl border border-gray-800 bg-[#0d0e12] p-3 text-white focus:border-[#8b5cf6] focus:outline-none"
                />
                {jsonError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {jsonError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Review Notes
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={t("approvals.notes_placeholder")}
                  className="w-full text-xs rounded-xl border border-gray-800 bg-[#0d0e12] px-3 py-2 text-white focus:border-[#8b5cf6] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingApproval(null)}
                  className="rounded-xl border border-gray-800 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#1a1c27]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndApprove}
                  className="rounded-xl bg-[#8b5cf6] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#8b5cf6]/30 hover:bg-[#7c3aed]"
                >
                  Save & Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

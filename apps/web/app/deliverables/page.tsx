"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Sparkles,
  FileCode,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  X,
  Bot,
  Layers,
  ArrowLeft,
  Search,
  Filter,
  GitBranch,
  History,
  Plus,
  RefreshCw,
  Building2,
  Users,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  Deliverable,
  fetchDeliverables,
  fetchDeliverableVersions,
  createDeliverableVersion,
  fetchClients,
  fetchAgents,
  Client,
  Agent,
} from "@/lib/api";

export default function DeliverablesPage() {
  const { t, isAr } = useI18n();

  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Filters
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Inspect Modal
  const [activeDeliverable, setActiveDeliverable] = useState<Deliverable | null>(null);

  // Version History Modal
  const [historyTarget, setHistoryTarget] = useState<Deliverable | null>(null);
  const [lineageVersions, setLineageVersions] = useState<Deliverable[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // New Version Modal
  const [forkTarget, setForkTarget] = useState<Deliverable | null>(null);
  const [newVersionTitle, setNewVersionTitle] = useState("");
  const [newVersionContent, setNewVersionContent] = useState("");
  const [submittingVersion, setSubmittingVersion] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [delivs, clList, agList] = await Promise.all([
        fetchDeliverables({
          client_id: selectedClient === "all" ? undefined : selectedClient,
          agent_id: selectedAgent === "all" ? undefined : selectedAgent,
          type: selectedType === "all" ? undefined : selectedType,
        }),
        fetchClients().catch(() => []),
        fetchAgents().catch(() => []),
      ]);
      setDeliverables(delivs);
      setClients(clList);
      setAgents(agList);
    } catch (err: any) {
      console.error("Failed to load deliverables:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClient, selectedAgent, selectedType]);

  const handleOpenVersions = async (d: Deliverable) => {
    setHistoryTarget(d);
    setLoadingVersions(true);
    try {
      const vers = await fetchDeliverableVersions(d.id);
      setLineageVersions(vers);
    } catch (err) {
      console.error("Failed to fetch versions:", err);
      setLineageVersions([d]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleOpenNewVersion = (d: Deliverable) => {
    setForkTarget(d);
    const nextVer = (d.version || 1) + 1;
    setNewVersionTitle(`${d.title} (v${nextVer})`);
    setNewVersionContent(d.raw_content || JSON.stringify(d.content_json, null, 2));
  };

  const handleSaveNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forkTarget) return;

    setSubmittingVersion(true);
    try {
      let parsedJson = forkTarget.content_json;
      try {
        parsedJson = JSON.parse(newVersionContent);
      } catch (err) {
        // use as string if not valid JSON
      }

      const created = await createDeliverableVersion(forkTarget.id, {
        title: newVersionTitle.trim(),
        raw_content: newVersionContent,
        content_json: parsedJson,
        quality_score: Math.min(100, (forkTarget.quality_score || 95) + 2),
      });

      setDeliverables((prev) => [created, ...prev]);
      setForkTarget(null);
    } catch (err: any) {
      alert(err.message || "Failed to create new version");
    } finally {
      setSubmittingVersion(false);
    }
  };

  const filtered = deliverables.filter((d) => {
    if (!debouncedSearch) return true;
    const term = debouncedSearch.toLowerCase();
    return (
      d.title.toLowerCase().includes(term) ||
      d.agent_name.toLowerCase().includes(term) ||
      (d.project_name && d.project_name.toLowerCase().includes(term)) ||
      (d.client_name && d.client_name.toLowerCase().includes(term))
    );
  });

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {t("deliverables.title")}
            </h1>
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
              {deliverables.length} Deliverables Stored
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {t("deliverables.subtitle")}
          </p>
        </div>

        {/* Deploy Agent Link */}
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 rounded-lg bg-[#8b5cf6] px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/20 hover:bg-[#7c3aed] transition"
        >
          <Bot className="h-4 w-4" />
          <span>Launch AI Agent Console</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 rounded-2xl border border-gray-800 bg-[#12141e] p-4 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              data-testid="search-deliverables"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deliverables, agents, clients..."
              className="w-full rounded-xl border border-gray-800 bg-[#161824] py-2 ps-9 pe-3 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
            />
          </div>

          {/* Client Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {t("deliverables.filter_client")}
            </span>
            <select
              value={selectedClient}
              data-testid="filter-client"
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-[#161824] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
            >
              <option value="all">{t("deliverables.filter_all")}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Agent Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {t("deliverables.filter_agent")}
            </span>
            <select
              value={selectedAgent}
              data-testid="filter-agent"
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-[#161824] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
            >
              <option value="all">{t("deliverables.filter_all")}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {t("deliverables.filter_type")}
            </span>
            <select
              value={selectedType}
              data-testid="filter-type"
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-[#161824] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
            >
              <option value="all">{t("deliverables.filter_all")}</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
              <option value="package">Package</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deliverables Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-800 bg-[#12141e]/50 p-12 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-gray-600" />
          <h3 className="mt-4 text-base font-bold text-white">{t("deliverables.empty")}</h3>
          <p className="mt-1 text-xs text-gray-400">
            Execute any of the 8 agents or an Om Samah workflow to generate verified client deliverables.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#12141e] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="border-b border-gray-800 bg-[#161824] uppercase text-[10px] font-bold tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-3.5">{t("deliverables.col_title")}</th>
                  <th className="px-4 py-3.5">Version</th>
                  <th className="px-5 py-3.5">{t("deliverables.col_agent")}</th>
                  <th className="px-5 py-3.5">{t("deliverables.col_project")}</th>
                  <th className="px-4 py-3.5">{t("deliverables.col_score")}</th>
                  <th className="px-4 py-3.5">{t("deliverables.col_status")}</th>
                  <th className="px-4 py-3.5">{t("deliverables.col_date")}</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium">
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    data-testid="deliverable-row"
                    className="hover:bg-[#181a28] transition group cursor-pointer"
                    onClick={() => setActiveDeliverable(d)}
                  >
                    {/* Title */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#8b5cf6] shrink-0" />
                        <div>
                          <p className="font-bold text-white group-hover:text-[#c4b5fd] transition line-clamp-1">
                            {d.title}
                          </p>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {d.file_type.toUpperCase()} • ID: {d.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Version Badge */}
                    <td className="px-4 py-4">
                      <span
                        data-testid="deliverable-version-badge"
                        className="inline-flex items-center gap-1 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 px-2.5 py-0.5 text-[11px] font-extrabold text-[#c4b5fd]"
                      >
                        <GitBranch className="h-3 w-3" />
                        <span>v{d.version || 1}</span>
                      </span>
                    </td>

                    {/* Agent */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs text-[#c4b5fd]">
                        <Bot className="h-3 w-3" />
                        <span>{d.agent_name}</span>
                      </span>
                    </td>

                    {/* Project & Client */}
                    <td className="px-5 py-4 text-gray-400">
                      <div>
                        <p className="text-white text-xs font-semibold">
                          {d.project_name || "Internal Operating System"}
                        </p>
                        {d.client_name && (
                          <span className="text-[10px] text-emerald-400 font-medium">
                            {d.client_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Quality Score */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{d.quality_score}/100</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                        {d.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-4 text-gray-400 text-[11px]">
                      {d.created_at ? d.created_at.slice(0, 16).replace("T", " ") : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* New Version Button */}
                        <button
                          onClick={() => handleOpenNewVersion(d)}
                          data-testid="create-new-version-btn"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#8b5cf6]/40 bg-[#8b5cf6]/15 px-2 py-1 text-[11px] font-bold text-[#c4b5fd] hover:bg-[#8b5cf6] hover:text-white transition"
                          title="Fork new version"
                        >
                          <Plus className="h-3 w-3" />
                          <span>v{(d.version || 1) + 1}</span>
                        </button>

                        {/* View Versions */}
                        <button
                          onClick={() => handleOpenVersions(d)}
                          data-testid="view-versions-btn"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                          title="View Version History"
                        >
                          <History className="h-4 w-4" />
                        </button>

                        {/* Inspect JSON */}
                        <button
                          onClick={() => setActiveDeliverable(d)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                          title="Inspect JSON"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Download File */}
                        <a
                          href={d.file_url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VERSION HISTORY MODAL ─────────────────────────────────────────── */}
      {historyTarget && (
        <div
          data-testid="versions-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-800 bg-[#12141e] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd]">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t("deliverables.modal_version_title")}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Lineage for: <strong className="text-white">{historyTarget.title}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryTarget(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {loadingVersions ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading versions...</div>
              ) : (
                lineageVersions.map((ver) => (
                  <div
                    key={ver.id}
                    data-testid="version-lineage-item"
                    className="flex items-center justify-between rounded-xl border border-gray-800 bg-[#161824] p-4 transition hover:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-xs font-extrabold text-[#c4b5fd]">
                        v{ver.version || 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-white">{ver.title}</h4>
                        <p className="text-[10px] text-gray-400">
                          By {ver.agent_name} • {ver.created_at?.slice(0, 16).replace("T", " ")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        {ver.quality_score}/100
                      </span>
                      <button
                        onClick={() => {
                          setHistoryTarget(null);
                          setActiveDeliverable(ver);
                        }}
                        className="rounded-lg border border-gray-800 bg-[#1c1f2e] px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:text-white"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end pt-3 border-t border-gray-800">
              <button
                onClick={() => setHistoryTarget(null)}
                className="rounded-xl border border-gray-800 bg-[#161824] px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE NEW VERSION MODAL ──────────────────────────────────────── */}
      {forkTarget && (
        <div
          data-testid="new-version-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-800 bg-[#12141e] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd]">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t("deliverables.modal_new_version_title")}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Parent: <strong className="text-white">{forkTarget.title}</strong> (v{forkTarget.version || 1})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setForkTarget(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewVersion} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300">
                  Version Title *
                </label>
                <input
                  type="text"
                  data-testid="new-version-title-input"
                  value={newVersionTitle}
                  onChange={(e) => setNewVersionTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-800 bg-[#161824] px-3.5 py-2.5 text-sm text-white focus:border-[#8b5cf6] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300">
                  {t("deliverables.version_notes")} / Content *
                </label>
                <textarea
                  rows={6}
                  data-testid="new-version-content-input"
                  value={newVersionContent}
                  onChange={(e) => setNewVersionContent(e.target.value)}
                  className="mt-1.5 w-full font-mono text-xs rounded-xl border border-gray-800 bg-[#161824] p-3 text-gray-200 focus:border-[#8b5cf6] focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setForkTarget(null)}
                  className="rounded-xl border border-gray-800 bg-[#161824] px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVersion}
                  data-testid="submit-new-version-btn"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-[#8b5cf6]/30 hover:bg-[#7c3aed] disabled:opacity-50"
                >
                  {submittingVersion ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <GitBranch className="h-3.5 w-3.5" />
                  )}
                  <span>{t("deliverables.version_save")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── INSPECT DELIVERABLE MODAL ─────────────────────────────────────── */}
      {activeDeliverable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-800 bg-[#12141e] p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-[#8b5cf6]" />
                  <span>{activeDeliverable.title}</span>
                  <span className="rounded bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 px-2 py-0.5 text-[10px] font-extrabold text-[#c4b5fd]">
                    v{activeDeliverable.version || 1}
                  </span>
                </h3>
                <p className="mt-1 text-xs text-gray-400">
                  Produced by{" "}
                  <span className="font-semibold text-[#c4b5fd]">
                    {activeDeliverable.agent_name}
                  </span>{" "}
                  • Score: {activeDeliverable.quality_score}/100
                </p>
              </div>
              <button
                onClick={() => setActiveDeliverable(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Display */}
            <div className="mt-4">
              <div className="rounded-xl border border-gray-800 bg-[#0e1017] p-4 max-h-[500px] overflow-y-auto text-xs font-mono text-gray-200">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(activeDeliverable.content_json, null, 2)}
                </pre>
              </div>

              {/* Modal Footer */}
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-800">
                <span className="text-[11px] text-gray-500 font-mono">
                  Path: {activeDeliverable.file_url}
                </span>

                <div className="flex items-center gap-2">
                  <a
                    href={activeDeliverable.file_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#8b5cf6] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#7c3aed]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{t("agents.download_json")}</span>
                  </a>
                  <button
                    onClick={() => setActiveDeliverable(null)}
                    className="rounded-lg border border-gray-800 bg-[#161824] px-3.5 py-1.5 text-xs font-semibold text-gray-300 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

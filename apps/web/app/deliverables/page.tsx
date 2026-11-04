"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { Deliverable, fetchDeliverables } from "@/lib/api";

export default function DeliverablesPage() {
  const { t, isAr } = useI18n();

  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeDeliverable, setActiveDeliverable] = useState<Deliverable | null>(null);

  const loadData = async () => {
    try {
      const data = await fetchDeliverables();
      setDeliverables(data);
    } catch (err: any) {
      console.error("Failed to load deliverables:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = deliverables.filter((d) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(term) ||
      d.agent_name.toLowerCase().includes(term) ||
      (d.project_name && d.project_name.toLowerCase().includes(term))
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
          <span>{t("agents.title")}</span>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deliverables, agents, or projects..."
            className="w-full rounded-xl border border-gray-800 bg-[#14161f] py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
          />
        </div>
      </div>

      {/* Deliverables Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-[#13151f]/50 p-12 text-center">
          <Sparkles className="h-12 w-12 text-[#8b5cf6]/50 mb-3" />
          <h3 className="text-sm font-bold text-white">
            {t("deliverables.empty")}
          </h3>
          <p className="mt-1 text-xs text-gray-500 max-w-md">
            Execute a task from the Agents Directory to produce a structured deliverable with an immutable audit file.
          </p>
          <Link
            href="/agents"
            className="mt-4 rounded-xl bg-[#8b5cf6] px-4 py-2 text-xs font-bold text-white hover:bg-[#7c3aed] transition"
          >
            {t("agents.title")}
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#13151f] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-800 bg-[#161824] text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-3.5">{t("deliverables.col_title")}</th>
                  <th className="px-5 py-3.5">{t("deliverables.col_agent")}</th>
                  <th className="px-5 py-3.5">{t("deliverables.col_project")}</th>
                  <th className="px-5 py-3.5">{t("deliverables.col_score")}</th>
                  <th className="px-5 py-3.5">{t("deliverables.col_status")}</th>
                  <th className="px-5 py-3.5">{t("deliverables.col_date")}</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    data-testid={`deliverable-row-${d.id}`}
                    onClick={() => setActiveDeliverable(d)}
                    className="cursor-pointer transition hover:bg-[#181b28]"
                  >
                    {/* Title */}
                    <td className="px-5 py-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-[#8b5cf6]" />
                        <span>{d.title}</span>
                      </div>
                    </td>

                    {/* Agent */}
                    <td className="px-5 py-4">
                      <span className="rounded bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 px-2 py-0.5 text-[10px] font-bold text-[#c4b5fd]">
                        {d.agent_name}
                      </span>
                    </td>

                    {/* Project */}
                    <td className="px-5 py-4 text-gray-400">
                      {d.project_name || "—"}
                    </td>

                    {/* Quality Score */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {d.quality_score}/100
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-300">
                        {d.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-gray-500 font-mono text-[11px]">
                      {d.created_at ? d.created_at.slice(0, 16).replace("T", " ") : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setActiveDeliverable(d)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                          title="Inspect JSON"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
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

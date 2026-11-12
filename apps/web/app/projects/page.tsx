"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderGit2,
  Search,
  Plus,
  Trash2,
  Building2,
  DollarSign,
  Calendar,
  Filter,
  X,
  ArrowUpRight,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  Project,
  Client,
  fetchProjects,
  fetchClients,
  createProject,
  deleteProject,
} from "@/lib/api";

export default function ProjectsPage() {
  const { t, isAr } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "paused" | "completed">(
    "active"
  );
  const [retainer, setRetainer] = useState("5000");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projData, clientData] = await Promise.all([
        fetchProjects({
          client_id: selectedClient || undefined,
          status: selectedStatus || undefined,
        }),
        fetchClients(),
      ]);
      setProjects(projData);
      setClients(clientData);
      if (clientData.length > 0 && !clientId) {
        setClientId(clientData[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClient, selectedStatus]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientId) return;

    try {
      setSubmitting(true);
      await createProject({
        client_id: clientId,
        name: name.trim(),
        description: description.trim(),
        status,
        retainer_amount: parseFloat(retainer) || 0,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });

      setName("");
      setDescription("");
      setStatus("active");
      setRetainer("5000");
      setStartDate("");
      setEndDate("");
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, projName: string) => {
    if (!confirm(`${t("projects.delete_confirm")} (${projName})`)) return;
    try {
      await deleteProject(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete project");
    }
  };

  return (
    <AppShell>
      {/* Title & Add Project */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {t("projects.title")}
          </h1>
          <p className="mt-1 text-xs text-gray-400">{t("projects.subtitle")}</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/20 transition hover:bg-[#7c3aed]"
        >
          <Plus className="h-4 w-4" />
          <span>{t("projects.new_button")}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-[#13151f] p-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[#8b5cf6]" />
          <span className="font-semibold text-gray-300">
            {t("projects.filter_client")}
          </span>
          <select
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
            className="rounded-lg border border-gray-800 bg-[#181a26] px-2.5 py-1.5 text-white focus:outline-none"
          >
            <option value="">{t("projects.all_clients")}</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-300">
            {t("projects.filter_status")}
          </span>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-gray-800 bg-[#181a26] px-2.5 py-1.5 text-white focus:outline-none"
          >
            <option value="">{t("projects.all_statuses")}</option>
            <option value="active">{t("projects.status_active")}</option>
            <option value="paused">{t("projects.status_paused")}</option>
            <option value="completed">{t("projects.status_completed")}</option>
          </select>
        </div>

        {(selectedClient || selectedStatus) && (
          <button
            onClick={() => {
              setSelectedClient("");
              setSelectedStatus("");
            }}
            className="ml-auto text-[11px] text-gray-400 hover:text-white"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Projects Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#13151f] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-800 bg-[#161824] text-[11px] uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-5 py-3.5">{t("projects.col_project")}</th>
                <th className="px-5 py-3.5">{t("projects.col_client")}</th>
                <th className="px-5 py-3.5">{t("projects.col_status")}</th>
                <th className="px-5 py-3.5">{t("projects.col_retainer")}</th>
                <th className="px-5 py-3.5 text-right">
                  {t("projects.col_actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-4 w-36 bg-gray-800 rounded mb-1.5" />
                      <div className="h-3 w-24 bg-gray-800/60 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-24 bg-gray-800 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 w-16 bg-gray-800 rounded-full" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-20 bg-gray-800 rounded" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-4 w-12 bg-gray-800 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <FolderGit2 className="mx-auto h-8 w-8 text-gray-600 mb-2" />
                    <p className="text-xs text-gray-400">
                      {selectedClient || selectedStatus
                        ? t("projects.empty")
                        : t("projects.empty_create")}
                    </p>
                  </td>
                </tr>
              ) : (
                projects.map(proj => (
                  <tr key={proj.id} className="transition hover:bg-[#181a26]">
                    {/* Project Name */}
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/projects/${proj.id}`}
                        className="font-bold text-white hover:text-[#a78bfa] transition"
                      >
                        {proj.name}
                      </Link>
                      {proj.description && (
                        <p className="text-[10px] text-gray-400 truncate max-w-xs">
                          {proj.description}
                        </p>
                      )}
                    </td>

                    {/* Client Link */}
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/clients/${proj.client_id}`}
                        className="inline-flex items-center gap-2 font-medium text-gray-300 hover:text-white"
                      >
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              proj.client_brand_color || "#8b5cf6",
                          }}
                        />
                        <span>{proj.client_name || "Client"}</span>
                      </Link>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          proj.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : proj.status === "paused"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                        }`}
                      >
                        {proj.status}
                      </span>
                    </td>

                    {/* Retainer */}
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-emerald-400">
                        ${proj.retainer_amount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-500"> / mo</span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/projects/${proj.id}`}
                          className="rounded-lg border border-gray-800 bg-[#1a1c27] px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:border-[#8b5cf6] hover:text-white"
                        >
                          {t("projects.view")}
                        </Link>
                        <button
                          onClick={() => handleDelete(proj.id, proj.name)}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 p-1 text-red-400 hover:bg-red-500/20"
                          title={t("projects.delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-[#13151f] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="text-base font-bold text-white">
                {t("project_modal.title_new")}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {clients.length === 0 ? (
              <div className="py-6 text-center">
                <Building2 className="mx-auto h-8 w-8 text-[#8b5cf6] mb-2" />
                <p className="text-xs text-gray-300 mb-4">
                  {isAr
                    ? "يجب إضافة عميل أولاً قبل إنشاء مشروع!"
                    : "Please add at least one client before creating a project!"}
                </p>
                <Link
                  href="/clients"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#8b5cf6] px-4 py-2 text-xs font-bold text-white"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t("dash.add_client")}</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="mt-4 space-y-4">
                {/* Client Select */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("project_modal.client")} *
                  </label>
                  <select
                    required
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.industry})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Project Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("project_modal.name")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Media Crisis Management & PR"
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("project_modal.description")}
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Project deliverables, campaign scope..."
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>

                {/* Status & Retainer */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      {t("project_modal.status")}
                    </label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                    >
                      <option value="active">
                        {t("projects.status_active")}
                      </option>
                      <option value="paused">
                        {t("projects.status_paused")}
                      </option>
                      <option value="completed">
                        {t("projects.status_completed")}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      {t("project_modal.retainer")}
                    </label>
                    <input
                      type="number"
                      value={retainer}
                      onChange={e => setRetainer(e.target.value)}
                      placeholder="5000"
                      className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      {t("project_modal.start_date")}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      {t("project_modal.end_date")}
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-gray-800 bg-[#181a26] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#202333]"
                  >
                    {t("project_modal.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-[#8b5cf6] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/20 hover:bg-[#7c3aed] disabled:opacity-50"
                  >
                    {submitting
                      ? t("project_modal.saving")
                      : t("project_modal.save")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

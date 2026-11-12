"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Mail,
  Phone,
  UserCheck,
  FolderGit2,
  Plus,
  DollarSign,
  Calendar,
  X,
  ExternalLink,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  Client,
  Project,
  fetchClient,
  createProject,
  deleteProject,
} from "@/lib/api";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, isAr } = useI18n();

  const clientId = params?.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Project Modal State
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectStatus, setProjectStatus] = useState<
    "active" | "paused" | "completed"
  >("active");
  const [projectRetainer, setProjectRetainer] = useState("5000");
  const [projectSubmitting, setProjectSubmitting] = useState(false);

  const loadClient = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchClient(clientId);
      setClient(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load client");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      loadClient();
    }
  }, [clientId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !client) return;

    try {
      setProjectSubmitting(true);
      await createProject({
        client_id: client.id,
        name: projectName.trim(),
        description: projectDesc.trim(),
        status: projectStatus,
        retainer_amount: parseFloat(projectRetainer) || 0,
      });

      setProjectName("");
      setProjectDesc("");
      setProjectStatus("active");
      setProjectRetainer("5000");
      setProjectModalOpen(false);
      await loadClient();
    } catch (err: any) {
      alert(err.message || "Failed to create project");
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string, name: string) => {
    if (!confirm(`${t("projects.delete_confirm")} (${name})`)) return;
    try {
      await deleteProject(projectId);
      await loadClient();
    } catch (err: any) {
      alert(err.message || "Failed to delete project");
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5cf6] border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (error || !client) {
    return (
      <AppShell>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
          <p>{error || "Client not found"}</p>
          <Link
            href="/clients"
            className="mt-4 inline-block text-xs font-bold text-white underline"
          >
            {t("client_detail.back")}
          </Link>
        </div>
      </AppShell>
    );
  }

  const projects = client.projects || [];
  const activeCount = projects.filter(p => p.status === "active").length;
  const totalRetainer = projects
    .filter(p => p.status === "active")
    .reduce((sum, p) => sum + (p.retainer_amount || 0), 0);

  return (
    <AppShell>
      {/* Back Link */}
      <div className="mb-4">
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white"
        >
          {isAr ? (
            <ArrowRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowLeft className="h-3.5 w-3.5" />
          )}
          <span>{t("client_detail.back")}</span>
        </Link>
      </div>

      {/* Hero Client Banner */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-gray-800 bg-[#13151f] p-6">
        <div
          className="absolute left-0 top-0 h-1.5 w-full"
          style={{ backgroundColor: client.brand_color || "#8b5cf6" }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg"
              style={{ backgroundColor: client.brand_color || "#8b5cf6" }}
            >
              {client.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white sm:text-2xl">
                  {client.name}
                </h1>
                <span className="rounded-md border border-gray-800 bg-[#1a1c27] px-2 py-0.5 text-[10px] font-semibold text-gray-300">
                  {client.industry}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {isAr ? "تاريخ التسجيل:" : "Registered on:"}{" "}
                {new Date(client.created_at).toLocaleDateString(
                  isAr ? "ar-EG" : "en-US"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setProjectModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/20 hover:bg-[#7c3aed]"
            >
              <Plus className="h-4 w-4" />
              <span>{t("projects.new_button")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3 mb-8">
        {/* Contact Info */}
        <div className="rounded-xl border border-gray-800 bg-[#13151f] p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            {isAr ? "بيانات جهة الاتصال" : "Contact Details"}
          </h3>
          <div className="space-y-2 text-xs">
            <p className="font-semibold text-white">
              {client.contact_name || "—"}
            </p>
            {client.contact_email && (
              <p className="text-gray-400 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-gray-500" />
                <span>{client.contact_email}</span>
              </p>
            )}
            {client.contact_phone && (
              <p className="text-gray-400 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-gray-500" />
                <span dir="ltr">{client.contact_phone}</span>
              </p>
            )}
          </div>
        </div>

        {/* Assigned Team Member */}
        <div className="rounded-xl border border-gray-800 bg-[#13151f] p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            {isAr ? "المسؤول الداخلي" : "Internal Assignee"}
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <UserCheck className="h-4 w-4 text-[#8b5cf6]" />
            <span className="font-semibold text-white">
              {client.assigned_user_name ||
                (isAr ? "فريق الوكالة بالكامل" : "All Agency Team")}
            </span>
          </div>
        </div>

        {/* Retainer Summary */}
        <div className="rounded-xl border border-gray-800 bg-[#13151f] p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            {isAr ? "إجمالي العقد الشهري" : "Monthly Retainer Total"}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">
              ${totalRetainer.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">
              {isAr
                ? `(عبر ${activeCount} مشاريع نشطة)`
                : `(across ${activeCount} active projects)`}
            </span>
          </div>
        </div>
      </div>

      {/* Linked Projects Section */}
      <div className="rounded-xl border border-gray-800 bg-[#13151f] overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <FolderGit2 className="h-4 w-4 text-[#8b5cf6]" />
            <h3 className="text-sm font-bold text-white">
              {t("client_detail.linked_projects")} ({projects.length})
            </h3>
          </div>
          <button
            onClick={() => setProjectModalOpen(true)}
            className="text-xs text-[#a78bfa] font-semibold hover:underline"
          >
            + {t("projects.new_button")}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-800 bg-[#161824] text-[11px] uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-5 py-3.5">{t("projects.col_project")}</th>
                <th className="px-5 py-3.5">{t("projects.col_status")}</th>
                <th className="px-5 py-3.5">{t("projects.col_retainer")}</th>
                <th className="px-5 py-3.5 text-right">
                  {t("projects.col_actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    <p>{t("client_detail.no_projects")}</p>
                  </td>
                </tr>
              ) : (
                projects.map(project => (
                  <tr
                    key={project.id}
                    className="transition hover:bg-[#181a26]"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-bold text-white hover:text-[#a78bfa]"
                      >
                        {project.name}
                      </Link>
                      {project.description && (
                        <p className="text-[10px] text-gray-400 truncate max-w-sm">
                          {project.description}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          project.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : project.status === "paused"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                        }`}
                      >
                        {project.status}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-bold text-white">
                      ${project.retainer_amount.toLocaleString()}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/projects/${project.id}`}
                          className="rounded-lg border border-gray-800 bg-[#1a1c27] px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:border-[#8b5cf6] hover:text-white"
                        >
                          {t("projects.view")}
                        </Link>
                        <button
                          onClick={() =>
                            handleDeleteProject(project.id, project.name)
                          }
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          {t("projects.delete")}
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
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-[#13151f] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="text-base font-bold text-white">
                {t("project_modal.title_new")} • {client.name}
              </h3>
              <button
                onClick={() => setProjectModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t("project_modal.name")} *
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="e.g. Annual Digital PR Retainer"
                  className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t("project_modal.description")}
                </label>
                <textarea
                  rows={3}
                  value={projectDesc}
                  onChange={e => setProjectDesc(e.target.value)}
                  placeholder="Goals, media channels, key milestones..."
                  className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("project_modal.status")}
                  </label>
                  <select
                    value={projectStatus}
                    onChange={e => setProjectStatus(e.target.value as any)}
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
                    value={projectRetainer}
                    onChange={e => setProjectRetainer(e.target.value)}
                    placeholder="5000"
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="rounded-lg border border-gray-800 bg-[#181a26] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#202333]"
                >
                  {t("project_modal.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={projectSubmitting}
                  className="rounded-lg bg-[#8b5cf6] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/20 hover:bg-[#7c3aed] disabled:opacity-50"
                >
                  {projectSubmitting
                    ? t("project_modal.saving")
                    : t("project_modal.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

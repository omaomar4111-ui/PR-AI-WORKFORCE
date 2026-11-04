"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  FolderGit2,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  Sparkles,
  Bot,
  CheckCircle2,
  Shield,
  Layers,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { Project, fetchProject } from "@/lib/api";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, isAr } = useI18n();

  const projectId = params?.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId)
        .then((data) => setProject(data))
        .catch((err) => {
          console.error(err);
          setError(err.message || "Failed to load project");
        })
        .finally(() => setLoading(false));
    }
  }, [projectId]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b5cf6] border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (error || !project) {
    return (
      <AppShell>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
          <p>{error || "Project not found"}</p>
          <Link
            href="/projects"
            className="mt-4 inline-block text-xs font-bold text-white underline"
          >
            {t("project_detail.back")}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Back button */}
      <div className="mb-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white"
        >
          {isAr ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
          <span>{t("project_detail.back")}</span>
        </Link>
      </div>

      {/* Hero Project Banner */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-gray-800 bg-[#13151f] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  project.status === "active"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : project.status === "paused"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "bg-gray-500/15 text-gray-400 border border-gray-500/30"
                }`}
              >
                {project.status}
              </span>
              <Link
                href={`/clients/${project.client_id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-[#a78bfa]"
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: project.client_brand_color || "#8b5cf6" }}
                />
                <span>{project.client_name || "Client"}</span>
              </Link>
            </div>
            <h1 className="text-xl font-black text-white sm:text-2xl">{project.name}</h1>
            <p className="mt-1 text-xs text-gray-400">
              {isAr ? "تم الإنشاء:" : "Created:"}{" "}
              {new Date(project.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-400/80">
                {t("project_detail.retainer_badge")}
              </p>
              <p className="text-xl font-black text-emerald-400">
                ${project.retainer_amount.toLocaleString()}
                <span className="text-xs font-normal text-emerald-400/70"> / mo</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Overview + Dates */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
        {/* Scope & Description */}
        <div className="md:col-span-2 rounded-xl border border-gray-800 bg-[#13151f] p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            {t("project_detail.overview")}
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
            {project.description || (isAr ? "لا يوجد وصف مدخل لهذا المشروع." : "No description provided.")}
          </p>
        </div>

        {/* Timeline & Metadata */}
        <div className="rounded-xl border border-gray-800 bg-[#13151f] p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {t("projects.col_dates")}
          </h3>
          <div className="text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">{t("project_modal.start_date")}:</span>
              <span className="font-semibold text-white">
                {project.start_date || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">{t("project_modal.end_date")}:</span>
              <span className="font-semibold text-white">
                {project.end_date || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              <span className="text-gray-400">{t("client_modal.industry")}:</span>
              <span className="font-semibold text-[#a78bfa]">
                {project.client_industry || "PR & Communications"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Linked AI Workforce Tasks (Placeholder for M3/M4) */}
      <div className="rounded-xl border border-dashed border-[#8b5cf6]/40 bg-[#151322] p-8 text-center sm:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8b5cf6]/20 text-[#a78bfa] mb-3">
          <Bot className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-white">
          {t("project_detail.linked_tasks")}
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-xs text-gray-400 leading-relaxed">
          {t("project_detail.tasks_placeholder")}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold text-purple-300">
          <span>👑 Om Samah Orchestration Ready</span>
        </div>
      </div>
    </AppShell>
  );
}

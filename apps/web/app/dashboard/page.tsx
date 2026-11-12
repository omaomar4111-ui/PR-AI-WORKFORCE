"use client";
/**
 * PR AI WORKFORCE — Central Command Center Dashboard
 */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  FolderGit2,
  DollarSign,
  PlusCircle,
  ArrowUpRight,
  Sparkles,
  Building2,
  Briefcase,
  AlertCircle,
  RefreshCw,
  Wand2,
  Film,
  Palette,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { DashboardStats, fetchDashboardStats } from "@/lib/api";

export default function DashboardPage() {
  const { t, isAr } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err: any) {
      console.error("Failed to load dashboard stats:", err);
      setError(err.message || "Failed to load live data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const {
    totalClients,
    activeProjects,
    totalRetainer,
    isEmpty,
    formattedRetainer,
  } = useMemo(() => {
    const clients = stats?.total_clients ?? 0;
    const projects = stats?.active_projects ?? 0;
    const retainer = stats?.total_retainer ?? 0;
    return {
      totalClients: clients,
      activeProjects: projects,
      totalRetainer: retainer,
      isEmpty: clients === 0 && projects === 0,
      formattedRetainer: retainer.toLocaleString("en-US", {
        minimumFractionDigits: 0,
      }),
    };
  }, [stats]);

  return (
    <AppShell>
      {/* Header Banner */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-[#8b5cf6]/30 bg-gradient-to-br from-[#1c1430] via-[#12141c] to-[#0d0e12] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#8b5cf6]/20 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/40 bg-[#8b5cf6]/10 px-3 py-1 text-xs font-semibold text-[#c4b5fd]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#8b5cf6]" />
              <span>{t("nav.command_center")} • Real-time Data</span>
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              {t("dash.welcome")}
            </h1>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-300">
              {t("dash.welcome_sub")}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={loadStats}
              aria-label="تحديث الإحصائيات / Refresh dashboard data"
              className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-[#171923] px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">تحديث / Refresh</span>
            </button>
            <Link
              href="/clients"
              aria-label="إضافة عميل جديد / Add new client"
              className="flex items-center gap-1.5 rounded-lg bg-[#8b5cf6] px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/20 hover:bg-[#7c3aed]"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>{t("dash.add_client")}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Production Studio Launcher */}
      <div className="mb-8 rounded-2xl border border-gray-800 bg-[#12141f] p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8b5cf6]/20 text-[#c4b5fd]">
              <Wand2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isAr
                  ? "استوديو العمل ومسارات الإنتاج المباشرة (Production Studio)"
                  : "Production Studio Playbooks"}
              </h2>
              <p className="text-[11px] text-gray-400">
                {isAr
                  ? "اختر مسار العمل المطلوب وتولى الإشراف على مخرجات فريق الذكاء الاصطناعي وتعديلها خطوة بخطوة."
                  : "Select a specialized production track to generate, supervise and edit deliverables on the fly."}
              </p>
            </div>
          </div>
          <Link
            href="/studio"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8b5cf6] hover:text-[#c4b5fd] transition"
          >
            <span>{isAr ? "فتح الاستوديو بالكامل" : "Open Full Studio"}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/studio"
            className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-950/20 p-3 transition hover:border-purple-500/50 hover:bg-purple-950/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-[#c4b5fd]">
              <Film className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">
                {isAr ? "إنتاج سيناريو وفيديو" : "Video & Script Studio"}
              </h3>
              <p className="text-[10px] text-purple-300">
                {isAr ? "زوايا، سكريبت، ومؤثرات" : "Hooks, AV Script & Audio"}
              </p>
            </div>
          </Link>

          <Link
            href="/studio"
            className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 transition hover:border-amber-500/50 hover:bg-amber-950/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">
                {isAr ? "إطلاق هوية بصرية" : "Brand Identity Studio"}
              </h3>
              <p className="text-[10px] text-amber-300">
                {isAr
                  ? "شعار بالذكاء الاصطناعي، وألوان"
                  : "AI Logo & Launch PR"}
              </p>
            </div>
          </Link>

          <Link
            href="/studio"
            className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-950/20 p-3 transition hover:border-rose-500/50 hover:bg-rose-950/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">
                {isAr ? "إدارة الأزمات والرد" : "Crisis & PR War Room"}
              </h3>
              <p className="text-[10px] text-rose-300">
                {isAr ? "بيان رسمي، ومصفوفة الردود" : "Holding PR & Q&A Matrix"}
              </p>
            </div>
          </Link>

          <Link
            href="/studio"
            className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 transition hover:border-emerald-500/50 hover:bg-emerald-950/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">
                {isAr ? "حملة تسويق ونمو" : "Growth & Performance"}
              </h3>
              <p className="text-[10px] text-emerald-300">
                {isAr ? "إعلانات ميتا، ميزانية، وSEO" : "Ad Copy Suite & SEO"}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Real Data Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="relative overflow-hidden rounded-xl border border-gray-800 bg-[#13151f] p-5 shadow-sm h-28 animate-pulse flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-gray-800 rounded" />
                <div className="h-9 w-9 bg-gray-800 rounded-lg" />
              </div>
              <div className="h-7 w-24 bg-gray-800 rounded" />
            </div>
          ))
        ) : (
          <>
            {/* Total Clients */}
            <div className="relative overflow-hidden rounded-xl border border-gray-800 bg-[#13151f] p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">
                  {t("dash.total_clients")}
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8b5cf6]/10 text-[#a78bfa]">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {totalClients}
                </span>
                <span className="text-xs text-gray-400">
                  {isAr ? "عميل مسجل" : "clients recorded"}
                </span>
              </div>
            </div>

            {/* Active Projects */}
            <div className="relative overflow-hidden rounded-xl border border-gray-800 bg-[#13151f] p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">
                  {t("dash.active_projects")}
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <FolderGit2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {activeProjects}
                </span>
                <span className="text-xs text-gray-400">
                  {isAr
                    ? `من إجمالي ${stats?.total_projects ?? 0}`
                    : `of ${stats?.total_projects ?? 0} total`}
                </span>
              </div>
            </div>

            {/* Total Retainer Revenue */}
            <div className="relative overflow-hidden rounded-xl border border-gray-800 bg-[#13151f] p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">
                  {t("dash.total_retainer")}
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  ${formattedRetainer}
                </span>
                <span className="text-xs text-emerald-400 font-semibold">
                  {isAr ? "/ شهرياً" : "/ month"}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* If Database is Empty -> Show Clean CTA */}
      {!loading && isEmpty && (
        <div className="mt-8 rounded-2xl border border-dashed border-[#8b5cf6]/40 bg-[#151322] p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8b5cf6]/10 text-[#a78bfa] mb-4">
            <Building2 className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-white sm:text-xl">
            {t("dash.empty_cta_title")}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-gray-400">
            {t("dash.empty_cta_desc")}
          </p>
          <div className="mt-6">
            <Link
              href="/clients"
              className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#8b5cf6]/25 transition hover:bg-[#7c3aed]"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{t("dash.add_client")}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Recent Clients & Projects Tables (When not empty) */}
      {!loading && !isEmpty && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Clients */}
          <div className="rounded-xl border border-gray-800 bg-[#13151f] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#8b5cf6]" />
                <h3 className="text-sm font-bold text-white">
                  {t("dash.recent_clients")}
                </h3>
              </div>
              <Link
                href="/clients"
                className="text-xs text-[#a78bfa] hover:underline"
              >
                {t("dash.view_all")}
              </Link>
            </div>

            <div className="mt-4 divide-y divide-gray-800/60">
              {stats?.recent_clients?.length ? (
                stats.recent_clients.map(client => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between py-3 px-2 rounded-lg transition hover:bg-[#181a26]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3.5 w-3.5 rounded-full"
                        style={{
                          backgroundColor: client.brand_color || "#8b5cf6",
                        }}
                      />
                      <div>
                        <p className="text-xs font-bold text-white">
                          {client.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {client.industry}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <span>{client.contact_name || "—"}</span>
                      <ArrowUpRight className="h-3 w-3 text-gray-500" />
                    </span>
                  </Link>
                ))
              ) : (
                <p className="py-6 text-center text-xs text-gray-500">
                  {t("dash.no_recent")}
                </p>
              )}
            </div>
          </div>

          {/* Recent Projects */}
          <div className="rounded-xl border border-gray-800 bg-[#13151f] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <FolderGit2 className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  {t("dash.recent_projects")}
                </h3>
              </div>
              <Link
                href="/projects"
                className="text-xs text-emerald-400 hover:underline"
              >
                {t("dash.view_all")}
              </Link>
            </div>

            <div className="mt-4 divide-y divide-gray-800/60">
              {stats?.recent_projects?.length ? (
                stats.recent_projects.map(project => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between py-3 px-2 rounded-lg transition hover:bg-[#181a26]"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">
                        {project.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {project.client_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400">
                        ${project.retainer_amount.toLocaleString()}
                      </span>
                      <span
                        className={`block text-[9px] font-semibold uppercase ${
                          project.status === "active"
                            ? "text-emerald-400"
                            : project.status === "paused"
                              ? "text-amber-400"
                              : "text-gray-400"
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="py-6 text-center text-xs text-gray-500">
                  {t("dash.no_recent")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

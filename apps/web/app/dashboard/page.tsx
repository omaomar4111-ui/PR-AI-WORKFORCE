"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearStoredSession,
  fetchHealth,
  fetchMe,
  getStoredToken,
  User,
} from "@/lib/api";

interface HealthData {
  status: string;
  version: string;
  database: string;
  redis: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"ar" | "en">("ar");

  const isAr = lang === "ar";

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    async function loadData() {
      try {
        const [meData, healthData] = await Promise.all([
          fetchMe(),
          fetchHealth().catch(() => ({
            status: "degraded",
            version: "1.0.0",
            database: "unreachable",
            redis: "unreachable",
          })),
        ]);
        setUser(meData.user);
        setHealth(healthData);
      } catch (err) {
        console.error("Authentication check failed:", err);
        clearStoredSession();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleLogout = () => {
    clearStoredSession();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0e12] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8b5cf6] border-t-transparent" />
          <p className="text-sm font-medium text-gray-400">
            {isAr ? "جارٍ تحميل لوحة التحكم..." : "Loading dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  const isOwner = user?.role === "owner";

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen bg-[#0d0e12] text-white selection:bg-[#8b5cf6] selection:text-white"
    >
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-gray-800/80 bg-[#12141c]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#8b5cf6] to-indigo-500 font-black text-white shadow-lg shadow-[#8b5cf6]/20">
              PR
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                PR AI WORKFORCE
              </h1>
              <p className="text-xs text-gray-400">
                {isAr
                  ? "نظام إدارة القوى العاملة الذكية"
                  : "Workforce OS • PR Agency"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Lang switch */}
            <button
              onClick={() => setLang(isAr ? "en" : "ar")}
              className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-[#171923] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-[#8b5cf6] hover:text-white"
            >
              <span>🌐</span>
              <span>{isAr ? "English" : "العربية"}</span>
            </button>

            {/* User badge */}
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-800 bg-[#171923] px-3 py-1.5 text-xs">
              <span className="font-semibold text-gray-200">
                {user?.full_name || user?.email}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isOwner
                    ? "bg-[#8b5cf6]/20 text-[#a78bfa] border border-[#8b5cf6]/40"
                    : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                }`}
              >
                {isOwner
                  ? isAr
                    ? "👑 مالك (Owner)"
                    : "👑 Owner"
                  : isAr
                  ? "👥 عضو (Member)"
                  : "👥 Member"}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
            >
              {isAr ? "تسجيل خروج" : "Logout"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Welcome Hero Card */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-[#8b5cf6]/30 bg-gradient-to-br from-[#1b152e] via-[#12141c] to-[#0d0e12] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#8b5cf6]/20 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/40 bg-[#8b5cf6]/10 px-3 py-1 text-xs font-semibold text-[#c4b5fd]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#8b5cf6]" />
              {isAr
                ? "المرحلة الأولى: التأسيس والبنية التحتية بنجاح"
                : "Milestone 1: Project Foundation Active"}
            </div>
            <h2 className="text-2xl font-black text-white sm:text-3xl">
              {isAr
                ? `مرحباً بك، ${user?.full_name || "الفريق"}!`
                : `Welcome, ${user?.full_name || "Team"}!`}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              {isAr
                ? "تم تجهيز بيئة التشغيل المركزية لمنصة PR AI WORKFORCE بنجاح. النظام مصمم لإدارة 38 موظف ذكاء اصطناعي متخصص بالإضافة لمنسق الإدارة التنفيذية (أم سماح)."
                : "The central operating environment for PR AI WORKFORCE has been successfully initialized. Designed to coordinate 38 specialized AI employees and 1 CEO Orchestrator (Om Samah)."}
            </p>
          </div>
        </div>

        {/* Status & Architecture Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* System Health */}
          <div className="rounded-xl border border-gray-800 bg-[#13151f] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-sm font-bold text-gray-200">
                {isAr ? "حالة النظام (System Health)" : "System Health"}
              </h3>
              <span className="flex h-2.5 w-2.5 items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              </span>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{isAr ? "الواجهة البرمجية (FastAPI):" : "FastAPI API:"}</span>
                <span className="font-semibold text-emerald-400">
                  {health?.status === "ok" ? "200 OK (Healthy)" : "Connected"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{isAr ? "إصدار المنصة:" : "Platform Version:"}</span>
                <span className="font-mono text-gray-300">{health?.version || "1.0.0"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{isAr ? "قاعدة البيانات:" : "Database Engine:"}</span>
                <span className="font-mono text-indigo-400">{health?.database || "PostgreSQL 16"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{isAr ? "ذاكرة التخزين المؤقت:" : "Redis Cache:"}</span>
                <span className="font-mono text-indigo-400">{health?.redis || "Redis 7"}</span>
              </div>
            </div>
          </div>

          {/* Active Workspace / Organization */}
          <div className="rounded-xl border border-gray-800 bg-[#13151f] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-sm font-bold text-gray-200">
                {isAr ? "المؤسسة والمستخدم" : "Organization & Identity"}
              </h3>
              <span className="text-base">🏢</span>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{isAr ? "اسم المؤسسة:" : "Org Name:"}</span>
                <span className="font-semibold text-white">
                  {user?.organization_name || "PR Agency Internal"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{isAr ? "معرف المؤسسة:" : "Org ID:"}</span>
                <span className="font-mono text-gray-400">
                  {user?.organization_id?.slice(0, 8)}...
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{isAr ? "البريد الإلكتروني:" : "Email:"}</span>
                <span className="font-mono text-gray-300">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{isAr ? "مستوى الصلاحية:" : "Access Role:"}</span>
                <span className="font-semibold text-[#a78bfa] uppercase">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Architecture Roadmap Milestone 1 Complete */}
          <div className="rounded-xl border border-[#8b5cf6]/30 bg-[#151322] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#8b5cf6]/20">
              <h3 className="text-sm font-bold text-purple-300">
                {isAr ? "المسار التقني (Roadmap)" : "Execution Roadmap"}
              </h3>
              <span className="rounded bg-[#8b5cf6]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#c4b5fd]">
                1 / 10
              </span>
            </div>
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <span>✓</span>
                <span className="font-medium">
                  {isAr ? "المرحلة 1: التأسيس والهيكلة" : "M1: Project Foundation"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-yellow-400">⏳</span>
                <span>
                  {isAr
                    ? "المرحلة 2: سجل وبنية الوكلاء (38 موظف + أم سماح)"
                    : "M2: Agent Registry (38 Agents + CEO)"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span>○</span>
                <span>
                  {isAr ? "المرحلة 3: غرفة عمليات الوكلاء" : "M3: Orchestrator Ops Room"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span>○</span>
                <span>
                  {isAr ? "المرحلة 4: محرك سير العمل" : "M4: Workflow Engine"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Workforce Teaser Cards */}
        <div className="mt-8 rounded-xl border border-gray-800 bg-[#13151f] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
            <div>
              <h3 className="text-base font-bold text-white">
                {isAr ? "قوة العمل الذكية (AI Workforce)" : "AI Workforce Overview"}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {isAr
                  ? "38 وكيلاً ذكياً في 7 أقسام متخصصة بقيادة منسق الإدارة التنفيذية أم سماح"
                  : "38 specialized AI agents across 7 departments orchestrated by CEO Om Samah"}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300">
              <span>🤖</span>
              <span>{isAr ? "جاهز للتفعيل في المرحلة 2" : "Ready for Milestone 2"}</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7 text-center">
            {[
              { en: "CEO Orchestrator", ar: "القيادة التنفيذية", count: "1 Agent", icon: "👑" },
              { en: "Marketing & Growth", ar: "التسويق والنمو", count: "7 Agents", icon: "📈" },
              { en: "Sales & CRM", ar: "المبيعات والعملاء", count: "5 Agents", icon: "🤝" },
              { en: "Content & Copy", ar: "صناعة المحتوى", count: "8 Agents", icon: "✍️" },
              { en: "Design & Media", ar: "التصميم والإنتاج", count: "6 Agents", icon: "🎨" },
              { en: "Tech & Ops", ar: "التقنية والعمليات", count: "6 Agents", icon: "⚙️" },
              { en: "Finance & Legal", ar: "المالية والقانون", count: "6 Agents", icon: "⚖️" },
            ].map((dept, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center rounded-lg border border-gray-800/80 bg-[#171923] p-3 transition hover:border-[#8b5cf6]/50"
              >
                <div className="text-2xl mb-1">{dept.icon}</div>
                <span className="text-xs font-bold text-gray-200">
                  {isAr ? dept.ar : dept.en}
                </span>
                <span className="mt-1 text-[10px] text-[#a78bfa] font-mono">
                  {dept.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

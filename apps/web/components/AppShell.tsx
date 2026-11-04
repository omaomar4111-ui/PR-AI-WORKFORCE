"use client";

import React, { useEffect, useState } from "react";
import Link from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Bot,
  Network,
  CheckSquare,
  Workflow,
  FolderGit2,
  Users,
  Brain,
  Sparkles,
  BarChart3,
  Cable,
  Settings,
  LogOut,
  Globe,
  Menu,
  X,
  ChevronRight,
  Shield,
  User as UserIcon,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import {
  clearStoredSession,
  fetchMe,
  getStoredToken,
  User,
} from "@/lib/api";

interface MenuItem {
  id: string;
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { id: "command_center", labelKey: "nav.command_center", href: "/dashboard", icon: LayoutDashboard, enabled: true },
  { id: "virtual_office", labelKey: "nav.virtual_office", href: "/virtual-office", icon: Building2, enabled: false },
  { id: "agents", labelKey: "nav.agents", href: "/agents", icon: Bot, enabled: false },
  { id: "departments", labelKey: "nav.departments", href: "/departments", icon: Network, enabled: false },
  { id: "tasks", labelKey: "nav.tasks", href: "/tasks", icon: CheckSquare, enabled: false },
  { id: "workflows", labelKey: "nav.workflows", href: "/workflows", icon: Workflow, enabled: false },
  { id: "projects", labelKey: "nav.projects", href: "/projects", icon: FolderGit2, enabled: true },
  { id: "clients", labelKey: "nav.clients", href: "/clients", icon: Users, enabled: true },
  { id: "memory", labelKey: "nav.memory", href: "/memory", icon: Brain, enabled: false },
  { id: "deliverables", labelKey: "nav.deliverables", href: "/deliverables", icon: Sparkles, enabled: false },
  { id: "analytics", labelKey: "nav.analytics", href: "/analytics", icon: BarChart3, enabled: false },
  { id: "integrations", labelKey: "nav.integrations", href: "/integrations", icon: Cable, enabled: false },
  { id: "settings", labelKey: "nav.settings", href: "/settings", icon: Settings, enabled: false },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, isAr, toggleLang, t } = useI18n();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    fetchMe()
      .then((data) => setUser(data.user))
      .catch(() => {
        clearStoredSession();
        router.replace("/login");
      })
      .finally(() => setLoading(false));
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
          <p className="text-sm font-medium text-gray-400">Loading system...</p>
        </div>
      </div>
    );
  }

  const isOwner = user?.role === "owner";

  return (
    <div className="flex min-h-screen bg-[#0d0e12] text-white selection:bg-[#8b5cf6] selection:text-white">
      {/* ── Desktop Persistent Sidebar (13 Items) ─────────────────────────── */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-gray-800/80 bg-[#12141c] shrink-0">
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-gray-800/80">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#8b5cf6] to-indigo-500 font-black text-white shadow-md shadow-[#8b5cf6]/20">
            PR
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight text-white truncate">
              {t("app.name")}
            </h1>
            <p className="text-[10px] text-gray-400 truncate">
              {t("app.subtitle")}
            </p>
          </div>
        </div>

        {/* 13 Nav Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-800">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

            if (!item.enabled) {
              return (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-gray-500 cursor-not-allowed opacity-60 hover:bg-[#171923]/50"
                  title="Coming Soon"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-gray-600" />
                    <span>{t(item.labelKey)}</span>
                  </div>
                  <span className="rounded bg-gray-800/80 px-1.5 py-0.5 text-[9px] font-semibold text-gray-400">
                    {t("badge.coming_soon")}
                  </span>
                </div>
              );
            }

            return (
              <a
                key={item.id}
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#8b5cf6] text-white shadow-sm shadow-[#8b5cf6]/30 font-bold"
                    : "text-gray-300 hover:bg-[#1a1c27] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-gray-400"}`} />
                  <span>{t(item.labelKey)}</span>
                </div>
                {isActive && <ChevronRight className={`h-3 w-3 ${isAr ? "rotate-180" : ""}`} />}
              </a>
            );
          })}
        </nav>

        {/* Bottom Org Info */}
        <div className="border-t border-gray-800/80 p-3 bg-[#0f1118]">
          <div className="flex items-center gap-2.5 rounded-lg bg-[#151722] p-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8b5cf6]/20 text-[#a78bfa]">
              <Shield className="h-4 w-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-gray-200 truncate">{user?.organization_name || t("nav.org")}</p>
              <p className="text-[10px] text-gray-400 truncate uppercase tracking-wider">
                {isOwner ? t("role.owner") : t("role.member")}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Application Content Area ─────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-800/80 bg-[#12141c]/90 px-4 sm:px-6 backdrop-blur-md">
          {/* Mobile menu trigger */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg border border-gray-800 bg-[#171923] p-2 text-gray-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="font-bold text-sm tracking-tight text-white">{t("app.name")}</span>
          </div>

          {/* Desktop Left: Breadcrumb / Active Context */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400">
            <span className="text-gray-200 font-semibold">{user?.organization_name || t("nav.org")}</span>
            <span>/</span>
            <span className="text-[#a78bfa] capitalize">
              {pathname === "/dashboard"
                ? t("nav.command_center")
                : pathname?.split("/")[1] || t("nav.command_center")}
            </span>
          </div>

          {/* Top Bar Right: Language Toggle, User Avatar & Logout */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-[#171923] px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-[#8b5cf6] hover:text-white"
              title="Toggle Language"
            >
              <Globe className="h-3.5 w-3.5 text-[#8b5cf6]" />
              <span>{isAr ? "English" : "العربية"}</span>
            </button>

            {/* User Avatar + Role */}
            <div className="flex items-center gap-2.5 rounded-xl border border-gray-800 bg-[#171923] px-3 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#8b5cf6] to-indigo-600 text-xs font-bold text-white shadow">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-gray-200 leading-none">
                  {user?.full_name || user?.email}
                </p>
                <span
                  className={`inline-block mt-0.5 rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                    isOwner
                      ? "bg-[#8b5cf6]/20 text-[#c4b5fd] border border-[#8b5cf6]/40"
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                  }`}
                >
                  {isOwner ? t("role.owner") : t("role.member")}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
              title={t("nav.logout")}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("nav.logout")}</span>
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-x-0 top-16 z-40 bg-[#12141c] border-b border-gray-800 p-4 space-y-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              if (!item.enabled) return null;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium ${
                    isActive ? "bg-[#8b5cf6] text-white" : "text-gray-300 hover:bg-[#1a1c27]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(item.labelKey)}</span>
                </a>
              );
            })}
          </div>
        )}

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

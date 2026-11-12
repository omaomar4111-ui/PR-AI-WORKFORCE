"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  Integration,
  fetchIntegrations,
  connectIntegration,
  disconnectIntegration,
  testIntegration,
} from "@/lib/api";
import {
  Cable,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plug,
  ExternalLink,
  Shield,
  Key,
  FolderOpen,
  FileText,
  Mail,
  Table,
  Megaphone,
  Search,
  Instagram,
  Image as ImageIcon,
  Video,
  Activity,
  Check,
  MessageSquare,
  Github,
  BookOpen,
  Send,
  Database,
  CreditCard,
  CheckSquare,
  BarChart3,
  Cloud,
  Sparkles,
  Layers,
  Zap,
} from "lucide-react";

export default function IntegrationsPage() {
  const { isAr, t } = useI18n();

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [actionLoadingProvider, setActionLoadingProvider] = useState<
    string | null
  >(null);
  const [testResult, setTestResult] = useState<{
    provider: string;
    success: boolean;
    message: string;
  } | null>(null);

  // Connect modal
  const [modalProvider, setModalProvider] = useState<Integration | null>(null);
  const [configFields, setConfigFields] = useState<Record<string, string>>({});

  const loadIntegrations = useCallback(async () => {
    try {
      const list = await fetchIntegrations();
      setIntegrations(list);
    } catch (err) {
      console.error("Failed to load integrations", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const handleOpenConnect = (item: Integration) => {
    setModalProvider(item);
    // Provide sensible default template
    if (
      item.provider === "google_drive" ||
      item.provider === "google_docs" ||
      item.provider === "gmail" ||
      item.provider === "google_sheets"
    ) {
      setConfigFields({ access_token: "", client_id: "" });
    } else if (item.provider === "meta_ads" || item.provider === "google_ads") {
      setConfigFields({ access_token: "", account_id: "" });
    } else if (item.provider === "instagram") {
      setConfigFields({ access_token: "", page_id: "" });
    } else if (item.provider === "slack") {
      setConfigFields({ bot_token: "", webhook_url: "" });
    } else if (item.provider === "github") {
      setConfigFields({ access_token: "", repository: "" });
    } else if (item.provider === "notion") {
      setConfigFields({ api_key: "", database_id: "" });
    } else if (item.provider === "resend") {
      setConfigFields({ api_key: "", sender_domain: "" });
    } else if (item.provider === "supabase") {
      setConfigFields({
        supabase_url: "",
        anon_key: "",
        service_role_key: "",
      });
    } else if (item.provider === "stripe") {
      setConfigFields({ secret_key: "", publishable_key: "" });
    } else if (item.provider === "linear") {
      setConfigFields({ api_key: "", team_id: "" });
    } else if (item.provider === "posthog") {
      setConfigFields({
        project_api_key: "",
        host_url: "https://app.posthog.com",
      });
    } else if (item.provider === "cloudflare") {
      setConfigFields({
        api_token: "",
        account_id: "",
        r2_bucket_name: "",
      });
    } else {
      setConfigFields({ api_key: "", model: "default" });
    }
  };

  const handleFillSandboxCredentials = () => {
    if (!modalProvider) return;
    if (
      modalProvider.provider.startsWith("google_") ||
      modalProvider.provider === "gmail"
    ) {
      setConfigFields({
        access_token: "ya29.sandbox_test_token_approved_rw",
        client_id: "sandbox_client_id.apps.googleusercontent.com",
      });
    } else if (
      modalProvider.provider.includes("ads") ||
      modalProvider.provider === "instagram"
    ) {
      setConfigFields({
        access_token: "EAAB_sandbox_user_token_marketing",
        account_id: "act_1234567890",
      });
    } else if (modalProvider.provider === "slack") {
      setConfigFields({
        bot_token: "xoxb-sandbox-slack-token-554433",
        webhook_url: "https://hooks.slack.com/services/T00/B00/XXXX",
      });
    } else if (modalProvider.provider === "github") {
      setConfigFields({
        access_token: "ghp_sandbox_personal_token_xyz999",
        repository: "pr-agency/campaigns",
      });
    } else if (modalProvider.provider === "notion") {
      setConfigFields({
        api_key: "secret_sandbox_notion_key_abc111",
        database_id: "notion-db-pr-briefs",
      });
    } else if (modalProvider.provider === "resend") {
      setConfigFields({
        api_key: "re_sandbox_test_marketing_key_8899",
        sender_domain: "mail.pragency.eg",
      });
    } else if (modalProvider.provider === "supabase") {
      setConfigFields({
        supabase_url: "https://pr-workforce.supabase.co",
        anon_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sandbox_anon_key",
        service_role_key:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sandbox_service_role",
      });
    } else if (modalProvider.provider === "stripe") {
      setConfigFields({
        secret_key: "sk_test_51MzSandboxTestStripeKey9988",
        publishable_key: "pk_test_51MzSandboxPubStripeKey9988",
      });
    } else if (modalProvider.provider === "linear") {
      setConfigFields({
        api_key: "lin_api_sandbox_personal_token_7766",
        team_id: "TEAM-PR-AGENCY",
      });
    } else if (modalProvider.provider === "posthog") {
      setConfigFields({
        project_api_key: "phc_sandbox_posthog_project_key_5544",
        host_url: "https://app.posthog.com",
      });
    } else if (modalProvider.provider === "cloudflare") {
      setConfigFields({
        api_token: "cf_token_sandbox_global_edge_token_1122",
        account_id: "cf_act_99887766",
        r2_bucket_name: "pr-agency-assets",
      });
    } else {
      setConfigFields({
        api_key: "sk-sandbox-media-key-xyz8899",
        model: "flux-pro-v1",
      });
    }
  };

  const handleSaveConnect = async () => {
    if (!modalProvider) return;
    setActionLoadingProvider(modalProvider.provider);
    try {
      await connectIntegration(modalProvider.provider, configFields);
      setModalProvider(null);
      await loadIntegrations();
    } catch (err: any) {
      alert(err.message || "Connection failed");
    } finally {
      setActionLoadingProvider(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(t("integrations.btn_disconnect") + "?")) return;
    setActionLoadingProvider(provider);
    try {
      await disconnectIntegration(provider);
      await loadIntegrations();
    } catch (err: any) {
      alert(err.message || "Disconnection failed");
    } finally {
      setActionLoadingProvider(null);
    }
  };

  const handleTestConnection = async (provider: string) => {
    setActionLoadingProvider(provider);
    setTestResult(null);
    try {
      const res = await testIntegration(provider);
      const isSuccess =
        res.success !== undefined
          ? res.success
          : (res as any).status === "connected";
      setTestResult({
        provider,
        success: isSuccess,
        message: res.message,
      });
      await loadIntegrations();
    } catch (err: any) {
      setTestResult({
        provider,
        success: false,
        message: err.message || "Test failed",
      });
    } finally {
      setActionLoadingProvider(null);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "google_drive":
        return <FolderOpen className="h-5 w-5 text-yellow-400" />;
      case "google_docs":
        return <FileText className="h-5 w-5 text-blue-400" />;
      case "gmail":
        return <Mail className="h-5 w-5 text-red-400" />;
      case "google_sheets":
        return <Table className="h-5 w-5 text-emerald-400" />;
      case "meta_ads":
        return <Megaphone className="h-5 w-5 text-blue-500" />;
      case "google_ads":
        return <Search className="h-5 w-5 text-amber-400" />;
      case "instagram":
        return <Instagram className="h-5 w-5 text-pink-400" />;
      case "slack":
        return <MessageSquare className="h-5 w-5 text-emerald-400" />;
      case "github":
        return <Github className="h-5 w-5 text-gray-200" />;
      case "notion":
        return <BookOpen className="h-5 w-5 text-amber-200" />;
      case "resend":
        return <Send className="h-5 w-5 text-white" />;
      case "supabase":
        return <Database className="h-5 w-5 text-emerald-400" />;
      case "stripe":
        return <CreditCard className="h-5 w-5 text-indigo-400" />;
      case "linear":
        return <CheckSquare className="h-5 w-5 text-zinc-300" />;
      case "posthog":
        return <BarChart3 className="h-5 w-5 text-amber-400" />;
      case "cloudflare":
        return <Cloud className="h-5 w-5 text-orange-400" />;
      case "image_gen":
        return <ImageIcon className="h-5 w-5 text-purple-400" />;
      case "video_gen":
        return <Video className="h-5 w-5 text-violet-400" />;
      default:
        return <Plug className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {t("integrations.status_connected")}
          </span>
        );
      case "requires_api_access":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">
            <AlertCircle className="h-3 w-3" />
            {t("integrations.status_requires_api_access")}
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 text-[11px] font-bold text-red-400">
            <XCircle className="h-3 w-3" />
            {t("integrations.status_error")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-800 border border-gray-700 px-2.5 py-0.5 text-[11px] font-semibold text-gray-400">
            <span className="h-2 w-2 rounded-full bg-gray-500" />
            {t("integrations.status_disconnected")}
          </span>
        );
    }
  };

  const filteredIntegrations = integrations.filter(item => {
    if (filterCategory === "all") return true;
    const cat = (item.category || "").toLowerCase();
    const prov = (item.provider || "").toLowerCase();
    if (filterCategory === "founder") {
      return [
        "resend",
        "supabase",
        "stripe",
        "linear",
        "posthog",
        "cloudflare",
        "github",
        "slack",
        "notion",
      ].includes(prov);
    }
    if (filterCategory === "database") {
      return cat === "database" || ["supabase"].includes(prov);
    }
    if (filterCategory === "payments") {
      return cat === "payments" || ["stripe"].includes(prov);
    }
    if (filterCategory === "productivity") {
      return cat === "productivity" || ["linear", "notion"].includes(prov);
    }
    if (filterCategory === "infra") {
      return (
        ["infrastructure", "development"].includes(cat) ||
        ["cloudflare", "supabase", "posthog", "github"].includes(prov)
      );
    }
    if (filterCategory === "storage") {
      return (
        [
          "storage",
          "docs",
          "sheets",
          "knowledge base",
          "infrastructure",
        ].includes(cat) ||
        [
          "google_drive",
          "google_docs",
          "google_sheets",
          "notion",
          "cloudflare",
        ].includes(prov)
      );
    }
    if (filterCategory === "marketing")
      return cat === "marketing" || ["meta_ads", "google_ads"].includes(prov);
    if (filterCategory === "social") {
      return (
        ["social", "communication"].includes(cat) ||
        ["instagram", "slack", "gmail", "resend"].includes(prov)
      );
    }
    if (filterCategory === "media")
      return cat === "media" || ["image_gen", "video_gen"].includes(prov);
    if (filterCategory === "dev") {
      return (
        [
          "development",
          "communication",
          "analytics",
          "infrastructure",
        ].includes(cat) ||
        [
          "github",
          "slack",
          "supabase",
          "linear",
          "posthog",
          "cloudflare",
        ].includes(prov)
      );
    }
    return true;
  });

  const connectedCount = integrations.filter(
    i => i.status === "connected"
  ).length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-[#a78bfa] border border-purple-500/30 shadow-md">
              <Cable className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                {t("integrations.title")}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {t("integrations.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-gray-800 bg-[#171923] px-3 py-1.5 text-xs text-gray-300">
              <span className="font-bold text-emerald-400">
                {connectedCount}
              </span>{" "}
              / {integrations.length} {t("integrations.status_connected")}
            </div>
          </div>
        </div>

        {/* Test Result Alert Banner */}
        {testResult && (
          <div
            className={`flex items-start justify-between rounded-xl border p-4 text-xs transition ${
              testResult.success
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/40 bg-red-500/10 text-red-300"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <div>
                <p className="font-bold">
                  Connection Test [{testResult.provider}]:{" "}
                  {testResult.success ? "SUCCESS" : "FAILED"}
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {testResult.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="text-gray-400 hover:text-white"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Founder Minimalist Tech Stack Showcase (Inspired by Viral Reel/Card) */}
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-[#13151f] via-[#10121a] to-[#0c0d14] p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>
                    {isAr
                      ? "حزمة تقنيات المؤسس العصري"
                      : "Modern Founder Tech Stack"}
                  </span>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                    2026 Edition
                  </span>
                </h2>
                <p className="text-[11px] text-gray-400">
                  {isAr
                    ? "أدوات الإنتاجية وقواعد البيانات والسحاب المفضلة للمؤسسين والشركات الناشئة"
                    : "Curated high-velocity toolchain for solo founders and modern AI agencies"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilterCategory("founder")}
              className="text-xs font-bold text-[#a78bfa] hover:text-[#c4b5fd] flex items-center gap-1 transition"
            >
              <span>{isAr ? "تصفية حزمة المؤسس" : "Filter Founder Stack"}</span>
              <Layers className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Minimalist Beige Aesthetic Card container matching the user reference */}
          <div className="mx-auto max-w-md rounded-2xl bg-[#efebe1] p-5 text-[#1f1e1d] shadow-2xl border border-[#ded8c8] font-mono text-xs select-none">
            <div className="space-y-2.5">
              {[
                {
                  label: "Emails",
                  provider: "resend",
                  badge: "Resend",
                  bg: "bg-black text-white",
                },
                {
                  label: "Database",
                  provider: "supabase",
                  badge: "Supabase",
                  bg: "bg-[#22c55e] text-white",
                },
                {
                  label: "Domains",
                  provider: "cloudflare",
                  badge: "Cloudflare",
                  bg: "bg-[#f97316] text-white",
                },
                {
                  label: "Images",
                  provider: "cloudflare",
                  badge: "Cloudflare R2",
                  bg: "bg-[#f97316] text-white",
                },
                {
                  label: "Code library",
                  provider: "github",
                  badge: "GitHub",
                  bg: "bg-black text-white",
                },
                {
                  label: "Analytics",
                  provider: "posthog",
                  badge: "PostHog",
                  bg: "bg-[#3b82f6] text-white",
                },
                {
                  label: "Payments",
                  provider: "stripe",
                  badge: "Stripe",
                  bg: "bg-[#6366f1] text-white",
                },
                {
                  label: "Tasks",
                  provider: "linear",
                  badge: "Linear",
                  bg: "bg-[#d1d5db] text-[#111827]",
                },
              ].map(stackItem => {
                const targetIntegration = integrations.find(
                  i => i.provider === stackItem.provider
                );
                const isConn = targetIntegration?.status === "connected";
                return (
                  <div
                    key={stackItem.label}
                    onClick={() => {
                      if (targetIntegration) {
                        handleOpenConnect(targetIntegration);
                      }
                    }}
                    className="flex items-center justify-between py-0.5 cursor-pointer hover:opacity-85 transition group"
                  >
                    <span className="font-medium text-stone-700 tracking-tight">
                      {stackItem.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm transition group-hover:scale-[1.02] ${stackItem.bg}`}
                      >
                        {stackItem.badge}
                      </span>
                      <span
                        title={
                          isConn
                            ? "Connected"
                            : "Disconnected (Click to connect)"
                        }
                        className={`h-2 w-2 rounded-full ${
                          isConn
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-stone-300"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-2">
          {[
            { id: "all", label: t("integrations.category_all") },
            {
              id: "founder",
              label: `⚡ ${t("integrations.category_founder")}`,
            },
            { id: "database", label: t("integrations.category_database") },
            { id: "payments", label: t("integrations.category_payments") },
            {
              id: "productivity",
              label: t("integrations.category_productivity"),
            },
            { id: "infra", label: t("integrations.category_infra") },
            { id: "storage", label: t("integrations.category_storage") },
            { id: "marketing", label: t("integrations.category_marketing") },
            { id: "social", label: t("integrations.category_social") },
            { id: "media", label: t("integrations.category_media") },
            { id: "dev", label: isAr ? "البرمجة والسحاب" : "Dev & Cloud" },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                filterCategory === cat.id
                  ? "bg-[#8b5cf6] text-white shadow-sm shadow-[#8b5cf6]/30"
                  : "bg-[#171923] text-gray-400 hover:text-white hover:bg-[#1f2230]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Integrations Grid (9 items) */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.map(item => {
              const isConnected = item.status === "connected";
              const isTesting = actionLoadingProvider === item.provider;

              return (
                <div
                  key={item.provider}
                  className={`flex flex-col justify-between rounded-xl border bg-[#12141c] p-5 transition shadow-sm hover:border-gray-700 ${
                    isConnected ? "border-emerald-500/30" : "border-gray-800/80"
                  }`}
                >
                  <div>
                    {/* Top row: Icon, Name & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#171923] border border-gray-800 shrink-0">
                          {getProviderIcon(item.provider)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {item.name}
                          </h3>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                            {item.category}
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-400 mt-3 line-clamp-2">
                      {item.description ||
                        (isAr ? item.name_ar : item.name) ||
                        "External platform connector"}
                    </p>

                    {/* Scopes */}
                    <div className="mt-4 pt-3 border-t border-gray-800/80">
                      <p className="text-[11px] font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                        <Shield className="h-3 w-3 text-[#8b5cf6]" />
                        {t("integrations.scopes_label")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(item.required_scopes || item.scopes || []).map(
                          scope => (
                            <span
                              key={scope}
                              className="font-mono text-[10px] rounded bg-gray-800/60 border border-gray-700/60 px-1.5 py-0.5 text-gray-300"
                            >
                              {scope}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-5 pt-3 border-t border-gray-800/80 flex items-center justify-between gap-2">
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => handleTestConnection(item.provider)}
                          disabled={isTesting}
                          className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-300 transition disabled:opacity-50"
                        >
                          <Activity
                            className={`h-3.5 w-3.5 ${isTesting ? "animate-spin" : ""}`}
                          />
                          <span>{t("integrations.btn_test")}</span>
                        </button>
                        <button
                          onClick={() => handleDisconnect(item.provider)}
                          disabled={isTesting}
                          className="text-xs font-semibold text-red-400 hover:text-red-300 transition"
                        >
                          {t("integrations.btn_disconnect")}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleOpenConnect(item)}
                        disabled={isTesting}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
                      >
                        <Plug className="h-3.5 w-3.5" />
                        <span>{t("integrations.btn_connect")}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Connect Modal */}
        {modalProvider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-[#12141c] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#171923]">
                    {getProviderIcon(modalProvider.provider)}
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {t("integrations.modal_title")}: {modalProvider.name}
                  </h3>
                </div>
                <button
                  onClick={() => setModalProvider(null)}
                  className="rounded-lg p-1 text-gray-400 hover:text-white"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                <div className="text-xs text-purple-300">
                  <span className="font-bold">Sandbox Testing:</span> Auto-fill
                  mock credentials to test without real production keys.
                </div>
                <button
                  type="button"
                  onClick={handleFillSandboxCredentials}
                  className="rounded-lg bg-purple-600 hover:bg-purple-500 px-2.5 py-1 text-[11px] font-bold text-white shrink-0 ml-2"
                >
                  Insert Sandbox Credentials
                </button>
              </div>

              {/* Dynamic form inputs */}
              <div className="space-y-3">
                {Object.keys(configFields).map(fieldKey => (
                  <div key={fieldKey}>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                      {fieldKey.replace("_", " ")}
                    </label>
                    <input
                      type={
                        fieldKey.includes("key") || fieldKey.includes("token")
                          ? "password"
                          : "text"
                      }
                      value={configFields[fieldKey] || ""}
                      onChange={e =>
                        setConfigFields({
                          ...configFields,
                          [fieldKey]: e.target.value,
                        })
                      }
                      placeholder={`Enter ${fieldKey.replace("_", " ")}`}
                      className="w-full text-xs rounded-xl border border-gray-800 bg-[#0d0e12] px-3.5 py-2.5 text-white focus:border-[#8b5cf6] focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalProvider(null)}
                  className="rounded-xl border border-gray-800 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#1a1c27]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConnect}
                  disabled={actionLoadingProvider === modalProvider.provider}
                  className="rounded-xl bg-[#8b5cf6] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#8b5cf6]/30 hover:bg-[#7c3aed] disabled:opacity-50"
                >
                  {t("integrations.modal_save")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

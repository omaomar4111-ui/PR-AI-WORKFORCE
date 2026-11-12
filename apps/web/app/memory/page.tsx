"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Sparkles,
  Building2,
  Users,
  FolderGit2,
  Bot,
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  Memory,
  MemoryType,
  fetchMemories,
  searchMemories,
  createMemory,
  deleteMemory,
  fetchClients,
  fetchProjects,
  fetchAgents,
  Client,
  Project,
  Agent,
  getStoredUser,
} from "@/lib/api";

const TYPE_ICONS: Record<MemoryType, any> = {
  organization: Building2,
  client: Users,
  project: FolderGit2,
  agent: Bot,
};

const TYPE_COLORS: Record<
  MemoryType,
  { bg: string; text: string; border: string }
> = {
  organization: {
    bg: "bg-purple-500/15",
    text: "text-[#c4b5fd]",
    border: "border-[#8b5cf6]/40",
  },
  client: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/40",
  },
  project: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/40",
  },
  agent: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/40",
  },
};

export default function MemoryPage() {
  const { t, isAr } = useI18n();
  const currentUser = getStoredUser();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | MemoryType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Reference lookups for modal & cards
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  // Add Memory Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalType, setModalType] = useState<MemoryType>("client");
  const [modalRefId, setModalRefId] = useState("");
  const [modalContent, setModalContent] = useState("");
  const [modalCategory, setModalCategory] = useState("Brand Guidelines");
  const [errorMessage, setErrorMessage] = useState("");

  // Load lookup data and memories on mount
  useEffect(() => {
    loadLookups();
    loadMemories();
  }, []);

  const loadLookups = async () => {
    try {
      const [cList, pList, aList] = await Promise.all([
        fetchClients().catch(() => []),
        fetchProjects().catch(() => []),
        fetchAgents().catch(() => []),
      ]);
      setClients(cList);
      setProjects(pList);
      setAgents(aList);
      if (cList.length > 0) setModalRefId(cList[0].id);
    } catch (e) {
      console.error("Failed to load lookups:", e);
    }
  };

  const loadMemories = async () => {
    setLoading(true);
    setHasSearched(false);
    try {
      const typeParam = activeTab === "all" ? undefined : activeTab;
      const data = await fetchMemories({ type: typeParam });
      setMemories(data);
    } catch (err) {
      console.error("Failed to fetch memories:", err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when tab changes (unless currently in a search result)
  useEffect(() => {
    if (!hasSearched) {
      loadMemories();
    }
  }, [activeTab]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      loadMemories();
      return;
    }

    setIsSearching(true);
    try {
      const typeParam = activeTab === "all" ? undefined : activeTab;
      const results = await searchMemories(searchQuery.trim(), {
        type: typeParam,
        limit: 10,
      });
      setMemories(results);
      setHasSearched(true);
    } catch (err) {
      console.error("Semantic search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    loadMemories();
  };

  const handleDelete = async (memoryId: string) => {
    if (!confirm(t("memory.delete_confirm"))) return;
    try {
      await deleteMemory(memoryId);
      setMemories(prev => prev.filter(m => m.id !== memoryId));
    } catch (err: any) {
      alert(err.message || "Failed to delete memory");
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalContent.trim()) {
      setErrorMessage("Please enter memory content");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");

    try {
      let resolvedRefId = modalRefId;
      if (modalType === "organization") {
        resolvedRefId =
          currentUser?.organization_id ||
          "00000000-0000-0000-0000-000000000001";
      }

      const newMem = await createMemory({
        type: modalType,
        reference_id: resolvedRefId,
        content: modalContent.trim(),
        metadata: {
          category: modalCategory,
          created_by: currentUser?.full_name || currentUser?.email,
        },
      });

      setMemories(prev => [newMem, ...prev]);
      setIsModalOpen(false);
      setModalContent("");
      setModalCategory("Brand Guidelines");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create memory");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to format reference name
  const getReferenceLabel = (m: Memory) => {
    if (m.type === "organization") return t("memory.tab_organization");
    if (m.type === "client") {
      const cl = clients.find(c => c.id === m.reference_id);
      return cl ? cl.name : `Client (${m.reference_id.slice(0, 8)})`;
    }
    if (m.type === "project") {
      const pr = projects.find(p => p.id === m.reference_id);
      return pr ? pr.name : `Project (${m.reference_id.slice(0, 8)})`;
    }
    if (m.type === "agent") {
      const ag = agents.find(a => a.id === m.reference_id);
      return ag ? ag.name : `Agent (${m.reference_id})`;
    }
    return m.reference_id;
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <span className="p-2 rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd]">
                <Brain className="h-6 w-6" />
              </span>
              <span>{t("memory.title")}</span>
            </h1>
            <p className="mt-1 text-sm text-gray-400">{t("memory.subtitle")}</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            data-testid="add-memory-cta"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#8b5cf6]/30 transition hover:bg-[#7c3aed] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>{t("memory.add_button")}</span>
          </button>
        </div>

        {/* Semantic Search Bar */}
        <div className="rounded-2xl border border-gray-800 bg-[#13151f] p-4 shadow-xl">
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                data-testid="memory-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("memory.search_placeholder")}
                className="w-full rounded-xl border border-gray-800 bg-[#181a26] py-2.5 ps-10 pe-10 text-sm text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearching}
              data-testid="memory-search-submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#8b5cf6]/50 bg-[#8b5cf6]/20 px-6 py-2.5 text-sm font-semibold text-[#c4b5fd] hover:bg-[#8b5cf6] hover:text-white transition disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{t("memory.searching")}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {isAr ? "بحث دلالي متقدم" : "Semantic Search (<=>)"}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Active Search Banner */}
          {hasSearched && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 px-3 py-2 text-xs text-[#c4b5fd]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>
                  {isAr
                    ? "نتائج البحث الدلالي المتجه (Vector Embeddings) لـ:"
                    : "Semantic Vector Results for:"}{" "}
                  <strong className="text-white">"{searchQuery}"</strong>
                </span>
              </div>
              <button
                onClick={handleClearSearch}
                className="text-gray-400 hover:text-white underline text-[11px]"
              >
                {isAr ? "إلغاء واستعادة الكل" : "Reset filter"}
              </button>
            </div>
          )}
        </div>

        {/* Level Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-3">
          {(["all", "organization", "client", "project", "agent"] as const).map(
            tab => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  data-testid={`memory-tab-${tab}`}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/30"
                      : "border border-gray-800 bg-[#13151f] text-gray-400 hover:border-gray-700 hover:text-white"
                  }`}
                >
                  <span>{t(`memory.tab_${tab}`)}</span>
                  <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px]">
                    {tab === "all"
                      ? memories.length
                      : memories.filter(m => m.type === tab).length}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {/* Memories Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-gray-800 bg-[#13151f] p-5 shadow-lg h-48 animate-pulse"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-5 w-24 bg-gray-800 rounded-full" />
                    <div className="h-4 w-16 bg-gray-800 rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3.5 w-full bg-gray-800 rounded" />
                    <div className="h-3.5 w-4/5 bg-gray-800 rounded" />
                    <div className="h-3.5 w-2/3 bg-gray-800/60 rounded" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-800/60">
                  <div className="h-3 w-20 bg-gray-800/60 rounded" />
                  <div className="h-4 w-4 bg-gray-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : memories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-800 bg-[#13151f]/50 p-12 text-center">
            <Brain className="mx-auto h-12 w-12 text-gray-600" />
            <h3 className="mt-4 text-base font-bold text-white">
              {t("memory.empty")}
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              {isAr
                ? "ابدأ بتدوين إرشادات العلامات التجارية أو أسلوب التواصل لتزويد الوكلاء بالسياق الحي."
                : "Add brand ground-truth, guidelines, or tone-of-voice to enrich agent responses."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {memories.map(mem => {
              const Icon = TYPE_ICONS[mem.type] || Brain;
              const color = TYPE_COLORS[mem.type] || TYPE_COLORS.organization;
              const hasScore = typeof mem.similarity === "number";

              return (
                <div
                  key={mem.id}
                  data-testid="memory-card"
                  className="flex flex-col justify-between rounded-2xl border border-gray-800 bg-[#13151f] p-5 shadow-lg transition hover:border-gray-700 hover:shadow-xl"
                >
                  <div>
                    {/* Card Top: Type & Similarity Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold uppercase ${color.bg} ${color.text} ${color.border}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{t(`memory.tab_${mem.type}`)}</span>
                        </span>

                        <span className="text-xs font-semibold text-gray-300 truncate max-w-[130px]">
                          {getReferenceLabel(mem)}
                        </span>
                      </div>

                      {hasScore && (
                        <span
                          data-testid="memory-similarity-badge"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold text-emerald-400"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>
                            {mem.similarity_percent ??
                              Math.round(mem.similarity! * 100)}
                            % {t("memory.match_score")}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Content text */}
                    <p className="mt-3 text-sm text-gray-200 leading-relaxed line-clamp-4">
                      {mem.content}
                    </p>
                  </div>

                  {/* Card Bottom: Metadata, date, delete */}
                  <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      {mem.metadata?.category && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#181a26] border border-gray-800 px-2 py-0.5 text-[10px] text-gray-300">
                          <Tag className="h-2.5 w-2.5 text-[#8b5cf6]" />
                          <span>{mem.metadata.category}</span>
                        </span>
                      )}
                      <span className="text-[10px] text-gray-500">
                        {mem.created_at?.slice(0, 10)}
                      </span>
                    </div>

                    {currentUser?.role === "owner" && (
                      <button
                        onClick={() => handleDelete(mem.id)}
                        data-testid="delete-memory-btn"
                        className="text-gray-500 hover:text-red-400 p-1 rounded transition"
                        title={t("memory.delete_confirm")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ADD MEMORY MODAL ────────────────────────────────────────────── */}
        {isModalOpen && (
          <div
            data-testid="add-memory-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-[#13151f] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 p-2 text-[#c4b5fd]">
                    <Brain className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {t("memory.modal_title")}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {errorMessage && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleCreateMemory} className="mt-4 space-y-4">
                {/* Memory Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300">
                    {t("memory.type_label")}
                  </label>
                  <select
                    value={modalType}
                    data-testid="memory-type-select"
                    onChange={e => {
                      const newType = e.target.value as MemoryType;
                      setModalType(newType);
                      if (newType === "client" && clients.length > 0)
                        setModalRefId(clients[0].id);
                      if (newType === "project" && projects.length > 0)
                        setModalRefId(projects[0].id);
                      if (newType === "agent" && agents.length > 0)
                        setModalRefId(agents[0].id);
                    }}
                    className="mt-1.5 w-full rounded-xl border border-gray-800 bg-[#181a26] px-3.5 py-2.5 text-sm text-white focus:border-[#8b5cf6] focus:outline-none"
                  >
                    <option value="organization">
                      {t("memory.tab_organization")}
                    </option>
                    <option value="client">{t("memory.tab_client")}</option>
                    <option value="project">{t("memory.tab_project")}</option>
                    <option value="agent">{t("memory.tab_agent")}</option>
                  </select>
                </div>

                {/* Reference Selector */}
                {modalType !== "organization" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300">
                      {t("memory.ref_label")}
                    </label>
                    <select
                      value={modalRefId}
                      data-testid="memory-ref-select"
                      onChange={e => setModalRefId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-800 bg-[#181a26] px-3.5 py-2.5 text-sm text-white focus:border-[#8b5cf6] focus:outline-none"
                    >
                      {modalType === "client" &&
                        clients.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.industry || "Client"})
                          </option>
                        ))}
                      {modalType === "project" &&
                        projects.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      {modalType === "agent" &&
                        agents.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.department})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Content Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300">
                    {t("memory.content_label")} *
                  </label>
                  <textarea
                    rows={4}
                    data-testid="memory-content-input"
                    value={modalContent}
                    onChange={e => setModalContent(e.target.value)}
                    placeholder={
                      isAr
                        ? "مثال: يفضل العميل ألوان البنفسجي #8b5cf6 والأبيض، ونبرة الخطاب فصحى معاصرة بدون كلمات عامية مبتذلة..."
                        : "e.g., Client visual identity requires #8b5cf6 purple, modern formal tone, zero generic marketing cliches..."
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-800 bg-[#181a26] p-3 text-sm text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]"
                    required
                  />
                </div>

                {/* Category Tag */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300">
                    {t("memory.metadata_label")}
                  </label>
                  <input
                    type="text"
                    value={modalCategory}
                    onChange={e => setModalCategory(e.target.value)}
                    placeholder="e.g. Brand Guidelines, Tone of Voice, Forbidden Words"
                    className="mt-1.5 w-full rounded-xl border border-gray-800 bg-[#181a26] px-3.5 py-2.5 text-sm text-white focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-gray-800 bg-[#181a26] px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white"
                  >
                    {t("memory.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    data-testid="save-memory-btn"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-[#8b5cf6]/30 hover:bg-[#7c3aed] disabled:opacity-50"
                  >
                    {submitting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span>{t("memory.save")}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

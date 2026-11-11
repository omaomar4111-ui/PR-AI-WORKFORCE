"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Network,
  Plus,
  Search,
  Edit3,
  Trash2,
  Users,
  Bot,
  Sparkles,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Megaphone,
  Palette,
  Film,
  Cpu,
  Compass,
  Briefcase,
  Layers,
  CheckCheck,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  Department,
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  fetchMe,
  User,
} from "@/lib/api";

const DEPT_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  marketing: Megaphone,
  creative: Palette,
  video: Film,
  engineering: Cpu,
  research: Compass,
  sales: Briefcase,
  operations: Layers,
  quality: CheckCheck,
};

export default function DepartmentsPage() {
  const { t, isAr } = useI18n();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<User | null>(null);

  // Modal State
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [activeDept, setActiveDept] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Layers");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [depts, me] = await Promise.all([
        fetchDepartments(),
        fetchMe().catch(() => null),
      ]);
      setDepartments(depts);
      if (me?.user) setUser(me.user);
    } catch (err: any) {
      console.error("Failed to load departments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isOwner = user?.role === "owner";

  // Filtered Departments
  const filteredDepts = departments.filter(d => {
    const q = search.toLowerCase();
    const matchName =
      d.name.toLowerCase().includes(q) ||
      (d.name_ar && d.name_ar.toLowerCase().includes(q)) ||
      (d.description && d.description.toLowerCase().includes(q));
    const matchAgent =
      d.agents?.some(
        a =>
          a.name.toLowerCase().includes(q) ||
          (a.name_ar && a.name_ar.toLowerCase().includes(q)) ||
          (a.role && a.role.toLowerCase().includes(q))
      ) || false;
    return matchName || matchAgent;
  });

  const handleOpenCreate = () => {
    setModalMode("create");
    setActiveDept(null);
    setName("");
    setNameAr("");
    setSlug("");
    setDescription("");
    setIcon("Layers");
    setErrorMsg(null);
  };

  const handleOpenEdit = (dept: Department) => {
    setModalMode("edit");
    setActiveDept(dept);
    setName(dept.name);
    setNameAr(dept.name_ar || "");
    setSlug(dept.slug || dept.id);
    setDescription(dept.description || "");
    setIcon(dept.icon || "Layers");
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      if (modalMode === "create") {
        await createDepartment({
          name: name.trim(),
          name_ar: nameAr.trim() || undefined,
          slug: slug.trim() || undefined,
          description: description.trim() || undefined,
          icon,
        });
      } else if (modalMode === "edit" && activeDept) {
        await updateDepartment(activeDept.id, {
          name: name.trim(),
          name_ar: nameAr.trim() || undefined,
          slug: slug.trim() || undefined,
          description: description.trim() || undefined,
          icon,
        });
      }
      setModalMode(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDepartment(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete department");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <main id="main-content" role="main" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd]">
                <Network className="h-5 w-5" />
              </span>
              <span>
                {isAr
                  ? "الأقسام والهيكل التنظيمي"
                  : "Agency Departments & Taxonomy"}
              </span>
            </h1>
            <p className="mt-1 text-xs text-gray-400">
              {isAr
                ? "استعراض الأقسام المتخصصة ووكلاء الذكاء الاصطناعي الـ 38 الموزعين عبر التخصصات"
                : "Explore specialized agency divisions and the 38 autonomous AI employees assigned to them"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isOwner && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/30 transition hover:bg-[#7c3aed]"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? "إضافة قسم جديد" : "Add Department"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar & Summary Stats */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={
                isAr
                  ? "بحث بالقسم أو الوكيل أو الاختصاص..."
                  : "Search departments or assigned agents..."
              }
              className="w-full rounded-xl border border-gray-800 bg-[#12141e] px-9 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-white rtl:right-auto rtl:left-3"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="rounded-lg border border-gray-800 bg-[#12141e] px-3 py-1.5 font-semibold">
              {isAr ? "الأقسام:" : "Total Departments:"}{" "}
              <strong className="text-white">{departments.length}</strong>
            </span>
            <span className="rounded-lg border border-gray-800 bg-[#12141e] px-3 py-1.5 font-semibold">
              {isAr ? "إجمالي الوكلاء:" : "Active AI Workforce:"}{" "}
              <strong className="text-emerald-400">
                {departments.reduce((sum, d) => sum + (d.agent_count || 0), 0)}
              </strong>
            </span>
          </div>
        </div>

        {/* Departments Grid */}
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-[#8b5cf6]" />
            <span>
              {isAr
                ? "جارٍ تحميل الأقسام والوكلاء..."
                : "Loading departments..."}
            </span>
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-[#12141e] p-12 text-center text-gray-400 space-y-2">
            <Bot className="h-8 w-8 mx-auto text-gray-600" />
            <p className="text-xs font-semibold">
              {isAr
                ? "لم يتم العثور على أي أقسام مطابقة للبحث"
                : "No departments matched your search"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredDepts.map(dept => {
              const IconComp =
                DEPT_ICONS[dept.id] || DEPT_ICONS[dept.slug || ""] || Layers;
              const agentCount = dept.agent_count || dept.agents?.length || 0;

              return (
                <div
                  key={dept.id}
                  className="flex flex-col justify-between rounded-2xl border border-gray-800 bg-[#12141e] p-5 shadow-lg transition hover:border-gray-700 hover:shadow-xl"
                >
                  <div className="space-y-4">
                    {/* Card Top: Icon, Names & Actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd]">
                          <IconComp className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>
                              {isAr && dept.name_ar ? dept.name_ar : dept.name}
                            </span>
                          </h2>
                          <p className="text-[11px] text-gray-400 font-mono">
                            {isAr ? dept.name : dept.name_ar}
                          </p>
                        </div>
                      </div>

                      {/* Owner Actions */}
                      {isOwner && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(dept)}
                            title={isAr ? "تعديل القسم" : "Edit Department"}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(dept)}
                            title={isAr ? "حذف القسم" : "Delete Department"}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-950/40 hover:text-rose-400 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {dept.description && (
                      <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">
                        {dept.description}
                      </p>
                    )}

                    {/* Agent Roster List */}
                    <div className="pt-2 border-t border-gray-800/80">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-[#a78bfa]" />
                          <span>
                            {isAr
                              ? "فريق الوكلاء المعينين"
                              : "Assigned AI Agents"}
                          </span>
                        </span>
                        <span className="rounded-full bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 px-2 py-0.5 text-[10px] font-bold text-[#c4b5fd]">
                          {agentCount} {isAr ? "وكلاء" : "agents"}
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {dept.agents && dept.agents.length > 0 ? (
                          dept.agents.map(ag => (
                            <Link
                              key={ag.id}
                              href="/agents"
                              className="group flex items-center justify-between rounded-lg border border-gray-800/60 bg-[#161824] px-2.5 py-1.5 text-xs transition hover:border-[#8b5cf6]/40 hover:bg-[#1c1f2e]"
                            >
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#8b5cf6]/20 text-[10px] font-bold text-[#c4b5fd]">
                                  <Bot className="h-3 w-3" />
                                </span>
                                <div>
                                  <div className="font-semibold text-white group-hover:text-[#c4b5fd] transition">
                                    {isAr && ag.name_ar ? ag.name_ar : ag.name}
                                  </div>
                                  <div className="text-[10px] text-gray-400 line-clamp-1">
                                    {isAr && ag.role_ar ? ag.role_ar : ag.role}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="h-3 w-3 text-gray-600 group-hover:text-[#a78bfa] rtl:rotate-180 transition" />
                            </Link>
                          ))
                        ) : (
                          <div className="py-3 text-center text-[11px] text-gray-500">
                            {isAr
                              ? "لا يوجد وكلاء معينين في هذا القسم حالياً"
                              : "No agents currently assigned"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Quick Link */}
                  <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] text-gray-500">
                      ID: {dept.slug || dept.id}
                    </span>
                    <Link
                      href={`/agents?department=${dept.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-[#8b5cf6] hover:text-[#a78bfa] text-[11px]"
                    >
                      <span>
                        {isAr ? "عرض في شجرة الوكلاء" : "View in Roster"}
                      </span>
                      <ChevronRight className="h-3 w-3 rtl:rotate-180" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CREATE / EDIT DEPARTMENT MODAL (OWNER ONLY) ───────────────────── */}
        {modalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-[#12141e] p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd]">
                    <Network className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {modalMode === "create"
                        ? isAr
                          ? "إضافة قسم تنظيمي جديد"
                          : "Add New Department"
                        : isAr
                          ? "تعديل بيانات القسم"
                          : "Edit Department Details"}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="dept-name-en"
                    className="block text-xs font-semibold text-gray-300 mb-1"
                  >
                    {isAr
                      ? "اسم القسم (بالإنجليزية)"
                      : "Department Name (English)"}
                  </label>
                  <input
                    id="dept-name-en"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="e.g. Media Intelligence & PR"
                    className="w-full rounded-xl border border-gray-800 bg-[#161824] px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="dept-name-ar"
                    className="block text-xs font-semibold text-gray-300 mb-1"
                  >
                    {isAr ? "اسم القسم (بالعربية)" : "Department Name (Arabic)"}
                  </label>
                  <input
                    id="dept-name-ar"
                    type="text"
                    value={nameAr}
                    onChange={e => setNameAr(e.target.value)}
                    placeholder="مثال: استخبارات الإعلام والعلاقات العامة"
                    className="w-full rounded-xl border border-gray-800 bg-[#161824] px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="dept-slug"
                    className="block text-xs font-semibold text-gray-300 mb-1"
                  >
                    {isAr
                      ? "المعرّف الفريد (Slug)"
                      : "Unique Identifier (Slug)"}
                  </label>
                  <input
                    id="dept-slug"
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    placeholder="e.g. media-intelligence"
                    className="w-full font-mono rounded-xl border border-gray-800 bg-[#161824] px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="dept-description"
                    className="block text-xs font-semibold text-gray-300 mb-1"
                  >
                    {isAr
                      ? "الوصف ونطاق العمل"
                      : "Description & Strategic Scope"}
                  </label>
                  <textarea
                    id="dept-description"
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Department mission, mandates, and operational focus..."
                    className="w-full rounded-xl border border-gray-800 bg-[#161824] p-3 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="rounded-xl border border-gray-800 bg-[#161824] px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/30 hover:bg-[#7c3aed] disabled:opacity-50"
                  >
                    {saving && (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    )}
                    <span>{isAr ? "حفظ القسم" : "Save Department"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── DELETE CONFIRMATION DIALOG (OWNER ONLY) ───────────────────────── */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#12141e] p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                  <ShieldAlert className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? "تأكيد حذف القسم" : "Confirm Department Deletion"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {isAr
                      ? "هذا الإجراء لا يمكن التراجع عنه"
                      : "This action cannot be undone"}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                {isAr ? (
                  <>
                    هل أنت متأكد من رغبتك في حذف قسم{" "}
                    <strong className="text-white">
                      {deleteTarget.name_ar || deleteTarget.name}
                    </strong>
                    ؟
                  </>
                ) : (
                  <>
                    Are you sure you want to delete{" "}
                    <strong className="text-white">{deleteTarget.name}</strong>?
                  </>
                )}
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl border border-gray-800 bg-[#161824] px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {deleting && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>{isAr ? "تأكيد الحذف" : "Confirm Delete"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  Lock,
  Building,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  Users,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  User,
  Organization,
  fetchMe,
  updateUserProfile,
  updateUserPassword,
  fetchOrganization,
  updateOrganization,
} from "@/lib/api";

export default function SettingsPage() {
  const { t, isAr } = useI18n();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "organization"
  >("profile");

  // User State
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Organization State
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgMsg, setOrgMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingUser(true);
        const meRes = await fetchMe();
        if (meRes.user) {
          setUser(meRes.user);
          setFullName(meRes.user.full_name || "");
          setEmail(meRes.user.email || "");
        }
        const orgRes = await fetchOrganization().catch(() => null);
        if (orgRes) {
          setOrg(orgRes);
          setOrgName(orgRes.name || "");
          setOrgSlug(orgRes.slug || "");
        }
      } catch (err: any) {
        console.error("Failed to load settings data:", err);
      } finally {
        setLoadingUser(false);
      }
    }
    loadData();
  }, []);

  // Password Strength Indicators
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const isPasswordValid =
    hasMinLength && hasUpperCase && hasLowerCase && hasDigit;

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updated = await updateUserProfile({
        full_name: fullName.trim(),
        email: email.trim(),
      });
      setUser(updated);
      setProfileMsg({
        type: "success",
        text: isAr
          ? "تم تحديث الملف الشخصي بنجاح!"
          : "Profile updated successfully!",
      });
    } catch (err: any) {
      setProfileMsg({
        type: "error",
        text:
          err.message ||
          (isAr ? "فشل تحديث الملف الشخصي" : "Failed to update profile"),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Update
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({
        type: "error",
        text: isAr
          ? "كلمة المرور الجديدة غير متطابقة"
          : "New passwords do not match",
      });
      return;
    }

    if (!isPasswordValid) {
      setPasswordMsg({
        type: "error",
        text: isAr
          ? "كلمة المرور يجب أن تحقق جميع شروط الأمان المطلوبة"
          : "Password does not meet the security criteria",
      });
      return;
    }

    setSavingPassword(true);
    try {
      await updateUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMsg({
        type: "success",
        text: isAr
          ? "تم تغيير كلمة المرور بنجاح!"
          : "Password changed successfully!",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg({
        type: "error",
        text:
          err.message ||
          (isAr ? "فشل تغيير كلمة المرور" : "Failed to change password"),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Org Update
  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrg(true);
    setOrgMsg(null);
    try {
      const updated = await updateOrganization({
        name: orgName.trim(),
        slug: orgSlug.trim(),
      });
      setOrg(updated);
      setOrgMsg({
        type: "success",
        text: isAr
          ? "تم تحديث إعدادات المنظمة بنجاح!"
          : "Organization settings updated!",
      });
    } catch (err: any) {
      setOrgMsg({
        type: "error",
        text:
          err.message ||
          (isAr
            ? "فشل تحديث إعدادات المنظمة"
            : "Failed to update organization"),
      });
    } finally {
      setSavingOrg(false);
    }
  };

  const isOwner = user?.role === "owner";

  return (
    <AppShell>
      <main id="main-content" role="main" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd]">
                <Shield className="h-5 w-5" />
              </span>
              <span>
                {isAr
                  ? "إعدادات المنظومة والحساب"
                  : "System & Account Settings"}
              </span>
            </h1>
            <p className="mt-1 text-xs text-gray-400">
              {isAr
                ? "إدارة بيانات الملف الشخصي، معايير الأمان، وإعدادات الوكالة المركزية"
                : "Manage your profile identity, security credentials, and organization workspace"}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-px overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "profile"
                ? "border-[#8b5cf6] text-white bg-[#8b5cf6]/10 rounded-t-lg"
                : "border-transparent text-gray-400 hover:border-gray-700 hover:text-gray-200"
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>{isAr ? "الملف الشخصي" : "Profile Identity"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "security"
                ? "border-[#8b5cf6] text-white bg-[#8b5cf6]/10 rounded-t-lg"
                : "border-transparent text-gray-400 hover:border-gray-700 hover:text-gray-200"
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>{isAr ? "الأمان وكلمة المرور" : "Security & Password"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("organization")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "organization"
                ? "border-[#8b5cf6] text-white bg-[#8b5cf6]/10 rounded-t-lg"
                : "border-transparent text-gray-400 hover:border-gray-700 hover:text-gray-200"
            }`}
          >
            <Building className="h-4 w-4" />
            <span>{isAr ? "إعدادات المنظمة" : "Organization Workspace"}</span>
          </button>
        </div>

        {/* Tab Contents */}
        {loadingUser ? (
          <div className="py-16 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-[#8b5cf6]" />
            <span>
              {isAr ? "جارٍ تحميل الإعدادات..." : "Loading settings..."}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 max-w-3xl">
            {/* ════ TAB 1: PROFILE ════ */}
            {activeTab === "profile" && (
              <div className="rounded-2xl border border-gray-800 bg-[#12141e] p-6 shadow-xl space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-[#8b5cf6]" />
                    <span>
                      {isAr ? "معلومات الحساب" : "User Profile Information"}
                    </span>
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    {isAr
                      ? "قم بتحديث اسمك وبريدك الإلكتروني المسجل في النظام"
                      : "Update your display name and primary account email address"}
                  </p>
                </div>

                {profileMsg && (
                  <div
                    className={`flex items-center gap-2 rounded-xl p-3 text-xs border ${
                      profileMsg.type === "success"
                        ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                        : "border-rose-500/30 bg-rose-950/20 text-rose-300"
                    }`}
                  >
                    {profileMsg.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{profileMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  {/* Role & Org Summary Badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 px-3 py-1 font-bold text-[#c4b5fd]">
                      Role: {user?.role ? user.role.toUpperCase() : "MEMBER"}
                    </span>
                    <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 font-semibold text-cyan-300">
                      Org: {user?.organization_name || "PR Agency"}
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor="settings-name"
                      className="block text-xs font-semibold text-gray-300 mb-1"
                    >
                      {isAr
                        ? "الاسم الكامل (Display Name)"
                        : "Full Display Name"}
                    </label>
                    <input
                      id="settings-name"
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-800 bg-[#161824] px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="settings-email"
                      className="block text-xs font-semibold text-gray-300 mb-1"
                    >
                      {isAr
                        ? "البريد الإلكتروني (Email Address)"
                        : "Primary Email Address"}
                    </label>
                    <input
                      id="settings-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-800 bg-[#161824] px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/30 transition hover:bg-[#7c3aed] disabled:opacity-50"
                    >
                      {savingProfile ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isAr ? "حفظ التغييرات" : "Save Profile Changes"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ════ TAB 2: SECURITY & PASSWORD ════ */}
            {activeTab === "security" && (
              <div className="rounded-2xl border border-gray-800 bg-[#12141e] p-6 shadow-xl space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#8b5cf6]" />
                    <span>
                      {isAr ? "تغيير كلمة المرور" : "Change Account Password"}
                    </span>
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    {isAr
                      ? "يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، وحرف كبير وصغير ورقم"
                      : "Password must be at least 8 characters long with uppercase, lowercase, and a number"}
                  </p>
                </div>

                {passwordMsg && (
                  <div
                    className={`flex items-center gap-2 rounded-xl p-3 text-xs border ${
                      passwordMsg.type === "success"
                        ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                        : "border-rose-500/30 bg-rose-950/20 text-rose-300"
                    }`}
                  >
                    {passwordMsg.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="settings-current-pass"
                      className="block text-xs font-semibold text-gray-300 mb-1"
                    >
                      {isAr ? "كلمة المرور الحالية" : "Current Password"}
                    </label>
                    <input
                      id="settings-current-pass"
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-gray-800 bg-[#161824] px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:border-[#8b5cf6] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="settings-new-pass"
                      className="block text-xs font-semibold text-gray-300 mb-1"
                    >
                      {isAr ? "كلمة المرور الجديدة" : "New Secure Password"}
                    </label>
                    <input
                      id="settings-new-pass"
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-gray-800 bg-[#161824] px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:border-[#8b5cf6] focus:outline-none"
                    />
                  </div>

                  {/* Password Strength Checklist */}
                  {newPassword.length > 0 && (
                    <div className="rounded-xl border border-gray-800 bg-[#161824] p-3 text-[11px] space-y-1.5">
                      <span className="font-bold text-gray-400 block mb-1">
                        {isAr
                          ? "معايير قوة كلمة المرور:"
                          : "Password Strength Criteria:"}
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <span
                          className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-400" : "text-gray-500"}`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>
                            {isAr ? "8 أحرف على الأقل" : "8+ characters"}
                          </span>
                        </span>
                        <span
                          className={`flex items-center gap-1.5 ${hasUpperCase ? "text-emerald-400" : "text-gray-500"}`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>
                            {isAr ? "حرف كبير (A-Z)" : "Uppercase letter"}
                          </span>
                        </span>
                        <span
                          className={`flex items-center gap-1.5 ${hasLowerCase ? "text-emerald-400" : "text-gray-500"}`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>
                            {isAr ? "حرف صغير (a-z)" : "Lowercase letter"}
                          </span>
                        </span>
                        <span
                          className={`flex items-center gap-1.5 ${hasDigit ? "text-emerald-400" : "text-gray-500"}`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>
                            {isAr
                              ? "رقم واحد على الأقل (0-9)"
                              : "Numeric digit"}
                          </span>
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="settings-confirm-pass"
                      className="block text-xs font-semibold text-gray-300 mb-1"
                    >
                      {isAr
                        ? "تأكيد كلمة المرور الجديدة"
                        : "Confirm New Password"}
                    </label>
                    <input
                      id="settings-confirm-pass"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-gray-800 bg-[#161824] px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:border-[#8b5cf6] focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingPassword || !isPasswordValid}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/30 transition hover:bg-[#7c3aed] disabled:opacity-50"
                    >
                      {savingPassword ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <KeyRound className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isAr ? "تحديث كلمة المرور" : "Update Password"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ════ TAB 3: ORGANIZATION ════ */}
            {activeTab === "organization" && (
              <div className="rounded-2xl border border-gray-800 bg-[#12141e] p-6 shadow-xl space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building className="h-4 w-4 text-[#8b5cf6]" />
                    <span>
                      {isAr
                        ? "إعدادات المنظمة ومساحة العمل"
                        : "Organization Workspace"}
                    </span>
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    {isOwner
                      ? isAr
                        ? "بصفتك مالك المنظمة (Owner)، يمكنك تعديل الاسم والبيانات الأساسية"
                        : "As Workspace Owner, you have full administrative control over this tenant"
                      : isAr
                        ? "عرض بيانات المنظمة (التعديل متاح للمالك فقط)"
                        : "Read-only workspace details (modification requires Owner role)"}
                  </p>
                </div>

                {orgMsg && (
                  <div
                    className={`flex items-center gap-2 rounded-xl p-3 text-xs border ${
                      orgMsg.type === "success"
                        ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                        : "border-rose-500/30 bg-rose-950/20 text-rose-300"
                    }`}
                  >
                    {orgMsg.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{orgMsg.text}</span>
                  </div>
                )}

                {/* Plan Tier Highlight */}
                <div className="rounded-xl border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#c4b5fd] block">
                      Subscription Tier
                    </span>
                    <h3 className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#a78bfa]" />
                      <span>Enterprise Autonomous Workforce (38 Agents)</span>
                    </h3>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-400">
                    Active
                  </span>
                </div>

                <form onSubmit={handleOrgSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="settings-org-name"
                      className="block text-xs font-semibold text-gray-300 mb-1"
                    >
                      {isAr
                        ? "اسم المنظمة (Organization Name)"
                        : "Organization Name"}
                    </label>
                    <input
                      id="settings-org-name"
                      type="text"
                      value={orgName}
                      disabled={!isOwner}
                      onChange={e => setOrgName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-800 bg-[#161824] px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="settings-org-slug"
                      className="block text-xs font-semibold text-gray-300 mb-1"
                    >
                      {isAr ? "معرف مساحة العمل (Slug)" : "Workspace URL Slug"}
                    </label>
                    <input
                      id="settings-org-slug"
                      type="text"
                      value={orgSlug}
                      disabled={!isOwner}
                      onChange={e => setOrgSlug(e.target.value)}
                      required
                      className="w-full font-mono rounded-xl border border-gray-800 bg-[#161824] px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none disabled:opacity-60"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                    <Users className="h-4 w-4 text-cyan-400" />
                    <span>
                      {isAr
                        ? "عدد أعضاء المنظمة:"
                        : "Active Workspace Members:"}{" "}
                      <strong className="text-white">
                        {org?.members_count || 2}
                      </strong>
                    </span>
                  </div>

                  {isOwner && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingOrg}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/30 transition hover:bg-[#7c3aed] disabled:opacity-50"
                      >
                        {savingOrg ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {isAr
                            ? "حفظ إعدادات المنظمة"
                            : "Save Organization Settings"}
                        </span>
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </AppShell>
  );
}

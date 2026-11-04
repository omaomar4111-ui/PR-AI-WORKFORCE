"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@pragency.eg");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"ar" | "en">("ar");

  const isAr = lang === "ar";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginUser(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || (isAr ? "فشل تسجيل الدخول" : "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const prefill = (role: "owner" | "member") => {
    if (role === "owner") {
      setEmail("owner@pragency.eg");
      setPassword("Password123!");
    } else {
      setEmail("member@pragency.eg");
      setPassword("Password123!");
    }
    setError(null);
  };

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="relative flex min-h-screen w-full items-center justify-center bg-[#0d0e12] px-4 py-12"
    >
      {/* Background Radial Purple Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[450px] w-[450px] rounded-full bg-[#8b5cf6]/10 blur-[120px]" />
      </div>

      {/* Language Switcher */}
      <button
        onClick={() => setLang(isAr ? "en" : "ar")}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 rounded-full border border-gray-800 bg-[#14161f] px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-[#8b5cf6] hover:text-white"
      >
        <span>🌐</span>
        <span>{isAr ? "English" : "العربية"}</span>
      </button>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#222634] bg-[#14161f]/90 p-8 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6d28d9] to-[#8b5cf6] shadow-lg shadow-[#8b5cf6]/30">
            <span className="text-2xl font-black text-white">PR</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isAr ? "نظام إدارة القوى العاملة الذكية" : "PR AI WORKFORCE"}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {isAr
              ? "تسجيل دخول الفريق الإداري (38 وكيل ذكي + أم سماح)"
              : "Central Operating System (Om Samah + 38 Agents)"}
          </p>
        </div>

        {/* Demo Role Switcher */}
        <div className="mb-6 rounded-xl border border-gray-800/80 bg-[#0d0e12]/60 p-2">
          <div className="mb-2 text-center text-xs font-medium text-gray-400">
            {isAr ? "⚡ حسابات تجريبية سريعة للمعاينة:" : "⚡ Quick Demo Roles:"}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => prefill("owner")}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                email === "owner@pragency.eg"
                  ? "bg-[#8b5cf6] text-white shadow-md shadow-[#8b5cf6]/30"
                  : "bg-gray-800/50 text-gray-400 hover:text-white"
              }`}
            >
              👑 {isAr ? "المالك (Owner)" : "Owner"}
            </button>
            <button
              type="button"
              onClick={() => prefill("member")}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                email === "member@pragency.eg"
                  ? "bg-[#8b5cf6] text-white shadow-md shadow-[#8b5cf6]/30"
                  : "bg-gray-800/50 text-gray-400 hover:text-white"
              }`}
            >
              👥 {isAr ? "عضو فريق (Member)" : "Team Member"}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-300">
              {isAr ? "البريد الإلكتروني" : "Email Address"}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@pragency.eg"
              className="w-full rounded-xl border border-[#222634] bg-[#0d0e12] px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-colors focus:border-[#8b5cf6] focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-300">
              {isAr ? "كلمة المرور" : "Password"}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[#222634] bg-[#0d0e12] px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-colors focus:border-[#8b5cf6] focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] py-3 text-sm font-bold text-white shadow-lg shadow-[#8b5cf6]/25 transition-all hover:opacity-95 disabled:opacity-50"
          >
            {loading
              ? isAr
                ? "جاري التحقق..."
                : "Authenticating..."
              : isAr
              ? "دخول إلى لوحة العمليات"
              : "Access Platform"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <span>{isAr ? "نظام داخلي مؤمن — وكالة PR Agency" : "Secured Internal OS — PR Agency"}</span>
        </div>
      </div>
    </div>
  );
}

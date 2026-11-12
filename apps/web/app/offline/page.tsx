"use client";

import React from "react";
import { WifiOff, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0e12] px-4 text-center text-white selection:bg-[#8b5cf6]/30">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[400px] w-[400px] rounded-full bg-[#8b5cf6]/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-md rounded-2xl border border-gray-800 bg-[#14161f]/90 p-8 shadow-2xl backdrop-blur-xl">
        {/* Offline Icon Beacon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6d28d9]/30 to-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd] shadow-lg shadow-[#8b5cf6]/20">
          <WifiOff className="h-8 w-8 text-[#a78bfa]" />
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          أنت غير متصل بالإنترنت
        </h1>
        <p className="mt-1 text-sm font-medium text-gray-400">
          You are currently offline
        </p>

        {/* Description */}
        <p className="mt-4 text-xs leading-relaxed text-gray-400">
          يبدو أنك فقدت الاتصال بالشبكة. يمكنك محاولة إعادة الاتصال أو استخدام
          الميزات المخبأة مسبقاً في وضع عدم الاتصال.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleRetry}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/25 transition hover:brightness-110 active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>إعادة المحاولة / Retry</span>
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-800 bg-[#161824] px-4 py-2.5 text-xs font-semibold text-gray-300 hover:border-gray-700 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            <span>الرئيسية / Home</span>
          </Link>
        </div>

        {/* Status Pill */}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-gray-800 bg-[#0d0e14] px-3 py-1 text-[11px] font-mono text-gray-500">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span>PR AI WORKFORCE • Offline Mode</span>
        </div>
      </div>
    </div>
  );
}

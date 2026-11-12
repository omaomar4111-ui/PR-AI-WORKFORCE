"use client";

import React, { useEffect, useState } from "react";
import { Download, Share, PlusSquare, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "pwa_install_dismissed";
const DISMISS_DAYS = 7;

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    // 1. Check if already running in standalone mode (already installed)
    const checkStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;

    // Register Service Worker in production
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(reg => {
          console.log("[PWA] ServiceWorker registered with scope:", reg.scope);
        })
        .catch(err => {
          console.warn("[PWA] ServiceWorker registration failed:", err);
        });
    }

    if (checkStandalone) {
      setIsStandalone(true);
      return;
    }

    // 2. Check 7-day dismissal window
    const dismissedTime = localStorage.getItem(DISMISS_KEY);
    if (dismissedTime) {
      const elapsed = Date.now() - parseInt(dismissedTime, 10);
      if (elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIOSDevice =
      (/iPad|iPhone|iPod/.test(ua) ||
        (window.navigator.platform === "MacIntel" &&
          window.navigator.maxTouchPoints > 1)) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;

    setIsIOS(isIOSDevice);

    // 4. Capture beforeinstallprompt event for Android / Chromium / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If iOS and not dismissed, show prompt after brief grace period (3 seconds)
    let iosTimer: NodeJS.Timeout | null = null;
    if (isIOSDevice && !checkStandalone) {
      iosTimer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsVisible(false);
      } else {
        handleDismiss();
      }
      setDeferredPrompt(null);
    } catch {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // localStorage may fail in strict private mode
    }
    setIsVisible(false);
    setShowIOSGuide(false);
  };

  if (!isVisible || isStandalone) {
    return null;
  }

  return (
    <aside
      aria-label="PWA Installation Banner"
      className="fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[#8b5cf6]/30 bg-[#14161f]/95 p-4 sm:p-5 shadow-2xl shadow-[#8b5cf6]/15 backdrop-blur-xl">
        {/* Glow accent */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full bg-[#8b5cf6]/20 blur-2xl" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 left-3 text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-white/5"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5">
          {/* App Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6d28d9] to-[#8b5cf6] p-0.5 shadow-md">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0d0e14] text-xs font-black tracking-wider text-white">
              PR
            </div>
          </div>

          <div className="flex-1 pr-6 rtl:pr-0 rtl:pl-6 text-right rtl:text-right ltr:text-left">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>تثبيت تطبيق PR Workforce</span>
            </h3>
            <p className="mt-0.5 text-xs text-gray-400">
              احصل على تجربة سريعة وتصفح بدون إنترنت
            </p>

            {/* iOS Instructions Drawer */}
            {showIOSGuide ? (
              <div className="mt-3 rounded-xl border border-gray-800 bg-[#0d0e14]/80 p-3 text-xs text-gray-300">
                <p className="font-semibold text-[#c4b5fd] mb-1.5 flex items-center gap-1.5">
                  <Share className="h-3.5 w-3.5 text-[#8b5cf6]" />
                  خطوات التثبيت على iOS Safari:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-400">
                  <li>
                    اضغط على زر المشاركة{" "}
                    <Share className="inline h-3 w-3 text-blue-400 mx-0.5" /> في
                    أسفل المتصفح.
                  </li>
                  <li>
                    مرر لأسفل واختر{" "}
                    <PlusSquare className="inline h-3 w-3 text-emerald-400 mx-0.5" />{" "}
                    &quot;إضافة إلى الصفحة الرئيسية&quot;.
                  </li>
                  <li>اضغط &quot;إضافة&quot; في الزاوية العلوية.</li>
                </ol>
              </div>
            ) : null}

            {/* Action buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-[#8b5cf6]/20 transition hover:brightness-110 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isIOS ? "طريقة التثبيت" : "تثبيت الآن"}</span>
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-xl border border-gray-800 bg-[#161824] px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition"
              >
                لاحقاً
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

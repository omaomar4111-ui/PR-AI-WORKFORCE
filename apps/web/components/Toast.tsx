"use client";

import React, { useState, useCallback, useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastType = "error" | "success" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastMessage = { id, type, title, message, duration };
      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    []
  );

  const showError = useCallback(
    (title: string, message?: string, duration: number = 5000) => {
      return showToast("error", title, message, duration);
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (title: string, message?: string, duration: number = 3000) => {
      return showToast("success", title, message, duration);
    },
    [showToast]
  );

  return {
    toasts,
    showToast,
    showError,
    showSuccess,
    removeToast,
  };
}

export function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const config = {
    error: {
      bg: "bg-rose-950/90 border-rose-600/60 text-rose-200",
      icon: <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />,
      accent: "text-rose-100",
    },
    success: {
      bg: "bg-emerald-950/90 border-emerald-600/60 text-emerald-200",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
      accent: "text-emerald-100",
    },
    warning: {
      bg: "bg-amber-950/90 border-amber-600/60 text-amber-200",
      icon: <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />,
      accent: "text-amber-100",
    },
    info: {
      bg: "bg-sky-950/90 border-sky-600/60 text-sky-200",
      icon: <Info className="h-5 w-5 text-sky-400 shrink-0" />,
      accent: "text-sky-100",
    },
  }[toast.type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 max-w-sm w-full ${config.bg}`}
    >
      {config.icon}
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-semibold leading-tight ${config.accent}`}>
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-xs mt-1 text-slate-300 line-clamp-3 leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors -mr-1 -mt-1"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-auto"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

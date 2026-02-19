"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error" | "warning";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = "default") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={cn(
              "rounded-lg border px-4 py-3 text-sm shadow-lg transition-all animate-in slide-in-from-right",
              {
                "border-border bg-card text-card-foreground": t.variant === "default",
                "border-success/20 bg-success/10 text-success": t.variant === "success",
                "border-destructive/20 bg-destructive/10 text-destructive": t.variant === "error",
                "border-warning/20 bg-warning/10 text-warning": t.variant === "warning",
              }
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-current opacity-50 hover:opacity-100"
                aria-label="Dismiss"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

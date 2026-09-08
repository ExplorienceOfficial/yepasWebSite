"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { useOperations } from "@/context/OperationsContext";
import { cn } from "@/lib/format";

const icons = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const iconColors = {
  success: "text-[var(--ok)]",
  error: "text-[var(--bad)]",
  info: "text-[var(--warn)]",
};

export function Toaster() {
  const { toasts, dismissToast } = useOperations();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-full max-w-sm flex-col gap-2.5">
      {toasts.map((toast) => {
        const Icon = icons[toast.tone];
        return (
          <div
            key={toast.id}
            role="status"
            className="yp-slide-right glass pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3.5 shadow-[var(--shadow-lg)] ring-1 ring-hairline"
          >
            <Icon className={cn("mt-0.5 size-[18px] shrink-0", iconColors[toast.tone])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-[13px] leading-5 text-ink-2">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Bildirimi kapat"
              className="-mr-1 flex size-6 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="yp-fade absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-md transition-all duration-300" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="yp-slide-right absolute inset-y-0 right-0 flex w-full max-w-[34rem] flex-col bg-surface shadow-[var(--shadow-lg)] ring-1 ring-hairline"
      >
        <header className="flex items-start justify-between gap-4 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="truncate text-[19px] font-semibold tracking-tight text-ink">{title}</h2>
              {badge}
            </div>
            {subtitle && <p className="mt-1 truncate text-[13px] text-ink-2">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>

        {footer && (
          <footer className="flex items-center justify-between gap-2.5 border-t border-hairline px-6 py-4">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}

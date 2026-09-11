"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/format";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
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
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto p-4 sm:p-6 text-left">
      {/* Arka plan buzlu cam blur overlay */}
      <div
        className="yp-fade fixed inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-md transition-all duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Ekran ortalama modal kartı */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "yp-scale-in relative z-10 my-auto w-full overflow-hidden rounded-[22px] bg-surface text-ink shadow-[var(--shadow-lg)] ring-1 ring-hairline",
          width,
        )}
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-1 text-[13px] text-ink-2">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="-mr-1.5 -mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="px-6 pb-5">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2.5 border-t border-hairline px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

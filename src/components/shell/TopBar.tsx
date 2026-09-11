"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Bell, CloudUpload, Loader2, Menu, Search } from "lucide-react";

import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useOperations } from "@/context/OperationsContext";
import { cn, initials } from "@/lib/format";

const routeMeta: Record<string, { crumb: string; title: string }> = {
  "/admin": { crumb: "Genel", title: "Kontrol Paneli" },
  "/admin/siparisler": { crumb: "Operasyon", title: "Siparişler" },
  "/admin/urunler": { crumb: "Operasyon", title: "Ürünler" },
  "/admin/sofor-yonetimi": { crumb: "Saha", title: "Şoför Yönetimi" },
  "/admin/musteri-yanitlari": { crumb: "Müşteri", title: "Müşteri Yanıtları" },
};

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { session } = useAuth();
  const { orderSystemOpen, syncToErp, syncing, hasUnsyncedChanges } = useOperations();
  const searchRef = useRef<HTMLInputElement>(null);

  const meta = routeMeta[pathname] ?? { crumb: "Yepaş", title: "Yönetim" };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="glass sticky top-0 z-30 border-b border-hairline">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        {/* Sol: menü + başlık */}
        <button
          type="button"
          onClick={onMenu}
          aria-label="Menü"
          className="flex size-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 lg:hidden"
        >
          <Menu className="size-5" strokeWidth={1.8} />
        </button>

        <div className="min-w-0">
          <p className="text-[11px] font-medium text-ink-3">{meta.crumb}</p>
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">{meta.title}</h1>
        </div>

        {/* Orta: Spotlight arama */}
        <div className="mx-auto hidden w-full max-w-[360px] md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Ara"
              aria-label="Ara"
              className="h-9 w-full rounded-[10px] bg-surface-2 pl-10 pr-14 text-sm text-ink placeholder:text-ink-3 transition-all focus:bg-surface focus:outline-none focus:ring-4 focus:ring-[var(--ring)]"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink-3 ring-1 ring-hairline">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Sağ: durum + aksiyonlar */}
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <span className="hidden items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-ink-2 lg:inline-flex">
            <span
              className={cn(
                "size-1.5 rounded-full",
                orderSystemOpen ? "bg-[var(--ok)]" : "bg-[var(--bad)]",
              )}
            />
            {orderSystemOpen ? "Sistem açık" : "Sistem kapalı"}
          </span>

          <button
            type="button"
            onClick={syncToErp}
            disabled={syncing}
            title="Verileri sipariş programına aktar"
            className="relative hidden h-9 items-center gap-2 rounded-full bg-accent px-3.5 text-[13px] font-medium text-white transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 sm:inline-flex"
          >
            {syncing ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload className="size-4" strokeWidth={2} />}
            {syncing ? "Aktarılıyor" : "Aktar"}
            {hasUnsyncedChanges && !syncing && (
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[var(--bad)] ring-2 ring-[var(--elevated-solid)]" />
            )}
          </button>

          <button
            type="button"
            aria-label="Bildirimler"
            className="relative flex size-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Bell className="size-[18px]" strokeWidth={1.8} />
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[var(--bad)]" />
          </button>

          <ThemeToggle />

          <div className="ml-1 hidden items-center gap-2 sm:flex">
            <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-[12px] font-semibold text-ink-2">
              {session?.role === "admin" ? initials(session.name) : "—"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

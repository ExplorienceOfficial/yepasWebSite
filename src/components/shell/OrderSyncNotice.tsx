"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, TriangleAlert } from "lucide-react";

import { invalidateSession } from "@/context/AuthContext";
import { localApiUrl } from "@/lib/api";

interface OrderSyncStatus {
  pendingCount: number;
  lastExportedAtUtc: string | null;
  generatedAtUtc: string;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

export function OrderSyncNotice() {
  const pathname = usePathname();
  const onOrdersPage = pathname.startsWith("/admin/siparisler");
  const [status, setStatus] = useState<OrderSyncStatus | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    // Siparişler ekranı aynı günün daha ayrıntılı durumunu kendi verisinden gösterir.
    if (onOrdersPage) return;
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(localApiUrl("/api/v1/admin/orders/sync-status"), {
          credentials: "include",
          cache: "no-store",
        });
        if (response.status === 401) {
          invalidateSession();
          return;
        }
        if (!response.ok) throw new Error("Aktarım durumu alınamadı.");
        const body = (await response.json()) as OrderSyncStatus;
        if (active) {
          setStatus(body);
          setUnavailable(false);
        }
      } catch {
        if (active) {
          setStatus(null);
          setUnavailable(true);
        }
      }
    };

    void load();
    window.addEventListener("focus", load);
    window.addEventListener("yepas:order-sync-changed", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
      window.removeEventListener("yepas:order-sync-changed", load);
    };
  }, [onOrdersPage]);

  if (onOrdersPage || (!unavailable && (!status || status.pendingCount === 0))) return null;

  return (
    <div className="mx-auto mt-4 max-w-[1200px] px-4 lg:px-8">
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3.5 py-2.5 text-sm ${unavailable
        ? "border-hairline bg-surface text-ink-2"
        : "border-[var(--warn)]/20 bg-[var(--warn-soft)] text-ink"}`}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <TriangleAlert className={`size-4 shrink-0 ${unavailable ? "text-ink-3" : "text-[var(--warn)]"}`} />
          <p className="min-w-0 font-medium">{unavailable
            ? "Aktarım durumu şu anda doğrulanamıyor."
            : `Bugün ve yarın teslim için ${status?.pendingCount} değişiklik aktarılmayı bekliyor.`}</p>
        </div>
        {!unavailable && status?.lastExportedAtUtc && (
          <span className="text-xs text-ink-3">Son aktarım {formatDateTime(status.lastExportedAtUtc)}</span>
        )}
        <Link href="/admin/siparisler" className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-accent hover:underline">
          Siparişler <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

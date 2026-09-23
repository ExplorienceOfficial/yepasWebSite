"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [status, setStatus] = useState<OrderSyncStatus | null>(null);

  useEffect(() => {
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
        if (!response.ok) return;
        const body = (await response.json()) as OrderSyncStatus;
        if (active) setStatus(body);
      } catch {
        // Genel uyarı, ana ekranı erişim hatasında kullanılamaz hale getirmemelidir.
      }
    };

    void load();
    const timer = window.setInterval(load, 15_000);
    window.addEventListener("focus", load);
    window.addEventListener("yepas:order-sync-changed", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
      window.removeEventListener("yepas:order-sync-changed", load);
    };
  }, []);

  if (!status || status.pendingCount === 0) return null;

  return (
    <div className="mx-auto mt-4 max-w-[1200px] px-4 lg:px-8">
      <div className="flex flex-col gap-3 rounded-[14px] bg-[var(--warn-soft)] px-4 py-3 text-[var(--warn)] ring-1 ring-[var(--warn)]/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Eski sisteme aktarılmamış {status.pendingCount} sipariş değişikliği var.</p>
            <p className="mt-0.5 text-xs opacity-80">
              {status.lastExportedAtUtc
                ? `Son başarılı aktarım: ${formatDateTime(status.lastExportedAtUtc)}`
                : "Henüz başarılı bir aktarım yapılmadı."}
            </p>
          </div>
        </div>
        <Link href="/admin/siparisler" className="inline-flex items-center gap-1.5 self-start rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-hairline sm:self-auto">
          Siparişlere git <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

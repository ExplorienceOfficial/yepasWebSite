"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, PackageOpen, RefreshCw, Search, Truck } from "lucide-react";

import { PageHeading, Panel } from "@/components/admin/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { invalidateSession } from "@/context/AuthContext";
import { localApiUrl } from "@/lib/api";
import { cn, formatQty } from "@/lib/format";

type BoardScope = "delivery" | "submitted";
type BoardStatus = "SUBMITTED" | "NO_PRODUCT" | "CANCELLED" | "PENDING";

interface OrderLine {
  uStokId: number;
  aStokId: number;
  quantity: number;
  productCode: string;
  productName: string;
  variantName: string | null;
}

interface OrderView {
  orderId: number;
  deliveryDate: string;
  status: Exclude<BoardStatus, "PENDING">;
  revision: number;
  note: string | null;
  updatedAtUtc: string;
  lines: OrderLine[];
}

interface AdminOrderRow {
  legacyMbId: number;
  legacyCustomerId: number;
  legacyDepartmentId: number;
  legacyPersonnelId: number;
  customerCode: string;
  customerName: string;
  departmentName: string;
  personnelName: string;
  boardStatus: BoardStatus;
  integrationStatus: string | null;
  sourceRole: string | null;
  order: OrderView | null;
}

interface AdminOrderBoard {
  scope: BoardScope;
  localDate: string;
  expectedDeliveryDate: string;
  generatedAtUtc: string;
  rows: AdminOrderRow[];
}

const scopes: { key: BoardScope; label: string; sub: string }[] = [
  { key: "delivery", label: "Bugün Dağıtılacak", sub: "Teslim tarihi bugün olanlar" },
  { key: "submitted", label: "Bugün Verilen", sub: "Bugün oluşturulan siparişler" },
];

const statusMeta: Record<BoardStatus, { label: string; tone: "green" | "red" | "amber" | "zinc" }> = {
  SUBMITTED: { label: "Sipariş verdi", tone: "green" },
  NO_PRODUCT: { label: "Ürün istemedi", tone: "red" },
  CANCELLED: { label: "İptal edildi", tone: "zinc" },
  PENDING: { label: "Yanıt bekleniyor", tone: "amber" },
};

const sourceLabels: Record<string, string> = {
  CUSTOMER: "Müşteri",
  ADMIN: "Yönetici",
  OPERATOR: "Operatör",
};

const integrationLabels: Record<string, string> = {
  PENDING: "Aktarım bekliyor",
  EXPORTED: "Eski sisteme aktarıldı",
  FAILED: "Aktarım başarısız",
  NOT_REQUIRED: "Aktarım gerekmiyor",
};

function formatDate(value: string): string {
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  return year && month && day ? `${day}.${month}.${year}` : value;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function apiUrl(scope: BoardScope): string {
  return localApiUrl(`/api/v1/admin/orders?scope=${scope}`);
}

export default function OrdersPage() {
  const [scope, setScope] = useState<BoardScope>("submitted");
  const [board, setBoard] = useState<AdminOrderBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl(scope), {
      signal: controller.signal,
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => {
        if (response.status === 401) {
          invalidateSession();
          throw new Error("Yönetici oturumu sona erdi.");
        }
        if (!response.ok) {
          const body = await response.json().catch(() => null) as { message?: string } | null;
          throw new Error(body?.message || "Sipariş listesine erişilemiyor.");
        }
        return (await response.json()) as AdminOrderBoard;
      })
      .then((result) => {
        if (!Array.isArray(result.rows)) throw new Error("Sipariş verisi beklenen biçimde değil.");
        setBoard(result);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setBoard(null);
        setError(cause instanceof Error ? cause.message : "Sipariş listesine erişilemiyor.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [scope, reloadKey]);

  const counts = useMemo(() => {
    const initial: Record<BoardStatus, number> = { SUBMITTED: 0, NO_PRODUCT: 0, CANCELLED: 0, PENDING: 0 };
    for (const row of board?.rows ?? []) initial[row.boardStatus] += 1;
    return initial;
  }, [board]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    if (!term) return board?.rows ?? [];
    return (board?.rows ?? []).filter((row) => [
      row.customerName,
      row.customerCode,
      row.departmentName,
      row.personnelName,
      String(row.legacyMbId),
      ...(row.order?.lines.flatMap((line) => [line.productCode, line.productName, line.variantName ?? ""]) ?? []),
    ].some((value) => value.toLocaleLowerCase("tr-TR").includes(term)));
  }, [board, search]);

  const refresh = () => {
    setLoading(true);
    setReloadKey((value) => value + 1);
  };

  const selectScope = (value: BoardScope) => {
    if (value === scope) return;
    setLoading(true);
    setScope(value);
  };

  return (
    <div className="yp-rise">
      <PageHeading
        title="Siparişler"
        description="Dağıtım planını ve mobil kanaldan gelen gerçek siparişleri inceleyin."
        action={<Button variant="secondary" onClick={refresh} disabled={loading}><RefreshCw className={cn("size-4", loading && "animate-spin")} />Yenile</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit items-center gap-1 rounded-[12px] bg-surface-2 p-1">
          {scopes.map((item) => (
            <button key={item.key} type="button" onClick={() => selectScope(item.key)}
              className={cn("flex flex-col items-start rounded-[9px] px-4 py-1.5 text-left transition-all duration-150",
                scope === item.key ? "bg-surface shadow-[var(--shadow-sm)]" : "hover:bg-surface/50")}>
              <span className={cn("text-[14px] font-medium", scope === item.key ? "text-ink" : "text-ink-2")}>{item.label}</span>
              <span className="text-[11px] text-ink-3">{item.sub}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <TextInput value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Müşteri, şube, ürün veya şoför ara" className="pl-9" />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(Object.keys(statusMeta) as BoardStatus[]).map((status) => (
          <div key={status} className="rounded-[14px] bg-surface px-4 py-3 ring-1 ring-hairline">
            <div className="flex items-center gap-2"><Badge tone={statusMeta[status].tone} dot>{statusMeta[status].label}</Badge></div>
            <p className="mt-2 text-[26px] font-semibold leading-none tabular-nums text-ink">{counts[status]}</p>
          </div>
        ))}
      </div>

      {board && !loading && (
        <p className="mb-3 text-xs text-ink-3">
          Teslim tarihi: <strong className="font-medium text-ink-2">{formatDate(board.expectedDeliveryDate)}</strong>
          <span className="mx-2">·</span>{filteredRows.length} / {board.rows.length} şube gösteriliyor
        </p>
      )}

      <Panel bodyClassName="p-0">
        {loading ? (
          <div className="px-5 py-14 text-center text-sm text-ink-3">Siparişler yükleniyor…</div>
        ) : error ? (
          <div className="px-5 py-14 text-center"><p className="font-medium text-ink">Gerçek sipariş verisi alınamadı.</p><p className="mt-1 text-sm text-ink-3">{error}</p></div>
        ) : filteredRows.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-ink-3"><PackageOpen className="mx-auto mb-2 size-7" />{search ? "Aramaya uygun sipariş veya şube bulunamadı." : "Bu gün için dağıtım kaydı bulunamadı."}</div>
        ) : (
          <div className="divide-y divide-hairline">
            {filteredRows.map((row) => {
              const meta = statusMeta[row.boardStatus];
              const totalQuantity = row.order?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
              return (
                <details key={row.legacyMbId} className="group px-5 py-4 open:bg-surface-2/40">
                  <summary className="grid cursor-pointer list-none gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2"><Building2 className="size-5" /></span>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{row.customerName}</p><p className="mt-0.5 truncate text-xs text-ink-3">{row.customerCode || "Kod yok"} · {row.departmentName} · MB ID {row.legacyMbId}</p></div>
                    </div>
                    <div><p className="text-xs text-ink-3">Dağıtım personeli</p><p className="mt-1 flex items-center gap-1.5 text-sm text-ink"><Truck className="size-3.5 text-ink-3" />{row.personnelName || `Personel ${row.legacyPersonnelId}`}</p></div>
                    <div><p className="text-xs text-ink-3">Sipariş</p><p className="mt-1 text-sm text-ink">{row.order ? `${row.order.lines.length} kalem · ${formatQty(totalQuantity)} adet` : "Henüz sipariş yok"}</p></div>
                    <div className="lg:text-right"><Badge tone={meta.tone} dot>{meta.label}</Badge><p className="mt-1 text-[11px] text-ink-3">Detay için aç</p></div>
                  </summary>

                  <div className="mt-4 border-t border-hairline pt-4 lg:ml-[52px]">
                    {!row.order ? <p className="text-sm text-ink-3">Bu şube dağıtım planında; henüz mobil sipariş veya “ürün istemiyorum” yanıtı bulunmuyor.</p> : (
                      <div className="space-y-4">
                        {row.order.lines.length > 0 ? <div className="overflow-hidden rounded-xl ring-1 ring-hairline">
                          {row.order.lines.map((line) => <div key={`${line.uStokId}-${line.aStokId}`} className="flex items-center justify-between gap-4 border-b border-hairline bg-surface px-4 py-3 last:border-b-0"><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{line.productName}{line.variantName ? ` · ${line.variantName}` : ""}</p><p className="mt-0.5 text-xs text-ink-3">{line.productCode} · Stok {line.uStokId}{line.aStokId ? `/${line.aStokId}` : ""}</p></div><strong className="shrink-0 text-sm tabular-nums text-ink">{formatQty(line.quantity)} adet</strong></div>)}
                        </div> : <p className="text-sm text-ink-3">Bu siparişte ürün satırı yok.</p>}
                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-3">
                          <span>Revizyon: <strong className="font-medium text-ink-2">{row.order.revision}</strong></span>
                          <span>Kaynak: <strong className="font-medium text-ink-2">{sourceLabels[row.sourceRole ?? ""] ?? row.sourceRole ?? "—"}</strong></span>
                          <span>Entegrasyon: <strong className="font-medium text-ink-2">{integrationLabels[row.integrationStatus ?? ""] ?? row.integrationStatus ?? "—"}</strong></span>
                          <span>Son işlem: <strong className="font-medium text-ink-2">{formatDateTime(row.order.updatedAtUtc)}</strong></span>
                        </div>
                        {row.order.note && <p className="rounded-xl bg-surface px-3 py-2 text-sm text-ink-2 ring-1 ring-hairline"><span className="font-medium text-ink">Not:</span> {row.order.note}</p>}
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </Panel>

      <p className="mt-4 text-center text-xs text-ink-3">Bu ekran şu anda salt okunurdur. Yönetici adına sipariş ekleme ve güncelleme bir sonraki adımda güvenli API üzerinden eklenecek.</p>
    </div>
  );
}

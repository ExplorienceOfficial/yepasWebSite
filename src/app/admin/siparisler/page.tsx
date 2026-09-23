"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, LockKeyhole, PackageOpen, Pencil, Plus, RefreshCw, Search, Send, Truck } from "lucide-react";

import { PageHeading, Panel } from "@/components/admin/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, NumberInput, Select, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
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
  finalization: OrderFinalization | null;
}

interface OrderFinalization {
  finalizationId: number;
  deliveryDate: string;
  state: "FINALIZING" | "FINALIZED" | "FAILED";
  orderCount: number;
  lineCount: number;
  totalQuantity: number;
  attemptCount: number;
  startedAtUtc: string;
  finalizedAtUtc: string | null;
  lastError: string | null;
}

interface AssignedProduct {
  uStokId: number;
  aStokId: number;
  code: string;
  name: string;
  variantName: string | null;
  maxQuantity: number;
}

interface AdminOrderContext {
  legacyMbId: number;
  deliveryDate: string;
  products: AssignedProduct[];
  order: OrderView | null;
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
  EXPORTED: "Eski sistemle senkronize",
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

function productKey(uStokId: number, aStokId: number): string {
  return `${uStokId}:${aStokId}`;
}

export default function OrdersPage() {
  const [scope, setScope] = useState<BoardScope>("submitted");
  const [board, setBoard] = useState<AdminOrderBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editRow, setEditRow] = useState<AdminOrderRow | null>(null);
  const [editContext, setEditContext] = useState<AdminOrderContext | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formStatus, setFormStatus] = useState<Exclude<BoardStatus, "PENDING">>("SUBMITTED");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

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

  const openEditor = async (row: AdminOrderRow) => {
    setEditRow(row);
    setEditContext(null);
    setEditLoading(true);
    setEditError(null);
    try {
      const response = await fetch(localApiUrl(`/api/v1/admin/orders/${row.legacyMbId}/context`), {
        credentials: "include",
        cache: "no-store",
      });
      if (response.status === 401) {
        invalidateSession();
        throw new Error("Yönetici oturumu sona erdi.");
      }
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message || "Sipariş düzenleme bilgisi alınamadı.");
      }
      const context = (await response.json()) as AdminOrderContext;
      const nextQuantities: Record<string, number> = {};
      for (const line of context.order?.lines ?? [])
        nextQuantities[productKey(line.uStokId, line.aStokId)] = line.quantity;
      setEditContext(context);
      setQuantities(nextQuantities);
      setFormStatus(context.order?.status ?? "SUBMITTED");
      setNote(context.order?.note ?? "");
    } catch (cause) {
      setEditError(cause instanceof Error ? cause.message : "Sipariş düzenleme bilgisi alınamadı.");
    } finally {
      setEditLoading(false);
    }
  };

  const saveOrder = async () => {
    if (!editRow || !editContext) return;
    const lines = formStatus === "SUBMITTED" ? editContext.products
      .map((product) => ({
        uStokId: product.uStokId,
        aStokId: product.aStokId,
        quantity: quantities[productKey(product.uStokId, product.aStokId)] ?? 0,
      }))
      .filter((line) => line.quantity > 0) : [];
    if (formStatus === "SUBMITTED" && lines.length === 0) {
      setEditError("Sipariş için en az bir ürün miktarı girin.");
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      const response = await fetch(localApiUrl(`/api/v1/admin/orders/${editRow.legacyMbId}`), {
        method: "PUT",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
        body: JSON.stringify({
          revision: editContext.order?.revision ?? 0,
          status: formStatus,
          note: note.trim() || null,
          lines,
        }),
      });
      if (response.status === 401) {
        invalidateSession();
        throw new Error("Yönetici oturumu sona erdi.");
      }
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message || "Sipariş kaydedilemedi.");
      }
      setEditRow(null);
      setEditContext(null);
      refresh();
    } catch (cause) {
      setEditError(cause instanceof Error ? cause.message : "Sipariş kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const finalizeOrders = async () => {
    setFinalizing(true);
    setFinalizeError(null);
    try {
      const response = await fetch(localApiUrl("/api/v1/admin/orders/finalize"), {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      if (response.status === 401) {
        invalidateSession();
        throw new Error("Yönetici oturumu sona erdi.");
      }
      const body = await response.json().catch(() => null) as (OrderFinalization & { message?: string }) | null;
      if (!response.ok) throw new Error(body?.message || "Siparişler eski sisteme gönderilemedi.");
      setFinalizeOpen(false);
      setBoard((current) => current && body ? { ...current, finalization: body } : current);
      refresh();
    } catch (cause) {
      setFinalizeError(cause instanceof Error ? cause.message : "Siparişler eski sisteme gönderilemedi.");
    } finally {
      setFinalizing(false);
    }
  };

  const submittedLineCount = formStatus === "SUBMITTED" && editContext
    ? editContext.products.filter((product) =>
      (quantities[productKey(product.uStokId, product.aStokId)] ?? 0) > 0).length
    : 0;

  const finalization = board?.finalization ?? null;
  const submittedOrderCount = counts.SUBMITTED;
  const submittedTotalQuantity = useMemo(() => (board?.rows ?? [])
    .filter((row) => row.boardStatus === "SUBMITTED")
    .reduce((sum, row) => sum + (row.order?.lines.reduce((lineSum, line) => lineSum + line.quantity, 0) ?? 0), 0), [board]);
  const boardLineCount = useMemo(() => (board?.rows ?? [])
    .filter((row) => row.boardStatus === "SUBMITTED")
    .reduce((sum, row) => sum + (row.order?.lines.length ?? 0), 0), [board]);
  const hasPendingSync = useMemo(() => (board?.rows ?? []).some((row) =>
    row.boardStatus === "SUBMITTED" && row.integrationStatus !== "EXPORTED"), [board]);
  const isSynchronized = finalization?.state === "FINALIZED" && !hasPendingSync;
  const syncButtonLabel = finalization?.state === "FAILED"
    ? "Aktarımı tekrar dene"
    : finalization && hasPendingSync
      ? "Değişiklikleri gönder"
      : finalization?.state === "FINALIZING"
        ? "Aktarımı kontrol et"
        : "Eski sisteme gönder";

  return (
    <div className="yp-rise">
      <PageHeading
        title="Siparişler"
        description="Dağıtım planını ve mobil kanaldan gelen gerçek siparişleri inceleyin."
        action={<div className="flex items-center gap-2">
          {scope === "submitted" && (!isSynchronized || hasPendingSync) && <Button variant="primary" onClick={() => { setFinalizeError(null); setFinalizeOpen(true); }} disabled={loading}>{finalization ? <RefreshCw className="size-4" /> : <Send className="size-4" />}{syncButtonLabel}</Button>}
          <Button variant="secondary" onClick={refresh} disabled={loading || finalizing}><RefreshCw className={cn("size-4", loading && "animate-spin")} />Yenile</Button>
        </div>}
      />

      {scope === "submitted" && finalization && (
        <div className={cn("mb-4 rounded-[14px] px-4 py-3 ring-1", isSynchronized ? "bg-[var(--good-soft)] text-[var(--good)] ring-[var(--good)]/20" : finalization.state === "FAILED" ? "bg-[var(--bad-soft)] text-[var(--bad)] ring-[var(--bad)]/20" : "bg-[var(--warn-soft)] text-[var(--warn)] ring-[var(--warn)]/20")}>
          <div className="flex items-start gap-3">
            {isSynchronized ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <LockKeyhole className="mt-0.5 size-5 shrink-0" />}
            <div>
              <p className="text-sm font-semibold">{isSynchronized ? "Siparişlerin son hali eski sistemle senkronize." : finalization.state === "FAILED" ? "Aktarım tamamlanamadı; güvenle tekrar deneyebilirsiniz." : hasPendingSync ? "Eski sisteme gönderilmeyi bekleyen değişiklikler var." : "Siparişler eski sisteme aktarılıyor."}</p>
              <p className="mt-1 text-xs opacity-80">{finalization.orderCount} sipariş · {finalization.lineCount} kalem · {formatQty(finalization.totalQuantity)} adet{finalization.attemptCount > 1 ? ` · ${finalization.attemptCount}. deneme` : ""}</p>
              {finalization.lastError && <p className="mt-1 text-xs">{finalization.lastError}</p>}
            </div>
          </div>
        </div>
      )}

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
                    {scope === "submitted" && finalization?.state !== "FINALIZING" && <div className="mt-4"><Button size="sm" variant="primary" onClick={() => void openEditor(row)}>{row.order ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}{row.order ? "Siparişi düzenle" : "Müşteri adına sipariş gir"}</Button></div>}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </Panel>

      {scope === "delivery" && <p className="mt-4 text-center text-xs text-ink-3">Bugün dağıtılacak siparişler kesinleşmiş operasyon listesidir. Yönetici düzenlemesi yalnızca “Bugün Verilen” ekranından yapılır.</p>}

      <Modal
        open={finalizeOpen}
        onClose={() => { if (!finalizing) setFinalizeOpen(false); }}
        title={finalization && hasPendingSync ? "Değişiklikleri eski sisteme gönder" : "Siparişleri eski sisteme gönder"}
        subtitle={`${board ? formatDate(board.expectedDeliveryDate) : ""} teslimatı`}
        footer={<><Button onClick={() => setFinalizeOpen(false)} disabled={finalizing}>Vazgeç</Button><Button variant="primary" onClick={() => void finalizeOrders()} disabled={finalizing}>{finalizing ? "Gönderiliyor…" : syncButtonLabel}</Button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-surface-2 px-3 py-3"><p className="text-xs text-ink-3">Sipariş</p><p className="mt-1 text-xl font-semibold tabular-nums text-ink">{submittedOrderCount}</p></div>
            <div className="rounded-xl bg-surface-2 px-3 py-3"><p className="text-xs text-ink-3">Kalem</p><p className="mt-1 text-xl font-semibold tabular-nums text-ink">{boardLineCount}</p></div>
            <div className="rounded-xl bg-surface-2 px-3 py-3"><p className="text-xs text-ink-3">Toplam adet</p><p className="mt-1 text-xl font-semibold tabular-nums text-ink">{formatQty(submittedTotalQuantity)}</p></div>
          </div>
          <p className="text-sm leading-6 text-ink-2">Yalnızca “Sipariş verdi” durumundaki kayıtların son hali eski sipariş programına aktarılır. Sonradan yapılan değişiklikler yeni bir fiş oluşturmaz; uygulamanın daha önce oluşturduğu aynı MOBIL fişi güncellenir.</p>
          {!finalization
            ? <p className="rounded-xl bg-[var(--warn-soft)] px-3 py-2 text-sm text-[var(--warn)]">İlk aktarım için sipariş alımının Ayarlar ekranından kapatılmış veya son sipariş saatinin geçmiş olması gerekir.</p>
            : <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2">Bu gönderim mevcut mobil fişleri günceller; yeni fiş numarası üretmez.</p>}
          {finalizeError && <p className="rounded-xl bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{finalizeError}</p>}
        </div>
      </Modal>

      <Modal
        open={Boolean(editRow)}
        onClose={() => { if (!saving) { setEditRow(null); setEditContext(null); } }}
        title={editRow?.order ? "Siparişi düzenle" : "Müşteri adına sipariş gir"}
        subtitle={editRow ? `${editRow.customerName} · ${editRow.departmentName} · MB ID ${editRow.legacyMbId}` : undefined}
        width="max-w-3xl"
        footer={<><Button onClick={() => { setEditRow(null); setEditContext(null); }} disabled={saving}>Vazgeç</Button><Button variant="primary" onClick={() => void saveOrder()} disabled={saving || editLoading || !editContext || (formStatus === "SUBMITTED" && submittedLineCount === 0)}>{saving ? "Kaydediliyor…" : "Siparişi kaydet"}</Button></>}
      >
        {editLoading ? <div className="py-12 text-center text-sm text-ink-3">Ürün tanımları yükleniyor…</div> : editContext ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sipariş durumu">
                <Select value={formStatus} onChange={(event) => setFormStatus(event.target.value as Exclude<BoardStatus, "PENDING">)}>
                  <option value="SUBMITTED">Sipariş verildi</option>
                  <option value="NO_PRODUCT">Ürün istemiyor</option>
                  {editContext.order && <option value="CANCELLED">Siparişi iptal et</option>}
                </Select>
              </Field>
              <Field label="Teslim tarihi"><TextInput value={formatDate(editContext.deliveryDate)} disabled /></Field>
            </div>

            {formStatus === "SUBMITTED" && (
              <div>
                <p className="text-[13px] font-medium text-ink-2">Müşteriye tanımlı ürünler</p>
                {editContext.products.length === 0 ? <p className="mt-2 rounded-xl bg-[var(--warn-soft)] px-3 py-3 text-sm text-[var(--warn)]">Bu şubeye eski programda mobil sipariş ürünü tanımlanmamış.</p> :
                  <div className="mt-2 max-h-[360px] divide-y divide-hairline overflow-y-auto rounded-xl ring-1 ring-hairline">
                    {editContext.products.map((product) => {
                      const key = productKey(product.uStokId, product.aStokId);
                      return <div key={key} className="grid gap-3 bg-surface px-4 py-3 sm:grid-cols-[1fr_130px] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{product.name}{product.variantName ? ` · ${product.variantName}` : ""}</p><p className="mt-0.5 text-xs text-ink-3">{product.code} · Limit {formatQty(product.maxQuantity)} adet</p></div><NumberInput min={0} max={product.maxQuantity > 0 ? product.maxQuantity : undefined} step={1} value={quantities[key] || ""} placeholder="0" onChange={(event) => setQuantities((current) => ({ ...current, [key]: Math.max(0, Number(event.target.value) || 0) }))} aria-label={`${product.name} miktarı`} /></div>;
                    })}
                  </div>}
              </div>
            )}

            <Field label="Sipariş notu" hint="En fazla 500 karakter.">
              <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} className="w-full resize-none rounded-[10px] border border-hairline bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-transparent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-[var(--ring)]" placeholder="İsteğe bağlı not" />
            </Field>
            <p className="text-xs text-ink-3">Yönetici işlemleri son sipariş saatinden bağımsızdır ve denetim kaydına yönetici işlemi olarak yazılır.</p>
            {editError && <p className="rounded-xl bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{editError}</p>}
          </div>
        ) : <div className="py-8 text-center text-sm text-[var(--bad)]">{editError || "Sipariş bilgisi alınamadı."}</div>}
      </Modal>
    </div>
  );
}

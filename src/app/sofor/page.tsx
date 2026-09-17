"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Search, X, XCircle } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { cn, formatQty, initials } from "@/lib/format";

type RouteScope = "delivery" | "submitted";
type FilterType = "all" | "green" | "red";

interface OrderLine {
  uStokId: number;
  aStokId: number;
  quantity: number;
  productCode: string;
  productName: string;
  variantName: string | null;
}

interface DriverOrder {
  orderId: number;
  legacyMbId: number;
  deliveryDate: string;
  status: "SUBMITTED" | "NO_PRODUCT" | "CANCELLED";
  revision: number;
  note: string | null;
  updatedAtUtc: string;
  lines: OrderLine[];
}

interface RouteStop {
  legacyMbId: number;
  legacyCustomerId: number;
  legacyDepartmentId: number;
  customerCode: string;
  customerName: string;
  departmentName: string;
  order: DriverOrder | null;
}

interface DriverRouteResponse {
  legacyPersonnelId: number;
  personnelCode: string;
  personnelName: string;
  scope: RouteScope;
  localDate: string;
  deliveryDate: string;
  generatedAtUtc: string;
  stops: RouteStop[];
}

const scopes: { key: RouteScope; label: string; sub: string }[] = [
  { key: "delivery", label: "Bugün Dağıtılacak", sub: "Teslim tarihi bugün olanlar" },
  { key: "submitted", label: "Bugün Verilen", sub: "Bugün oluşturulan siparişler" },
];

function apiUrl(scope: RouteScope): string {
  const path = `/api/v1/driver/routes?scope=${scope}`;
  if (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return `http://localhost:5057${path}`;
  }
  return path;
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || "Dağıtım listesi alınamadı.";
  } catch { return "Dağıtım listesi alınamadı."; }
}

function hasSubmittedOrder(stop: RouteStop): boolean {
  return stop.order?.status === "SUBMITTED" && stop.order.lines.length > 0;
}

export default function DriverRoutePage() {
  const { session } = useAuth();
  const [scope, setScope] = useState<RouteScope>("delivery");
  const [route, setRoute] = useState<DriverRouteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openItems, setOpenItems] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl(scope), { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseMessage(response));
        return response.json() as Promise<DriverRouteResponse>;
      })
      .then((data) => { setRoute(data); setError(null); setOpenItems([]); })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Dağıtım listesi alınamadı.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [scope]);

  const searchedStops = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("tr-TR");
    if (!query) return route?.stops ?? [];
    return (route?.stops ?? []).filter((stop) =>
      `${stop.customerCode} ${stop.customerName} ${stop.departmentName} ${stop.legacyMbId}`
        .toLocaleLowerCase("tr-TR").includes(query));
  }, [route, searchQuery]);

  const counts = useMemo(() => {
    const green = searchedStops.filter(hasSubmittedOrder).length;
    return { all: searchedStops.length, green, red: searchedStops.length - green };
  }, [searchedStops]);

  const filteredStops = useMemo(() => searchedStops.filter((stop) => {
    if (filter === "green") return hasSubmittedOrder(stop);
    if (filter === "red") return !hasSubmittedOrder(stop);
    return true;
  }), [searchedStops, filter]);

  const toggleOpen = (legacyMbId: number) => setOpenItems((current) =>
    current.includes(legacyMbId)
      ? current.filter((id) => id !== legacyMbId)
      : [...current, legacyMbId]);

  const changeScope = (next: RouteScope) => {
    if (next === scope) return;
    setLoading(true);
    setScope(next);
  };

  return (
    <div className="yp-rise space-y-5 pb-10">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Dağıtım Listesi</h1>
        <p className="mt-0.5 text-[13px] text-ink-2">
          {route ? `${route.personnelName} · ${route.personnelCode} · Personel ID ${route.legacyPersonnelId}`
            : session?.role === "driver" ? `${session.code} · Personel ID ${session.driverId}` : "Şoför rotası"}
        </p>
        {route && <p className="mt-1 text-[12px] text-ink-3">Teslim günü: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(route.deliveryDate))}</p>}
      </div>

      <div className="inline-flex items-center gap-1 rounded-[12px] bg-surface-2 p-1 ring-1 ring-hairline">
        {scopes.map((item) => <button key={item.key} type="button" onClick={() => changeScope(item.key)}
          className={cn("flex flex-col items-start rounded-[9px] px-4 py-1.5 text-left transition-all",
            scope === item.key ? "bg-amber-500/15 font-semibold text-orange-600 ring-1 ring-orange-500/30 dark:text-orange-400" : "text-ink-2 hover:bg-surface/60")}>
          <span className="text-[13.5px] font-medium">{item.label}</span>
          <span className="text-[11px] text-ink-3">{item.sub}</span>
        </button>)}
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Bayi, şube, kod veya MB ID ara…"
            className="h-10 w-full rounded-[12px] bg-surface pl-10 pr-9 text-sm text-ink ring-1 ring-hairline focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
          {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="Aramayı temizle"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-3 hover:bg-surface-2"><X className="size-4" /></button>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-[12px] bg-surface-2 p-1 ring-1 ring-hairline">
          {([ ["all", "Tümü", counts.all], ["green", "Sipariş veren", counts.green], ["red", "Sipariş yok", counts.red] ] as const)
            .map(([key, label, count]) => <button key={key} type="button" onClick={() => setFilter(key)}
              className={cn("rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-all",
                filter === key ? "bg-surface text-ink shadow-sm ring-1 ring-hairline" : "text-ink-2 hover:bg-surface/50")}>
              {label} <span className="ml-1 text-[11px] tabular-nums text-ink-3">{count}</span>
            </button>)}
        </div>
      </div>

      {loading && <div className="rounded-[16px] bg-surface p-8 text-center text-sm text-ink-3 ring-1 ring-hairline">Rota yükleniyor…</div>}
      {!loading && error && <div className="rounded-[16px] bg-[var(--bad-soft)] p-5 text-center text-sm text-[var(--bad)] ring-1 ring-[var(--bad)]/20">{error}</div>}

      {!loading && !error && <div className="space-y-3">
        {filteredStops.map((stop) => {
          const submitted = hasSubmittedOrder(stop);
          const totalUnits = stop.order?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
          const isOpen = openItems.includes(stop.legacyMbId);
          const noProduct = stop.order?.status === "NO_PRODUCT";
          return <div key={stop.legacyMbId}
            className={cn("overflow-hidden rounded-[16px] border-l-4 bg-surface ring-1 ring-hairline",
              submitted ? "border-l-[var(--ok)]" : "border-l-[var(--bad)]")}>
            <button type="button" onClick={() => submitted && toggleOpen(stop.legacyMbId)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-surface-2/40">
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                  submitted ? "bg-[var(--ok)]/10 text-[var(--ok)]" : "bg-[var(--bad)]/10 text-[var(--bad)]")}>{initials(stop.customerName)}</span>
                <div className="min-w-0"><h2 className="truncate text-[14.5px] font-semibold text-ink">{stop.customerName}</h2>
                  <p className="truncate text-[12px] text-ink-3">{stop.customerCode} · {stop.departmentName} · MB ID {stop.legacyMbId}</p></div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-right">
                {submitted ? <div><span className="inline-flex items-center gap-1 rounded-full bg-[var(--ok)]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[var(--ok)]"><CheckCircle2 className="size-3.5" />Sipariş Verildi</span>
                  <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink">{formatQty(totalUnits)} <span className="text-[11px] font-normal text-ink-3">adet</span></p></div>
                  : <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bad)]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[var(--bad)]"><XCircle className="size-3.5" />{noProduct ? "Ürün istemedi" : "Sipariş yok"}</span>}
                {submitted && <ChevronDown className={cn("size-4 text-ink-3 transition-transform", isOpen && "rotate-180")} />}
              </div>
            </button>
            {submitted && isOpen && stop.order && <div className="border-t border-hairline bg-surface-2/30 px-4 py-3">
              <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-ink-2">Sipariş ürünleri</p>
              <div className="space-y-1.5">{stop.order.lines.map((line) => <div key={`${line.uStokId}-${line.aStokId}`}
                className="flex items-center justify-between rounded-[8px] bg-surface px-3 py-2 text-[13px] ring-1 ring-hairline">
                <span className="font-medium text-ink">{line.productName}{line.variantName ? ` · ${line.variantName}` : ""}</span>
                <span className="font-bold tabular-nums text-ink">{formatQty(line.quantity)} <span className="text-[11px] font-normal text-ink-3">adet</span></span>
              </div>)}</div>
              {stop.order.note && <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-ink-2 ring-1 ring-hairline">Not: {stop.order.note}</p>}
            </div>}
          </div>;
        })}
        {filteredStops.length === 0 && <div className="rounded-[16px] bg-surface p-8 text-center text-ink-3 ring-1 ring-hairline">Bu filtrede gösterilecek şube bulunamadı.</div>}
      </div>}
    </div>
  );
}

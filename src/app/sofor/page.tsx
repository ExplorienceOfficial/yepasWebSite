"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Search, X, XCircle } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useOperations } from "@/context/OperationsContext";
import { cn, formatQty, initials } from "@/lib/format";
import type { OrderDay } from "@/types";

const days: { key: OrderDay; label: string; sub: string }[] = [
  { key: "delivery", label: "Bugün Dağıtılacak", sub: "Dün verilen siparişler" },
  { key: "today", label: "Bugün Verilen", sub: "Yarın dağıtılacaklar" },
];

type FilterType = "all" | "green" | "red";

export default function DriverRoutePage() {
  const { session } = useAuth();
  const { customers, orders, deliveryOrders, getProduct, drivers } = useOperations();

  const [day, setDay] = useState<OrderDay>("delivery");
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const toggleOpen = (id: string) => {
    setOpenItems((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const driverId = session?.role === "driver" ? session.driverId : "d1";
  const driverInfo = drivers.find((d) => d.id === driverId);

  const assignedCustomers = useMemo(
    () => customers.filter((c) => c.driverId === driverId).sort((a, b) => a.stopNo - b.stopNo),
    [customers, driverId],
  );

  const activeOrders = day === "delivery" ? deliveryOrders : orders;

  // Search filtering
  const searchedCustomers = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("tr-TR");
    if (!query) return assignedCustomers;
    return assignedCustomers.filter((c) => {
      const matchName = c.name.toLocaleLowerCase("tr-TR").includes(query);
      const matchDistrict = c.district.toLocaleLowerCase("tr-TR").includes(query);
      const matchType = c.type.toLocaleLowerCase("tr-TR").includes(query);
      const matchStop =
        `durak #${c.stopNo}`.toLocaleLowerCase("tr-TR").includes(query) || `${c.stopNo}` === query;
      return matchName || matchDistrict || matchType || matchStop;
    });
  }, [assignedCustomers, searchQuery]);

  // Counts for tabs based on current search scope
  const counts = useMemo(() => {
    let green = 0;
    let red = 0;

    searchedCustomers.forEach((c) => {
      const order = activeOrders.find((o) => o.customerId === c.id);
      const hasOrder = Boolean(order && order.status === "ordered" && order.lines.length > 0);
      if (hasOrder) {
        green += 1;
      } else {
        red += 1;
      }
    });

    return {
      all: searchedCustomers.length,
      green,
      red,
    };
  }, [searchedCustomers, activeOrders]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return searchedCustomers.filter((c) => {
      const order = activeOrders.find((o) => o.customerId === c.id);
      const hasOrder = Boolean(order && order.status === "ordered" && order.lines.length > 0);

      if (filter === "green") return hasOrder;
      if (filter === "red") return !hasOrder;
      return true; // "all"
    });
  }, [searchedCustomers, activeOrders, filter]);

  return (
    <div className="yp-rise space-y-5 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink">
          Dağıtım Listesi {driverInfo ? `(${driverInfo.name})` : ""}
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-2">
          {driverInfo ? `${driverInfo.plate} · ${driverInfo.region}` : "Şoför Durak Listesi"}
        </p>
      </div>

      {/* Gün Geçişi */}
      <div className="inline-flex items-center gap-1 rounded-[12px] bg-surface-2 p-1 ring-1 ring-hairline">
        {days.map((d) => {
          const isActive = day === d.key;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setDay(d.key)}
              className={cn(
                "flex flex-col items-start rounded-[9px] px-4 py-1.5 text-left transition-all duration-300 ease-in-out active:scale-95",
                isActive
                  ? "bg-amber-500/15 text-orange-600 dark:text-orange-400 font-semibold ring-1 ring-orange-500/30 shadow-sm scale-[1.01]"
                  : "hover:bg-surface/60 text-ink-2",
              )}
            >
              <span
                className={cn(
                  "text-[13.5px] font-medium transition-colors duration-300",
                  isActive ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-ink-2",
                )}
              >
                {d.label}
              </span>
              <span className="text-[11px] text-ink-3">{d.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Search Bar & Status Filters Container */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Bayi adı, ilçe veya durak no ara..."
            className="h-10 w-full rounded-[12px] bg-surface pl-10 pr-9 text-sm text-ink placeholder:text-ink-3 ring-1 ring-hairline transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Aramayı Temizle"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs (Tümü, Yeşiller, Kırmızılar) */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-[12px] bg-surface-2 p-1 ring-1 ring-hairline">
          {(
            [
              { key: "all", label: "Tümü", count: counts.all, activeBg: "bg-surface text-ink shadow-sm" },
              {
                key: "green",
                label: "Yeşiller",
                count: counts.green,
                dot: "bg-[var(--ok)]",
                activeBg: "bg-[var(--ok)]/15 text-[var(--ok)] font-semibold ring-1 ring-[var(--ok)]/30",
              },
              {
                key: "red",
                label: "Kırmızılar",
                count: counts.red,
                dot: "bg-[var(--bad)]",
                activeBg: "bg-[var(--bad)]/15 text-[var(--bad)] font-semibold ring-1 ring-[var(--bad)]/30",
              },
            ] as const
          ).map((t) => {
            const isActive = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-all duration-200 active:scale-95",
                  isActive ? t.activeBg : "text-ink-2 hover:bg-surface/50 hover:text-ink",
                )}
              >
                {"dot" in t && <span className={cn("size-2 rounded-full", t.dot)} />}
                <span>{t.label}</span>
                <span className="rounded-full bg-surface-3/80 px-1.5 py-0.2 text-[11px] font-semibold tabular-nums text-ink-3">
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tanımlı Bayi Listesi */}
      <div className="space-y-3">
        {filteredCustomers.map((customer) => {
          const order = activeOrders.find((o) => o.customerId === customer.id);
          const hasOrder = Boolean(order && order.status === "ordered" && order.lines.length > 0);
          const totalUnits = order?.lines.reduce((s, l) => s + l.qty, 0) ?? 0;
          const isOpen = openItems.includes(customer.id);

          return (
            <div
              key={customer.id}
              className={cn(
                "overflow-hidden rounded-[16px] bg-surface ring-1 ring-hairline border-l-4 transition-all duration-150",
                hasOrder ? "border-l-[var(--ok)]" : "border-l-[var(--bad)]",
              )}
            >
              {/* Başlık Satırı */}
              <button
                type="button"
                onClick={() => hasOrder && toggleOpen(customer.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                      hasOrder
                        ? "bg-[var(--ok)]/10 text-[var(--ok)]"
                        : "bg-[var(--bad)]/10 text-[var(--bad)]",
                    )}
                  >
                    {initials(customer.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[14.5px] font-semibold text-ink">{customer.name}</h2>
                      <span className="text-[11px] font-medium text-ink-3">Durak #{customer.stopNo}</span>
                    </div>
                    <p className="truncate text-[12px] text-ink-3">
                      {customer.type} · {customer.district}
                    </p>
                  </div>
                </div>

                {/* Durum & Adet */}
                <div className="flex items-center gap-3 shrink-0">
                  {hasOrder ? (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ok)]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[var(--ok)]">
                        <CheckCircle2 className="size-3.5" />
                        Sipariş Verildi
                      </span>
                      <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink">
                        {formatQty(totalUnits)} <span className="text-[11px] font-normal text-ink-3">adet</span>
                      </p>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bad)]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[var(--bad)]">
                        <XCircle className="size-3.5" />
                        Sipariş Vermedi
                      </span>
                    </div>
                  )}

                  {hasOrder && (
                    <ChevronDown
                      className={cn(
                        "size-4 text-ink-3 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  )}
                </div>
              </button>

              {/* Ürün Listesi Açılır Detay */}
              {hasOrder && isOpen && order && (
                <div className="border-t border-hairline bg-surface-2/30 px-4 py-3">
                  <p className="mb-2 text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider">
                    Teslim Edilecek Ürünler
                  </p>
                  <div className="space-y-1.5">
                    {order.lines.map((line) => {
                      const product = getProduct(line.productId);
                      if (!product) return null;
                      return (
                        <div
                          key={line.productId}
                          className="flex items-center justify-between rounded-[8px] bg-surface px-3 py-2 text-[13px] ring-1 ring-hairline"
                        >
                          <span className="font-medium text-ink">{product.name}</span>
                          <span className="font-bold tabular-nums text-ink">
                            {formatQty(line.qty)} <span className="text-[11px] font-normal text-ink-3">adet</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredCustomers.length === 0 && (
          <div className="rounded-[16px] bg-surface p-8 text-center text-ink-3 ring-1 ring-hairline space-y-1">
            <p className="font-medium text-[15px] text-ink">Sonuç Bulunamadı</p>
            <p className="text-[13px]">
              {searchQuery
                ? `"${searchQuery}" aramanıza uygun durak bulunamadı.`
                : "Seçili filtre kategorisinde durak bulunmuyor."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

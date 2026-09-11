"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, XCircle } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useOperations } from "@/context/OperationsContext";
import { cn, formatQty, initials } from "@/lib/format";
import type { OrderDay } from "@/types";

const days: { key: OrderDay; label: string; sub: string }[] = [
  { key: "delivery", label: "Bugün Dağıtılacak", sub: "Dün verilen siparişler" },
  { key: "today", label: "Bugün Verilen", sub: "Yarın dağıtılacaklar" },
];

export default function DriverRoutePage() {
  const { session } = useAuth();
  const { customers, orders, deliveryOrders, getProduct, drivers } = useOperations();

  const [day, setDay] = useState<OrderDay>("delivery");
  const [openItems, setOpenItems] = useState<string[]>([]);

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

  return (
    <div className="yp-rise space-y-5">
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
      <div className="inline-flex items-center gap-1 rounded-[12px] bg-surface-2 p-1">
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setDay(d.key)}
            className={cn(
              "flex flex-col items-start rounded-[9px] px-4 py-1.5 text-left transition-all duration-150",
              day === d.key ? "bg-surface shadow-[var(--shadow-sm)]" : "hover:bg-surface/50",
            )}
          >
            <span className={cn("text-[13.5px] font-medium", day === d.key ? "text-ink" : "text-ink-2")}>
              {d.label}
            </span>
            <span className="text-[11px] text-ink-3">{d.sub}</span>
          </button>
        ))}
      </div>

      {/* Tanımlı Bayi Listesi — Sipariş verdiyse YEŞİL, vermediyse KIRMIZI */}
      <div className="space-y-3">
        {assignedCustomers.map((customer) => {
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

        {assignedCustomers.length === 0 && (
          <div className="rounded-[16px] bg-surface p-8 text-center text-ink-3 ring-1 ring-hairline">
            Bu şoför için henüz atanmış bayi bulunmuyor.
          </div>
        )}
      </div>
    </div>
  );
}

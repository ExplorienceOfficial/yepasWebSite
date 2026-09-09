"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";

import { useOperations } from "@/context/OperationsContext";
import { cn, formatQty, initials } from "@/lib/format";
import type { DailyOrder, OrderStatus } from "@/types";

const groupMeta: { status: OrderStatus; label: string; dot: string; empty: string }[] = [
  { status: "ordered", label: "Sipariş Verildi", dot: "bg-[var(--ok)]", empty: "Sipariş veren bayi yok." },
  { status: "pending", label: "Giriş Bekleyen", dot: "bg-[var(--warn)]", empty: "Bekleyen bayi yok." },
  { status: "declined", label: "Ürün İstemedi", dot: "bg-[var(--bad)]", empty: "Pas geçen bayi yok." },
];

/**
 * Siparişleri 3 duruma göre gruplayıp Bayi · Ürün Cinsi · Adet olarak listeler.
 * Hem admin sipariş ekranı hem şoför görünümü tarafından kullanılır.
 */
export function ConsolidatedOrders({
  orders,
  customerIds,
  onSelect,
}: {
  orders: DailyOrder[];
  /** Verilirse yalnızca bu müşteriler gösterilir (şoför görünümü) */
  customerIds?: string[];
  /** Satıra tıklanınca (admin düzenleme) */
  onSelect?: (customerId: string) => void;
}) {
  const { getCustomer, getProduct } = useOperations();

  const grouped = useMemo(() => {
    const scope = orders.filter((o) => !customerIds || customerIds.includes(o.customerId));
    return groupMeta.map((meta) => ({
      ...meta,
      rows: scope
        .filter((o) => o.status === meta.status)
        .map((order) => ({ order, customer: getCustomer(order.customerId) }))
        .filter((r) => r.customer)
        .sort((a, b) => (a.customer!.name > b.customer!.name ? 1 : -1)),
    }));
  }, [orders, customerIds, getCustomer]);

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <section key={group.status}>
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className={cn("size-2 rounded-full", group.dot)} />
            <h3 className="text-[13px] font-semibold text-ink">{group.label}</h3>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[12px] font-medium tabular-nums text-ink-2">
              {group.rows.length}
            </span>
          </div>

          {group.rows.length === 0 ? (
            <p className="rounded-[14px] bg-surface px-4 py-5 text-[13px] text-ink-3 ring-1 ring-hairline">
              {group.empty}
            </p>
          ) : (
            <div className="space-y-2">
              {group.rows.map(({ order, customer }) => {
                if (!customer) return null;
                const total = order.lines.reduce((s, l) => s + l.qty, 0);
                const clickable = Boolean(onSelect);
                return (
                  <div
                    key={customer.id}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={clickable ? () => onSelect?.(customer.id) : undefined}
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSelect?.(customer.id);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "rounded-[14px] bg-surface ring-1 ring-hairline transition-shadow",
                      clickable && "cursor-pointer hover:shadow-[var(--shadow-sm)]",
                    )}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[12px] font-semibold text-ink-2">
                        {initials(customer.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-ink">{customer.name}</p>
                        <p className="truncate text-[12px] text-ink-3">
                          {customer.type} · {customer.district}
                        </p>
                      </div>
                      {order.status === "ordered" && (
                        <span className="text-right">
                          <span className="text-[15px] font-semibold tabular-nums text-ink">{formatQty(total)}</span>
                          <span className="ml-1 text-[12px] text-ink-3">adet</span>
                        </span>
                      )}
                      {clickable && <ChevronRight className="size-4 shrink-0 text-ink-3" />}
                    </div>

                    {order.status === "ordered" && order.lines.length > 0 && (
                      <div className="border-t border-hairline px-4 py-1">
                        {order.lines.map((line) => {
                          const product = getProduct(line.productId);
                          if (!product) return null;
                          return (
                            <div
                              key={line.productId}
                              className="flex items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0"
                            >
                              <span className="text-[13px] text-ink-2">{product.name}</span>
                              <span className="text-[13px] font-medium tabular-nums text-ink">
                                {formatQty(line.qty)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {order.status === "declined" && order.note && (
                      <p className="border-t border-hairline px-4 py-2.5 text-[12px] text-ink-3">{order.note}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

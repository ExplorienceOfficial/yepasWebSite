"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";

import { useOperations } from "@/context/OperationsContext";
import { cn, formatQty, initials } from "@/lib/format";
import type { DailyOrder, OrderStatus } from "@/types";

const groupMeta: {
  status: OrderStatus;
  label: string;
  dot: string;
  color: string;
  badgeBg: string;
  accentBorder: string;
  empty: string;
}[] = [
  {
    status: "ordered",
    label: "Sipariş Verildi",
    dot: "bg-[var(--ok)]",
    color: "text-[var(--ok)]",
    badgeBg: "bg-[var(--ok)]/10 text-[var(--ok)]",
    accentBorder: "border-l-[var(--ok)]",
    empty: "Sipariş veren bayi yok.",
  },
  {
    status: "declined",
    label: "Ürün İstemedi",
    dot: "bg-[var(--bad)]",
    color: "text-[var(--bad)]",
    badgeBg: "bg-[var(--bad)]/10 text-[var(--bad)]",
    accentBorder: "border-l-[var(--bad)]",
    empty: "Pas geçen bayi yok.",
  },
  {
    status: "pending",
    label: "Giriş Bekleyen",
    dot: "bg-[var(--warn)]",
    color: "text-[var(--warn)]",
    badgeBg: "bg-[var(--warn)]/10 text-[var(--warn)]",
    accentBorder: "border-l-[var(--warn)]",
    empty: "Bekleyen bayi yok.",
  },
];

/**
 * Siparişleri 3 duruma göre 3 sütun halinde gruplar. Her bayi bir açılır kart:
 * kapalıyken bayi + toplam, tıklanınca kalem kalem açılır.
 */
export function ConsolidatedOrders({
  orders,
  customerIds,
  onSelect,
}: {
  orders: DailyOrder[];
  /** Verilirse yalnızca bu müşteriler gösterilir (şoför görünümü) */
  customerIds?: string[];
  /** "Düzenle" ile sipariş düzenleme (yalnızca admin) */
  onSelect?: (customerId: string) => void;
}) {
  const { getCustomer, getProduct } = useOperations();
  const [open, setOpen] = useState<string[]>([]);
  const editable = Boolean(onSelect);

  const toggle = (id: string) =>
    setOpen((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 items-start">
      {grouped.map((group) => (
        <section key={group.status} className="flex flex-col">
          {/* Sütun başlığı */}
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full ring-2 ring-surface", group.dot)} />
              <h3 className={cn("text-[14px] font-semibold tracking-tight", group.color)}>
                {group.label}
              </h3>
            </div>
            <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-bold tabular-nums", group.badgeBg)}>
              {group.rows.length}
            </span>
          </div>

          {/* Sütun kartları */}
          {group.rows.length === 0 ? (
            <p className="rounded-[14px] bg-surface px-4 py-5 text-[13px] text-ink-3 ring-1 ring-hairline">
              {group.empty}
            </p>
          ) : (
            <div className="space-y-2.5">
              {group.rows.map(({ order, customer }) => {
                if (!customer) return null;
                const total = order.lines.reduce((s, l) => s + l.qty, 0);
                const isOpen = open.includes(customer.id);
                return (
                  <div
                    key={customer.id}
                    className={cn(
                      "overflow-hidden rounded-[14px] bg-surface ring-1 ring-hairline border-l-4 transition-all duration-150 hover:shadow-sm",
                      group.accentBorder
                    )}
                  >
                    {/* Başlık — tıkla aç/kapa */}
                    <button
                      type="button"
                      onClick={() => toggle(customer.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-2/50"
                    >
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold", group.badgeBg)}>
                        {initials(customer.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink">{customer.name}</p>
                        <p className="truncate text-[11.5px] text-ink-3">
                          {customer.type} · {customer.district}
                        </p>
                      </div>
                      {order.status === "ordered" && (
                        <span className="text-right shrink-0">
                          <span className="text-[14px] font-semibold tabular-nums text-ink">{formatQty(total)}</span>
                          <span className="ml-1 text-[11px] text-ink-3">adet</span>
                        </span>
                      )}
                      {order.status === "declined" && (
                        <span className={cn("text-[12px] font-medium shrink-0", group.color)}>İstemedi</span>
                      )}
                      {order.status === "pending" && (
                        <span className={cn("text-[12px] font-medium shrink-0", group.color)}>Bekliyor</span>
                      )}
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-ink-3 transition-transform duration-200",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>

                    {/* İçerik — kalem kalem */}
                    {isOpen && (
                      <div className="border-t border-hairline px-3.5 py-2.5 bg-surface-2/30">
                        {order.status === "ordered" && order.lines.length > 0 && (
                          <div className="space-y-1">
                            {order.lines.map((line) => {
                              const product = getProduct(line.productId);
                              if (!product) return null;
                              return (
                                <div
                                  key={line.productId}
                                  className="flex items-center justify-between gap-3 border-b border-hairline/60 py-1.5 last:border-b-0 text-[12.5px]"
                                >
                                  <span className="text-ink-2 font-normal">{product.name}</span>
                                  <span className="font-semibold tabular-nums text-ink">
                                    {formatQty(line.qty)} <span className="text-[11px] text-ink-3 font-normal">adet</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {order.status === "ordered" && order.lines.length === 0 && (
                          <p className="py-1 text-[12.5px] text-ink-3">Bu siparişte kalem yok.</p>
                        )}

                        {order.status === "pending" && (
                          <p className="py-1 text-[12.5px] text-ink-3">Bayi henüz sipariş girişi yapmadı.</p>
                        )}

                        {order.status === "declined" && (
                          <p className="py-1 text-[12.5px] text-ink-3">
                            Bayi bugün ürün istemedi.{order.note ? ` (${order.note})` : ""}
                          </p>
                        )}

                        {editable && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => onSelect?.(customer.id)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[12px] font-medium text-ink transition-colors hover:bg-surface-2 ring-1 ring-hairline shadow-2xs"
                            >
                              <Pencil className="size-3 text-ink-2" strokeWidth={1.8} />
                              Düzenle
                            </button>
                          </div>
                        )}
                      </div>
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

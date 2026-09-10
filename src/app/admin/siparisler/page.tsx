"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { AddOrderModal } from "@/components/admin/AddOrderModal";
import { OrderDrawer } from "@/components/admin/OrderDrawer";
import { PageHeading } from "@/components/admin/Panel";
import { ConsolidatedOrders } from "@/components/orders/ConsolidatedOrders";
import { Button } from "@/components/ui/Button";
import { useOperations } from "@/context/OperationsContext";
import { cn } from "@/lib/format";
import type { OrderDay } from "@/types";

const days: { key: OrderDay; label: string; sub: string }[] = [
  { key: "delivery", label: "Bugün Dağıtılacak", sub: "Dün verilen siparişler" },
  { key: "today", label: "Bugün Verilen", sub: "Yarın dağıtılacaklar" },
];

const summaryMeta = [
  { key: "ordered", label: "Sipariş Veren", dot: "bg-[var(--ok)]", color: "text-[var(--ok)]" },
  { key: "declined", label: "İstemeyen", dot: "bg-[var(--bad)]", color: "text-[var(--bad)]" },
  { key: "pending", label: "Yanıt Bekleyen", dot: "bg-[var(--warn)]", color: "text-[var(--warn)]" },
] as const;

export default function OrdersPage() {
  const { orders, deliveryOrders } = useOperations();

  const [day, setDay] = useState<OrderDay>("today");
  const [openCustomer, setOpenCustomer] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const isEditable = day === "today";
  const activeOrders = day === "delivery" ? deliveryOrders : orders;

  const counts = useMemo(
    () => ({
      ordered: activeOrders.filter((o) => o.status === "ordered").length,
      declined: activeOrders.filter((o) => o.status === "declined").length,
      pending: activeOrders.filter((o) => o.status === "pending").length,
    }),
    [activeOrders],
  );

  return (
    <div className="yp-rise">
      <PageHeading
        title="Siparişler"
        description="Günü seçin, siparişleri duruma göre gruplanmış olarak inceleyin."
        action={
          <Button
            variant="primary"
            onClick={() => {
              setDay("today");
              setAddOpen(true);
            }}
          >
            <Plus className="size-4" strokeWidth={2} />
            Sipariş Ekle
          </Button>
        }
      />

      {/* 2 günlük geçiş */}
      <div className="mb-4 inline-flex items-center gap-1 rounded-[12px] bg-surface-2 p-1">
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
            <span className={cn("text-[14px] font-medium", day === d.key ? "text-ink" : "text-ink-2")}>
              {d.label}
            </span>
            <span className="text-[11px] text-ink-3">{d.sub}</span>
          </button>
        ))}
      </div>

      {/* Durum özeti — yan yana */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {summaryMeta.map((s) => (
          <div key={s.key} className="rounded-[14px] bg-surface px-4 py-3 ring-1 ring-hairline">
            <div className="flex items-center gap-2">
              <span className={cn("size-1.5 rounded-full", s.dot)} />
              <span className="truncate text-[12px] font-medium text-ink-2">{s.label}</span>
            </div>
            <p className={cn("mt-1 text-[26px] font-semibold leading-none tabular-nums", s.color)}>
              {counts[s.key]}
            </p>
          </div>
        ))}
      </div>

      <ConsolidatedOrders
        orders={activeOrders}
        onSelect={isEditable ? (id) => setOpenCustomer(id) : undefined}
      />

      {!isEditable && (
        <p className="mt-5 text-center text-[12px] text-ink-3">
          Bu liste kesinleşmiştir ve düzenlenemez. Değişiklik için “Bugün Verilen” gününe geçin.
        </p>
      )}

      {openCustomer && <OrderDrawer customerId={openCustomer} onClose={() => setOpenCustomer(null)} />}
      {addOpen && <AddOrderModal onClose={() => setAddOpen(false)} />}
    </div>
  );
}

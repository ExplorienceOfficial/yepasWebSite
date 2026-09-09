"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { AddOrderModal } from "@/components/admin/AddOrderModal";
import { OrderDrawer } from "@/components/admin/OrderDrawer";
import { PageHeading } from "@/components/admin/Panel";
import { ConsolidatedOrders } from "@/components/orders/ConsolidatedOrders";
import { Button } from "@/components/ui/Button";
import { useOperations } from "@/context/OperationsContext";
import { DELIVERY_DATE, ORDER_DATE } from "@/data/mockData";
import { cn } from "@/lib/format";
import type { OrderDay } from "@/types";

const days: { key: OrderDay; label: string; sub: string }[] = [
  { key: "delivery", label: "Bugün Dağıtılacak", sub: "Dün verilen siparişler" },
  { key: "today", label: "Bugün Verilen", sub: "Yeni siparişler" },
];

export default function OrdersPage() {
  const { orders, deliveryOrders } = useOperations();

  const [day, setDay] = useState<OrderDay>("today");
  const [openCustomer, setOpenCustomer] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const isToday = day === "today";
  const activeOrders = isToday ? orders : deliveryOrders;
  const dateLabel = isToday ? ORDER_DATE : DELIVERY_DATE;

  return (
    <div className="yp-rise">
      <PageHeading
        title="Siparişler"
        description="Günü seçin, siparişleri duruma göre gruplanmış olarak inceleyin."
        action={
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" strokeWidth={2} />
            Sipariş Ekle
          </Button>
        }
      />

      {/* 2 günlük geçiş */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              <span className={cn("text-[14px] font-medium", day === d.key ? "text-ink" : "text-ink-2")}>
                {d.label}
              </span>
              <span className="text-[11px] text-ink-3">{d.sub}</span>
            </button>
          ))}
        </div>
        <p className="text-[13px] tabular-nums text-ink-3">{dateLabel}</p>
      </div>

      <ConsolidatedOrders
        orders={activeOrders}
        onSelect={isToday ? (id) => setOpenCustomer(id) : undefined}
      />

      {!isToday && (
        <p className="mt-5 text-center text-[12px] text-ink-3">
          Bu liste kesinleşmiştir ve düzenlenemez. Değişiklik için “Bugün Verilen” gününe geçin.
        </p>
      )}

      {openCustomer && <OrderDrawer customerId={openCustomer} onClose={() => setOpenCustomer(null)} />}
      {addOpen && <AddOrderModal onClose={() => setAddOpen(false)} />}
    </div>
  );
}

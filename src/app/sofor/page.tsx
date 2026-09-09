"use client";

import { useMemo, useState } from "react";

import { ConsolidatedOrders } from "@/components/orders/ConsolidatedOrders";
import { useAuth } from "@/context/AuthContext";
import { useOperations } from "@/context/OperationsContext";
import { DELIVERY_DATE, ORDER_DATE } from "@/data/mockData";
import { cn } from "@/lib/format";
import type { OrderDay } from "@/types";

const days: { key: OrderDay; label: string; sub: string }[] = [
  { key: "delivery", label: "Bugün Dağıtılacak", sub: "Dün verilen siparişler" },
  { key: "today", label: "Bugün Verilen", sub: "Yeni siparişler" },
];

export default function DriverRoutePage() {
  const { session } = useAuth();
  const { customers, orders, deliveryOrders } = useOperations();

  const [day, setDay] = useState<OrderDay>("delivery");

  const driverId = session?.role === "driver" ? session.driverId : "";
  const ownIds = useMemo(
    () => customers.filter((c) => c.driverId === driverId).map((c) => c.id),
    [customers, driverId],
  );

  const isToday = day === "today";
  const activeOrders = isToday ? orders : deliveryOrders;
  const dateLabel = isToday ? ORDER_DATE : DELIVERY_DATE;

  return (
    <div className="yp-rise">
      <div className="mb-5">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink">Dağıtım Listesi</h1>
        <p className="mt-1 text-[14px] text-ink-2">Bayi · ürün cinsi · adet</p>
      </div>

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

      <ConsolidatedOrders orders={activeOrders} customerIds={ownIds} />
    </div>
  );
}

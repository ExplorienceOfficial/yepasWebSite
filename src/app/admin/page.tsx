"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Calendar,
  Check,
  ChevronRight,
  Circle,
  Clock4,
  MoreHorizontal,
  Package,
  Store,
  TriangleAlert,
} from "lucide-react";

import { MetricCard } from "@/components/dash/MetricCard";
import { PerformanceCard } from "@/components/dash/PerformanceCard";
import { CustomerInspector } from "@/components/dash/CustomerInspector";
import { PageHeading, Panel } from "@/components/admin/Panel";
import { StatusBadge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useOperations } from "@/context/OperationsContext";
import { OPERATION_DATE } from "@/data/mockData";
import { periodDelta } from "@/data/trends";
import { cn, formatQty, initials } from "@/lib/format";

const statusOrder = { ordered: 0, pending: 1, declined: 2 } as const;

const activityIcon = {
  success: Check,
  danger: TriangleAlert,
  warning: TriangleAlert,
  neutral: Circle,
};

const activityColor = {
  success: "text-[var(--ok)]",
  danger: "text-[var(--bad)]",
  warning: "text-[var(--warn)]",
  neutral: "text-ink-3",
};

export default function OverviewPage() {
  const { session } = useAuth();
  const { metrics, productionTotals, categories, activity, customers, orders, orderTotals } =
    useOperations();

  const [selected, setSelected] = useState<string | null>(null);

  const firstName = session?.role === "admin" ? session.name.split(" ")[0] : "Yönetici";

  const categoryTotals = useMemo(() => {
    const rows = categories
      .map((c) => ({
        name: c.name,
        qty: productionTotals
          .filter((p) => p.product.categoryId === c.id)
          .reduce((s, p) => s + p.qty, 0),
      }))
      .filter((r) => r.qty > 0)
      .sort((a, b) => b.qty - a.qty);
    const max = rows[0]?.qty ?? 1;
    return { rows, max };
  }, [categories, productionTotals]);

  const rows = useMemo(() => {
    return customers
      .map((c) => {
        const order = orders.find((o) => o.customerId === c.id);
        const totals = order ? orderTotals(order) : { units: 0 };
        return { customer: c, order, totals };
      })
      .sort(
        (a, b) =>
          (statusOrder[a.order?.status ?? "pending"] ?? 1) -
          (statusOrder[b.order?.status ?? "pending"] ?? 1),
      )
      .slice(0, 8);
  }, [customers, orderTotals, orders]);

  return (
    <div className="yp-rise">
      <PageHeading
        title={`Günaydın, ${firstName}.`}
        description="Platformunuzda bugün olup bitenlerin özeti."
        action={
          <span className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] font-medium text-ink ring-1 ring-hairline">
            <Calendar className="size-4 text-ink-2" strokeWidth={1.8} />
            {OPERATION_DATE}
          </span>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Üretim" value={formatQty(metrics.units)} delta={periodDelta("units")} icon={Package} caption="adet · önceki döneme göre" />
        <MetricCard label="Sipariş Veren" value={`${metrics.ordered}/${metrics.total}`} delta={periodDelta("orders")} icon={Store} caption="bayi · önceki döneme göre" />
        <MetricCard label="Giriş Bekleyen" value={metrics.pending} icon={Clock4} caption="bayi giriş bekliyor" />
        <MetricCard label="Yanıt Oranı" value={`%${metrics.responseRate}`} delta={0.6} icon={Activity} />
      </div>

      {/* Analitik */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <PerformanceCard />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Kategori Üretimi" description="Bugünkü üretim emrinin dağılımı">
            <div className="space-y-4">
              {categoryTotals.rows.map((row) => (
                <div key={row.name}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-ink-2">{row.name}</span>
                    <span className="font-medium tabular-nums text-ink">{formatQty(row.qty)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(6, (row.qty / categoryTotals.max) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Son Etkinlik">
            <ol className="space-y-3.5">
              {activity.slice(0, 5).map((item) => {
                const Icon = activityIcon[item.tone];
                return (
                  <li key={item.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2">
                      <Icon className={cn("size-3.5", activityColor[item.tone])} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-5 text-ink">{item.text}</p>
                      <p className="text-[12px] tabular-nums text-ink-3">{item.at}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>
      </div>

      {/* Sipariş tablosu */}
      <Panel
        className="mt-5"
        title="Son Siparişler"
        description="Bir bayiye tıklayarak ayrıntıları görüntüleyin"
        action={
          <Link
            href="/admin/siparisler"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-accent transition-opacity hover:opacity-80"
          >
            Tümü
            <ChevronRight className="size-4" />
          </Link>
        }
        bodyClassName="px-2 pb-2"
      >
        <div className="hidden grid-cols-[1.8fr_1fr_0.8fr_0.8fr_auto] items-center gap-4 px-4 py-2 text-[12px] font-medium text-ink-3 sm:grid">
          <span>Bayi</span>
          <span>Durum</span>
          <span className="text-right">Kalem</span>
          <span className="text-right">Adet</span>
          <span className="w-8" />
        </div>

        <div className="space-y-0.5">
          {rows.map(({ customer, order, totals }) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => setSelected(customer.id)}
              className="grid w-full grid-cols-[1fr_auto] items-center gap-4 rounded-[12px] px-4 py-2.5 text-left transition-colors hover:bg-surface-2 sm:grid-cols-[1.8fr_1fr_0.8fr_0.8fr_auto]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[12px] font-semibold text-ink-2">
                  {initials(customer.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{customer.name}</p>
                  <p className="truncate text-[12px] text-ink-3">{customer.type} · {customer.district}</p>
                </div>
              </div>
              <span className="hidden sm:block">{order ? <StatusBadge status={order.status} /> : null}</span>
              <span className="hidden text-right text-[13px] tabular-nums text-ink-2 sm:block">
                {order && order.lines.length > 0 ? order.lines.length : "—"}
              </span>
              <span className="hidden text-right text-[13px] font-medium tabular-nums text-ink sm:block">
                {totals.units > 0 ? formatQty(totals.units) : "—"}
              </span>
              <span className="flex size-8 items-center justify-center justify-self-end rounded-full text-ink-3 hover:bg-surface-3">
                <MoreHorizontal className="size-4" />
              </span>
            </button>
          ))}
        </div>
      </Panel>

      <CustomerInspector customerId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

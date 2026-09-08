"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  Route,
  TriangleAlert,
  Truck,
  Users,
} from "lucide-react";

import { KpiCard } from "@/components/admin/KpiCard";
import { OrderDrawer } from "@/components/admin/OrderDrawer";
import { PageHeading } from "@/components/admin/Panel";
import { Badge } from "@/components/ui/Badge";
import { useOperations } from "@/context/OperationsContext";
import { cn, formatCurrency, formatQty } from "@/lib/format";
import { computeDriverStats } from "@/lib/stats";

const statusDot = {
  ordered: "bg-emerald-500",
  declined: "bg-rose-500",
  pending: "bg-amber-400",
};

export default function DriversPage() {
  const { drivers, customers, orders, products, getOrder, orderTotals, deliveries } =
    useOperations();
  const [openCustomer, setOpenCustomer] = useState<string | null>(null);

  const stats = useMemo(
    () => computeDriverStats(drivers, customers, orders, products),
    [customers, drivers, orders, products],
  );

  const totalCrates = stats.reduce((sum, stat) => sum + stat.crates, 0);
  const totalCapacity = stats.reduce((sum, stat) => sum + stat.driver.crateCapacity, 0);
  const overloaded = stats.filter((stat) => stat.crates > stat.driver.crateCapacity).length;

  return (
    <>
      <PageHeading
        title="Şoför & Dağıtım Takibi"
        description="Sabit bayi listeleri, rota doluluğu ve şoför bazında sipariş durumu."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Aktif Şoför" value={drivers.length} unit="araç" icon={Truck} />
        <KpiCard
          label="Toplam Durak"
          value={customers.length}
          unit="bayi"
          icon={MapPin}
          sub={`Rota başına ort. ${Math.round(customers.length / drivers.length)} durak`}
        />
        <KpiCard
          label="Yüklenecek Kasa"
          value={totalCrates}
          unit={`/ ${totalCapacity} kapasite`}
          icon={Boxes}
          tone="accent"
        />
        <KpiCard
          label="Kapasite Uyarısı"
          value={overloaded}
          unit="rota"
          icon={TriangleAlert}
          tone={overloaded > 0 ? "danger" : "success"}
          sub={overloaded > 0 ? "Araç kapasitesi aşıldı" : "Tüm rotalar kapasite içinde"}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-2">
        {stats.map((stat) => {
          const fill = Math.min(100, Math.round((stat.crates / stat.driver.crateCapacity) * 100));
          const over = stat.crates > stat.driver.crateCapacity;
          const delivered = stat.customers.filter((item) => deliveries[item.id]).length;

          return (
            <section
              key={stat.driver.id}
              className="rounded-md border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)]"
            >
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 items-center justify-center rounded bg-zinc-900 text-white">
                    <Truck className="size-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-zinc-900">{stat.driver.name}</h2>
                      <Badge tone="zinc">{stat.driver.code}</Badge>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Route className="size-3" />
                        {stat.driver.plate}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {stat.driver.region}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Phone className="size-3" />
                        {stat.driver.phone}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
                  <span className="rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                    {stat.ordered} teslimat
                  </span>
                  <span className="rounded bg-rose-50 px-2 py-1 font-semibold text-rose-700 ring-1 ring-inset ring-rose-100">
                    {stat.declined} pas
                  </span>
                  <span className="rounded bg-amber-50 px-2 py-1 font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
                    {stat.pending} bekliyor
                  </span>
                </div>
              </header>

              {/* Yük özeti */}
              <div className="grid grid-cols-3 gap-4 border-b border-zinc-100 px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Yüklenecek Adet
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-zinc-900">
                    {formatQty(stat.units)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Sevkiyat Tutarı
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-zinc-900">
                    {formatCurrency(stat.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Kasa Doluluğu
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 font-mono text-lg font-semibold tabular-nums",
                      over ? "text-rose-700" : "text-zinc-900",
                    )}
                  >
                    {stat.crates}
                    <span className="ml-1 text-xs font-normal text-zinc-500">
                      / {stat.driver.crateCapacity}
                    </span>
                  </p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-sm bg-zinc-100">
                    <div
                      className={cn("h-full rounded-sm", over ? "bg-rose-500" : "bg-amber-600")}
                      style={{ width: `${Math.max(3, fill)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bayi listesi */}
              <div className="divide-y divide-zinc-100">
                {stat.customers.map((customer) => {
                  const order = getOrder(customer.id);
                  if (!order) return null;
                  const totals = orderTotals(order);
                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => setOpenCustomer(customer.id)}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-amber-50/40"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded bg-zinc-100 font-mono text-[10px] font-semibold tabular-nums text-zinc-500">
                        {customer.stopNo}
                      </span>
                      <span
                        className={cn("size-2 shrink-0 rounded-full", statusDot[order.status])}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-zinc-800">{customer.name}</p>
                        <p className="truncate font-mono text-[11px] text-zinc-500">
                          {customer.code} · {customer.district}
                        </p>
                      </div>
                      {order.status === "declined" ? (
                        <span className="text-[11px] font-medium text-rose-600">İstemedi</span>
                      ) : order.status === "pending" ? (
                        <span className="text-[11px] font-medium text-amber-600">Beklemede</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-zinc-700">
                          <Package className="size-3 text-zinc-400" />
                          {formatQty(totals.units)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-100 bg-zinc-50/60 px-4 py-2 text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3" />
                  {stat.customers.length} sabit bayi
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <PackageCheck className="size-3" />
                  Teslim edilen:{" "}
                  <b
                    className={cn(
                      "font-mono font-semibold tabular-nums",
                      delivered === stat.ordered && stat.ordered > 0
                        ? "text-emerald-700"
                        : "text-zinc-700",
                    )}
                  >
                    {delivered}/{stat.ordered}
                  </b>
                </span>
                <span className="ml-auto" />
                {over && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-rose-600">
                    <TriangleAlert className="size-3" />
                    Kapasite aşımı — ikinci sefer planlayın
                  </span>
                )}
              </footer>
            </section>
          );
        })}
      </div>

      {openCustomer && (
        <OrderDrawer customerId={openCustomer} onClose={() => setOpenCustomer(null)} />
      )}
    </>
  );
}

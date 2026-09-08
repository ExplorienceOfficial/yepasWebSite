"use client";

import { useMemo, useState } from "react";
import {
  CircleSlash,
  Clock4,
  Factory,
  PackageCheck,
  PencilLine,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";

import { KpiCard } from "@/components/admin/KpiCard";
import { OrderDrawer } from "@/components/admin/OrderDrawer";
import { PageHeading, Panel } from "@/components/admin/Panel";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Field";
import { useOperations } from "@/context/OperationsContext";
import { cn, formatCurrency, formatQty } from "@/lib/format";
import type { OrderStatus } from "@/types";

type StatusFilter = "all" | OrderStatus;

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "ordered", label: "Sipariş Verildi" },
  { value: "declined", label: "İstemedi" },
  { value: "pending", label: "Beklemede" },
];

export default function OrdersPage() {
  const { customers, drivers, orders, metrics, getProduct, orderTotals, setOrderStatus } =
    useOperations();

  const [search, setSearch] = useState("");
  const [driverFilter, setDriverFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [openCustomer, setOpenCustomer] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");

    return customers
      .map((customer) => {
        const order = orders.find((item) => item.customerId === customer.id)!;
        const driver = drivers.find((item) => item.id === customer.driverId)!;
        return { customer, order, driver, totals: orderTotals(order) };
      })
      .filter(({ customer, order, driver }) => {
        if (statusFilter !== "all" && order.status !== statusFilter) return false;
        if (driverFilter !== "all" && customer.driverId !== driverFilter) return false;
        if (!term) return true;
        return (
          customer.name.toLocaleLowerCase("tr-TR").includes(term) ||
          customer.code.toLocaleLowerCase("tr-TR").includes(term) ||
          customer.district.toLocaleLowerCase("tr-TR").includes(term) ||
          driver.name.toLocaleLowerCase("tr-TR").includes(term)
        );
      })
      .sort((a, b) => {
        if (a.driver.code !== b.driver.code) return a.driver.code.localeCompare(b.driver.code);
        return a.customer.stopNo - b.customer.stopNo;
      });
  }, [customers, drivers, driverFilter, orderTotals, orders, search, statusFilter]);

  const filtersActive = search !== "" || driverFilter !== "all" || statusFilter !== "all";
  const resetFilters = () => {
    setSearch("");
    setDriverFilter("all");
    setStatusFilter("all");
  };

  const statusCount = (value: StatusFilter) =>
    value === "all"
      ? orders.length
      : orders.filter((order) => order.status === value).length;

  return (
    <>
      <PageHeading
        title="Günlük Sipariş Operasyonu"
        description="Müşteri girişlerini inceleyin, gerekiyorsa adetleri düzenleyip üretime hazır hâle getirin."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Sipariş Veren"
          value={metrics.ordered}
          unit="müşteri"
          icon={PackageCheck}
          tone="success"
        />
        <KpiCard
          label="Ürün İstemeyen"
          value={metrics.declined}
          unit="müşteri"
          icon={CircleSlash}
          tone="danger"
        />
        <KpiCard
          label="Giriş Bekleyen"
          value={metrics.pending}
          unit="müşteri"
          icon={Clock4}
          tone="warning"
        />
        <KpiCard
          label="Toplam Kalem"
          value={formatQty(metrics.units)}
          unit="adet"
          icon={Factory}
          tone="accent"
          sub={formatCurrency(metrics.amount)}
        />
      </div>

      <Panel
        className="mt-4"
        bodyClassName="p-0"
        title="Müşteri Sipariş Listesi"
        description={`${rows.length} kayıt görüntüleniyor`}
        action={
          filtersActive && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="size-3.5" />
              Filtreleri sıfırla
            </Button>
          )
        }
      >
        {/* Filtre şeridi */}
        <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
            <TextInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Müşteri, kod, bölge veya şoför ara"
              className="pl-8"
            />
          </div>

          <Select
            value={driverFilter}
            onChange={(event) => setDriverFilter(event.target.value)}
            aria-label="Şoföre göre filtrele"
            className="lg:w-56"
          >
            <option value="all">Tüm şoförler</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.code} · {driver.name}
              </option>
            ))}
          </Select>

          <div className="flex flex-wrap items-center gap-1 lg:ml-auto">
            {statusTabs.map((tab) => {
              const active = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-zinc-800 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100",
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "font-mono tabular-nums",
                      active ? "text-zinc-300" : "text-zinc-400",
                    )}
                  >
                    {statusCount(tab.value)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tablo */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[62rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-white text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2 text-left font-semibold">Müşteri / Bayi</th>
                <th className="px-3 py-2 text-left font-semibold">Şoför</th>
                <th className="px-3 py-2 text-left font-semibold">Durum</th>
                <th className="px-3 py-2 text-left font-semibold">Sipariş İçeriği</th>
                <th className="px-3 py-2 text-right font-semibold">Adet</th>
                <th className="px-3 py-2 text-right font-semibold">Tutar</th>
                <th className="px-3 py-2 text-right font-semibold">Saat</th>
                <th className="px-4 py-2 text-right font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ customer, order, driver, totals }) => (
                <tr
                  key={customer.id}
                  className="group border-b border-zinc-100 transition-colors last:border-0 hover:bg-amber-50/40"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded bg-zinc-100 font-mono text-[11px] font-semibold tabular-nums text-zinc-500">
                        {customer.stopNo}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900">{customer.name}</p>
                        <p className="font-mono text-[11px] text-zinc-500">
                          {customer.code} · {customer.type} · {customer.district}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-2.5">
                    <p className="text-xs font-medium text-zinc-700">{driver.name}</p>
                    <p className="font-mono text-[11px] text-zinc-500">{driver.code}</p>
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={order.status} />
                      {order.editedByAdmin && (
                        <span className="font-mono text-[10px] uppercase tracking-wide text-amber-700">
                          admin düzenledi
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="max-w-[22rem] px-3 py-2.5">
                    {order.status === "declined" ? (
                      <span className="text-xs italic text-zinc-400">
                        {order.note ?? "Bu gün için ürün talep edilmedi"}
                      </span>
                    ) : order.lines.length === 0 ? (
                      <span className="text-xs italic text-zinc-400">Giriş bekleniyor</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {order.lines.slice(0, 3).map((line) => {
                          const product = getProduct(line.productId);
                          if (!product) return null;
                          return (
                            <span
                              key={line.productId}
                              className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] text-zinc-700"
                            >
                              <b className="font-mono font-semibold tabular-nums text-zinc-900">
                                {formatQty(line.qty)}×
                              </b>
                              {product.name}
                            </span>
                          );
                        })}
                        {order.lines.length > 3 && (
                          <Badge tone="zinc">+{order.lines.length - 3} kalem</Badge>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold tabular-nums text-zinc-900">
                    {totals.units > 0 ? formatQty(totals.units) : "—"}
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-600">
                    {totals.amount > 0 ? formatCurrency(totals.amount) : "—"}
                  </td>

                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-500">
                    {order.updatedAt ?? "—"}
                  </td>

                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {order.status !== "declined" && (
                        <button
                          type="button"
                          onClick={() => setOrderStatus(customer.id, "declined")}
                          title="Bu müşteriyi bugün için pas geç"
                          className="rounded-md border border-transparent p-1.5 text-zinc-400 opacity-0 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <CircleSlash className="size-3.5" />
                        </button>
                      )}
                      <Button size="sm" onClick={() => setOpenCustomer(customer.id)}>
                        <PencilLine className="size-3.5" />
                        Düzenle
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <UserRound className="mx-auto size-6 text-zinc-300" />
                    <p className="mt-2 text-sm font-medium text-zinc-600">
                      Filtrelere uyan müşteri bulunamadı
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Arama terimini veya şoför/durum filtresini değiştirin.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {openCustomer && (
        <OrderDrawer customerId={openCustomer} onClose={() => setOpenCustomer(null)} />
      )}
    </>
  );
}

"use client";

import { useMemo } from "react";
import {
  Boxes,
  Check,
  CircleSlash,
  Clock4,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  RotateCcw,
  StickyNote,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useOperations } from "@/context/OperationsContext";
import { cn, formatQty } from "@/lib/format";
import { UNITS_PER_CRATE } from "@/lib/stats";

export default function DriverRoutePage() {
  const { session } = useAuth();
  const { customers, orders, products, getDriver, orderTotals, deliveries, toggleDelivery } =
    useOperations();

  const driverId = session?.role === "driver" ? session.driverId : "";
  const driver = getDriver(driverId);

  const stops = useMemo(
    () =>
      customers
        .filter((customer) => customer.driverId === driverId)
        .sort((a, b) => a.stopNo - b.stopNo)
        .map((customer) => {
          const order = orders.find((item) => item.customerId === customer.id);
          return { customer, order, totals: order ? orderTotals(order) : { units: 0, amount: 0 } };
        })
        .filter((row) => row.order !== undefined),
    [customers, driverId, orderTotals, orders],
  );

  const loadList = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const { order } of stops) {
      if (order?.status !== "ordered") continue;
      for (const line of order.lines) {
        if (line.qty <= 0) continue;
        bucket.set(line.productId, (bucket.get(line.productId) ?? 0) + line.qty);
      }
    }
    return products
      .filter((product) => bucket.has(product.id))
      .map((product) => ({ product, qty: bucket.get(product.id) ?? 0 }))
      .sort((a, b) => b.qty - a.qty);
  }, [products, stops]);

  const deliverableStops = stops.filter(({ order }) => order?.status === "ordered");
  const declinedCount = stops.filter(({ order }) => order?.status === "declined").length;
  const pendingCount = stops.filter(({ order }) => order?.status === "pending").length;
  const totalUnits = loadList.reduce((sum, row) => sum + row.qty, 0);
  const doneCount = deliverableStops.filter(({ customer }) => deliveries[customer.id]).length;
  const progress =
    deliverableStops.length === 0 ? 0 : Math.round((doneCount / deliverableStops.length) * 100);

  return (
    <>
      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Rotam</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {driver?.region} bölgesi · {stops.length} sabit bayi · durak sırasına göre listelenir.
        </p>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          label="Teslimat"
          value={deliverableStops.length}
          unit="durak"
          icon={PackageCheck}
          tone="success"
        />
        <Tile label="Pas Geçilen" value={declinedCount} unit="bayi" icon={CircleSlash} tone="danger" />
        <Tile label="Bekleyen" value={pendingCount} unit="bayi" icon={Clock4} tone="warning" />
        <Tile
          label="Yüklenecek"
          value={formatQty(totalUnits)}
          unit={`adet · ${Math.ceil(totalUnits / UNITS_PER_CRATE)} kasa`}
          icon={Boxes}
          tone="accent"
        />
      </div>

      {/* İlerleme */}
      <section className="mt-4 rounded-md border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Teslimat İlerlemesi
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">
              {doneCount}
              <span className="text-base font-normal text-zinc-400">
                {" "}
                / {deliverableStops.length} durak
              </span>
            </p>
          </div>
          <span
            className={cn(
              "font-mono text-sm font-semibold tabular-nums",
              progress === 100 ? "text-emerald-700" : "text-amber-700",
            )}
          >
            %{progress}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-zinc-100">
          <div
            className={cn(
              "h-full rounded-sm transition-all",
              progress === 100 ? "bg-emerald-500" : "bg-amber-600",
            )}
            style={{ width: `${Math.max(2, progress)}%` }}
          />
        </div>
      </section>

      {/* Yükleme listesi */}
      <section className="mt-4 rounded-md border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
        <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-2.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Araç Yükleme Listesi
          </h2>
          <span className="font-mono text-[11px] tabular-nums text-zinc-500">
            {loadList.length} kalem
          </span>
        </header>

        {loadList.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            Bu rota için yüklenecek ürün bulunmuyor.
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {loadList.map(({ product, qty }) => (
                <tr key={product.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2">
                    <p className="font-medium text-zinc-900">{product.name}</p>
                    <p className="font-mono text-[11px] text-zinc-500">
                      {product.code} · {product.gram} gr
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-zinc-500">
                    {Math.ceil(qty / UNITS_PER_CRATE)} kasa
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-base font-semibold tabular-nums text-zinc-900">
                    {formatQty(qty)}
                  </td>
                </tr>
              ))}
              <tr className="bg-zinc-50">
                <td className="px-4 py-2.5 font-semibold text-zinc-700" colSpan={2}>
                  Toplam
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-base font-bold tabular-nums text-zinc-900">
                  {formatQty(totalUnits)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      {/* Duraklar */}
      <h2 className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        Durak Listesi
      </h2>

      <div className="space-y-2.5">
        {stops.map(({ customer, order, totals }) => {
          if (!order) return null;
          const deliveredAt = deliveries[customer.id];
          const isDelivered = Boolean(deliveredAt);
          const canDeliver = order.status === "ordered";

          return (
            <article
              key={customer.id}
              className={cn(
                "overflow-hidden rounded-md border bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)] transition-colors",
                isDelivered
                  ? "border-emerald-200 bg-emerald-50/30"
                  : order.status === "declined"
                    ? "border-zinc-200"
                    : "border-zinc-200",
              )}
            >
              <div className="flex items-start gap-3 px-4 py-3">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded font-mono text-xs font-semibold tabular-nums",
                    isDelivered
                      ? "bg-emerald-600 text-white"
                      : order.status === "declined"
                        ? "bg-rose-50 text-rose-500"
                        : "bg-zinc-100 text-zinc-500",
                  )}
                >
                  {isDelivered ? <Check className="size-4" /> : customer.stopNo}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={cn(
                        "text-sm font-semibold",
                        isDelivered ? "text-emerald-900" : "text-zinc-900",
                      )}
                    >
                      {customer.name}
                    </h3>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
                    {customer.code} · {customer.type} · {customer.district}
                  </p>
                </div>

                {canDeliver && (
                  <div className="hidden shrink-0 text-right leading-tight sm:block">
                    <p className="font-mono text-lg font-semibold tabular-nums text-zinc-900">
                      {formatQty(totals.units)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">adet</p>
                  </div>
                )}
              </div>

              {/* Kalemler */}
              {canDeliver && order.lines.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t border-zinc-100 px-4 py-2.5">
                  {order.lines.map((line) => {
                    const product = products.find((item) => item.id === line.productId);
                    if (!product) return null;
                    return (
                      <span
                        key={line.productId}
                        className="inline-flex items-center gap-1.5 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
                      >
                        <b className="font-mono font-semibold tabular-nums text-zinc-900">
                          {formatQty(line.qty)}×
                        </b>
                        {product.name}
                      </span>
                    );
                  })}
                </div>
              )}

              {order.status === "declined" && (
                <p className="border-t border-zinc-100 bg-rose-50/40 px-4 py-2.5 text-xs text-rose-800">
                  Bu bayi bugün ürün istemedi — durağı atlayın.
                  {order.note && <span className="text-rose-600"> ({order.note})</span>}
                </p>
              )}

              {order.status === "pending" && (
                <p className="border-t border-zinc-100 bg-amber-50/40 px-4 py-2.5 text-xs text-amber-800">
                  Bayi henüz sipariş girişi yapmadı. Yola çıkmadan önce listeyi tekrar kontrol
                  edin.
                </p>
              )}

              {order.note && order.status === "ordered" && (
                <p className="flex items-start gap-2 border-t border-zinc-100 bg-sky-50/50 px-4 py-2.5 text-xs leading-5 text-sky-900">
                  <StickyNote className="mt-0.5 size-3.5 shrink-0 text-sky-600" />
                  {order.note}
                </p>
              )}

              {/* Aksiyonlar */}
              <div className="flex items-center gap-2 border-t border-zinc-100 bg-zinc-50/60 px-4 py-2.5">
                <a
                  href={`tel:${customer.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                >
                  <Phone className="size-3.5" />
                  {customer.contact}
                </a>

                <span className="hidden items-center gap-1.5 text-[11px] text-zinc-500 sm:inline-flex">
                  <MapPin className="size-3" />
                  {customer.stopNo}. durak
                </span>

                {canDeliver && (
                  <div className="ml-auto flex items-center gap-2">
                    {isDelivered && (
                      <span className="font-mono text-[11px] tabular-nums text-emerald-700">
                        {deliveredAt} teslim
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleDelivery(customer.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                        isDelivered
                          ? "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
                          : "border-emerald-700/60 bg-emerald-600 text-white hover:bg-emerald-700",
                      )}
                    >
                      {isDelivered ? (
                        <>
                          <RotateCcw className="size-3.5" />
                          Geri al
                        </>
                      ) : (
                        <>
                          <Package className="size-3.5" />
                          Teslim edildi
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

const tileTones = {
  success: "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100",
  danger: "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-100",
  warning: "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100",
  accent: "bg-amber-600 text-white",
};

function Tile({
  label,
  value,
  unit,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof tileTones;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 shadow-[0_1px_2px_rgba(24,24,27,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </span>
        <span className={cn("flex size-6 items-center justify-center rounded", tileTones[tone])}>
          <Icon className="size-3" />
        </span>
      </div>
      <p className="mt-2 font-mono text-xl font-semibold tabular-nums tracking-tight text-zinc-900">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-500">{unit}</p>
    </div>
  );
}

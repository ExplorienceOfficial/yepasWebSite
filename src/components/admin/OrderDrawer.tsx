"use client";

import { useState } from "react";
import { CircleSlash, Info, PackageCheck, Plus, Trash2, TriangleAlert } from "lucide-react";

import { ProductThumb } from "@/components/admin/ProductThumb";
import { QtyStepper } from "@/components/admin/QtyStepper";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Select } from "@/components/ui/Field";
import { useOperations } from "@/context/OperationsContext";
import { cn, formatCurrency, formatQty } from "@/lib/format";
import type { OrderStatus } from "@/types";

const statusOptions: { value: OrderStatus; label: string; active: string }[] = [
  { value: "ordered", label: "Sipariş Verildi", active: "bg-emerald-600 text-white border-emerald-600" },
  { value: "declined", label: "Ürün İstemedi", active: "bg-rose-600 text-white border-rose-600" },
  { value: "pending", label: "Beklemede", active: "bg-amber-500 text-white border-amber-500" },
];

export function OrderDrawer({
  customerId,
  onClose,
}: {
  customerId: string | null;
  onClose: () => void;
}) {
  const {
    getCustomer,
    getOrder,
    getDriver,
    getProduct,
    products,
    setLineQty,
    addLine,
    removeLine,
    setOrderStatus,
    orderTotals,
  } = useOperations();

  const [productToAdd, setProductToAdd] = useState("");

  const customer = customerId ? getCustomer(customerId) : undefined;
  const order = customerId ? getOrder(customerId) : undefined;

  if (!customer || !order) return null;

  const driver = getDriver(customer.driverId);
  const totals = orderTotals(order);
  const available = products.filter(
    (product) => product.active && !order.lines.some((line) => line.productId === product.id),
  );

  const handleAdd = () => {
    if (!productToAdd) return;
    addLine(customer.id, productToAdd);
    setProductToAdd("");
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={customer.name}
      badge={<StatusBadge status={order.status} />}
      subtitle={`${customer.code} · ${customer.type} · ${customer.district} · ${driver?.name ?? "-"} (${driver?.plate ?? "-"})`}
      footer={
        <>
          <div className="flex items-baseline gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Toplam
              </p>
              <p className="font-mono text-sm font-semibold tabular-nums text-zinc-900">
                {formatQty(totals.units)} adet
              </p>
            </div>
            <span className="font-mono text-sm tabular-nums text-zinc-500">
              {formatCurrency(totals.amount)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-zinc-500 sm:block">
              Değişiklikler anında uygulanır
            </span>
            <Button variant="primary" onClick={onClose}>
              Tamam
            </Button>
          </div>
        </>
      }
    >
      {/* Durum seçimi */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Sipariş Durumu
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {statusOptions.map((option) => {
            const active = order.status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setOrderStatus(customer.id, option.value)}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? option.active
                    : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Müşteri notu */}
      {order.note && (
        <div className="mt-3 flex gap-2 rounded-md border border-sky-200 bg-sky-50/70 px-3 py-2">
          <Info className="mt-0.5 size-3.5 shrink-0 text-sky-600" />
          <p className="text-xs leading-5 text-sky-900">{order.note}</p>
        </div>
      )}

      {order.editedByAdmin && (
        <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
          <p className="text-xs leading-5 text-amber-900">
            Bu sipariş admin tarafından düzenlendi. Aktarım sırasında müşteri girişinin üzerine
            yazılacak.
          </p>
        </div>
      )}

      {/* Kalemler */}
      {order.status === "declined" ? (
        <div className="mt-4 rounded-md border border-dashed border-rose-200 bg-rose-50/40 px-4 py-8 text-center">
          <CircleSlash className="mx-auto size-6 text-rose-400" />
          <p className="mt-2 text-sm font-medium text-rose-800">Müşteri bu gün ürün istemedi</p>
          <p className="mt-0.5 text-xs text-rose-600">
            Rota planında bu durak atlanacak, üretim emrine dahil edilmeyecek.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setOrderStatus(customer.id, "ordered")}
          >
            <PackageCheck className="size-3.5" />
            Siparişe geri al
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Sipariş Kalemleri
            </p>
            <span className="font-mono text-[11px] tabular-nums text-zinc-500">
              {order.lines.length} kalem
            </span>
          </div>

          <div className="mt-2 divide-y divide-zinc-100 rounded-md border border-zinc-200">
            {order.lines.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-zinc-500">
                Henüz kalem eklenmemiş. Aşağıdan ürün ekleyerek sipariş oluşturabilirsiniz.
              </p>
            )}

            {order.lines.map((line) => {
              const product = getProduct(line.productId);
              if (!product) return null;
              const atLimit = line.qty >= product.maxOrderLimit;
              return (
                <div key={line.productId} className="flex items-center gap-3 px-3 py-2.5">
                  <ProductThumb src={product.imageUrl} name={product.name} className="size-9" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{product.name}</p>
                    <p className="font-mono text-[11px] text-zinc-500">
                      {product.code} · {formatCurrency(product.unitPrice)} · limit{" "}
                      {formatQty(product.maxOrderLimit)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <QtyStepper
                      value={line.qty}
                      max={product.maxOrderLimit}
                      onChange={(next) => setLineQty(customer.id, product.id, next)}
                    />
                    <span className="w-20 text-right font-mono text-xs tabular-nums text-zinc-600">
                      {formatCurrency(line.qty * product.unitPrice)}
                    </span>
                    <button
                      type="button"
                      aria-label={`${product.name} kalemini kaldır`}
                      onClick={() => removeLine(customer.id, product.id)}
                      className="rounded p-1 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  {atLimit && (
                    <Badge tone="amber" className="ml-1">
                      limit
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ürün ekle */}
          <div className="mt-3 flex items-center gap-2">
            <Select
              value={productToAdd}
              onChange={(event) => setProductToAdd(event.target.value)}
              aria-label="Eklenecek ürün"
              className="flex-1"
            >
              <option value="">Kataloğdan ürün ekle...</option>
              {available.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.code} (öneri {product.avgOrder})
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={handleAdd} disabled={!productToAdd}>
              <Plus className="size-4" />
              Ekle
            </Button>
          </div>
        </div>
      )}

      {/* Müşteri künyesi */}
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-md border border-zinc-200 bg-zinc-50/60 px-3 py-3 text-xs">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Yetkili
          </dt>
          <dd className="mt-0.5 text-zinc-800">{customer.contact}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Telefon
          </dt>
          <dd className="mt-0.5 font-mono tabular-nums text-zinc-800">{customer.phone}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Rota / Durak
          </dt>
          <dd className="mt-0.5 text-zinc-800">
            {driver?.region} · {customer.stopNo}. durak
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Son Giriş
          </dt>
          <dd className="mt-0.5 font-mono tabular-nums text-zinc-800">
            {order.updatedAt ?? "Giriş yapılmadı"}
          </dd>
        </div>
      </dl>
    </Drawer>
  );
}

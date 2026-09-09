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
import { cn, formatQty } from "@/lib/format";
import type { OrderStatus } from "@/types";

const statusOptions: { value: OrderStatus; label: string; active: string }[] = [
  { value: "ordered", label: "Sipariş Verildi", active: "bg-[var(--ok)] text-white" },
  { value: "declined", label: "İstemedi", active: "bg-[var(--bad)] text-white" },
  { value: "pending", label: "Beklemede", active: "bg-[var(--warn)] text-white" },
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
    getProduct,
    getMaxQty,
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

  const totals = orderTotals(order);
  const available = products.filter(
    (product) => !order.lines.some((line) => line.productId === product.id),
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
      subtitle={`${customer.code} · ${customer.type} · ${customer.district}`}
      footer={
        <>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">Toplam</p>
            <p className="text-[15px] font-semibold tabular-nums text-ink">
              {formatQty(totals.units)} adet
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[12px] text-ink-3 sm:block">Değişiklikler anında uygulanır</span>
            <Button variant="primary" onClick={onClose}>
              Tamam
            </Button>
          </div>
        </>
      }
    >
      {/* Durum seçimi */}
      <div>
        <p className="text-[13px] font-medium text-ink-2">Sipariş Durumu</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-[12px] bg-surface-2 p-1">
          {statusOptions.map((option) => {
            const active = order.status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setOrderStatus(customer.id, option.value)}
                className={cn(
                  "rounded-[9px] px-2 py-1.5 text-[13px] font-medium transition-colors",
                  active ? option.active : "text-ink-2 hover:text-ink",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {order.note && (
        <div className="mt-3 flex gap-2 rounded-[12px] bg-accent-soft px-3 py-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.8} />
          <p className="text-[13px] leading-5 text-ink">{order.note}</p>
        </div>
      )}

      {order.editedByAdmin && (
        <div className="mt-3 flex gap-2 rounded-[12px] bg-[var(--warn-soft)] px-3 py-2.5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--warn)]" strokeWidth={1.8} />
          <p className="text-[13px] leading-5 text-ink">
            Bu sipariş admin tarafından düzenlendi. Aktarım sırasında müşteri girişinin üzerine yazılacak.
          </p>
        </div>
      )}

      {order.status === "declined" ? (
        <div className="mt-4 rounded-[14px] bg-[var(--bad-soft)] px-4 py-8 text-center">
          <CircleSlash className="mx-auto size-6 text-[var(--bad)]" strokeWidth={1.6} />
          <p className="mt-2 text-[15px] font-medium text-ink">Müşteri bu gün ürün istemedi</p>
          <p className="mt-0.5 text-[13px] text-ink-2">Üretim emrine dahil edilmeyecek.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setOrderStatus(customer.id, "ordered")}>
            <PackageCheck className="size-3.5" />
            Siparişe geri al
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-ink-2">Sipariş Kalemleri</p>
            <span className="text-[12px] tabular-nums text-ink-3">{order.lines.length} kalem</span>
          </div>

          <div className="mt-2 divide-y divide-hairline rounded-[14px] bg-surface-2">
            {order.lines.length === 0 && (
              <p className="px-3 py-6 text-center text-[13px] text-ink-2">
                Henüz kalem yok. Aşağıdan ürün ekleyin.
              </p>
            )}

            {order.lines.map((line) => {
              const product = getProduct(line.productId);
              if (!product) return null;
              const max = getMaxQty(product.id);
              const atLimit = line.qty >= max;
              return (
                <div key={line.productId} className="flex items-center gap-3 px-3 py-2.5">
                  <ProductThumb src={product.imageUrl} name={product.name} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{product.name}</p>
                    <p className="text-[12px] text-ink-3">
                      {product.code} · limit {formatQty(max)}
                    </p>
                  </div>
                  <QtyStepper
                    value={line.qty}
                    max={max}
                    onChange={(next) => setLineQty(customer.id, product.id, next)}
                  />
                  {atLimit && <Badge tone="amber">limit</Badge>}
                  <button
                    type="button"
                    aria-label={`${product.name} kalemini kaldır`}
                    onClick={() => removeLine(customer.id, product.id)}
                    className="flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Select
              value={productToAdd}
              onChange={(event) => setProductToAdd(event.target.value)}
              aria-label="Eklenecek ürün"
              className="flex-1"
            >
              <option value="">Kataloğdan ürün ekle…</option>
              {available.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.code}
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

      {/* Künye */}
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[14px] bg-surface-2 px-4 py-3.5 text-[13px]">
        <div>
          <dt className="text-[12px] text-ink-3">Yetkili</dt>
          <dd className="mt-0.5 text-ink">{customer.contact}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-3">Telefon</dt>
          <dd className="mt-0.5 tabular-nums text-ink">{customer.phone}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-3">Son Giriş</dt>
          <dd className="mt-0.5 tabular-nums text-ink">{order.updatedAt ?? "Giriş yapılmadı"}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-3">İlçe</dt>
          <dd className="mt-0.5 text-ink">{customer.district}</dd>
        </div>
      </dl>
    </Drawer>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown, MapPin, Phone, Receipt, Truck, User } from "lucide-react";

import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/Badge";
import { useOperations } from "@/context/OperationsContext";
import { cn, formatCurrency, formatQty, initials } from "@/lib/format";

function Disclosure({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-[14px] bg-surface-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <Icon className="size-4 text-ink-3" strokeWidth={1.8} />
        <span className="flex-1 text-[13px] font-semibold text-ink">{title}</span>
        <ChevronDown
          className={cn("size-4 text-ink-3 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-hairline py-2.5 first:border-t-0">
      <span className="text-[13px] text-ink-2">{label}</span>
      <span className="text-right text-[13px] font-medium text-ink">{value}</span>
    </div>
  );
}

export function CustomerInspector({
  customerId,
  onClose,
}: {
  customerId: string | null;
  onClose: () => void;
}) {
  const { getCustomer, getOrder, getDriver, getProduct, orderTotals } = useOperations();

  const customer = customerId ? getCustomer(customerId) : undefined;
  const order = customerId ? getOrder(customerId) : undefined;
  const driver = customer ? getDriver(customer.driverId) : undefined;
  const totals = order ? orderTotals(order) : { units: 0, amount: 0 };

  return (
    <Drawer
      open={Boolean(customer)}
      onClose={onClose}
      title={customer?.name ?? ""}
      subtitle={customer ? `${customer.type} · ${customer.code}` : ""}
      badge={order ? <StatusBadge status={order.status} /> : undefined}
    >
      {customer && (
        <div className="space-y-4">
          {/* Profil başlığı */}
          <div className="flex items-center gap-4 rounded-[14px] bg-surface-2 p-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-surface text-[18px] font-semibold text-ink-2 ring-1 ring-hairline">
              {initials(customer.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink">{customer.name}</p>
              <p className="truncate text-[13px] text-ink-2">{customer.district}</p>
            </div>
          </div>

          <Disclosure title="İletişim" icon={Phone}>
            <Row label="Yetkili" value={customer.contact} />
            <Row label="Telefon" value={<span className="tabular-nums">{customer.phone}</span>} />
            <Row label="İlçe" value={customer.district} />
            <Row label="Bayi Kodu" value={<span className="tabular-nums">{customer.code}</span>} />
          </Disclosure>

          <Disclosure title="Sipariş" icon={Receipt}>
            {order && order.lines.length > 0 ? (
              <div className="space-y-2">
                {order.lines.map((line) => {
                  const p = getProduct(line.productId);
                  if (!p) return null;
                  return (
                    <div key={line.productId} className="flex items-center justify-between gap-3 py-1">
                      <span className="text-[13px] text-ink">{p.name}</span>
                      <span className="text-[13px] font-medium tabular-nums text-ink-2">
                        {formatQty(line.qty)} adet
                      </span>
                    </div>
                  );
                })}
                <div className="mt-1 flex items-center justify-between border-t border-hairline pt-2.5">
                  <span className="text-[13px] font-semibold text-ink">Toplam</span>
                  <span className="text-[13px] font-semibold tabular-nums text-ink">
                    {formatQty(totals.units)} adet · {formatCurrency(totals.amount)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="py-1 text-[13px] text-ink-2">
                {order?.status === "declined"
                  ? "Bu bayi yarın için ürün istemedi."
                  : "Henüz sipariş girişi yapılmadı."}
              </p>
            )}
            {order?.note && (
              <p className="mt-2 rounded-[10px] bg-surface px-3 py-2 text-[12px] leading-5 text-ink-2 ring-1 ring-hairline">
                “{order.note}”
              </p>
            )}
          </Disclosure>

          <Disclosure title="Rota & Dağıtım" icon={Truck} defaultOpen={false}>
            <Row label="Şoför" value={driver?.name ?? "—"} />
            <Row label="Plaka" value={<span className="tabular-nums">{driver?.plate ?? "—"}</span>} />
            <Row label="Bölge" value={driver?.region ?? "—"} />
            <Row label="Durak Sırası" value={<span className="tabular-nums">#{customer.stopNo}</span>} />
          </Disclosure>

          <Disclosure title="Durum" icon={User} defaultOpen={false}>
            <Row
              label="Sipariş durumu"
              value={order ? <StatusBadge status={order.status} /> : "—"}
            />
            <Row label="Son giriş" value={<span className="tabular-nums">{order?.updatedAt ?? "—"}</span>} />
            <Row
              label="Admin düzenlemesi"
              value={order?.editedByAdmin ? "Evet" : "Hayır"}
            />
          </Disclosure>

          <div className="flex items-center gap-1.5 px-1 pt-1 text-[12px] text-ink-3">
            <MapPin className="size-3.5" strokeWidth={1.8} />
            {customer.district} · Durak #{customer.stopNo}
          </div>
        </div>
      )}
    </Drawer>
  );
}

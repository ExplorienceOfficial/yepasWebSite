"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Field, NumberInput, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useOperations } from "@/context/OperationsContext";

interface DraftLine {
  productId: string;
  qty: number;
}

export function AddOrderModal({ onClose }: { onClose: () => void }) {
  const { customers, products, createOrder, getMaxQty, getOrder } = useOperations();

  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ productId: "", qty: 50 }]);
  const [error, setError] = useState<string | null>(null);

  const usedIds = lines.map((l) => l.productId).filter(Boolean);

  const handleCustomerChange = (newId: string) => {
    setCustomerId(newId);
    setError(null);
    if (!newId) {
      setLines([{ productId: "", qty: 50 }]);
      return;
    }
    const existing = getOrder(newId);
    if (existing && existing.lines.length > 0) {
      setLines(existing.lines.map((l) => ({ productId: l.productId, qty: l.qty })));
    } else {
      setLines([{ productId: "", qty: 50 }]);
    }
  };

  const setLine = (index: number, values: Partial<DraftLine>) => {
    setError(null);
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...values } : l)));
  };

  const addRow = () => {
    setError(null);
    setLines((current) => [...current, { productId: "", qty: 50 }]);
  };

  const removeRow = (index: number) => {
    setError(null);
    setLines((current) => (current.length === 1 ? [{ productId: "", qty: 50 }] : current.filter((_, i) => i !== index)));
  };

  const handleSave = () => {
    if (!customerId) {
      setError("Lütfen bir müşteri seçin.");
      return;
    }
    const valid = lines.filter((l) => l.productId && l.qty > 0);
    if (valid.length === 0) {
      setError("En az bir ürün ve adet girin.");
      return;
    }
    createOrder(customerId, valid);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Sipariş Ekle"
      subtitle="Sipariş alımı kapandıysa müşteri adına manuel giriş yapın."
      width="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Siparişi kaydet
          </Button>
        </>
      }
    >
      {error && (
        <p className="mb-3 rounded-[10px] bg-[var(--bad-soft)] px-3 py-2 text-[13px] text-[var(--bad)]">
          {error}
        </p>
      )}

      <Field label="Müşteri / Bayi">
        <Select value={customerId} onChange={(e) => handleCustomerChange(e.target.value)}>
          <option value="">Müşteri seçin…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.district}
            </option>
          ))}
        </Select>
      </Field>

      <div className="mt-4">
        <p className="text-[13px] font-medium text-ink-2">Ürünler</p>
        <div className="mt-2 space-y-2">
          {lines.map((line, index) => {
            const available = products.filter(
              (p) => p.id === line.productId || !usedIds.includes(p.id),
            );
            const max = line.productId ? getMaxQty(line.productId) : undefined;
            return (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={line.productId}
                  onChange={(e) => setLine(index, { productId: e.target.value })}
                  className="min-w-0 flex-1"
                >
                  <option value="">Ürün seçin…</option>
                  {available.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.code}
                    </option>
                  ))}
                </Select>
                <NumberInput
                  value={line.qty}
                  min={0}
                  max={max}
                  onChange={(e) => setLine(index, { qty: Number(e.target.value) || 0 })}
                  className="w-24 shrink-0 text-center"
                  aria-label="Adet"
                />
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  aria-label="Satırı kaldır"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]"
                >
                  <Trash2 className="size-4" strokeWidth={1.8} />
                </button>
              </div>
            );
          })}
        </div>

        <Button variant="ghost" size="sm" className="mt-2" onClick={addRow}>
          <Plus className="size-4" strokeWidth={2} />
          Ürün ekle
        </Button>
      </div>
    </Modal>
  );
}

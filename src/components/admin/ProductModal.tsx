"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

import { ProductThumb } from "@/components/admin/ProductThumb";
import { Button } from "@/components/ui/Button";
import { Field, NumberInput, Select, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useOperations } from "@/context/OperationsContext";
import type { Product } from "@/types";

const emptyProduct = (categoryId: string): Product => ({
  id: "",
  categoryId,
  name: "",
  code: "",
  maxOrderLimit: 300,
  avgOrder: 50,
  imageUrl: "",
});

export function ProductModal({
  product,
  onClose,
}: {
  /** null ise yeni ürün eklenir */
  product: Product | null;
  onClose: () => void;
}) {
  const { categories, saveProduct } = useOperations();
  const [draft, setDraft] = useState<Product>(product ?? emptyProduct(categories[0].id));
  const [error, setError] = useState<string | null>(null);

  const patch = (values: Partial<Product>) => setDraft((current) => ({ ...current, ...values }));

  const handleSave = () => {
    if (!draft.name.trim()) {
      setError("Ürün adı zorunludur.");
      return;
    }
    if (!draft.code.trim()) {
      setError("Ürün kodu zorunludur.");
      return;
    }
    if (draft.avgOrder > draft.maxOrderLimit) {
      setError("Geçmiş ortalama, maksimum limitten büyük olamaz.");
      return;
    }
    saveProduct({
      ...draft,
      id: draft.id || `p${Date.now().toString(36)}`,
      name: draft.name.trim(),
      code: draft.code.trim().toLocaleUpperCase("tr-TR"),
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={product ? "Ürün Kartını Düzenle" : "Yeni Ürün Ekle"}
      subtitle={
        product
          ? `${product.code} · katalogda kayıtlı ürün`
          : "Katalog ana kategorisi altında yeni bir alt varyasyon tanımlayın"
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {product ? "Değişiklikleri kaydet" : "Ürünü ekle"}
          </Button>
        </>
      }
    >
      {error && (
        <p className="mb-3 rounded-[10px] bg-[var(--bad-soft)] px-3 py-2 text-[13px] text-[var(--bad)]">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Ürün Adı (Alt Varyasyon)" className="sm:col-span-2">
          <TextInput
            value={draft.name}
            onChange={(event) => patch({ name: event.target.value })}
            placeholder="Örn. 3 Çizgili Üstü"
          />
        </Field>

        <Field label="Ana Kategori">
          <Select value={draft.categoryId} onChange={(event) => patch({ categoryId: event.target.value })}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Ürün Kodu">
          <TextInput
            value={draft.code}
            onChange={(event) => patch({ code: event.target.value })}
            placeholder="EKM-305"
          />
        </Field>

        <Field
          label="Maksimum Sipariş Limiti"
          hint="Bir müşterinin tek günde geçebileceği en yüksek adet."
        >
          <NumberInput
            value={draft.maxOrderLimit}
            min={0}
            onChange={(event) => patch({ maxOrderLimit: Number(event.target.value) || 0 })}
          />
        </Field>

        <Field label="Geçmiş Ortalama Adet" hint="“Geçmiş Ortalama” kuralında üst sınır olur.">
          <NumberInput
            value={draft.avgOrder}
            min={0}
            onChange={(event) => patch({ avgOrder: Number(event.target.value) || 0 })}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Fotoğraf URL">
            <div className="flex items-center gap-3">
              <TextInput
                value={draft.imageUrl}
                onChange={(event) => patch({ imageUrl: event.target.value })}
                placeholder="/urunler/1.jpg veya https://…"
                className="text-[13px]"
              />
              {draft.imageUrl ? (
                <ProductThumb src={draft.imageUrl} name={draft.name || "Ürün"} className="size-12" />
              ) : (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-ink-3 ring-1 ring-hairline">
                  <ImageIcon className="size-4" />
                </span>
              )}
            </div>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

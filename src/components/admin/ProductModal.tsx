"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

import { ProductThumb } from "@/components/admin/ProductThumb";
import { Button } from "@/components/ui/Button";
import { Field, Label, NumberInput, Select, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { useOperations } from "@/context/OperationsContext";
import type { Product } from "@/types";

const emptyProduct = (categoryId: string): Product => ({
  id: "",
  categoryId,
  name: "",
  code: "",
  gram: 250,
  unitPrice: 0,
  maxOrderLimit: 300,
  avgOrder: 50,
  imageUrl: "",
  active: true,
});

/**
 * Yalnızca modal açıkken monte edilir; böylece taslak state her açılışta
 * seçili üründen yeniden kurulur ve senkronizasyon efektine gerek kalmaz.
 */
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
      setError("Önerilen sipariş adedi, maksimum limitten büyük olamaz.");
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
        <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
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
          <Select
            value={draft.categoryId}
            onChange={(event) => patch({ categoryId: event.target.value })}
          >
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
            className="font-mono"
          />
        </Field>

        <Field label="Gramaj (gr)">
          <NumberInput
            value={draft.gram}
            min={0}
            onChange={(event) => patch({ gram: Number(event.target.value) || 0 })}
          />
        </Field>

        <Field label="Birim Fiyat (₺)">
          <NumberInput
            value={draft.unitPrice}
            min={0}
            step={0.25}
            onChange={(event) => patch({ unitPrice: Number(event.target.value) || 0 })}
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

        <Field
          label="Önerilen / Ortalama Adet"
          hint="Müşteri ekranında varsayılan olarak önerilir."
        >
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
                placeholder="/urunler/1.jpg veya https://..."
                className="font-mono text-xs"
              />
              {draft.imageUrl ? (
                <ProductThumb
                  src={draft.imageUrl}
                  name={draft.name || "Ürün"}
                  className="size-12"
                />
              ) : (
                <span className="flex size-12 shrink-0 items-center justify-center rounded border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400">
                  <ImageIcon className="size-4" />
                </span>
              )}
            </div>
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 sm:col-span-2">
          <div>
            <Label>Sipariş Ekranında Görünür</Label>
            <p className="mt-0.5 text-xs text-zinc-500">
              Kapatılırsa müşteriler bu ürünü sipariş listesinde göremez.
            </p>
          </div>
          <Switch
            checked={draft.active}
            onChange={(next) => patch({ active: next })}
            label="Ürünü aktif/pasif yap"
          />
        </div>
      </div>
    </Modal>
  );
}

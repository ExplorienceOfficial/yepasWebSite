"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Plus, Search, Trash2, Wrench } from "lucide-react";

import { PageHeading, Panel } from "@/components/admin/Panel";
import { ProductModal } from "@/components/admin/ProductModal";
import { ProductThumb } from "@/components/admin/ProductThumb";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { useOperations } from "@/context/OperationsContext";
import { cn, formatCurrency, formatQty } from "@/lib/format";
import type { Product } from "@/types";

export default function ProductsPage() {
  const { categories, products, productionTotals, toggleProductActive, deleteProduct } = useOperations();

  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const orderedQty = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of productionTotals) map.set(row.product.id, row.qty);
    return map;
  }, [productionTotals]);

  const term = search.trim().toLocaleLowerCase("tr-TR");
  const visible = products.filter(
    (product) =>
      !term ||
      product.name.toLocaleLowerCase("tr-TR").includes(term) ||
      product.code.toLocaleLowerCase("tr-TR").includes(term),
  );

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setModalOpen(true);
  };

  const toggleCollapse = (categoryId: string) =>
    setCollapsed((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );

  return (
    <>
      <PageHeading
        title="Ürün Kataloğu"
        description="Ana kategoriler ve alt varyasyonlar; sipariş limitleri ile önerilen adetler burada yönetilir."
        action={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ürün veya kod ara"
                className="w-52 pl-8"
              />
            </div>
            <Button variant="primary" onClick={openNew}>
              <Plus className="size-4" />
              Yeni Ürün
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        {categories.map((category) => {
          const items = visible.filter((product) => product.categoryId === category.id);
          if (items.length === 0) return null;
          const isCollapsed = collapsed.includes(category.id);
          const activeCount = items.filter((item) => item.active).length;

          return (
            <section
              key={category.id}
              className="rounded-md border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)]"
            >
              <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleCollapse(category.id)}
                  className="flex items-center gap-2 text-left"
                >
                  <ChevronDown
                    className={cn(
                      "size-4 text-zinc-400 transition-transform",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">{category.name}</h2>
                    <p className="text-[11px] text-zinc-500">{category.line}</p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <Badge tone="zinc">
                    {items.length} varyasyon · {activeCount} aktif
                  </Badge>
                </div>
              </header>

              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[56rem] text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
                        <th className="px-4 py-2 text-left font-semibold">Alt Varyasyon</th>
                        <th className="px-3 py-2 text-right font-semibold">Gramaj</th>
                        <th className="px-3 py-2 text-right font-semibold">Birim Fiyat</th>
                        <th className="px-3 py-2 text-right font-semibold">Önerilen</th>
                        <th className="px-3 py-2 text-right font-semibold">Maks. Limit</th>
                        <th className="px-3 py-2 text-right font-semibold">Yarınki Talep</th>
                        <th className="px-3 py-2 text-center font-semibold">Görünür</th>
                        <th className="px-4 py-2 text-right font-semibold">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((product) => {
                        const demand = orderedQty.get(product.id) ?? 0;
                        return (
                          <tr
                            key={product.id}
                            className={cn(
                              "group border-b border-zinc-100 transition-colors last:border-0 hover:bg-amber-50/40",
                              !product.active && "bg-zinc-50/60",
                            )}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-3">
                                <ProductThumb
                                  src={product.imageUrl}
                                  name={product.name}
                                  className="size-10"
                                />
                                <div className="min-w-0">
                                  <p
                                    className={cn(
                                      "font-medium",
                                      product.active ? "text-zinc-900" : "text-zinc-500",
                                    )}
                                  >
                                    {product.name}
                                    {!product.active && (
                                      <Badge tone="red" className="ml-2">
                                        pasif
                                      </Badge>
                                    )}
                                  </p>
                                  <p className="font-mono text-[11px] text-zinc-500">
                                    {product.code}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-600">
                              {product.gram} gr
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-800">
                              {formatCurrency(product.unitPrice)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-600">
                              {formatQty(product.avgOrder)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold tabular-nums text-amber-700">
                              {formatQty(product.maxOrderLimit)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {demand > 0 ? (
                                <span className="font-mono text-sm font-semibold tabular-nums text-zinc-900">
                                  {formatQty(demand)}
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex justify-center">
                                <Switch
                                  size="sm"
                                  checked={product.active}
                                  onChange={() => toggleProductActive(product.id)}
                                  label={`${product.name} görünürlüğü`}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPendingDelete(product)}
                                  aria-label={`${product.name} ürününü sil`}
                                  className="rounded-md border border-transparent p-1.5 text-zinc-400 opacity-0 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 group-hover:opacity-100"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                                <Button size="sm" onClick={() => openEdit(product)}>
                                  <Wrench className="size-3.5" />
                                  Düzenle
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}

        {visible.length === 0 && (
          <Panel bodyClassName="px-4 py-14 text-center">
            <Search className="mx-auto size-6 text-zinc-300" />
            <p className="mt-2 text-sm font-medium text-zinc-600">
              &quot;{search}&quot; için ürün bulunamadı
            </p>
          </Panel>
        )}
      </div>

      {modalOpen && <ProductModal product={editing} onClose={() => setModalOpen(false)} />}

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Ürünü katalogdan kaldır"
        subtitle={pendingDelete?.code}
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pendingDelete) deleteProduct(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              <Trash2 className="size-3.5" />
              Kaldır
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-zinc-600">
          <b className="text-zinc-900">{pendingDelete?.name}</b> katalogdan kaldırılacak ve bugünkü
          açık siparişlerdeki kalemleri silinecek. Bu işlem demo verisinde geri alınamaz.
        </p>
      </Modal>
    </>
  );
}

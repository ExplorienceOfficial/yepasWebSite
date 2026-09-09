"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { PageHeading, Panel } from "@/components/admin/Panel";
import { ProductModal } from "@/components/admin/ProductModal";
import { ProductThumb } from "@/components/admin/ProductThumb";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useOperations } from "@/context/OperationsContext";
import { cn, formatQty } from "@/lib/format";
import type { Product } from "@/types";

export default function ProductsPage() {
  const { categories, products, productionTotals, deleteProduct } = useOperations();

  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const demandOf = useMemo(() => {
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
    <div className="yp-rise">
      <PageHeading
        title="Ürünler"
        description="Ürün kataloğu; sipariş limitleri ve günlük talep burada yönetilir."
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ürün veya kod ara"
                className="w-44 pl-9 sm:w-56"
              />
            </div>
            <Button variant="primary" onClick={openNew}>
              <Plus className="size-4" strokeWidth={2} />
              <span className="hidden sm:inline">Yeni Ürün</span>
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        {categories.map((category) => {
          const items = visible.filter((product) => product.categoryId === category.id);
          if (items.length === 0) return null;
          const isCollapsed = collapsed.includes(category.id);

          return (
            <Panel key={category.id} bodyClassName="px-2 pb-2">
              <button
                type="button"
                onClick={() => toggleCollapse(category.id)}
                className="-mx-2 -mt-2 mb-1 flex w-[calc(100%+1rem)] items-center gap-3 rounded-t-[18px] px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60"
              >
                <ChevronDown
                  className={cn("size-4 text-ink-3 transition-transform duration-200", isCollapsed && "-rotate-90")}
                />
                <div className="flex-1">
                  <h2 className="text-[15px] font-semibold tracking-tight text-ink">{category.name}</h2>
                  <p className="text-[12px] text-ink-3">{category.line}</p>
                </div>
                <Badge tone="zinc">{items.length} varyasyon</Badge>
              </button>

              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[34rem] border-collapse">
                    <thead>
                      <tr className="text-[12px] font-medium text-ink-3">
                        <th className="px-2 py-2 text-left font-medium">Ürün</th>
                        <th className="px-2 py-2 text-right font-medium">Maks. Limit</th>
                        <th className="px-2 py-2 text-right font-medium">Bugünkü Talep</th>
                        <th className="w-24 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((product) => {
                        const demand = demandOf.get(product.id) ?? 0;
                        return (
                          <tr
                            key={product.id}
                            className="group border-t border-hairline transition-colors hover:bg-surface-2/50"
                          >
                            <td className="px-2 py-2.5">
                              <div className="flex items-center gap-3">
                                <ProductThumb src={product.imageUrl} name={product.name} className="size-10" />
                                <div className="min-w-0">
                                  <p className="truncate text-[14px] font-medium text-ink">{product.name}</p>
                                  <p className="truncate text-[12px] text-ink-3">{product.code}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-2.5 text-right text-[14px] tabular-nums text-ink-2">
                              {formatQty(product.maxOrderLimit)}
                            </td>
                            <td className="px-2 py-2.5 text-right">
                              {demand > 0 ? (
                                <span className="text-[14px] font-semibold tabular-nums text-ink">
                                  {formatQty(demand)}
                                </span>
                              ) : (
                                <span className="text-[13px] text-ink-3">—</span>
                              )}
                            </td>
                            <td className="px-2 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEdit(product)}
                                  aria-label={`${product.name} düzenle`}
                                  className="flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
                                >
                                  <Pencil className="size-4" strokeWidth={1.8} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDelete(product)}
                                  aria-label={`${product.name} sil`}
                                  className="flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]"
                                >
                                  <Trash2 className="size-4" strokeWidth={1.8} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          );
        })}

        {visible.length === 0 && (
          <Panel bodyClassName="px-4 py-14 text-center">
            <Search className="mx-auto size-6 text-ink-3" />
            <p className="mt-2 text-[15px] font-medium text-ink">&quot;{search}&quot; için ürün bulunamadı</p>
          </Panel>
        )}
      </div>

      {modalOpen && <ProductModal product={editing} onClose={() => setModalOpen(false)} />}

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Ürünü kaldır"
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
        <p className="text-[15px] leading-6 text-ink-2">
          <b className="text-ink">{pendingDelete?.name}</b> katalogdan kaldırılacak ve açık siparişlerdeki
          kalemleri silinecek. Bu işlem demo verisinde geri alınamaz.
        </p>
      </Modal>
    </div>
  );
}

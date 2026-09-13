"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { PageHeading, Panel } from "@/components/admin/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";

interface CatalogProduct {
  uStokId: number;
  code: string;
  name: string;
  groupId: number;
  aStokId: number;
  variantName: string | null;
}

function catalogUrl(): string {
  if (typeof window === "undefined") return "/api/v1/admin/products";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:5057/api/v1/admin/products";
  }
  return "/api/v1/admin/products";
}

export default function ProductsPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(catalogUrl(), { signal: controller.signal, cache: "no-store", credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Ürün kataloğuna erişilemiyor.");
        return (await response.json()) as CatalogProduct[];
      })
      .then((rows) => {
        if (!Array.isArray(rows)) throw new Error("Ürün verisi beklenen biçimde değil.");
        setProducts(rows);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setProducts([]);
        setError(cause instanceof Error ? cause.message : "Ürün kataloğuna erişilemiyor.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  const grouped = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    const groups = new Map<number, { code: string; name: string; groupId: number; variants: CatalogProduct[] }>();
    for (const row of products) {
      const matches = !term || [row.name, row.code, row.variantName ?? ""]
        .some((value) => value.toLocaleLowerCase("tr-TR").includes(term));
      if (!matches) continue;
      const group = groups.get(row.uStokId) ?? {
        code: row.code,
        name: row.name,
        groupId: row.groupId,
        variants: [],
      };
      group.variants.push(row);
      groups.set(row.uStokId, group);
    }
    return [...groups.entries()];
  }, [products, search]);

  return (
    <div className="yp-rise">
      <PageHeading
        title="Ürünler"
        description="Mevcut sipariş programındaki gerçek ürün kataloğu · salt okunur"
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ürün, varyasyon veya kod ara"
                className="w-56 pl-9"
              />
            </div>
            <Button variant="secondary" onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }}>
              Yenile
            </Button>
          </div>
        }
      />

      {loading ? (
        <Panel bodyClassName="px-5 py-10 text-center text-ink-3">Ürünler yükleniyor…</Panel>
      ) : error ? (
        <Panel bodyClassName="px-5 py-10 text-center">
          <p className="font-medium text-ink">Gerçek ürün verisi alınamadı.</p>
          <p className="mt-2 text-sm text-ink-3">{error} Yerel ürün API’sinin çalıştığını kontrol et.</p>
        </Panel>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-3">{grouped.length} üst ürün · {products.length} katalog satırı</p>
          {grouped.map(([uStokId, group]) => (
            <Panel key={uStokId} bodyClassName="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">{group.name}</h2>
                  <p className="text-xs text-ink-3">{group.code} · Stok ID: {uStokId}</p>
                </div>
                <Badge tone="zinc">Grup {group.groupId}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.variants.map((variant) => (
                  <span
                    key={`${variant.uStokId}-${variant.aStokId}`}
                    className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] text-ink-2"
                  >
                    {variant.aStokId === 0 ? "Alt varyasyon yok" : variant.variantName}
                    {variant.aStokId !== 0 && <span className="ml-1 text-ink-3">#{variant.aStokId}</span>}
                  </span>
                ))}
              </div>
            </Panel>
          ))}
          {grouped.length === 0 && (
            <Panel bodyClassName="px-5 py-10 text-center text-ink-3">
              {search ? "Aramaya uygun ürün yok." : "Katalogda ürün bulunamadı."}
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

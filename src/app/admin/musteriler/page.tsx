"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, Search, Users } from "lucide-react";
import { PageHeading, Panel } from "@/components/admin/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";

interface CustomerAccount {
  userId: number;
  loginName: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

interface CustomerBranch {
  legacyMbId: number;
  legacyCustomerId: number;
  legacyDepartmentId: number;
  legacyPersonnelId: number;
  customerCode: string;
  customerName: string;
  departmentName: string;
  personnelName: string;
  distributionDays: string;
  productCount: number;
  productAssignmentMissing: boolean;
  account: CustomerAccount | null;
}

function apiUrl(): string {
  if (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:5057/api/v1/admin/customers";
  }
  return "/api/v1/admin/customers";
}

export default function CustomersPage() {
  const [rows, setRows] = useState<CustomerBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl(), { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Müşteri listesine erişilemiyor.");
        return (await response.json()) as CustomerBranch[];
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Müşteri verisi beklenen biçimde değil.");
        setRows(data);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Müşteri listesine erişilemiyor.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((row) => {
      if (missingOnly && !row.productAssignmentMissing) return false;
      return !term || [row.customerName, row.customerCode, row.departmentName,
        row.personnelName, String(row.legacyMbId), row.account?.loginName ?? ""]
        .some((value) => value.toLocaleLowerCase("tr-TR").includes(term));
    });
  }, [rows, search, missingOnly]);

  const missingCount = rows.filter((row) => row.productAssignmentMissing).length;
  const accountCount = new Set(rows.filter((row) => row.account).map((row) => row.account!.userId)).size;

  return (
    <div className="yp-rise">
      <PageHeading
        title="Müşteriler ve Şubeler"
        description="Şubeler, hesap bağlantıları ve eski programdaki ürün tanımları"
        action={<Button variant="secondary" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Yenile</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel bodyClassName="px-5 py-4"><p className="text-xs text-ink-3">Operasyon şubesi</p><p className="mt-1 text-2xl font-bold text-ink">{rows.length}</p></Panel>
        <Panel bodyClassName="px-5 py-4"><p className="text-xs text-ink-3">Mobil müşteri hesabı</p><p className="mt-1 text-2xl font-bold text-ink">{accountCount}</p></Panel>
        <Panel bodyClassName="px-5 py-4"><p className="text-xs text-ink-3">Ürün ataması eksik</p><p className="mt-1 text-2xl font-bold text-[var(--warn)]">{missingCount}</p></Panel>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <TextInput value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Müşteri, şube, MB ID, şoför veya kullanıcı ara" className="pl-9" />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={missingOnly} onChange={(event) => setMissingOnly(event.target.checked)} className="size-4" />
          Yalnızca ürün ataması eksik olanlar
        </label>
      </div>

      <Panel className="mt-4" bodyClassName="p-0">
        {loading ? <div className="px-5 py-12 text-center text-sm text-ink-3">Müşteriler yükleniyor…</div>
          : error ? <div className="px-5 py-12 text-center"><p className="font-medium text-ink">Müşteri verisi alınamadı.</p><p className="mt-1 text-sm text-ink-3">{error}</p></div>
          : <div className="divide-y divide-hairline">
            {filtered.map((row) => (
              <div key={row.legacyMbId} className="grid gap-4 px-5 py-4 lg:grid-cols-[1.5fr_1.2fr_1fr_auto] lg:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2"><Building2 className="size-5" /></span>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{row.customerName}</p><p className="mt-0.5 truncate text-xs text-ink-3">{row.customerCode} · {row.departmentName} · MB ID {row.legacyMbId}</p></div>
                </div>
                <div><p className="text-xs text-ink-3">Dağıtım</p><p className="mt-1 text-sm text-ink">{row.distributionDays || "SG günü tanımsız"}</p><p className="mt-0.5 text-xs text-ink-3">{row.personnelName || `Personel ${row.legacyPersonnelId}`}</p></div>
                <div><p className="text-xs text-ink-3">Mobil hesap</p>{row.account ? <div className="mt-1 flex flex-wrap items-center gap-2"><span className="text-sm text-ink">{row.account.loginName}</span><Badge tone={row.account.isActive ? "green" : "red"}>{row.account.isActive ? "Aktif" : "Kapalı"}</Badge></div> : <p className="mt-1 text-sm text-ink-3">Hesap bağlı değil</p>}</div>
                <div className="lg:text-right">
                  {row.productAssignmentMissing ? <div className="inline-flex max-w-xs items-start gap-2 rounded-xl bg-[var(--warn)]/10 px-3 py-2 text-left text-xs text-[var(--warn)] ring-1 ring-[var(--warn)]/20"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span><strong>Ürün ataması eksik.</strong><br />Eski sipariş programından tanımlayın.</span></div> : <Badge tone="green">{row.productCount} ürün tanımlı</Badge>}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="px-5 py-12 text-center text-sm text-ink-3"><Users className="mx-auto mb-2 size-6" />Filtreye uygun şube bulunamadı.</div>}
          </div>}
      </Panel>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, KeyRound, Plus, Power, Search, Users } from "lucide-react";
import { PageHeading, Panel } from "@/components/admin/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

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
  productSourcePending: boolean;
  productAssignmentMissing: boolean;
  account: CustomerAccount | null;
}

function apiUrl(path = ""): string {
  if (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return `http://localhost:5057/api/v1/admin/customers${path}`;
  }
  return `/api/v1/admin/customers${path}`;
}

async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || fallback;
  } catch {
    return fallback;
  }
}

export default function CustomersPage() {
  const [rows, setRows] = useState<CustomerBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [reload, setReload] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedMbIds, setSelectedMbIds] = useState<number[]>([]);
  const [loginName, setLoginName] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [resetAccount, setResetAccount] = useState<CustomerAccount | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [manageAccount, setManageAccount] = useState<CustomerAccount | null>(null);
  const [manageMbIds, setManageMbIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const accountCount = new Set(rows.filter((row) => row.account).map((row) => row.account!.userId)).size;
  const customerGroups = useMemo(() => {
    const groups = new Map<number, CustomerBranch[]>();
    for (const row of rows) groups.set(row.legacyCustomerId, [...(groups.get(row.legacyCustomerId) ?? []), row]);
    return [...groups.entries()].map(([customerId, branches]) => ({ customerId, branches,
      name: branches[0].customerName, code: branches[0].customerCode }));
  }, [rows]);

  const openCreate = (customerId?: number) => {
    const group = customerGroups.find((item) => item.customerId === customerId) ??
      customerGroups.find((item) => item.branches.some((branch) => !branch.account));
    setSelectedCustomerId(group?.customerId ?? null);
    setSelectedMbIds(group?.branches.filter((branch) => !branch.account).map((branch) => branch.legacyMbId) ?? []);
    setLoginName("");
    setTemporaryPassword("");
    setActionError(null);
    setCreateOpen(true);
  };

  const chooseCustomer = (customerId: number) => {
    const group = customerGroups.find((item) => item.customerId === customerId);
    setSelectedCustomerId(customerId);
    setSelectedMbIds(group?.branches.filter((branch) => !branch.account).map((branch) => branch.legacyMbId) ?? []);
  };

  const toggleMb = (value: number, selected: number[], setSelected: (values: number[]) => void) => {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  const refresh = () => { setLoading(true); setReload((value) => value + 1); };

  const createAccount = async () => {
    setBusy(true); setActionError(null);
    try {
      const response = await fetch(apiUrl("/accounts"), {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginName, temporaryPassword, legacyMbIds: selectedMbIds }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Müşteri hesabı oluşturulamadı."));
      setCreateOpen(false); setNotice(`${loginName} hesabı oluşturuldu.`); refresh();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Hesap oluşturulamadı."); }
    finally { setBusy(false); }
  };

  const setAccountStatus = async (account: CustomerAccount) => {
    setBusy(true); setActionError(null);
    try {
      const response = await fetch(apiUrl(`/accounts/${account.userId}/status`), {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !account.isActive }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Hesap durumu değiştirilemedi."));
      setNotice(account.isActive ? "Müşteri hesabı kapatıldı; açık oturumları sonlandırıldı." : "Müşteri hesabı açıldı.");
      refresh();
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Hesap durumu değiştirilemedi."); }
    finally { setBusy(false); }
  };

  const openBranchManager = (account: CustomerAccount) => {
    setManageAccount(account);
    setManageMbIds(rows.filter((row) => row.account?.userId === account.userId).map((row) => row.legacyMbId));
    setActionError(null);
  };

  const saveBranches = async () => {
    if (!manageAccount) return;
    setBusy(true); setActionError(null);
    try {
      const response = await fetch(apiUrl(`/accounts/${manageAccount.userId}/branches`), {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legacyMbIds: manageMbIds }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Şubeler güncellenemedi."));
      setManageAccount(null); setNotice("Hesabın şube erişimleri güncellendi."); refresh();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Şubeler güncellenemedi."); }
    finally { setBusy(false); }
  };

  const submitReset = async () => {
    if (!resetAccount) return;
    setBusy(true); setActionError(null);
    try {
      const response = await fetch(apiUrl(`/accounts/${resetAccount.userId}/reset-password`), {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temporaryPassword: resetPassword }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Geçici parola yenilenemedi."));
      setResetAccount(null); setResetPassword("");
      setNotice("Geçici parola yenilendi; diğer oturumlar kapatıldı."); refresh();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Parola yenilenemedi."); }
    finally { setBusy(false); }
  };

  return (
    <div className="yp-rise">
      <PageHeading
        title="Müşteriler ve Şubeler"
        description="Şubeler, hesap bağlantıları ve eski programdaki ürün tanımları"
        action={<div className="flex gap-2"><Button variant="secondary" onClick={refresh}>Yenile</Button><Button variant="primary" onClick={() => openCreate()}><Plus className="size-4" />Müşteri hesabı aç</Button></div>}
      />

      {notice && <div className="mb-4 flex items-center justify-between rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent ring-1 ring-accent/20"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} className="text-xs font-semibold">Kapat</button></div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel bodyClassName="px-5 py-4"><p className="text-xs text-ink-3">Operasyon şubesi</p><p className="mt-1 text-2xl font-bold text-ink">{rows.length}</p></Panel>
        <Panel bodyClassName="px-5 py-4"><p className="text-xs text-ink-3">Mobil müşteri hesabı</p><p className="mt-1 text-2xl font-bold text-ink">{accountCount}</p></Panel>
        <Panel bodyClassName="px-5 py-4"><p className="text-xs text-ink-3">Ürün kaynağı</p><p className="mt-1 text-lg font-bold text-[var(--warn)]">Yeni tablo bekleniyor</p></Panel>
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
                <div>
                  <p className="text-xs text-ink-3">Mobil hesap</p>
                  {row.account ? <><div className="mt-1 flex flex-wrap items-center gap-2"><span className="text-sm text-ink">{row.account.loginName}</span><Badge tone={row.account.isActive ? "green" : "red"}>{row.account.isActive ? "Aktif" : "Kapalı"}</Badge>{row.account.mustChangePassword && <Badge tone="amber">Parola değişecek</Badge>}</div><div className="mt-2 flex flex-wrap gap-1"><Button size="sm" variant="ghost" disabled={busy} onClick={() => openBranchManager(row.account!)}>Şubeler</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => { setResetAccount(row.account); setResetPassword(""); setActionError(null); }}><KeyRound className="size-3.5" />Parola</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => void setAccountStatus(row.account!)}><Power className="size-3.5" />{row.account.isActive ? "Kapat" : "Aç"}</Button></div></> : <div className="mt-1"><p className="text-sm text-ink-3">Hesap bağlı değil</p><Button size="sm" variant="ghost" className="mt-1" onClick={() => openCreate(row.legacyCustomerId)}><Plus className="size-3.5" />Hesap aç</Button></div>}
                </div>
                <div className="lg:text-right">
                  {row.productSourcePending ? <div className="inline-flex max-w-xs items-start gap-2 rounded-xl bg-[var(--warn)]/10 px-3 py-2 text-left text-xs text-[var(--warn)] ring-1 ring-[var(--warn)]/20"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span><strong>Ürün tablosu bekleniyor.</strong><br />Müşteri yeni tabloyu hazırlayacak.</span></div> : row.productAssignmentMissing ? <Badge tone="red">Ürün ataması eksik</Badge> : <Badge tone="green">{row.productCount} ürün tanımlı</Badge>}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="px-5 py-12 text-center text-sm text-ink-3"><Users className="mx-auto mb-2 size-6" />Filtreye uygun şube bulunamadı.</div>}
          </div>}
      </Panel>

      <Modal open={createOpen} onClose={() => !busy && setCreateOpen(false)} title="Mobil müşteri hesabı aç" subtitle="Aynı müşterinin birden fazla şubesini tek hesaba bağlayabilirsiniz." width="max-w-xl" footer={<><Button onClick={() => setCreateOpen(false)} disabled={busy}>Vazgeç</Button><Button variant="primary" onClick={() => void createAccount()} disabled={busy || selectedMbIds.length === 0 || loginName.trim().length < 3 || temporaryPassword.length < 12}>{busy ? "Kaydediliyor…" : "Hesabı oluştur"}</Button></>}>
        <div className="space-y-4">
          <Field label="Müşteri"><Select value={selectedCustomerId ?? ""} onChange={(event) => chooseCustomer(Number(event.target.value))}><option value="" disabled>Müşteri seçin</option>{customerGroups.filter((group) => group.branches.some((branch) => !branch.account)).map((group) => <option key={group.customerId} value={group.customerId}>{group.name} · {group.code}</option>)}</Select></Field>
          <div><p className="text-[13px] font-medium text-ink-2">Bağlanacak şubeler</p><div className="mt-2 max-h-52 space-y-2 overflow-y-auto rounded-xl bg-surface-2 p-3 ring-1 ring-hairline">{customerGroups.find((group) => group.customerId === selectedCustomerId)?.branches.map((branch) => <label key={branch.legacyMbId} className={`flex items-start gap-3 rounded-lg p-2 ${branch.account ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-surface"}`}><input type="checkbox" className="mt-0.5 size-4" disabled={Boolean(branch.account)} checked={selectedMbIds.includes(branch.legacyMbId)} onChange={() => toggleMb(branch.legacyMbId, selectedMbIds, setSelectedMbIds)} /><span className="text-sm text-ink"><strong>{branch.departmentName}</strong><span className="mt-0.5 block text-xs text-ink-3">MB ID {branch.legacyMbId} · {branch.distributionDays || "SG günü yok"}{branch.account ? ` · ${branch.account.loginName} hesabına bağlı` : ""}</span></span></label>) ?? <p className="text-sm text-ink-3">Önce müşteri seçin.</p>}</div></div>
          <Field label="Kullanıcı adı"><TextInput value={loginName} onChange={(event) => setLoginName(event.target.value)} autoComplete="off" maxLength={100} /></Field>
          <Field label="Geçici parola" hint="12-128 karakter. Yedi gün geçerlidir; müşteri ilk girişte değiştirmek zorundadır."><TextInput type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} autoComplete="new-password" maxLength={128} /></Field>
          {actionError && <p className="rounded-xl bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{actionError}</p>}
        </div>
      </Modal>

      <Modal open={Boolean(resetAccount)} onClose={() => !busy && setResetAccount(null)} title="Geçici parolayı yenile" subtitle={resetAccount ? `${resetAccount.loginName} hesabının açık oturumları kapatılacak.` : undefined} width="max-w-md" footer={<><Button onClick={() => setResetAccount(null)} disabled={busy}>Vazgeç</Button><Button variant="primary" onClick={() => void submitReset()} disabled={busy || resetPassword.length < 12}>{busy ? "Kaydediliyor…" : "Parolayı yenile"}</Button></>}>
        <Field label="Yeni geçici parola" hint="Müşteri sonraki girişte bu parolayı değiştirmek zorundadır."><TextInput type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} autoComplete="new-password" maxLength={128} /></Field>
        {actionError && <p className="mt-3 rounded-xl bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{actionError}</p>}
      </Modal>

      <Modal open={Boolean(manageAccount)} onClose={() => !busy && setManageAccount(null)} title="Hesabın şubelerini yönet" subtitle={manageAccount ? `${manageAccount.loginName} · yalnızca aynı müşterinin şubeleri` : undefined} width="max-w-lg" footer={<><Button onClick={() => setManageAccount(null)} disabled={busy}>Vazgeç</Button><Button variant="primary" onClick={() => void saveBranches()} disabled={busy || manageMbIds.length === 0}>{busy ? "Kaydediliyor…" : "Şubeleri kaydet"}</Button></>}>
        <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl bg-surface-2 p-3 ring-1 ring-hairline">
          {(() => { const current = rows.find((row) => row.account?.userId === manageAccount?.userId); return rows.filter((row) => row.legacyCustomerId === current?.legacyCustomerId && (!row.account || row.account.userId === manageAccount?.userId)).map((branch) => <label key={branch.legacyMbId} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-surface"><input type="checkbox" className="mt-0.5 size-4" checked={manageMbIds.includes(branch.legacyMbId)} onChange={() => toggleMb(branch.legacyMbId, manageMbIds, setManageMbIds)} /><span className="text-sm text-ink"><strong>{branch.departmentName}</strong><span className="mt-0.5 block text-xs text-ink-3">MB ID {branch.legacyMbId} · {branch.distributionDays || "SG günü yok"}</span></span></label>); })()}
        </div>
        {actionError && <p className="mt-3 rounded-xl bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{actionError}</p>}
      </Modal>
    </div>
  );
}

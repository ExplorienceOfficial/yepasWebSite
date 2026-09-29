"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Power, Search, Truck, UserCheck, Users } from "lucide-react";
import { PageHeading, Panel } from "@/components/admin/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { invalidateSession } from "@/context/AuthContext";
import { localApiUrl } from "@/lib/api";
import { initials } from "@/lib/format";

interface DriverAccount {
  userId: number;
  loginName: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

interface DriverRow {
  legacyPersonnelId: number;
  personnelCode: string;
  personnelName: string;
  isLegacyActive: boolean;
  branchCount: number;
  account: DriverAccount | null;
}

function apiUrl(path = ""): string {
  return localApiUrl(`/api/v1/admin/drivers${path}`);
}

async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || fallback;
  } catch { return fallback; }
}

function requireCurrentAdminSession(response: Response): boolean {
  if (response.status !== 401) return true;
  invalidateSession();
  return false;
}

export default function DriverManagementPage() {
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  const [createDriver, setCreateDriver] = useState<DriverRow | null>(null);
  const [resetAccount, setResetAccount] = useState<DriverAccount | null>(null);
  const [loginName, setLoginName] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl(), { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseMessage(response, "Şoför listesi alınamadı."));
        return response.json() as Promise<DriverRow[]>;
      })
      .then((data) => { setRows(data); setLoadError(null); })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setLoadError(cause instanceof Error ? cause.message : "Şoför listesi alınamadı.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [reload]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    if (!term) return rows;
    return rows.filter((row) =>
      `${row.personnelCode} ${row.personnelName} ${row.legacyPersonnelId} ${row.account?.loginName ?? ""}`
        .toLocaleLowerCase("tr-TR").includes(term));
  }, [rows, search]);

  const accountCount = rows.filter((row) => row.account).length;
  const activeAccountCount = rows.filter((row) => row.account?.isActive && row.isLegacyActive).length;
  const refresh = () => { setLoading(true); setReload((value) => value + 1); };

  const openCreate = (driver: DriverRow) => {
    setCreateDriver(driver);
    setLoginName(driver.personnelCode);
    setTemporaryPassword("");
    setActionError(null);
  };

  const createAccount = async () => {
    if (!createDriver) return;
    setBusy(true); setActionError(null);
    try {
      const response = await fetch(apiUrl(`/${createDriver.legacyPersonnelId}/account`), {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginName, temporaryPassword }),
      });
      if (!requireCurrentAdminSession(response)) return;
      if (!response.ok) throw new Error(await responseMessage(response, "Şoför hesabı oluşturulamadı."));
      setCreateDriver(null); setNotice(`${createDriver.personnelName} için giriş hesabı oluşturuldu.`); refresh();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Hesap oluşturulamadı."); }
    finally { setBusy(false); }
  };

  const setAccountStatus = async (row: DriverRow) => {
    if (!row.account) return;
    setBusy(true); setActionError(null);
    try {
      const response = await fetch(apiUrl(`/accounts/${row.account.userId}/status`), {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !row.account.isActive }),
      });
      if (!requireCurrentAdminSession(response)) return;
      if (!response.ok) throw new Error(await responseMessage(response, "Şoför hesabı güncellenemedi."));
      setNotice(row.account.isActive
        ? "Şoför girişi kapatıldı ve açık oturumları sonlandırıldı."
        : "Şoför girişi açıldı.");
      refresh();
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Hesap güncellenemedi."); }
    finally { setBusy(false); }
  };

  const submitReset = async () => {
    if (!resetAccount) return;
    setBusy(true); setActionError(null);
    try {
      const response = await fetch(apiUrl(`/accounts/${resetAccount.userId}/reset-password`), {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temporaryPassword }),
      });
      if (!requireCurrentAdminSession(response)) return;
      if (!response.ok) throw new Error(await responseMessage(response, "Geçici parola yenilenemedi."));
      setResetAccount(null); setTemporaryPassword("");
      setNotice("Geçici parola yenilendi ve açık oturumlar kapatıldı."); refresh();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Parola yenilenemedi."); }
    finally { setBusy(false); }
  };

  return (
    <div className="yp-rise space-y-6">
      <PageHeading title="Şoför Giriş Yönetimi"
        description="Şoför ve rota bilgileri eski programdan gelir; burada yalnızca uygulama giriş hesapları yönetilir."
        action={<Button variant="secondary" onClick={refresh}>Yenile</Button>} />

      {notice && <div className="flex items-center justify-between rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent ring-1 ring-accent/20"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} className="text-xs font-semibold">Kapat</button></div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel bodyClassName="px-5 py-4"><div className="flex items-center justify-between"><p className="text-xs text-ink-3">Şoför sayısı</p><Truck className="size-4 text-ink-3" /></div><p className="mt-1 text-2xl font-bold text-ink">{rows.length}</p></Panel>
        <Panel bodyClassName="px-5 py-4"><div className="flex items-center justify-between"><p className="text-xs text-ink-3">Giriş hesabı</p><Users className="size-4 text-ink-3" /></div><p className="mt-1 text-2xl font-bold text-ink">{accountCount}</p></Panel>
        <Panel bodyClassName="px-5 py-4"><div className="flex items-center justify-between"><p className="text-xs text-ink-3">Aktif giriş</p><UserCheck className="size-4 text-[var(--ok)]" /></div><p className="mt-1 text-2xl font-bold text-[var(--ok)]">{activeAccountCount}</p></Panel>
      </div>

      <Panel title="Eski Sistemdeki Rota Personelleri" description="Yeni şoför ve müşteri ataması eski programdan yapılır. Eski sistemde pasif olan personel uygulamaya giremez."
        action={<div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" /><TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kod, ad veya personel ID ara" className="w-72 pl-9" /></div>}>
        {loading ? <div className="px-5 py-10 text-center text-sm text-ink-3">Şoförler yükleniyor…</div>
          : loadError ? <div className="px-5 py-10 text-center text-sm text-[var(--bad)]">{loadError}</div>
          : <div className="divide-y divide-hairline">
            {filtered.map((row) => <div key={row.legacyPersonnelId} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.4fr)_0.7fr_1.2fr] lg:items-center">
              <div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xs font-bold text-ink-2 ring-1 ring-hairline">{initials(row.personnelName)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{row.personnelName}</p><p className="mt-0.5 text-xs text-ink-3">Kod {row.personnelCode} · Personel ID {row.legacyPersonnelId}</p></div></div>
              <div><p className="text-xs text-ink-3">Eski sistem</p><div className="mt-1 flex items-center gap-2"><Badge tone={row.isLegacyActive ? "green" : "red"}>{row.isLegacyActive ? "Aktif" : "Pasif"}</Badge><span className="text-xs text-ink-3">{row.branchCount} şube</span></div></div>
              <div><p className="text-xs text-ink-3">Uygulama hesabı</p>{row.account ? <><div className="mt-1 flex flex-wrap items-center gap-2"><span className="text-sm text-ink">{row.account.loginName}</span><Badge tone={row.account.isActive ? "green" : "red"}>{row.account.isActive ? "Açık" : "Kapalı"}</Badge>{row.account.mustChangePassword && <Badge tone="amber">Parola değişecek</Badge>}</div><div className="mt-2 flex flex-wrap gap-1"><Button size="sm" variant="ghost" disabled={busy || (!row.isLegacyActive && !row.account.isActive)} onClick={() => void setAccountStatus(row)}><Power className="size-3.5" />{row.account.isActive ? "Girişi kapat" : "Girişi aç"}</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => { setResetAccount(row.account); setTemporaryPassword(""); setActionError(null); }}><KeyRound className="size-3.5" />Parola</Button></div></> : <div className="mt-1"><p className="text-sm text-ink-3">Hesap açılmamış</p><Button size="sm" variant="ghost" className="mt-1" disabled={!row.isLegacyActive} onClick={() => openCreate(row)}>Giriş hesabı aç</Button></div>}</div>
            </div>)}
            {filtered.length === 0 && <div className="px-5 py-10 text-center text-sm text-ink-3">Filtreye uygun rota personeli bulunamadı.</div>}
          </div>}
      </Panel>

      <Modal open={Boolean(createDriver)} onClose={() => !busy && setCreateDriver(null)} title="Şoför giriş hesabı aç" subtitle={createDriver ? `${createDriver.personnelName} · Kod ${createDriver.personnelCode}` : undefined} width="max-w-md" footer={<><Button onClick={() => setCreateDriver(null)} disabled={busy}>Vazgeç</Button><Button variant="primary" onClick={() => void createAccount()} disabled={busy || loginName.trim().length < 2 || temporaryPassword.length < 12}>{busy ? "Kaydediliyor…" : "Hesabı oluştur"}</Button></>}>
        <div className="space-y-4"><Field label="Kullanıcı adı" hint="Eski sistemdeki personel kodu kullanılır."><TextInput value={loginName} readOnly /></Field><Field label="Geçici parola" hint="12-128 karakter. Yedi gün geçerlidir; ilk girişte değiştirilir."><TextInput type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} autoComplete="new-password" maxLength={128} /></Field>{actionError && <p className="rounded-xl bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{actionError}</p>}</div>
      </Modal>

      <Modal open={Boolean(resetAccount)} onClose={() => !busy && setResetAccount(null)} title="Şoför parolasını yenile" subtitle={resetAccount ? `${resetAccount.loginName} hesabının açık oturumları kapatılacak.` : undefined} width="max-w-md" footer={<><Button onClick={() => setResetAccount(null)} disabled={busy}>Vazgeç</Button><Button variant="primary" onClick={() => void submitReset()} disabled={busy || temporaryPassword.length < 12}>{busy ? "Kaydediliyor…" : "Parolayı yenile"}</Button></>}>
        <Field label="Yeni geçici parola" hint="Şoför sonraki girişte bu parolayı değiştirmek zorundadır."><TextInput type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} autoComplete="new-password" maxLength={128} /></Field>{actionError && <p className="mt-3 rounded-xl bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{actionError}</p>}
      </Modal>
    </div>
  );
}

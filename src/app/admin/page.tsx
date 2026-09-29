"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock4, Store } from "lucide-react";

import { MetricCard } from "@/components/dash/MetricCard";
import { PageHeading, Panel } from "@/components/admin/Panel";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { invalidateSession, useAuth } from "@/context/AuthContext";
import { localApiUrl } from "@/lib/api";

type Mode = "AUTO" | "OPEN" | "CLOSED";
type Settings = { cutoffTime: string; overrideMode: Mode; effectiveMode: Mode; isOpen: boolean };
type Row = {
  legacyMbId: number; customerName: string; departmentName: string;
  boardStatus: "SUBMITTED" | "NO_PRODUCT" | "CANCELLED" | "PENDING";
  sourceRole: string | null;
  order: { updatedAtUtc: string; lines: { quantity: number }[] } | null;
};
type Board = { localDate: string; expectedDeliveryDate: string; rows: Row[] };

const date = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
};
const time = (value: string) => new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul",
}).format(new Date(value));

async function read<T>(path: string): Promise<T> {
  const response = await fetch(localApiUrl(path), { credentials: "include", cache: "no-store" });
  if (response.status === 401) { invalidateSession(); throw new Error("Oturum sona erdi."); }
  if (!response.ok) throw new Error("Güncel veriler alınamadı.");
  return response.json() as Promise<T>;
}

export default function OverviewPage() {
  const { session } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [cutoffTime, setCutoffTime] = useState("18:00");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const results = await Promise.allSettled([
        read<Settings>("/api/v1/admin/order-settings"),
        read<Board>("/api/v1/admin/orders?scope=submitted"),
      ]);
      if (!active) return;
      if (results[0].status === "fulfilled") {
        setSettings(results[0].value);
        setCutoffTime(results[0].value.cutoffTime);
      } else setSettings(null);
      if (results[1].status === "fulfilled") setBoard(results[1].value);
      else setBoard(null);
      setError(results.some((result) => result.status === "rejected")
        ? "Bazı güncel bilgiler alınamadı; ilgili alanlar boş bırakıldı." : null);
    };
    void load();
    const timer = window.setInterval(load, 30_000);
    window.addEventListener("focus", load);
    window.addEventListener("yepas:order-sync-changed", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
      window.removeEventListener("yepas:order-sync-changed", load);
    };
  }, []);

  const save = async (mode: Mode) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(localApiUrl("/api/v1/admin/order-settings"), {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutoffTime, overrideMode: mode, overrideUntilUtc: null, reason: null }),
      });
      if (response.status === 401) { invalidateSession(); throw new Error("Oturum sona erdi."); }
      if (!response.ok) throw new Error("Ayarlar kaydedilemedi.");
      const result = await response.json() as Settings;
      setSettings(result);
      setCutoffTime(result.cutoffTime);
      window.dispatchEvent(new Event("yepas:settings-changed"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ayarlar kaydedilemedi."); }
    finally { setSaving(false); }
  };

  const rows = board?.rows ?? [];
  const recent = rows.filter((row) => row.order).sort((a, b) =>
    (b.order?.updatedAtUtc ?? "").localeCompare(a.order?.updatedAtUtc ?? "")).slice(0, 8);
  const ordered = rows.filter((row) => row.boardStatus === "SUBMITTED").length;
  const pending = rows.filter((row) => row.boardStatus === "PENDING").length;

  return <div className="yp-rise">
    <PageHeading title={`Günaydın, ${session?.name.split(" ")[0] ?? "Yönetici"}.`}
      description="Bugünkü sipariş ve sistem durumu."
      action={<span className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3 text-sm text-ink ring-1 ring-hairline"><Calendar className="size-4" />{board ? date(board.localDate) : "Tarih alınamıyor"}</span>} />
    {error && <p role="alert" className="mb-4 rounded-xl bg-[var(--bad-soft)] p-3 text-sm text-[var(--bad)]">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <MetricCard label="Sipariş Veren" value={board ? `${ordered}/${rows.length}` : "—"} icon={Store} caption="yarın teslim edilecek şubeler" />
      <MetricCard label="Giriş Bekleyen" value={board ? pending : "—"} icon={Clock4} caption="henüz yanıt vermeyen şubeler" />
    </div>
    <Panel className="mt-5" title="Genel Sipariş Yönetimi" description="Ayarlar doğrudan sunucuya kaydedilir.">
      <div className="divide-y divide-hairline">
        <div className="flex items-center justify-between px-2 py-4 sm:px-4"><div><p className="text-sm font-medium text-ink">Müşteri sipariş sistemi</p><p className="text-xs text-ink-2">{settings ? `${settings.isOpen ? "Açık" : "Kapalı"} · ${settings.effectiveMode === "AUTO" ? "Otomatik" : "Manuel"}` : "Durum alınamıyor"}</p></div><Switch checked={settings?.isOpen ?? false} onChange={(open) => void save(open ? "OPEN" : "CLOSED")} label="Sipariş sistemini aç/kapat" disabled={!settings || saving} /></div>
        <div className="flex items-center justify-between px-2 py-4 sm:px-4"><p className="text-sm font-medium text-ink">Çalışma biçimi</p><Button size="sm" disabled={!settings || saving || settings.overrideMode === "AUTO"} onClick={() => void save("AUTO")}>Otomatik moda dön</Button></div>
        <div className="flex items-center justify-between px-2 py-4 sm:px-4"><p className="text-sm font-medium text-ink">Kapanış saati</p><div className="flex gap-2"><input type="time" value={cutoffTime} onChange={(event) => setCutoffTime(event.target.value)} disabled={!settings || saving} aria-label="Kapanış saati" className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm text-ink" /><Button size="sm" disabled={!settings || saving || cutoffTime === settings.cutoffTime} onClick={() => void save(settings!.overrideMode)}>Saati kaydet</Button></div></div>
        <div className="flex items-center justify-between px-2 py-4 sm:px-4"><p className="text-sm font-medium text-ink">Operasyon günü</p><span className="text-sm text-ink-2">{board ? date(board.localDate) : "—"}</span></div>
      </div>
    </Panel>
    <div className="mt-5 grid gap-5 xl:grid-cols-3">
      <Panel className="xl:col-span-2" title="Son Siparişler" action={<Link href="/admin/siparisler" className="text-sm text-accent">Tümü</Link>}>
        {recent.length === 0 ? <p className="text-sm text-ink-3">Henüz sipariş yok.</p> : recent.map((row) => <div key={row.legacyMbId} className="flex items-center justify-between gap-4 border-b border-hairline py-3 text-sm"><div><p className="font-medium text-ink">{row.customerName}</p><p className="text-xs text-ink-3">{row.departmentName} · {time(row.order!.updatedAtUtc)}</p></div><span className="text-ink-2">{row.boardStatus === "SUBMITTED" ? "Sipariş verdi" : row.boardStatus === "PENDING" ? "Bekliyor" : "Sipariş yok"}</span></div>)}
      </Panel>
      <Panel title="Son Etkinlik">
        {recent.length === 0 ? <p className="text-sm text-ink-3">Henüz etkinlik yok.</p> : recent.slice(0, 5).map((row) => <div key={row.legacyMbId} className="border-b border-hairline py-3 text-sm"><p className="text-ink">{row.customerName} · {row.sourceRole === "ADMIN" ? "Yönetici" : "Müşteri"} güncelledi</p><p className="text-xs text-ink-3">{time(row.order!.updatedAtUtc)}</p></div>)}
      </Panel>
    </div>
  </div>;
}

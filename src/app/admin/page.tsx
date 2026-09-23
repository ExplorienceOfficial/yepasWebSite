"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Check,
  ChevronRight,
  Circle,
  Clock4,
  MoreHorizontal,
  Store,
  TriangleAlert,
} from "lucide-react";

import { MetricCard } from "@/components/dash/MetricCard";
import { CustomerInspector } from "@/components/dash/CustomerInspector";
import { PageHeading, Panel } from "@/components/admin/Panel";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { invalidateSession, useAuth } from "@/context/AuthContext";
import { useOperations } from "@/context/OperationsContext";
import { OPERATION_DATE } from "@/data/mockData";
import { periodDelta } from "@/data/trends";
import { localApiUrl } from "@/lib/api";
import { cn, formatQty, initials } from "@/lib/format";

const statusOrder = { ordered: 0, pending: 1, declined: 2 } as const;

const activityIcon = {
  success: Check,
  danger: TriangleAlert,
  warning: TriangleAlert,
  neutral: Circle,
};

const activityColor = {
  success: "text-[var(--ok)]",
  danger: "text-[var(--bad)]",
  warning: "text-[var(--warn)]",
  neutral: "text-ink-3",
};

type OrderMode = "AUTO" | "OPEN" | "CLOSED";

interface OrderSettings {
  cutoffMinute: number;
  cutoffTime: string;
  overrideMode: OrderMode;
  effectiveMode: OrderMode;
  isOpen: boolean;
  overrideUntilUtc: string | null;
  overrideReason: string | null;
  updatedAtUtc: string;
  serverNowUtc: string;
}

const modeLabels: Record<OrderMode, string> = {
  AUTO: "Otomatik",
  OPEN: "Manuel açık",
  CLOSED: "Manuel kapalı",
};

async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || fallback;
  } catch {
    return fallback;
  }
}

export default function OverviewPage() {
  const { session } = useAuth();
  const {
    metrics,
    activity,
    customers,
    orders,
    orderTotals,
  } = useOperations();

  const [selected, setSelected] = useState<string | null>(null);
  const [settings, setSettings] = useState<OrderSettings | null>(null);
  const [cutoffTime, setCutoffTime] = useState("18:00");
  const [overrideReason, setOverrideReason] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const firstName = session?.role === "admin" ? session.name.split(" ")[0] : "Yönetici";

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(localApiUrl("/api/v1/admin/order-settings"), {
          credentials: "include",
          cache: "no-store",
        });
        if (response.status === 401) {
          invalidateSession();
          throw new Error("Yönetici oturumu sona erdi.");
        }
        if (!response.ok) throw new Error(await responseMessage(response, "Sipariş ayarlarına erişilemiyor."));
        const result = (await response.json()) as OrderSettings;
        if (!active) return;
        setSettings(result);
        setCutoffTime(result.cutoffTime);
        setOverrideReason(result.overrideReason ?? "");
        setSettingsError(null);
      } catch (cause) {
        if (active) setSettingsError(cause instanceof Error ? cause.message : "Sipariş ayarlarına erişilemiyor.");
      } finally {
        if (active) setSettingsLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const saveSettings = async (mode: OrderMode, reason?: string) => {
    const trimmedReason = (reason ?? overrideReason).trim();
    if (mode !== "AUTO" && !trimmedReason) {
      setSettingsError("Manuel açma veya kapatma için işlem gerekçesi yazın.");
      return;
    }
    setSettingsSaving(true);
    setSettingsError(null);
    try {
      const response = await fetch(localApiUrl("/api/v1/admin/order-settings"), {
        method: "PUT",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cutoffTime,
          overrideMode: mode,
          overrideUntilUtc: null,
          reason: mode === "AUTO" ? null : trimmedReason,
        }),
      });
      if (response.status === 401) {
        invalidateSession();
        throw new Error("Yönetici oturumu sona erdi.");
      }
      if (!response.ok) throw new Error(await responseMessage(response, "Sipariş ayarları güncellenemiyor."));
      const result = (await response.json()) as OrderSettings;
      setSettings(result);
      setCutoffTime(result.cutoffTime);
      setOverrideReason(result.overrideReason ?? "");
    } catch (cause) {
      setSettingsError(cause instanceof Error ? cause.message : "Sipariş ayarları güncellenemiyor.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const saveCutoff = () => {
    const mode = settings?.overrideMode ?? "AUTO";
    const reason = mode === "AUTO"
      ? undefined
      : overrideReason.trim() || "Son sipariş saati güncellendi.";
    void saveSettings(mode, reason);
  };

  const rows = useMemo(() => {
    return customers
      .map((c) => {
        const order = orders.find((o) => o.customerId === c.id);
        const totals = order ? orderTotals(order) : { units: 0 };
        return { customer: c, order, totals };
      })
      .sort(
        (a, b) =>
          (statusOrder[a.order?.status ?? "pending"] ?? 1) -
          (statusOrder[b.order?.status ?? "pending"] ?? 1),
      )
      .slice(0, 8);
  }, [customers, orderTotals, orders]);

  return (
    <div className="yp-rise">
      <PageHeading
        title={`Günaydın, ${firstName}.`}
        description="Platformunuzda bugün olup bitenlerin özeti."
        action={
          <span className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] font-medium text-ink ring-1 ring-hairline">
            <Calendar className="size-4 text-ink-2" strokeWidth={1.8} />
            {OPERATION_DATE}
          </span>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Sipariş Veren"
          value={`${metrics.ordered}/${metrics.total}`}
          delta={periodDelta("orders")}
          icon={Store}
          caption="bayi · önceki döneme göre"
        />
        <MetricCard
          label="Giriş Bekleyen"
          value={metrics.pending}
          icon={Clock4}
          caption="bayi giriş bekliyor"
        />
      </div>

      {/* Sipariş Sistemi Yönetimi */}
      <Panel
        className="mt-5"
        title="Genel Sipariş Yönetimi"
        description="Bu ayarlar doğrudan sunucuya kaydedilir ve bütün müşteri siparişlerinde uygulanır."
      >
        <div className="divide-y divide-hairline">
          {settingsError && (
            <p className="mx-2 my-3 rounded-[10px] bg-[var(--bad-soft)] px-3 py-2 text-[13px] text-[var(--bad)] sm:mx-4">
              {settingsError}
            </p>
          )}
          <div className="flex items-center justify-between px-2 py-3.5 sm:px-4">
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-[14.5px] font-medium text-ink">Müşteri sipariş sistemi</p>
              <p className="mt-0.5 text-[12.5px] text-ink-2">
                {settingsLoading
                  ? "Sunucudaki durum okunuyor…"
                  : `${settings?.isOpen ? "Açık" : "Kapalı"} · ${modeLabels[settings?.effectiveMode ?? "AUTO"]}`}
              </p>
            </div>
            <Switch
              checked={settings?.isOpen ?? false}
              onChange={(next) => void saveSettings(next ? "OPEN" : "CLOSED")}
              label="Müşteri sipariş sistemini aç/kapat"
              disabled={settingsLoading || settingsSaving || !settings}
            />
          </div>

          <div className="flex items-center justify-between px-2 py-3.5 sm:px-4">
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-[14.5px] font-medium text-ink">Çalışma biçimi</p>
              <p className="mt-0.5 text-[12.5px] text-ink-2">
                Otomatik modda dağıtımdan önceki gün, belirlenen son saate kadar sipariş alınır.
              </p>
            </div>
            <Button
              size="sm"
              type="button"
              disabled={settingsLoading || settingsSaving || settings?.overrideMode === "AUTO"}
              onClick={() => void saveSettings("AUTO")}
            >
              Otomatik moda dön
            </Button>
          </div>

          <div className="flex items-center justify-between px-2 py-3.5 sm:px-4">
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-[14.5px] font-medium text-ink">Kapanış saati</p>
              <p className="mt-0.5 text-[12.5px] text-ink-2">
                Otomatik kapanışın uygulanacağı saat (varsayılan 18:00).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                aria-label="Kapanış saati"
                disabled={settingsLoading || settingsSaving}
                className="rounded-[10px] border border-hairline bg-surface-2 px-3 py-1.5 text-[14px] tabular-nums text-ink outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50"
              />
              <Button
                size="sm"
                type="button"
                disabled={settingsLoading || settingsSaving || !settings || cutoffTime === settings.cutoffTime}
                onClick={saveCutoff}
              >
                Saati kaydet
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 py-3.5 sm:px-4">
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-[14.5px] font-medium text-ink">Manuel işlem gerekçesi</p>
              <p className="mt-0.5 text-[12.5px] text-ink-2">
                Manuel açma ve kapatma işlemlerinde denetim kaydına yazılır.
              </p>
            </div>
            <input
              type="text"
              value={overrideReason}
              maxLength={300}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Örn. Yetkili talebi"
              aria-label="Manuel işlem gerekçesi"
              disabled={settingsLoading || settingsSaving}
              className="w-full max-w-[260px] rounded-[10px] border border-hairline bg-surface-2 px-3 py-1.5 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-between px-2 py-3.5 sm:px-4">
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-[14.5px] font-medium text-ink">Operasyon günü</p>
            </div>
            <span className="text-[14px] font-medium tabular-nums text-ink-2">
              {OPERATION_DATE}
            </span>
          </div>
        </div>
      </Panel>

      {/* İçerik */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Son Siparişler */}
        <div className="min-w-0 xl:col-span-2">
          <Panel
            title="Son Siparişler"
            description="Bir bayiye tıklayarak ayrıntıları görüntüleyin"
            action={
              <Link
                href="/admin/siparisler"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-accent transition-opacity hover:opacity-80"
              >
                Tümü
                <ChevronRight className="size-4" />
              </Link>
            }
            bodyClassName="px-2 pb-2"
          >
            <div className="hidden grid-cols-[1.8fr_1fr_0.8fr_0.8fr_auto] items-center gap-4 px-4 py-2 text-[12px] font-medium text-ink-3 sm:grid">
              <span>Bayi</span>
              <span>Durum</span>
              <span className="text-right">Kalem</span>
              <span className="text-right">Adet</span>
              <span className="w-8" />
            </div>

            <div className="space-y-0.5">
              {rows.map(({ customer, order, totals }) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setSelected(customer.id)}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-4 rounded-[12px] px-4 py-2.5 text-left transition-colors hover:bg-surface-2 sm:grid-cols-[1.8fr_1fr_0.8fr_0.8fr_auto]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[12px] font-semibold text-ink-2">
                      {initials(customer.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink">{customer.name}</p>
                      <p className="truncate text-[12px] text-ink-3">
                        {customer.type} · {customer.district}
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:block">
                    {order ? <StatusBadge status={order.status} /> : null}
                  </span>
                  <span className="hidden text-right text-[13px] tabular-nums text-ink-2 sm:block">
                    {order && order.lines.length > 0 ? order.lines.length : "—"}
                  </span>
                  <span className="hidden text-right text-[13px] font-medium tabular-nums text-ink sm:block">
                    {totals.units > 0 ? formatQty(totals.units) : "—"}
                  </span>
                  <span className="flex size-8 items-center justify-center justify-self-end rounded-full text-ink-3 hover:bg-surface-3">
                    <MoreHorizontal className="size-4" />
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* Son Etkinlik */}
        <div className="min-w-0 xl:col-span-1">
          <Panel title="Son Etkinlik">
            <ol className="space-y-3.5">
              {activity.slice(0, 5).map((item) => {
                const Icon = activityIcon[item.tone];
                return (
                  <li key={item.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2">
                      <Icon className={cn("size-3.5", activityColor[item.tone])} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-5 text-ink">{item.text}</p>
                      <p className="text-[12px] tabular-nums text-ink-3">{item.at}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>
      </div>

      <CustomerInspector customerId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

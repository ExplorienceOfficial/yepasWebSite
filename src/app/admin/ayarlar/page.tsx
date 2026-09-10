"use client";

import { CloudUpload, Loader2 } from "lucide-react";

import { PageHeading } from "@/components/admin/Panel";
import { NumberInput } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { useOperations } from "@/context/OperationsContext";
import { OPERATION_DATE } from "@/data/mockData";
import { cn } from "@/lib/format";
import { useTheme } from "@/lib/useTheme";
import type { OrderRule } from "@/types";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="px-1 pb-2 text-[13px] font-medium text-ink-2">{title}</h2>
      <div className="overflow-hidden rounded-[16px] bg-surface ring-1 ring-hairline shadow-[var(--shadow-sm)]">
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  title,
  description,
  control,
  children,
}: {
  title: string;
  description?: string;
  control?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-t border-hairline px-4 py-3.5 first:border-t-0">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-ink">{title}</p>
          {description && <p className="mt-0.5 text-[13px] leading-5 text-ink-2">{description}</p>}
        </div>
        {control && <div className="shrink-0">{control}</div>}
      </div>
      {children}
    </div>
  );
}

function ThemeRowSwitch() {
  const { dark, setDark } = useTheme();
  return <Switch checked={dark} onChange={setDark} label="Koyu mod" />;
}

const ruleOptions: { key: OrderRule; label: string }[] = [
  { key: "limit", label: "Sabit Limit" },
  { key: "average", label: "Geçmiş Ortalama" },
];

export default function SettingsPage() {
  const {
    orderSystemOpen,
    toggleOrderSystem,
    autoCloseEnabled,
    setAutoCloseEnabled,
    cutoffTime,
    setCutoffTime,
    orderRule,
    setOrderRule,
    maxQtyLimit,
    setMaxQtyLimit,
    syncToErp,
    syncing,
    lastSync,
    hasUnsyncedChanges,
  } = useOperations();

  return (
    <div className="yp-rise mx-auto max-w-[680px]">
      <PageHeading title="Ayarlar" description="Sipariş sistemi, kurallar, senkronizasyon ve görünüm." />

      <div className="space-y-7">
        <Group title="Genel">
          <SettingRow
            title="Müşteri sipariş sistemi"
            description="Açıkken bayiler bugünkü üretim için sipariş girebilir."
            control={
              <Switch
                checked={orderSystemOpen}
                onChange={toggleOrderSystem}
                label="Müşteri sipariş sistemini aç/kapat"
              />
            }
          />
          <SettingRow
            title="Kapanış saatinde otomatik kapat"
            description={`Açıkken sistem her gün ${cutoffTime}'de otomatik kapanır; kapalıyken elle kapatırsınız.`}
            control={
              <Switch checked={autoCloseEnabled} onChange={setAutoCloseEnabled} label="Saat bazlı otomatik kapatma" />
            }
          />
          <SettingRow
            title="Kapanış saati"
            description="Otomatik kapanışın uygulanacağı saat (varsayılan 18:00)."
            control={
              <input
                type="time"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                aria-label="Kapanış saati"
                className="rounded-[10px] border border-hairline bg-surface-2 px-3 py-2 text-[14px] tabular-nums text-ink outline-none transition-colors focus:border-transparent focus:ring-4 focus:ring-[var(--ring)]"
              />
            }
          />
          <SettingRow
            title="Operasyon günü"
            control={<span className="text-[15px] tabular-nums text-ink-2">{OPERATION_DATE}</span>}
          />
        </Group>

        <Group title="Maksimum Ürün Adeti Kuralı">
          <SettingRow
            title="Kural tipi"
            description="Bir müşterinin ürün başına geçebileceği üst sınır nasıl belirlensin?"
          >
            <div className="mt-3 inline-flex items-center gap-1 rounded-[10px] bg-surface-2 p-1">
              {ruleOptions.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setOrderRule(o.key)}
                  className={cn(
                    "rounded-[8px] px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150",
                    orderRule === o.key ? "bg-surface text-ink shadow-[var(--shadow-sm)]" : "text-ink-2 hover:text-ink",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </SettingRow>

          {orderRule === "limit" ? (
            <SettingRow
              title="Maksimum adet sınırı"
              description="Tüm ürünler için üst tavan. Ürünün kendi limiti daha düşükse o geçerli olur."
              control={
                <NumberInput
                  value={maxQtyLimit}
                  min={0}
                  step={50}
                  onChange={(e) => setMaxQtyLimit(Number(e.target.value) || 0)}
                  className="w-28 text-center"
                  aria-label="Maksimum adet sınırı"
                />
              }
            />
          ) : (
            <SettingRow
              title="Geçmiş ortalama"
              description="Her ürün, kendi geçmiş ortalama adedini üst sınır olarak kullanır."
              control={<span className="text-[13px] text-ink-3">ürün bazlı</span>}
            />
          )}
        </Group>

        <Group title="Senkronizasyon">
          <SettingRow
            title="Sipariş programına aktar"
            description={hasUnsyncedChanges ? "Aktarılmamış değişiklikler var." : `Son aktarım: ${lastSync.at}`}
            control={
              <button
                type="button"
                onClick={syncToErp}
                disabled={syncing}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-medium text-white transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
              >
                {syncing ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload className="size-4" strokeWidth={2} />}
                {syncing ? "Aktarılıyor" : "Şimdi aktar"}
              </button>
            }
          />
        </Group>

        <Group title="Görünüm">
          <SettingRow
            title="Koyu mod"
            description="Arayüzü macOS koyu görünümüne çevirir."
            control={<ThemeRowSwitch />}
          />
        </Group>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronRight, Loader2, CloudUpload } from "lucide-react";

import { PageHeading } from "@/components/admin/Panel";
import { Switch } from "@/components/ui/Switch";
import { useOperations } from "@/context/OperationsContext";
import { OPERATION_DATE, ORDER_CUTOFF } from "@/data/mockData";
import { cn } from "@/lib/format";
import { useTheme } from "@/lib/useTheme";

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
  onClick,
}: {
  title: string;
  description?: string;
  control?: React.ReactNode;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 border-t border-hairline px-4 py-3.5 text-left first:border-t-0",
        onClick && "transition-colors hover:bg-surface-2",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-ink">{title}</p>
        {description && <p className="mt-0.5 text-[13px] leading-5 text-ink-2">{description}</p>}
      </div>
      {control}
    </Comp>
  );
}

function ThemeRowSwitch() {
  const { dark, setDark } = useTheme();
  return <Switch checked={dark} onChange={setDark} label="Koyu mod" />;
}

export default function SettingsPage() {
  const {
    orderSystemOpen,
    toggleOrderSystem,
    syncToErp,
    syncing,
    lastSync,
    hasUnsyncedChanges,
  } = useOperations();

  const [autoSync, setAutoSync] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [criticalNotif, setCriticalNotif] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  const chevron = <ChevronRight className="size-4 text-ink-3" />;

  return (
    <div className="yp-rise mx-auto max-w-[720px]">
      <PageHeading
        title="Ayarlar"
        description="Sistem, senkronizasyon, görünüm ve güvenlik tercihleri."
      />

      <div className="space-y-7">
        <Group title="Genel">
          <SettingRow
            title="Müşteri sipariş sistemi"
            description="Açıkken bayiler yarınki üretim için sipariş girebilir."
            control={
              <Switch
                checked={orderSystemOpen}
                onChange={toggleOrderSystem}
                label="Müşteri sipariş sistemini aç/kapat"
              />
            }
          />
          <SettingRow title="Operasyon günü" control={<span className="text-[15px] tabular-nums text-ink-2">{OPERATION_DATE}</span>} onClick={() => {}} />
          <SettingRow
            title="Sipariş kapanış saati"
            control={<span className="text-[15px] tabular-nums text-ink-2">{ORDER_CUTOFF}</span>}
            onClick={() => {}}
          />
        </Group>

        <Group title="Senkronizasyon">
          <SettingRow
            title="ERP aktarımı"
            description={
              hasUnsyncedChanges
                ? "Aktarılmamış değişiklikler var."
                : `Son aktarım: ${lastSync.at}`
            }
            control={
              <button
                type="button"
                onClick={syncToErp}
                disabled={syncing}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[13px] font-medium text-white transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
              >
                {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <CloudUpload className="size-3.5" strokeWidth={2} />}
                {syncing ? "Aktarılıyor" : "Şimdi aktar"}
              </button>
            }
          />
          <SettingRow
            title="Otomatik aktarım"
            description="Kapanış saatinde onaylı siparişleri otomatik gönder."
            control={<Switch checked={autoSync} onChange={setAutoSync} label="Otomatik aktarım" />}
          />
        </Group>

        <Group title="Görünüm">
          <SettingRow
            title="Koyu mod"
            description="Arayüzü macOS koyu görünümüne çevirir."
            control={<ThemeRowSwitch />}
          />
        </Group>

        <Group title="Bildirimler">
          <SettingRow
            title="E-posta bildirimleri"
            description="Günlük özet ve aktarım raporları."
            control={<Switch checked={emailNotif} onChange={setEmailNotif} label="E-posta bildirimleri" />}
          />
          <SettingRow
            title="Kritik uyarılar"
            description="Kasa kapasitesi aşımı ve giriş gecikmeleri."
            control={<Switch checked={criticalNotif} onChange={setCriticalNotif} label="Kritik uyarılar" />}
          />
        </Group>

        <Group title="Güvenlik">
          <SettingRow
            title="İki adımlı doğrulama"
            description="Yönetici girişinde ek doğrulama iste."
            control={<Switch checked={twoFactor} onChange={setTwoFactor} label="İki adımlı doğrulama" />}
          />
          <SettingRow title="Oturum zaman aşımı" control={<span className="text-[15px] text-ink-2">30 dk</span>} onClick={() => {}} />
          <SettingRow title="Denetim kayıtları" control={chevron} onClick={() => {}} />
        </Group>
      </div>
    </div>
  );
}

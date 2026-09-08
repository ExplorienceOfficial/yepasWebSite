import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck } from "lucide-react";

import { OPERATION_DATE, ORDER_CUTOFF } from "@/data/mockData";

const entries = [
  {
    href: "/admin/giris",
    icon: ShieldCheck,
    title: "Yönetim Konsolu",
    description:
      "Siparişleri inceleyin, üretim emrini oluşturun, ürün limitlerini yönetin ve ERP aktarımını başlatın.",
    points: ["Analitik & kontrol paneli", "Sipariş ve ürün yönetimi", "Sistem ayarları"],
    chip: "bg-accent text-white",
  },
  {
    href: "/sofor/giris",
    icon: Truck,
    title: "Şoför Portalı",
    description:
      "Kendi rotanızdaki bayileri durak sırasıyla görün, araç yükleme listenizi alın ve teslimatları işaretleyin.",
    points: ["Günlük rota listesi", "Araç yükleme özeti", "Teslimat takibi"],
    chip: "bg-ink text-[var(--canvas)]",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-[9px] bg-ink text-[15px] font-bold text-[var(--canvas)]">
              Y
            </span>
            <div className="leading-tight">
              <p className="text-[15px] font-semibold tracking-tight text-ink">Yepaş</p>
              <p className="text-[11px] text-ink-3">Yönetim Konsolu</p>
            </div>
          </div>
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-[11px] font-medium text-ink-3">Aktif Operasyon Günü</p>
            <p className="text-[13px] font-medium tabular-nums text-ink-2">
              {OPERATION_DATE} · kapanış {ORDER_CUTOFF}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col justify-center px-6 py-16">
        <div className="yp-rise max-w-2xl">
          <p className="text-[13px] font-medium text-accent">Giriş</p>
          <h1 className="mt-2 text-[40px] font-semibold leading-[1.08] tracking-tight text-ink">
            Nasıl devam etmek
            <br />
            istersiniz?
          </h1>
          <p className="mt-4 text-[17px] leading-7 text-ink-2">
            Yönetim ve dağıtım ekranları ayrı giriş kullanır. Rolünüze ait alanı seçin.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {entries.map((entry, i) => {
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                style={{ animationDelay: `${80 + i * 70}ms` }}
                className="yp-rise group flex flex-col rounded-[20px] bg-surface p-7 ring-1 ring-hairline shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)]"
              >
                <span className={`flex size-12 items-center justify-center rounded-[14px] ${entry.chip}`}>
                  <Icon className="size-6" strokeWidth={1.8} />
                </span>

                <h2 className="mt-6 text-[22px] font-semibold tracking-tight text-ink">{entry.title}</h2>
                <p className="mt-2 flex-1 text-[15px] leading-6 text-ink-2">{entry.description}</p>

                <ul className="mt-6 space-y-2.5">
                  {entry.points.map((point) => (
                    <li key={point} className="flex items-center gap-2.5 text-[14px] text-ink-2">
                      <span className="size-1 rounded-full bg-ink-3" />
                      {point}
                    </li>
                  ))}
                </ul>

                <span className="mt-7 inline-flex items-center gap-1.5 text-[15px] font-medium text-accent">
                  Devam et
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-hairline">
        <p className="mx-auto max-w-[1100px] px-6 py-4 text-[12px] text-ink-3">
          Demo sürümü — veriler örnek operasyon verisidir, veritabanı bağlantısı bulunmamaktadır.
        </p>
      </footer>
    </div>
  );
}

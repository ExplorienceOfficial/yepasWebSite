/**
 * Grafikler için sentetik ama gerçekçi trend serileri. Tamamen deterministiktir
 * (Math.random yok) — böylece sunucu ve istemci render'ı birebir aynı olur ve
 * hydration uyumsuzluğu oluşmaz. Yepaş demo verisi tek gün olduğu için genel
 * bakış grafiği bu türetilmiş eğriyi kullanır.
 */

export type ChartRange = "7D" | "30D" | "3M" | "6M" | "1Y";
export type ChartMetric = "units" | "orders";

export interface SeriesPoint {
  label: string;
  value: number;
}

const BASE: Record<ChartMetric, number> = {
  units: 6940,
  orders: 17,
};

const RANGE: Record<ChartRange, { points: number; step: number }> = {
  "7D": { points: 7, step: 1 },
  "30D": { points: 30, step: 1 },
  "3M": { points: 13, step: 7 },
  "6M": { points: 13, step: 14 },
  "1Y": { points: 12, step: 30 },
};

// Operasyon referans günü (OPERATION_DATE ile uyumlu): 8 Eylül 2026
const TODAY = new Date(2026, 8, 8);

function dayValue(base: number, i: number): number {
  const wave =
    1 +
    0.22 * Math.sin(i * 0.34) +
    0.1 * Math.sin(i * 0.13 + 1.1) +
    0.06 * Math.sin(i * 0.9 + 0.4) +
    0.0007 * i; // hafif yükseliş trendi
  return Math.max(base * 0.35, base * wave);
}

function labelFor(offsetDays: number, range: ChartRange): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - offsetDays);
  if (range === "7D") {
    return d.toLocaleDateString("tr-TR", { weekday: "short" });
  }
  if (range === "30D") {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  }
  if (range === "1Y") {
    return d.toLocaleDateString("tr-TR", { month: "short" });
  }
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

export function getSeries(metric: ChartMetric, range: ChartRange): SeriesPoint[] {
  const base = BASE[metric];
  const { points, step } = RANGE[range];
  const out: SeriesPoint[] = [];
  for (let k = 0; k < points; k++) {
    const offset = (points - 1 - k) * step; // en yeni nokta en sağda
    const dayIndex = 400 - offset; // sabit faz
    const value = Math.round(dayValue(base, dayIndex));
    out.push({ label: labelFor(offset, range), value });
  }
  return out;
}

/** Bir önceki döneme göre yaklaşık değişim yüzdesi (KPI oklarında kullanılır). */
export function periodDelta(metric: ChartMetric): number {
  const s = getSeries(metric, "30D");
  const recent = s.slice(-7).reduce((a, b) => a + b.value, 0);
  const prev = s.slice(-14, -7).reduce((a, b) => a + b.value, 0);
  if (prev === 0) return 0;
  return Math.round(((recent - prev) / prev) * 1000) / 10;
}

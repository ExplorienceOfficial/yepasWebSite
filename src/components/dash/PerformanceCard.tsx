"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { LineChart } from "@/components/dash/LineChart";
import { getSeries, type ChartMetric, type ChartRange } from "@/data/trends";
import { cn, formatQty } from "@/lib/format";

const metrics: { key: ChartMetric; label: string }[] = [
  { key: "units", label: "Üretim" },
  { key: "orders", label: "Sipariş" },
];

const ranges: ChartRange[] = ["7D", "30D", "3M", "6M", "1Y"];

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-[10px] bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-[8px] px-3 py-1 text-[13px] font-medium transition-all duration-150",
            value === o.key
              ? "bg-surface text-ink shadow-[var(--shadow-sm)]"
              : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PerformanceCard() {
  const [metric, setMetric] = useState<ChartMetric>("units");
  const [range, setRange] = useState<ChartRange>("30D");

  const series = useMemo(() => getSeries(metric, range), [metric, range]);
  const fmt = formatQty;

  const last = series[series.length - 1]?.value ?? 0;
  const first = series[0]?.value ?? 0;
  const delta = first ? Math.round(((last - first) / first) * 1000) / 10 : 0;
  const up = delta >= 0;

  return (
    <section className="rounded-[18px] bg-surface ring-1 ring-hairline shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-4 px-6 pt-5 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">Performans</h2>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="text-[28px] font-semibold leading-none tracking-tight text-ink tabular-nums">
              {fmt(last)}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[13px] font-medium",
                up ? "text-[var(--ok)]" : "text-[var(--bad)]",
              )}
            >
              <ArrowUpRight className={cn("size-3.5", !up && "rotate-90")} strokeWidth={2} />
              {up ? "+" : ""}
              {delta}%
            </span>
          </div>
        </div>
        <Segmented value={metric} options={metrics} onChange={setMetric} />
      </div>

      <div className="px-4 sm:px-6">
        <LineChart points={series} formatValue={fmt} animateKey={`${metric}-${range}`} />
      </div>

      <div className="flex items-center justify-end gap-0.5 px-6 pb-4 pt-1">
        <div className="inline-flex items-center gap-0.5 rounded-[10px] bg-surface-2 p-0.5">
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-[8px] px-2.5 py-1 text-[12px] font-medium tabular-nums transition-all duration-150",
                range === r ? "bg-surface text-ink shadow-[var(--shadow-sm)]" : "text-ink-2 hover:text-ink",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

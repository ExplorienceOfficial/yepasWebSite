import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/format";

export function MetricCard({
  label,
  value,
  delta,
  caption = "önceki döneme göre",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  /** Yüzde değişim; verilmezse ok gösterilmez */
  delta?: number;
  caption?: string;
  icon: LucideIcon;
}) {
  const up = (delta ?? 0) >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="group rounded-[18px] bg-surface p-5 ring-1 ring-hairline shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-ink-2">
          <Icon className="size-[17px]" strokeWidth={1.8} />
        </span>
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
      </div>

      <div className="mt-4 text-[32px] font-semibold leading-none tracking-tight text-ink tabular-nums">
        {value}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[13px]">
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium tabular-nums",
              up ? "text-[var(--ok)]" : "text-[var(--bad)]",
            )}
          >
            <Arrow className="size-3.5" strokeWidth={2} />
            {up ? "+" : ""}
            {delta}%
          </span>
        )}
        <span className="text-ink-3">{caption}</span>
      </div>
    </div>
  );
}

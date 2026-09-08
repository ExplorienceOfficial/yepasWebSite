import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/format";

type Tone = "neutral" | "success" | "danger" | "warning" | "accent";

const iconTones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  success: "bg-[var(--ok-soft)] text-[var(--ok)]",
  danger: "bg-[var(--bad-soft)] text-[var(--bad)]",
  warning: "bg-[var(--warn-soft)] text-[var(--warn)]",
  accent: "bg-accent text-white",
};

export function KpiCard({
  label,
  value,
  unit,
  sub,
  icon: Icon,
  tone = "neutral",
  footer,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  icon: LucideIcon;
  tone?: Tone;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] bg-surface p-5 ring-1 ring-hairline shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-8 items-center justify-center rounded-full", iconTones[tone])}>
          <Icon className="size-[17px]" strokeWidth={1.8} />
        </span>
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-[28px] font-semibold leading-none tracking-tight text-ink tabular-nums">
          {value}
        </span>
        {unit && <span className="text-[13px] font-medium text-ink-3">{unit}</span>}
      </div>

      {sub && <p className="mt-2 text-[13px] leading-5 text-ink-2">{sub}</p>}
      {footer && <div className="mt-4 border-t border-hairline pt-3.5">{footer}</div>}
    </div>
  );
}

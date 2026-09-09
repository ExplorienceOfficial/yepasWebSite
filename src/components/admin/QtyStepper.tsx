"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/format";

export function QtyStepper({
  value,
  max,
  step = 10,
  onChange,
  disabled,
  className,
}: {
  value: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const clamp = (next: number) => Math.max(0, Math.min(next, max));
  const atMax = value >= max;

  return (
    <div
      className={cn(
        "inline-flex h-9 items-stretch overflow-hidden rounded-[10px] bg-surface-2",
        disabled && "opacity-60",
        className,
      )}
    >
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => onChange(clamp(value - step))}
        aria-label="Azalt"
        className="flex w-8 items-center justify-center text-ink-2 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:text-ink-3/50"
      >
        <Minus className="size-3.5" />
      </button>

      <input
        type="number"
        value={value}
        disabled={disabled}
        min={0}
        max={max}
        onChange={(event) => onChange(clamp(Number(event.target.value) || 0))}
        className={cn(
          "w-14 bg-transparent text-center text-sm tabular-nums outline-none",
          atMax ? "text-[var(--warn)]" : "text-ink",
        )}
      />

      <button
        type="button"
        disabled={disabled || atMax}
        onClick={() => onChange(clamp(value + step))}
        aria-label="Artır"
        title={atMax ? `Maksimum limit: ${max}` : undefined}
        className="flex w-8 items-center justify-center text-ink-2 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:text-ink-3/50"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

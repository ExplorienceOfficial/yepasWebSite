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
        "inline-flex h-8 items-stretch overflow-hidden rounded-md border border-zinc-300 bg-white",
        disabled && "opacity-60",
        className,
      )}
    >
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => onChange(clamp(value - step))}
        aria-label="Azalt"
        className="flex w-7 items-center justify-center text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent"
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
          "w-14 border-x border-zinc-200 text-center font-mono text-sm tabular-nums outline-none",
          "focus:bg-amber-50/60",
          atMax ? "text-amber-700" : "text-zinc-900",
        )}
      />

      <button
        type="button"
        disabled={disabled || atMax}
        onClick={() => onChange(clamp(value + step))}
        aria-label="Artır"
        title={atMax ? `Maksimum sipariş limiti: ${max}` : undefined}
        className="flex w-7 items-center justify-center text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

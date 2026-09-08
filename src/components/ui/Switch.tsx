"use client";

import { cn } from "@/lib/format";

export function Switch({
  checked,
  onChange,
  label,
  size = "md",
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const track = size === "md" ? "h-[26px] w-[42px]" : "h-[22px] w-[36px]";
  const knob = size === "md" ? "size-[22px]" : "size-[18px]";
  const shift = size === "md" ? "translate-x-[16px]" : "translate-x-[14px]";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full p-[2px] transition-colors duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]",
        track,
        checked ? "bg-[var(--ok)]" : "bg-surface-3",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-out",
          knob,
          checked ? shift : "translate-x-0",
        )}
      />
    </button>
  );
}

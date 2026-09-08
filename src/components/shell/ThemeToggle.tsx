"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/useTheme";

export function ThemeToggle() {
  const { dark, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Açık moda geç" : "Koyu moda geç"}
      title={dark ? "Açık mod" : "Koyu mod"}
      className="flex size-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink active:scale-95"
    >
      {dark ? <Sun className="size-[18px]" strokeWidth={1.8} /> : <Moon className="size-[18px]" strokeWidth={1.8} />}
    </button>
  );
}

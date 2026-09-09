"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Check, Sparkles } from "lucide-react";
import { DELIVERY_DATE, NEXT_DATE, ORDER_DATE } from "@/data/mockData";
import { cn } from "@/lib/format";
import type { OrderDay } from "@/types";

export interface DatePickerPopoverProps {
  value?: OrderDay;
  onChange?: (day: OrderDay) => void;
  className?: string;
  align?: "left" | "right";
}

const dayDetails: Record<OrderDay, { date: string; short: string; label: string; tag: string; dayNum: number }> = {
  delivery: {
    date: DELIVERY_DATE,
    short: "9 Eylül Çar",
    label: "Bugün Dağıtılacak",
    tag: "Dün verilen siparişler",
    dayNum: 9,
  },
  today: {
    date: ORDER_DATE,
    short: "10 Eylül Per",
    label: "Bugün Verilen",
    tag: "Yeni alınan siparişler",
    dayNum: 10,
  },
  next: {
    date: NEXT_DATE,
    short: "11 Eylül Cum",
    label: "1 Sonraki Gün",
    tag: "Yarın dağıtılacak siparişler",
    dayNum: 11,
  },
};

const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function DatePickerPopover({
  value = "today",
  onChange,
  className,
  align = "right",
}: DatePickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMonth, setActiveMonth] = useState({ year: 2026, monthName: "Eylül" });
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentInfo = dayDetails[value];

  // Dışarı tıklama ve ESC ile kapatma
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (dayKey: OrderDay) => {
    onChange?.(dayKey);
    setIsOpen(false);
  };

  // Eylül 2026: 30 gün, 1 Eylül Salı günü başlıyor (Pazartesi boşluğu = 1)
  const SeptemberDays = Array.from({ length: 30 }, (_, i) => i + 1);
  const firstDayOffset = 1; // Salı

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Takvim Tetikleyici Buton */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] font-medium text-ink ring-1 ring-hairline transition-all duration-150 hover:bg-surface-2 hover:ring-hairline/80 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] active:scale-[0.98]",
          isOpen && "bg-surface-2 ring-2 ring-[var(--ring)]",
          className,
        )}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Calendar className="size-4 text-accent shrink-0" strokeWidth={1.8} />
        <span className="tabular-nums font-semibold tracking-tight">{currentInfo.date}</span>
        <ChevronDown
          className={cn("size-3.5 text-ink-3 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      {/* Popover Takvim Paneli */}
      {isOpen && (
        <div
          className={cn(
            "yp-rise absolute top-full mt-2 z-50 w-[320px] rounded-[20px] border border-hairline bg-surface/95 p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl transition-all",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {/* Üst Başlık & Ay Değiştirici */}
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-[14px] font-semibold text-ink">
              {activeMonth.monthName} {activeMonth.year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveMonth({ year: 2026, monthName: "Ağustos" })}
                className="flex size-7 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors"
                title="Önceki Ay"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveMonth({ year: 2026, monthName: "Ekim" })}
                className="flex size-7 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors"
                title="Sonraki Ay"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Hızlı Gün Seçimi (Preset Pills) */}
          <div className="mb-3.5 flex flex-col gap-1.5 rounded-[14px] bg-surface-2/60 p-1.5 border border-hairline/40">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Hızlı Tarih Seçimi</p>

            <button
              type="button"
              onClick={() => handleSelect("delivery")}
              className={cn(
                "flex items-center justify-between rounded-[10px] px-2.5 py-1.5 text-left transition-all duration-150",
                value === "delivery"
                  ? "bg-surface shadow-[var(--shadow-sm)] ring-1 ring-hairline text-ink"
                  : "hover:bg-surface/50 text-ink-2",
              )}
            >
              <div>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <span>9 Eylül Çar</span>
                  <span className="rounded-md bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    Dün
                  </span>
                </div>
                <p className="text-[11px] text-ink-3">Bugün Dağıtılacak</p>
              </div>
              {value === "delivery" && <Check className="size-4 text-accent shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleSelect("today")}
              className={cn(
                "flex items-center justify-between rounded-[10px] px-2.5 py-1.5 text-left transition-all duration-150",
                value === "today"
                  ? "bg-surface shadow-[var(--shadow-sm)] ring-1 ring-hairline text-ink"
                  : "hover:bg-surface/50 text-ink-2",
              )}
            >
              <div>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <span>10 Eylül Per</span>
                  <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Bugün
                  </span>
                </div>
                <p className="text-[11px] text-ink-3">Bugün Verilen Siparişler</p>
              </div>
              {value === "today" && <Check className="size-4 text-accent shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => handleSelect("next")}
              className={cn(
                "flex items-center justify-between rounded-[10px] px-2.5 py-1.5 text-left transition-all duration-150",
                value === "next"
                  ? "bg-surface shadow-[var(--shadow-sm)] ring-1 ring-hairline text-ink"
                  : "hover:bg-surface/50 text-ink-2",
              )}
            >
              <div>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <span>11 Eylül Cum</span>
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-accent/10 px-1.5 py-0.2 text-[10px] font-medium text-accent">
                    <Sparkles className="size-2.5" /> 1 Sonraki Gün
                  </span>
                </div>
                <p className="text-[11px] text-ink-3">Yarın Dağıtılacak Siparişler</p>
              </div>
              {value === "next" && <Check className="size-4 text-accent shrink-0" />}
            </button>
          </div>

          {/* İnteraktif Takvim Izgarası */}
          <div className="mb-2">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-3 mb-1">
              {weekDays.map((wd) => (
                <div key={wd} className="py-1">
                  {wd}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-[12px] tabular-nums">
              {/* Salı günü başlama offset boşluğu */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`offset-${i}`} className="h-8" />
              ))}

              {SeptemberDays.map((d) => {
                const isDelivery = d === 9;
                const isToday = d === 10;
                const isNext = d === 11;
                const isSelected =
                  (value === "delivery" && isDelivery) ||
                  (value === "today" && isToday) ||
                  (value === "next" && isNext);

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      if (isDelivery) handleSelect("delivery");
                      else if (isToday) handleSelect("today");
                      else if (isNext) handleSelect("next");
                      else handleSelect("next"); // Diğer günler için 1 sonraki gün varsayılan
                    }}
                    className={cn(
                      "relative flex h-8 items-center justify-center rounded-[8px] font-medium transition-all duration-150",
                      isSelected
                        ? "bg-accent text-white shadow-sm font-bold scale-[1.04]"
                        : isDelivery || isToday || isNext
                        ? "bg-surface-2 text-ink font-semibold hover:bg-surface-3"
                        : "text-ink-2 hover:bg-surface-2/60",
                    )}
                  >
                    {d}
                    {/* Alt nokta göstergeleri */}
                    {isDelivery && !isSelected && (
                      <span className="absolute bottom-0.5 size-1 rounded-full bg-amber-500" />
                    )}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-0.5 size-1 rounded-full bg-emerald-500" />
                    )}
                    {isNext && !isSelected && (
                      <span className="absolute bottom-0.5 size-1 rounded-full bg-accent" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alt Bilgi Bandı */}
          <div className="mt-3 border-t border-hairline pt-2.5 text-center text-[11px] text-ink-3">
            Seçili: <span className="font-semibold text-ink">{currentInfo.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}

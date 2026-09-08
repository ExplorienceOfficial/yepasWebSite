import { cn } from "@/lib/format";
import type { OrderStatus } from "@/types";

type Tone = "green" | "red" | "amber" | "zinc" | "blue";

const toneClasses: Record<Tone, string> = {
  green: "bg-[var(--ok-soft)] text-[var(--ok)]",
  red: "bg-[var(--bad-soft)] text-[var(--bad)]",
  amber: "bg-[var(--warn-soft)] text-[var(--warn)]",
  zinc: "bg-surface-2 text-ink-2",
  blue: "bg-accent-soft text-accent",
};

const dotClasses: Record<Tone, string> = {
  green: "bg-[var(--ok)]",
  red: "bg-[var(--bad)]",
  amber: "bg-[var(--warn)]",
  zinc: "bg-ink-3",
  blue: "bg-accent",
};

export function Badge({
  tone = "zinc",
  dot = false,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-none",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dotClasses[tone])} />}
      {children}
    </span>
  );
}

const statusMap: Record<OrderStatus, { label: string; tone: Tone }> = {
  ordered: { label: "Sipariş Verildi", tone: "green" },
  declined: { label: "Ürün İstemedi", tone: "red" },
  pending: { label: "Beklemede", tone: "amber" },
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const config = statusMap[status];
  return (
    <Badge tone={config.tone} dot className={className}>
      {config.label}
    </Badge>
  );
}

export const statusLabel = (status: OrderStatus) => statusMap[status].label;

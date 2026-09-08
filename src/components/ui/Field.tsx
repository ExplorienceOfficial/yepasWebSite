import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/format";

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-[13px] font-medium text-ink-2", className)}>{children}</span>;
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1.5 text-xs leading-4 text-ink-3">{hint}</p>}
    </label>
  );
}

const control =
  "w-full rounded-[10px] border border-hairline bg-surface-2 px-3.5 py-2.5 text-sm text-ink " +
  "placeholder:text-ink-3 transition-all duration-150 " +
  "focus:border-transparent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-[var(--ring)] " +
  "disabled:opacity-50";

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cn("relative block", className)}>
      <select className={cn(control, "appearance-none pr-9")} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
    </span>
  );
}

export function NumberInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      inputMode="numeric"
      className={cn(control, "tabular-nums", className)}
      {...props}
    />
  );
}

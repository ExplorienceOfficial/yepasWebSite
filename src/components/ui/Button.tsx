import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:opacity-90 disabled:opacity-40",
  secondary:
    "bg-surface-2 text-ink hover:bg-surface-3 active:opacity-90 disabled:opacity-40",
  ghost:
    "bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-40",
  danger:
    "bg-[var(--bad)] text-white hover:opacity-90 active:opacity-80 disabled:opacity-40",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px] gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[10px] font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]",
        "disabled:cursor-not-allowed active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

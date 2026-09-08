import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OPERATION_DATE, ORDER_CUTOFF } from "@/data/mockData";

export function LoginLayout({
  eyebrow,
  title,
  description,
  highlights,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  image?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[380px]">
        {/* Marka */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-[13px] bg-ink text-lg font-bold text-[var(--canvas)]">
            Y
          </span>
          <p className="mt-3 text-[13px] font-medium text-accent">{eyebrow}</p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-[14px] leading-6 text-ink-2">{description}</p>
        </div>

        {children}

        {highlights.length > 0 && (
          <ul className="mt-6 space-y-2">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-ink-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-3" />
                {item}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-hairline pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Geri
          </Link>
          <p className="text-[12px] tabular-nums text-ink-3">
            {OPERATION_DATE} · kapanış {ORDER_CUTOFF}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DemoHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-[12px] bg-surface-2 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">Demo Erişimi</p>
      <div className="mt-2 space-y-1 text-[13px] leading-5 text-ink-2">{children}</div>
    </div>
  );
}

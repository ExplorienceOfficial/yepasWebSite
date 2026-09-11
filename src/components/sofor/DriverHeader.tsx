"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { useAuth } from "@/context/AuthContext";

export function DriverHeader() {
  const router = useRouter();
  const { session, logout } = useAuth();

  if (session?.role !== "driver") return null;

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  return (
    <header className="glass sticky top-0 z-30 border-b border-amber-500/20 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-amber-500 to-orange-500 text-[15px] font-bold text-white shadow-[0_2px_8px_rgba(249,115,22,0.3)]">
          Y
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-semibold tracking-tight text-ink">{session.name}</p>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/30">
              Şoför
            </span>
          </div>
          <p className="truncate text-[12px] tabular-nums text-ink-3">
            {session.code} · {session.plate}
          </p>
        </div>
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Oturumu kapat"
          className="flex size-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <LogOut className="size-[18px]" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}

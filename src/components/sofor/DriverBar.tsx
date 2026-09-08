"use client";

import { useRouter } from "next/navigation";
import { LogOut, Truck } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useOperations } from "@/context/OperationsContext";
import { OPERATION_DATE } from "@/data/mockData";
import { cn } from "@/lib/format";

export function DriverBar() {
  const router = useRouter();
  const { session, logout } = useAuth();
  const { orderSystemOpen } = useOperations();

  if (session?.role !== "driver") return null;

  const handleLogout = () => {
    logout();
    router.replace("/sofor/giris");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded bg-amber-600 text-white">
          <Truck className="size-4" />
        </span>

        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-zinc-900">{session.name}</p>
          <p className="truncate font-mono text-[11px] text-zinc-500">
            {session.code} · {session.plate}
          </p>
        </div>

        <div className="hidden text-right leading-tight sm:block">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Teslimat Günü
          </p>
          <p className="text-xs font-medium text-zinc-800">{OPERATION_DATE}</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">Çıkış</span>
        </button>
      </div>

      <div className="border-t border-zinc-100 bg-zinc-50/70">
        <p className="mx-auto flex max-w-4xl items-center gap-1.5 px-4 py-1.5 text-[11px] text-zinc-500">
          <span
            className={cn(
              "size-1.5 rounded-full",
              orderSystemOpen ? "bg-amber-500" : "bg-emerald-500",
            )}
          />
          {orderSystemOpen
            ? "Sipariş sistemi hâlâ açık — listede değişiklik olabilir."
            : "Sipariş sistemi kapandı, liste kesinleşti."}
        </p>
      </div>
    </header>
  );
}

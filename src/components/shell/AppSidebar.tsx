"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  LayoutGrid,
  LogOut,
  MessageSquareQuote,
  Package,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useOperations } from "@/context/OperationsContext";
import { cn, initials } from "@/lib/format";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "pending";
}

const items: Item[] = [
  { href: "/admin", label: "Kontrol Paneli", icon: LayoutGrid },
  { href: "/admin/siparisler", label: "Siparişler", icon: ClipboardList, badgeKey: "pending" },
  { href: "/admin/urunler", label: "Ürünler", icon: Package },
  { href: "/admin/sofor-yonetimi", label: "Şoför Yönetimi", icon: Truck },
  { href: "/admin/musteri-yanitlari", label: "Müşteri Yanıtları", icon: MessageSquareQuote },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { metrics } = useOperations();
  const { session, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Marka */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex size-8 items-center justify-center rounded-[9px] bg-ink text-[15px] font-bold text-[var(--canvas)]">
          Y
        </span>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold tracking-tight text-ink">Yepaş</p>
          <p className="text-[11px] text-ink-3">Yönetim Konsolu</p>
        </div>
      </div>

      {/* Gezinme */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const badge = item.badgeKey === "pending" && metrics.pending > 0 ? metrics.pending : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-[15px] transition-colors duration-150",
                active ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2/70 hover:text-ink",
              )}
            >
              <Icon className={cn("size-[19px] shrink-0", active ? "text-ink" : "text-ink-3")} strokeWidth={1.8} />
              <span className="flex-1 truncate">{item.label}</span>
              {badge != null && (
                <span className="rounded-full bg-[var(--warn-soft)] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--warn)]">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profil */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 hover:bg-surface-2/70">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-semibold text-ink-2">
            {session?.role === "admin" ? initials(session.name) : "—"}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[14px] font-medium text-ink">
              {session?.role === "admin" ? session.name : "Oturum yok"}
            </p>
            <p className="truncate text-[12px] text-ink-3">
              {session?.role === "admin" ? session.title : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Oturumu kapat"
            title="Oturumu kapat"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <LogOut className="size-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
}

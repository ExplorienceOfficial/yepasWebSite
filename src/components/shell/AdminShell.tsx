"use client";

import { useState } from "react";

import { AppSidebar } from "@/components/shell/AppSidebar";
import { TopBar } from "@/components/shell/TopBar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Masaüstü sabit ray */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-hairline bg-surface lg:block">
        <AppSidebar />
      </aside>

      {/* Mobil çekmece */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="yp-fade absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="yp-slide-left absolute inset-y-0 left-0 w-[17rem] border-r border-hairline bg-surface">
            <AppSidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* İçerik */}
      <div className="lg:pl-60">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-[1200px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

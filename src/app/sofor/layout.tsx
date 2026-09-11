"use client";

import { useEffect } from "react";

import { RequireRole } from "@/components/auth/RequireRole";
import { DriverHeader } from "@/components/sofor/DriverHeader";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme-mode", "driver");
    return () => {
      document.documentElement.removeAttribute("data-theme-mode");
    };
  }, []);

  return (
    <RequireRole role="driver" loginPath="/">
      <div className="min-h-screen bg-canvas transition-colors duration-500 ease-in-out">
        <DriverHeader />
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </div>
    </RequireRole>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Toaster } from "@/components/ui/Toaster";
import { OperationsProvider } from "@/context/OperationsContext";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yepaş · Yönetim Konsolu",
  description:
    "Yepaş ekmek ve unlu mamul üretim/dağıtım operasyonu için yönetim konsolu.",
};

// Boyamadan önce koyu/açık modu senkron uygula — tema geçişinde titreme (FOUC) olmasın.
const themeInit = `(function(){try{var t=localStorage.getItem("yepas.theme");var m=window.matchMedia("(prefers-color-scheme: dark)").matches;if(t==="dark"||(!t&&m)){document.documentElement.classList.add("dark");}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="font-sans antialiased">
        {/* Operasyon verisi admin ve şoför alanları arasında paylaşılır. */}
        <OperationsProvider>
          {children}
          <Toaster />
        </OperationsProvider>
      </body>
    </html>
  );
}

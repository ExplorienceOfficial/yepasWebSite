"use client";

import { useEffect, useState } from "react";
import { HubConnectionBuilder, HttpTransportType, LogLevel } from "@microsoft/signalr";
import { useAuth, invalidateSession } from "@/context/AuthContext";

type ConnectionState = "connecting" | "connected" | "unavailable";

export function OrderRealtime() {
  const { session } = useAuth();
  const enabled = session?.role === "admin" && !session.mustChangePassword;
  const [state, setState] = useState<ConnectionState>("connecting");

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let stopped = false;
    let running = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let changed: ReturnType<typeof setTimeout> | undefined;
    let connection: ReturnType<HubConnectionBuilder["build"]> | undefined;

    const refresh = () => {
      // Coalesce bursts without postponing the refresh indefinitely.
      if (!active || changed !== undefined) return;
      changed = setTimeout(() => {
        changed = undefined;
        if (!active) return;
        window.dispatchEvent(new Event("yepas:order-sync-changed"));
        window.dispatchEvent(new Event("yepas:settings-changed"));
      }, 150);
    };
    const ticket = async () => {
      const response = await fetch("/api/v1/admin/realtime/ticket", {
        credentials: "include", cache: "no-store", signal: AbortSignal.timeout(8000),
      });
      if (response.status === 401) { stopped = true; invalidateSession(); }
      if (response.status === 403) stopped = true;
      if (!response.ok) throw new Error("Realtime unavailable");
      const body = await response.json() as { hubUrl: string; accessToken: string };
      const url = new URL(body.hubUrl);
      if (url.protocol !== "https:" || url.pathname !== "/hubs/orders" ||
          url.search || url.username || url.password || !body.accessToken)
        throw new Error("Invalid realtime configuration");
      return body;
    };
    const scheduleRetry = () => {
      if (!active || stopped || retry !== undefined) return;
      setState("unavailable");
      // Only failed connection retries, never periodic order/status requests.
      const delays = [1000, 2000, 5000, 10000, 30000, 60000];
      if (attempt >= delays.length) return; // Focus/online offers a fresh attempt.
      retry = setTimeout(() => { retry = undefined; void connect(); }, delays[attempt++]);
    };
    const connect = async () => {
      if (!active || stopped || running || connection) return;
      running = true;
      try {
        const initial = await ticket();
        if (!active || stopped) return;
        const hub = new HubConnectionBuilder().withUrl(initial.hubUrl, {
          transport: HttpTransportType.WebSockets, skipNegotiation: true,
          // Avoid leaking the main HttpOnly session. Obtain a fresh short-lived ticket per connection.
          accessTokenFactory: async () => (await ticket()).accessToken,
        }).configureLogging(LogLevel.None).build();
        connection = hub;
        hub.on("OrdersChanged", refresh);
        hub.onclose(() => {
          if (connection === hub) connection = undefined;
          scheduleRetry();
        });
        await hub.start();
        if (!active) { await hub.stop(); return; }
        attempt = 0;
        setState("connected");
        refresh(); // Read authoritative snapshot after every successful (re)connection.
      } catch {
        const failed = connection;
        connection = undefined;
        if (failed) await failed.stop().catch(() => {});
        scheduleRetry();
      } finally { running = false; }
    };
    const resume = () => {
      if (document.visibilityState !== "visible" || connection || stopped) return;
      if (retry !== undefined) clearTimeout(retry);
      retry = undefined; attempt = 0;
      void connect();
    };
    void connect();
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      active = false;
      if (retry !== undefined) clearTimeout(retry);
      if (changed !== undefined) clearTimeout(changed);
      if (connection) void connection.stop();
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [enabled]);

  if (!enabled || state === "connected") return null;
  return <div role="status" className="border-b border-hairline bg-surface px-4 py-2 text-xs text-ink-3 lg:px-8">
    {state === "connecting" ? "Canlı sipariş bağlantısı kuruluyor…" :
      "Canlı bağlantı kesildi. Sipariş işlemleri kullanılabilir; güncel liste için Yenile’ye basabilirsiniz."}
  </div>;
}

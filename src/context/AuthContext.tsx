"use client";

import { useCallback, useSyncExternalStore } from "react";

import { adminAccounts } from "@/data/accounts";
import { drivers } from "@/data/mockData";

export type Session =
  | { role: "admin"; username: string; name: string; title: string }
  | { role: "driver"; driverId: string; code: string; name: string; plate: string };

export type LoginResult = { ok: true } | { ok: false; message: string };

const STORAGE_KEY = "yepas.session";

/**
 * Oturum küçük bir harici store'da tutulur: localStorage okuması render sırasında
 * değil useSyncExternalStore üzerinden yapılır, böylece SSR/hydration uyumsuzluğu
 * ve efekt içinde setState zinciri oluşmaz.
 */
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedSession: Session | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): Session | null {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedSession;
  cachedRaw = raw;
  try {
    cachedSession = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

function getServerSnapshot(): Session | null {
  return null;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function writeSession(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Gizli sekme gibi depolamanın kapalı olduğu durumlarda oturum yalnızca
    // bellekte kalır; akış bozulmasın diye sessizce geçiyoruz.
  }
  cachedRaw = session ? JSON.stringify(session) : null;
  cachedSession = session;
  listeners.forEach((listener) => listener());
}

/** İstemci tarafına geçilip geçilmediğini bildirir; guard'ların erken yönlendirmesini önler. */
const noopSubscribe = () => () => {};
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function useAuth() {
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useHydrated();

  const loginAdmin = useCallback((username: string, password: string): LoginResult => {
    const account = adminAccounts.find(
      (item) => item.username.toLocaleLowerCase("tr-TR") === username.trim().toLocaleLowerCase("tr-TR"),
    );
    if (!account || account.password !== password) {
      return { ok: false, message: "Kullanıcı adı veya parola hatalı." };
    }
    writeSession({
      role: "admin",
      username: account.username,
      name: account.name,
      title: account.title,
    });
    return { ok: true };
  }, []);

  const loginDriver = useCallback((code: string, pin: string): LoginResult => {
    const normalized = code.trim().toLocaleUpperCase("tr-TR");
    const driver = drivers.find((item) => item.code === normalized);
    if (!driver) {
      return { ok: false, message: "Bu şoför kodu sistemde kayıtlı değil." };
    }
    if (driver.pin !== pin.trim()) {
      return { ok: false, message: "PIN hatalı. Lütfen tekrar deneyin." };
    }
    writeSession({
      role: "driver",
      driverId: driver.id,
      code: driver.code,
      name: driver.name,
      plate: driver.plate,
    });
    return { ok: true };
  }, []);

  const logout = useCallback(() => writeSession(null), []);

  return { session, hydrated, loginAdmin, loginDriver, logout };
}

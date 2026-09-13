"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Session =
  | { role: "admin"; username: string; name: string; title: string }
  | { role: "driver"; driverId: string; code: string; name: string; plate: string };

export type LoginResult = { ok: true } | { ok: false; message: string };

interface ApiIdentity {
  userId: number;
  loginName: string;
  role: "ADMIN" | "DRIVER";
  mustChangePassword: boolean;
}

interface AuthSnapshot {
  session: Session | null;
  loaded: boolean;
  unavailable: boolean;
}

const listeners = new Set<() => void>();
let snapshot: AuthSnapshot = { session: null, loaded: false, unavailable: false };
const serverSnapshot: AuthSnapshot = { session: null, loaded: false, unavailable: false };
let loading: Promise<void> | null = null;

function apiUrl(path: string): string {
  if (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return `http://localhost:5057/api/v1/auth/${path}`;
  }
  return `/api/v1/auth/${path}`;
}

function toSession(identity: ApiIdentity): Session | null {
  if (identity.role === "ADMIN") {
    return {
      role: "admin",
      username: identity.loginName,
      name: identity.loginName,
      title: "Yönetici",
    };
  }
  if (identity.role === "DRIVER") {
    return {
      role: "driver",
      driverId: `legacy-${identity.userId}`,
      code: identity.loginName,
      name: identity.loginName,
      plate: "",
    };
  }
  return null;
}

function update(next: AuthSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() { return snapshot; }
function getServerSnapshot(): AuthSnapshot { return serverSnapshot; }

function ensureLoaded(): Promise<void> {
  if (loading) return loading;
  if (snapshot.loaded) return Promise.resolve();
  loading = fetch(apiUrl("me"), { credentials: "include", cache: "no-store" })
    .then(async (response) => {
      if (response.status === 401) {
        update({ session: null, loaded: true, unavailable: false });
        return;
      }
      if (!response.ok) throw new Error("Oturum hizmetine erişilemiyor.");
      const identity = (await response.json()) as ApiIdentity;
      update({ session: toSession(identity), loaded: true, unavailable: false });
    })
    .catch(() => update({ session: null, loaded: true, unavailable: true }))
    .finally(() => { loading = null; });
  return loading;
}

async function login(loginName: string, password: string, role: "ADMIN" | "DRIVER"): Promise<LoginResult> {
  try {
    const response = await fetch(apiUrl("login"), {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginName, password, role }),
    });
    if (response.status === 401) {
      return { ok: false, message: "Kullanıcı adı veya parola hatalı ya da hesap kapalı." };
    }
    if (!response.ok) return { ok: false, message: "Giriş hizmetine erişilemiyor." };
    const identity = (await response.json()) as ApiIdentity;
    const session = toSession(identity);
    if (!session || session.role !== role.toLowerCase()) {
      return { ok: false, message: "Bu giriş türü için yetkiniz yok." };
    }
    update({ session, loaded: true, unavailable: false });
    return { ok: true };
  } catch {
    return { ok: false, message: "Giriş hizmetine erişilemiyor." };
  }
}

export function useAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { void ensureLoaded(); }, []);

  const loginAdmin = useCallback(
    (username: string, password: string) => login(username, password, "ADMIN"), []);
  const loginDriver = useCallback(
    (code: string, password: string) => login(code, password, "DRIVER"), []);
  const logout = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(apiUrl("logout"), {
        method: "POST", credentials: "include", cache: "no-store",
      });
      if (!response.ok) return false;
      update({ session: null, loaded: true, unavailable: false });
      return true;
    } catch { return false; }
  }, []);

  return { session: state.session, hydrated: state.loaded,
    unavailable: state.unavailable, loginAdmin, loginDriver, logout };
}

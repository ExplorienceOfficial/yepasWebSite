"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck, TriangleAlert, Truck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { useAuth } from "@/context/AuthContext";
import { drivers } from "@/data/mockData";
import { cn } from "@/lib/format";

type Mode = "admin" | "driver";

export default function LoginPage() {
  const router = useRouter();
  const { session, loginAdmin, loginDriver } = useAuth();

  const [mode, setMode] = useState<Mode>("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session?.role === "admin") router.replace("/admin");
    else if (session?.role === "driver") router.replace("/sofor");
  }, [router, session]);

  useEffect(() => {
    if (mode === "driver") {
      document.documentElement.setAttribute("data-theme-mode", "driver");
    } else {
      document.documentElement.removeAttribute("data-theme-mode");
    }
    return () => {
      document.documentElement.removeAttribute("data-theme-mode");
    };
  }, [mode]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    window.setTimeout(() => {
      const result = mode === "admin" ? loginAdmin(username, password) : loginDriver(code, pin);
      if (result.ok) {
        router.replace(mode === "admin" ? "/admin" : "/sofor");
        return;
      }
      setError(result.message);
      setBusy(false);
    }, 400);
  };

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center px-4 py-12 transition-colors duration-1000 ease-out",
        mode === "driver"
          ? "bg-gradient-to-br from-[#fff3e8] via-[#fff8f2] to-[#ffebd9] dark:from-[#1e1107] dark:via-[#140b05] dark:to-[#190d05]"
          : "bg-canvas",
      )}
      style={{ transitionDuration: "1200ms", transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)" }}
    >
      <div className="w-full max-w-[390px]">
        {/* Marka */}
        <div className="mb-7 flex flex-col items-center text-center">
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-[16px] text-xl font-extrabold transition-all duration-700 ease-out",
              mode === "driver"
                ? "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-[0_8px_25px_rgba(249,115,22,0.35)]"
                : "bg-ink text-[var(--canvas)]",
            )}
            style={{ transitionDuration: "1200ms", transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)" }}
          >
            Y
          </span>
          <h1 className="mt-3.5 text-[23px] font-bold tracking-tight text-ink transition-colors duration-700">
            Yepaş Yönetim Konsolu
          </h1>
          <p className="mt-1 text-[14px] font-medium text-ink-2 transition-colors duration-700">
            {mode === "driver" ? "Şoför Girişi — Saha Teslimat Paneli" : "Devam etmek için giriş yapın"}
          </p>
        </div>

        <div
          className={cn(
            "rounded-[20px] bg-surface p-6 ring-1 transition-all duration-700 ease-out shadow-[var(--shadow-md)]",
            mode === "driver"
              ? "ring-orange-500/30 bg-gradient-to-b from-amber-500/10 via-surface to-surface dark:from-amber-950/30 shadow-[0_16px_45px_rgba(249,115,22,0.18)]"
              : "ring-hairline",
          )}
          style={{ transitionDuration: "1200ms", transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)" }}
        >
          {/* Rol seçimi - Kayan Pill (Sliding Segmented Control) */}
          <div
            className={cn(
              "relative grid grid-cols-2 rounded-[14px] p-1.5 transition-all duration-700 ease-out select-none",
              mode === "driver"
                ? "bg-amber-500/20 ring-1 ring-orange-500/40"
                : "bg-surface-2 ring-1 ring-hairline",
            )}
            style={{ transitionDuration: "1200ms", transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)" }}
          >
            {/* Kayar Aktif Seçim Arka Planı (Sliding Active Indicator) */}
            <div
              className={cn(
                "absolute inset-y-1.5 w-[calc(50%-0.375rem)] rounded-[10px] transition-all duration-400 shadow-md",
                mode === "admin"
                  ? "left-1.5 bg-surface shadow-[var(--shadow-sm)]"
                  : "left-[calc(50%+0.1875rem)] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_4px_18px_rgba(249,115,22,0.45)]",
              )}
              style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.2, 0.64, 1)" }}
            />

            {/* Yönetici Butonu */}
            <button
              type="button"
              onClick={() => switchMode("admin")}
              className={cn(
                "relative z-10 flex items-center justify-center gap-2 rounded-[10px] py-2.5 text-[14px] font-semibold transition-colors duration-300 active:scale-95",
                mode === "admin" ? "text-ink" : "text-ink-2 hover:text-ink",
              )}
            >
              <ShieldCheck className="size-4" strokeWidth={2} />
              Yönetici
            </button>

            {/* Şoför Butonu */}
            <button
              type="button"
              onClick={() => switchMode("driver")}
              className={cn(
                "relative z-10 flex items-center justify-center gap-2 rounded-[10px] py-2.5 text-[14px] font-semibold transition-colors duration-300 active:scale-95",
                mode === "driver" ? "text-white font-bold" : "text-ink-2 hover:text-ink",
              )}
            >
              <Truck className="size-4" strokeWidth={2} />
              Şoför
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === "admin" ? (
              <>
                <Field label="Kullanıcı Adı">
                  <TextInput
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="admin"
                    autoFocus
                    required
                  />
                </Field>
                <Field label="Parola">
                  <div className="relative">
                    <TextInput
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pr-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Parolayı gizle" : "Parolayı göster"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
              </>
            ) : (
              <>
                <Field label="Şoför">
                  <Select
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="focus:ring-orange-500/50 focus:border-orange-500"
                  >
                    <option value="">Şoför seçin</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.code}>
                        {driver.code} · {driver.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="PIN" hint="Araç plakanızın son 4 hanesi.">
                  <TextInput
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="text-center text-xl tracking-[0.6em] focus:ring-orange-500/50 focus:border-orange-500"
                    required
                  />
                </Field>
              </>
            )}

            {error && (
              <p className="flex items-start gap-2 rounded-[10px] bg-[var(--bad-soft)] px-3.5 py-2.5 text-[13px] text-[var(--bad)]">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant={mode === "driver" ? "primary" : "primary"}
              size="lg"
              disabled={busy}
              className={cn(
                "w-full transition-all duration-300",
                mode === "driver" &&
                  "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-[0_4px_16px_rgba(249,115,22,0.35)] border-none",
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Doğrulanıyor…
                </>
              ) : (
                <>
                  <LogIn className="size-4" />
                  Giriş yap
                </>
              )}
            </Button>
          </form>

          <div
            className={cn(
              "mt-5 rounded-[12px] px-4 py-3 transition-colors duration-500",
              mode === "driver" ? "bg-amber-500/10 ring-1 ring-orange-500/20" : "bg-surface-2",
            )}
          >
            <p
              className={cn(
                "text-[11px] font-medium uppercase tracking-wider transition-colors duration-300",
                mode === "driver" ? "text-orange-700 dark:text-orange-300" : "text-ink-3",
              )}
            >
              Demo Erişimi
            </p>
            <div className="mt-2 space-y-1 text-[13px] leading-5 text-ink-2">
              {mode === "admin" ? (
                <>
                  <p>admin / yepas2026</p>
                  <p>planlama / yepas2026</p>
                </>
              ) : (
                drivers.slice(0, 3).map((d) => (
                  <p key={d.id}>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">{d.code}</span> / {d.pin} — {d.name}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[12px] text-ink-3">
          Demo sürümü — veriler örnek operasyon verisidir.
        </p>
      </div>
    </div>
  );
}

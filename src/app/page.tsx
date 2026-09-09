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
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[380px]">
        {/* Marka */}
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-[13px] bg-ink text-lg font-bold text-[var(--canvas)]">
            Y
          </span>
          <h1 className="mt-3 text-[22px] font-semibold tracking-tight text-ink">Yepaş Yönetim Konsolu</h1>
          <p className="mt-1 text-[14px] text-ink-2">Devam etmek için giriş yapın</p>
        </div>

        <div className="rounded-[18px] bg-surface p-6 ring-1 ring-hairline shadow-[var(--shadow-md)]">
          {/* Rol seçimi */}
          <div className="grid grid-cols-2 gap-1 rounded-[12px] bg-surface-2 p-1">
            {(
              [
                { key: "admin", label: "Yönetici", icon: ShieldCheck },
                { key: "driver", label: "Şoför", icon: Truck },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => switchMode(m.key)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-[9px] py-2 text-[14px] font-medium transition-all duration-150",
                  mode === m.key ? "bg-surface text-ink shadow-[var(--shadow-sm)]" : "text-ink-2 hover:text-ink",
                )}
              >
                <m.icon className="size-4" strokeWidth={1.8} />
                {m.label}
              </button>
            ))}
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
                  <Select value={code} onChange={(e) => setCode(e.target.value)} required>
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
                    className="text-center text-xl tracking-[0.6em]"
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

            <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
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

          <div className="mt-5 rounded-[12px] bg-surface-2 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">Demo Erişimi</p>
            <div className="mt-2 space-y-1 text-[13px] leading-5 text-ink-2">
              {mode === "admin" ? (
                <>
                  <p>admin / yepas2026</p>
                  <p>planlama / yepas2026</p>
                </>
              ) : (
                drivers.slice(0, 3).map((d) => (
                  <p key={d.id}>
                    {d.code} / {d.pin} — {d.name}
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

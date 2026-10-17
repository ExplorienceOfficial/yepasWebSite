"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { useAuth } from "@/context/AuthContext";
import { isDriverPin } from "@/lib/driverPin";

export function LoginForm({ role }: { role: "admin" | "driver" }) {
  const router = useRouter();
  const { session, loginAdmin, loginDriver, logout } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const driver = role === "driver";

  useEffect(() => {
    if (session?.role === role) router.replace(driver ? "/sofor" : "/admin");
  }, [session, role, driver, router]);

  useEffect(() => {
    if (driver) document.documentElement.setAttribute("data-theme-mode", "driver");
    return () => document.documentElement.removeAttribute("data-theme-mode");
  }, [driver]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (/\s/.test(username)) { setError("Kullanıcı adı boşluk içeremez."); return; }
    if (driver && !isDriverPin(password)) { setError("Şoför parolası tam 2 rakamdan oluşmalıdır."); return; }
    setBusy(true);
    setError(null);
    // Do not replace a different role's active session without explicitly signing out.
    if (session && session.role !== role && !await logout()) {
      setError("Mevcut oturum kapatılamadı."); setBusy(false); return;
    }
    const result = driver ? await loginDriver(username, password) : await loginAdmin(username, password);
    if (result.ok) router.replace(driver ? "/sofor" : "/admin");
    else { setError(result.message); setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        {driver ? <Truck className="mx-auto mb-3 size-10 text-orange-500" /> : <ShieldCheck className="mx-auto mb-3 size-10 text-accent" />}
        <h1 className="text-2xl font-bold text-ink">Yepaş · {driver ? "Şoför Girişi" : "Yönetici Girişi"}</h1>
        <p className="mt-2 text-sm text-ink-2">{driver ? "Saha ve dağıtım paneli" : "Yönetim konsolu"}</p>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-surface p-6 ring-1 ring-hairline">
        <Field label={driver ? "Şoför kullanıcı adı" : "Kullanıcı adı"}>
          <TextInput value={username} onChange={event => setUsername(event.target.value.replace(/\s/g, ""))}
            required autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={100} />
        </Field>
        <Field label="Parola">
          <TextInput type="password" value={password} onChange={event => setPassword(event.target.value)}
            required autoComplete="current-password" maxLength={driver ? 2 : 128}
            inputMode={driver ? "numeric" : undefined} pattern={driver ? "[0-9]{2}" : undefined} />
        </Field>
        {error && <p role="alert" className="text-sm text-[var(--bad)]">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          {busy ? "Doğrulanıyor…" : "Giriş yap"}
        </Button>
      </form>
    </div>
  </main>;
}

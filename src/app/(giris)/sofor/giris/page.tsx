"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LogIn, Truck, TriangleAlert } from "lucide-react";

import { DemoHint, LoginLayout } from "@/components/auth/LoginLayout";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { useAuth } from "@/context/AuthContext";
import { drivers } from "@/data/mockData";

export default function DriverLoginPage() {
  const router = useRouter();
  const { session, loginDriver } = useAuth();

  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session?.role === "driver") router.replace("/sofor");
  }, [router, session]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    window.setTimeout(() => {
      const result = loginDriver(code, pin);
      if (result.ok) {
        router.replace("/sofor");
        return;
      }
      setError(result.message);
      setBusy(false);
    }, 450);
  };

  return (
    <LoginLayout
      eyebrow="Şoför Erişimi"
      title="Rotanız ve yükleme listeniz"
      description="Kendi bayilerinizin siparişlerini görün, araca yükleyeceğiniz adetleri kontrol edin ve teslimatları işaretleyin."
      highlights={[
        "Durak sırasına göre günlük teslimat listesi",
        "Ürün bazında araç yükleme özeti",
        "Ürün istemeyen bayilerin anında görünmesi",
      ]}
    >
      <div className="rounded-[16px] bg-surface p-6 ring-1 ring-hairline shadow-[var(--shadow-md)]">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-[13px] bg-ink text-[var(--canvas)]">
            <Truck className="size-5" strokeWidth={1.9} />
          </span>
          <div className="leading-tight">
            <h2 className="text-[17px] font-semibold text-ink">Şoför Girişi</h2>
            <p className="text-[13px] text-ink-2">Kod ve PIN ile erişim</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Şoför Kodu">
            <Select value={code} onChange={(event) => setCode(event.target.value)} required>
              <option value="">Şoför seçin</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.code}>
                  {driver.code} · {driver.name} ({driver.plate})
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
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="text-center font-mono text-xl tracking-[0.6em]"
              required
            />
          </Field>

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
                Doğrulanıyor...
              </>
            ) : (
              <>
                <LogIn className="size-4" />
                Rotama giriş yap
              </>
            )}
          </Button>
        </form>

        <DemoHint>
          {drivers.map((driver) => (
            <p key={driver.id}>
              {driver.code} / {driver.pin} — {driver.name}
            </p>
          ))}
        </DemoHint>

        <p className="mt-5 border-t border-hairline pt-4 text-[13px] text-ink-2">
          Yönetici misiniz?{" "}
          <Link href="/admin/giris" className="font-medium text-accent hover:opacity-80">
            Admin girişine geçin
          </Link>
        </p>
      </div>
    </LoginLayout>
  );
}

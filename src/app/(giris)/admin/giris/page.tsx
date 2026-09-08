"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck, TriangleAlert } from "lucide-react";

import { DemoHint, LoginLayout } from "@/components/auth/LoginLayout";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { useAuth } from "@/context/AuthContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { session, loginAdmin } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session?.role === "admin") router.replace("/admin");
  }, [router, session]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    // Sunucu doğrulamasının gecikmesini taklit eder.
    window.setTimeout(() => {
      const result = loginAdmin(username, password);
      if (result.ok) {
        router.replace("/admin");
        return;
      }
      setError(result.message);
      setBusy(false);
    }, 450);
  };

  return (
    <LoginLayout
      eyebrow="Yönetim Erişimi"
      title="Üretim ve dağıtım kontrol paneli"
      description="Günlük siparişleri inceleyip onaylayın, üretim emrini oluşturun ve ERP aktarımını başlatın."
      highlights={[
        "Müşteri sipariş sistemini açıp kapatma yetkisi",
        "Sipariş adetlerini düzenleme ve ürün limitleri",
        "Şoför rotalarının ve kasa dolulukların takibi",
      ]}
    >
      <div className="rounded-[16px] bg-surface p-6 ring-1 ring-hairline shadow-[var(--shadow-md)]">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-[13px] bg-accent text-white">
            <ShieldCheck className="size-5" strokeWidth={1.9} />
          </span>
          <div className="leading-tight">
            <h2 className="text-[17px] font-semibold text-ink">Admin Girişi</h2>
            <p className="text-[13px] text-ink-2">Yetkili personel erişimi</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Kullanıcı Adı">
            <TextInput
              value={username}
              onChange={(event) => setUsername(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Parolayı gizle" : "Parolayı göster"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
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
                Panele giriş yap
              </>
            )}
          </Button>
        </form>

        <DemoHint>
          <p>admin / yepas2026</p>
          <p>planlama / yepas2026</p>
        </DemoHint>

        <p className="mt-5 border-t border-hairline pt-4 text-[13px] text-ink-2">
          Şoför müsünüz?{" "}
          <Link href="/sofor/giris" className="font-medium text-accent hover:opacity-80">
            Şoför girişine geçin
          </Link>
        </p>
      </div>
    </LoginLayout>
  );
}

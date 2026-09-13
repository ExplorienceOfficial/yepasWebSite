"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuth, type Session } from "@/context/AuthContext";

/**
 * Yalnızca arayüz yönlendirmesi; gerçek yetki kontrolü API'dedir.
 */
export function RequireRole({
  role,
  loginPath,
  children,
}: {
  role: Session["role"];
  loginPath: string;
  children: React.ReactNode;
}) {
  const { session, hydrated, unavailable } = useAuth();
  const router = useRouter();
  const allowed = session?.role === role;

  useEffect(() => {
    if (hydrated && !allowed && !unavailable) router.replace(loginPath);
  }, [allowed, hydrated, unavailable, loginPath, router]);

  if (unavailable) return <div className="p-8 text-center">Oturum hizmetine erişilemiyor. Lütfen daha sonra tekrar deneyin.</div>;

  if (!allowed) return <AuthPending />;
  return <>{children}</>;
}

function AuthPending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex items-center gap-2.5 text-sm text-ink-2">
        <Loader2 className="size-4 animate-spin text-accent" />
        Oturum doğrulanıyor...
      </div>
    </div>
  );
}

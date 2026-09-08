"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuth, type Session } from "@/context/AuthContext";

/**
 * İstemci tarafı demo koruması. Gerçek bir kurulumda bu kontrol sunucuda
 * (middleware veya session cookie) yapılmalıdır.
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
  const { session, hydrated } = useAuth();
  const router = useRouter();
  const allowed = session?.role === role;

  useEffect(() => {
    if (hydrated && !allowed) router.replace(loginPath);
  }, [allowed, hydrated, loginPath, router]);

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

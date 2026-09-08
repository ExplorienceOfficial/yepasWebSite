import { RequireRole } from "@/components/auth/RequireRole";
import { DriverBar } from "@/components/sofor/DriverBar";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="driver" loginPath="/sofor/giris">
      <div className="min-h-screen bg-zinc-100">
        <DriverBar />
        <main className="mx-auto max-w-4xl px-4 py-4">{children}</main>
      </div>
    </RequireRole>
  );
}

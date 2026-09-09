import { RequireRole } from "@/components/auth/RequireRole";
import { DriverHeader } from "@/components/sofor/DriverHeader";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="driver" loginPath="/">
      <div className="min-h-screen bg-canvas">
        <DriverHeader />
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </div>
    </RequireRole>
  );
}

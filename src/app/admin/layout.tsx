import { AdminShell } from "@/components/shell/AdminShell";
import { RequireRole } from "@/components/auth/RequireRole";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="admin" loginPath="/admin/giris">
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}

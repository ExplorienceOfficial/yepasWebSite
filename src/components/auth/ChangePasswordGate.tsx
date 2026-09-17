"use client";

import { useState } from "react";
import { KeyRound, Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { useAuth } from "@/context/AuthContext";

export function ChangePasswordGate() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (newPassword.length < 12) {
      setError("Yeni parola en az 12 karakter olmalıdır.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Yeni parola ile tekrarı aynı değil.");
      return;
    }
    setBusy(true);
    const result = await changePassword(currentPassword, newPassword);
    if (!result.ok) setError(result.message);
    setBusy(false);
  };

  return <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
    <div className="w-full max-w-md rounded-[20px] bg-surface p-6 shadow-[var(--shadow-md)] ring-1 ring-hairline">
      <span className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-orange-600 ring-1 ring-orange-500/25"><KeyRound className="size-5" /></span>
      <h1 className="mt-4 text-xl font-bold text-ink">Geçici parolanızı değiştirin</h1>
      <p className="mt-1 text-sm text-ink-2">Devam etmeden önce yalnızca sizin bildiğiniz yeni bir parola belirleyin.</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="Geçici parola"><TextInput type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></Field>
        <Field label="Yeni parola" hint="12-128 karakter; geçici paroladan farklı olmalıdır."><TextInput type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required /></Field>
        <Field label="Yeni parola tekrar"><TextInput type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required /></Field>
        {error && <p className="flex items-start gap-2 rounded-xl bg-[var(--bad-soft)] px-3.5 py-2.5 text-sm text-[var(--bad)]"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || !currentPassword || newPassword.length < 12 || confirmation.length < 12}>{busy ? <><Loader2 className="size-4 animate-spin" />Değiştiriliyor…</> : "Parolayı değiştir ve devam et"}</Button>
      </form>
    </div>
  </div>;
}

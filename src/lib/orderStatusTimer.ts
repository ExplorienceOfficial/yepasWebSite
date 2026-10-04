export type OrderStatusSnapshot = {
  isOpen: boolean;
  serverNowUtc: string;
  nextStatusChangeAtUtc: string | null;
};

export function statusRefreshDelay(snapshot: OrderStatusSnapshot): number | null {
  if (!snapshot.nextStatusChangeAtUtc) return null;
  const now = Date.parse(snapshot.serverNowUtc);
  const next = Date.parse(snapshot.nextStatusChangeAtUtc);
  if (!Number.isFinite(now) || !Number.isFinite(next)) return null;
  // No browser wall clock and no speculative local open/closed decision.
  // Small margin avoids the backend's inclusive cutoff and clock granularity.
  return Math.min(2_147_483_647, Math.max(250, next - now + 250));
}

type TimerHost = {
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (id: number) => void;
};

export function scheduleStatusRefresh(snapshot: OrderStatusSnapshot, refresh: () => void, host: TimerHost): () => void {
  const delay = statusRefreshDelay(snapshot);
  if (delay === null) return () => {};
  let active = true;
  const id = host.setTimeout(() => { if (active) { active = false; refresh(); } }, delay);
  return () => { active = false; host.clearTimeout(id); };
}

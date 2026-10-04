import test from 'node:test';
import assert from 'node:assert/strict';
import { statusRefreshDelay, scheduleStatusRefresh } from '../src/lib/orderStatusTimer.ts';

const snapshot = (next) => ({isOpen:true,serverNowUtc:'2026-10-04T23:03:00Z',nextStatusChangeAtUtc:next});
test('delay uses server timestamps, not browser wall clock or a fixed cutoff', () => {
  assert.equal(statusRefreshDelay(snapshot('2026-10-04T23:04:00.001Z')), 60251);
  assert.equal(statusRefreshDelay(snapshot('2026-10-04T23:08:00.001Z')), 300251);
  assert.equal(statusRefreshDelay(snapshot(null)), null);
  assert.equal(statusRefreshDelay(snapshot('invalid')), null);
  assert.equal(statusRefreshDelay(snapshot('2026-10-04T23:02:00Z')), 250);
});
test('one boundary produces one refresh; replacing settings cancels the old timer', () => {
  const pending = new Map(); let id=0; let refreshes=0;
  const host = {setTimeout(fn,delay) {pending.set(++id,{fn,delay});return id;},clearTimeout(id) {pending.delete(id);}};
  const first = scheduleStatusRefresh(snapshot('2026-10-04T23:04:00.001Z'), () => refreshes++, host);
  const stale = pending.get(1).fn;
  first();
  const second = scheduleStatusRefresh(snapshot('2026-10-04T23:08:00.001Z'), () => refreshes++, host);
  stale(); assert.equal(refreshes,0); assert.equal(pending.size,1);
  const current = pending.get(2).fn;
  current(); current(); assert.equal(refreshes,1);
  second(); assert.equal(pending.size,0);
  scheduleStatusRefresh(snapshot(null), () => refreshes++, host);
  assert.equal(pending.size,0);
});

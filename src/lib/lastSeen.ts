/**
 * When this member last had the app open on this device.
 *
 * A signed-in member is not shown the public front page at all. They get a
 * one-line "welcome back" only when they come back after a real absence -
 * more than 72 hours - and otherwise go straight to the app.
 */

export const WELCOME_BACK_AFTER_MS = 72 * 60 * 60 * 1000;

const key = (userId: string) => `dc:last-seen:${userId}`;

export function getLastSeen(userId: string): number | null {
  try {
    const raw = localStorage.getItem(key(userId));
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function markSeen(userId: string, at = Date.now()): void {
  try { localStorage.setItem(key(userId), String(at)); } catch { /* storage blocked */ }
}

/** True on a first visit on this device, or after 72 hours away. */
export function isReturningAfterAbsence(userId: string, now = Date.now()): boolean {
  const last = getLastSeen(userId);
  return last === null || now - last > WELCOME_BACK_AFTER_MS;
}

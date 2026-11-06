/**
 * Keep every open copy of Dates.care on the newest version.
 *
 * Dates.care is a single-page app: once open - especially as a Home Screen
 * app on a phone - it can keep running the same code for days, because
 * nothing ever reloads it. Fixes published in the meantime never reach that
 * phone. That is why answered calls still failed after the call fix went
 * live: both devices were still running the version from before it.
 *
 * Every build writes its id to /version.json. This checks it when the app
 * comes back to the screen and every few minutes in the background, and
 * reloads onto the new version at a moment the member will not lose anything:
 * while the app is in the background, or the instant they return to it -
 * never during a call.
 */

const CHECK_EVERY_MS = 5 * 60 * 1000;

function onCallScreen(): boolean {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  return /video-chat|audio-chat/.test(hash) || !!(window as any).callTimer;
}

async function newerVersionPublished(): Promise<boolean> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return typeof data?.id === 'string' && data.id !== __BUILD_ID__;
  } catch {
    return false;
  }
}

let started = false;
let updatePending = false;

export function startUpdateWatcher(): void {
  if (started || typeof window === 'undefined' || import.meta.env.DEV) return;
  started = true;

  const reloadIfSafe = () => {
    if (!updatePending || onCallScreen()) return;
    window.location.reload();
  };

  const check = async () => {
    if (!updatePending) updatePending = await newerVersionPublished();
    // In the background nobody is looking; on return they have only just
    // arrived. Either way nothing is lost by reloading now.
    reloadIfSafe();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
  window.addEventListener('hashchange', reloadIfSafe);
  setInterval(() => {
    if (document.visibilityState === 'hidden') void check();
    else if (!updatePending) void newerVersionPublished().then((v) => { updatePending = v; });
  }, CHECK_EVERY_MS);
}

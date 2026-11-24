import { supabaseClient } from '@/lib/supabase';

// Public key only — safe to ship in client code. The matching private key
// lives exclusively in Vercel's server environment and is never exposed
// here.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Notifications are ON by default. The only thing that keeps this device
// from being subscribed is the member switching them off in Settings, which
// is remembered here (per device, because a push subscription is per device).
const OPT_OUT_KEY = 'push-opt-out';

export function isPushOptedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPushOptOut(optedOut: boolean): void {
  try {
    if (optedOut) localStorage.setItem(OPT_OUT_KEY, 'true');
    else localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    /* private mode: nothing to remember */
  }
}

/**
 * Asks the browser's "Allow notifications?" question during the tap that
 * creates the account or signs in, so call alerts work from the very first
 * visit. Browsers only show that question from a tap, and only once the
 * question has not been answered, so this must be called synchronously at
 * the start of the tap handler, before anything is awaited.
 *
 * It only asks; the subscription itself is saved by EnablePushPrompt as soon
 * as the member is signed in and permission is "granted". Never throws.
 */
export function primePushPermission(): void {
  try {
    if (!isPushSupported() || isPushOptedOut()) return;
    if (Notification.permission !== 'default') return;
    void Notification.requestPermission();
  } catch {
    /* some browsers throw outside a tap; nothing to do */
  }
}

// "Not now" on the soft question: wait a few days before asking again.
// Unlike the browser's own "Block", this can always be asked again.
const LAST_ASKED_KEY = 'push-last-asked';
export const ASK_AGAIN_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

export function deferPushAsk(): void {
  try { localStorage.setItem(LAST_ASKED_KEY, String(Date.now())); } catch { /* private mode */ }
}

export function canAskForPushNow(): boolean {
  try {
    const last = Number(localStorage.getItem(LAST_ASKED_KEY) || 0);
    return Date.now() - last >= ASK_AGAIN_AFTER_MS;
  } catch {
    return true;
  }
}

/**
 * Calls back whenever this site's notification permission changes - most
 * usefully when a member who had blocked notifications switches them back on
 * in the browser's settings. Uses the Permissions API where it exists, and
 * re-checks whenever the tab regains focus (Safari has no change event).
 * Returns a stop function.
 */
export function watchNotificationPermission(onChange: (p: NotificationPermission) => void): () => void {
  if (typeof Notification === 'undefined') return () => {};
  let last = Notification.permission;
  const check = () => {
    const now = Notification.permission;
    if (now !== last) {
      last = now;
      onChange(now);
    }
  };
  let status: PermissionStatus | null = null;
  try {
    void navigator.permissions
      ?.query({ name: 'notifications' as PermissionName })
      .then((st) => {
        status = st;
        st.onchange = check;
      })
      .catch(() => {});
  } catch {
    /* no Permissions API */
  }
  const onVisible = () => { if (document.visibilityState === 'visible') check(); };
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', onVisible);
  const timer = setInterval(check, 5000);
  return () => {
    if (status) status.onchange = null;
    window.removeEventListener('focus', check);
    document.removeEventListener('visibilitychange', onVisible);
    clearInterval(timer);
  };
}

/** How to un-block notifications for dates.care in this particular browser. */
export function notificationUnblockSteps(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const android = /Android/i.test(ua);
  if (ios) {
    return 'Open your iPhone Settings → Notifications → Dates.care, and turn on Allow Notifications. Then come back here.';
  }
  if (/SamsungBrowser/i.test(ua)) {
    return 'In Samsung Internet, tap the menu (three lines) → Settings → Sites and downloads → Notifications, find dates.care and allow it. Then come back here.';
  }
  if (android) {
    return 'Tap the icon to the left of the web address → Permissions (or Site settings) → Notifications → Allow. If it is still off, open your phone Settings → Apps → your browser → Notifications and turn them on. Then come back here.';
  }
  if (/Firefox/i.test(ua)) {
    return 'Click the icon to the left of the web address, find Notifications marked "Blocked" and clear it (the ×), then reload the page and choose Allow when asked.';
  }
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)) {
    return 'Open Safari → Settings → Websites → Notifications, find dates.care and choose Allow. Then come back here.';
  }
  return 'Click the icon to the left of the web address (a padlock or sliders) → Site settings, set Notifications to Allow, then come back to this tab.';
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
}

export async function getPushPermissionState(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Checks whether the current device already has an active push
 * subscription (registered service worker + live PushManager
 * subscription) — used to correctly initialize the Settings toggle.
 */
export async function hasActivePushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * Requests notification permission, registers the service worker,
 * subscribes via PushManager, and saves the subscription server-side.
 * Returns false (without throwing) on any failure — permission denial,
 * unsupported browser, or a save failure — so the caller can show a
 * simple "couldn't enable" message rather than crash.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
      });
    }

    const subJson = subscription.toJSON();
    const { error } = await supabaseClient.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subJson.endpoint!,
        p256dh_key: subJson.keys!.p256dh,
        auth_key: subJson.keys!.auth,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('Failed to save push subscription:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to subscribe to push notifications:', err);
    return false;
  }
}

/**
 * Unsubscribes this device from push and removes its row server-side.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return true;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    const { error } = await supabaseClient.from('push_subscriptions').delete().eq('endpoint', endpoint);
    if (error) console.error('Failed to remove push subscription:', error);

    return true;
  } catch (err) {
    console.error('Failed to unsubscribe from push notifications:', err);
    return false;
  }
}

/**
 * Ask the server to push a notification to another user's devices.
 *
 * The server decides whether this is allowed - it re-checks, with the service
 * role, that a real reason exists (currently: a live ringing call invite from
 * you to them). Nothing here is trusted, so a caller cannot use this to spam
 * arbitrary members.
 *
 * Deliberately never throws: a push that fails must not break the call that
 * triggered it. Returns whether at least one device was reached.
 */
export async function sendPushToUser(
  targetUserId: string,
  message: {
    title: string;
    body?: string;
    url?: string;
    /** Replaces any earlier notification with the same tag instead of stacking. */
    tag?: string;
    /** Keeps the notification on screen until acted on - use for calls. */
    requireInteraction?: boolean;
    vibrate?: number[];
    /** No sound or vibration (e.g. turning a ringing call into "Missed call"). */
    silent?: boolean;
    /** Why a member is notifying someone else; the server checks it. */
    purpose?: 'call-missed';
  }
): Promise<boolean> {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;

    const response = await fetch('/api/send-push-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetUserId, ...message }),
    });

    if (!response.ok) {
      console.warn('Push notification rejected:', response.status);
      return false;
    }

    const result = await response.json().catch(() => null);
    return (result?.sent ?? 0) > 0;
  } catch (err) {
    console.error('Failed to send push notification:', err);
    return false;
  }
}

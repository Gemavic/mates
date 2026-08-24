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

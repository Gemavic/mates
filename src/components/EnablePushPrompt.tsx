import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  isPushSupported,
  getPushPermissionState,
  subscribeToPush,
  isPushOptedOut,
  setPushOptOut,
  canAskForPushNow,
  deferPushAsk,
  watchNotificationPermission,
  notificationUnblockSteps,
} from '@/lib/pushNotifications';

// iPhone in Safari: notifications need the Home Screen app. Hint dismissed.
const IOS_HINT_KEY = 'push-ios-hint-dismissed';
// The "notifications are blocked" guide, dismissed: shown again after a week.
const BLOCKED_HINT_KEY = 'push-blocked-hint-at';
const BLOCKED_HINT_AGAIN_MS = 7 * 24 * 60 * 60 * 1000;

const read = (k: string) => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const write = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* private mode */ }
};

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;

type Card = 'none' | 'ask' | 'blocked' | 'done' | 'ios';

/**
 * Notifications are ON by default for every signed-in member, unless they
 * switch them off in Settings.
 *
 * A website can never switch notifications on by itself: the browser asks
 * "Allow?" once, and if the member taps Block, it never lets the site ask
 * again. So this works in three steps:
 *
 *  1. Permission already allowed: subscribe silently. No card.
 *  2. Not asked yet: our own small card asks first ("Turn on call alerts?").
 *     Only "Yes" brings up the browser's question, so the people who would
 *     have tapped Block tap "Not now" instead - and that can be asked again
 *     in a few days. The browser's question is never sprung on anyone.
 *  3. Blocked: a short guide for this browser explains how to allow
 *     notifications again, and the moment the member does, this device is
 *     subscribed automatically - no further steps.
 */
export const EnablePushPrompt: React.FC = () => {
  const { user } = useAuth();
  const [card, setCard] = useState<Card>('none');
  const [busy, setBusy] = useState(false);
  const userIdRef = useRef<string | null>(null);
  // True while the browser's own question is on screen from our "Yes".
  const askingRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    userIdRef.current = user.id;
    const userId = user.id;

    if (!isPushSupported()) {
      if (isIos() && !isStandalone() && read(IOS_HINT_KEY) !== 'true') setCard('ios');
      return;
    }
    if (isPushOptedOut()) return;

    let cancelled = false;

    const decide = async (fromChange = false) => {
      const permission = await getPushPermissionState();
      if (cancelled) return;

      if (permission === 'granted') {
        // Allowed (now, or earlier, or just re-allowed in settings): make sure
        // this member is subscribed. Re-saving also moves a shared device's
        // subscription to whoever is signed in now.
        const ok = await subscribeToPush(userId);
        if (!cancelled) setCard(fromChange && ok ? 'done' : 'none');
        return;
      }
      if (permission === 'denied') {
        const last = Number(read(BLOCKED_HINT_KEY) || 0);
        setCard(Date.now() - last >= BLOCKED_HINT_AGAIN_MS ? 'blocked' : 'none');
        return;
      }
      // 'default': not asked yet (or a block was cleared in the browser).
      setCard(fromChange || canAskForPushNow() ? 'ask' : 'none');
    };

    void decide();
    // Notices when a member re-allows notifications in the browser's
    // settings, and finishes the job without them doing anything else.
    const stop = watchNotificationPermission(() => {
      if (askingRef.current) return; // our own Yes flow handles this change
      void decide(true);
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, [user?.id]);

  // Auto-hide the confirmation.
  useEffect(() => {
    if (card !== 'done') return;
    const t = setTimeout(() => setCard('none'), 5000);
    return () => clearTimeout(t);
  }, [card]);

  const yes = async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    setBusy(true);
    askingRef.current = true;
    // Straight from the tap: the only moment browsers allow the question.
    const ok = await subscribeToPush(userId);
    askingRef.current = false;
    setBusy(false);
    if (ok) {
      setCard('done');
    } else {
      // They said no to the browser, or it failed. Respect that: no new
      // question for a few days, and no "how to unblock" guide for a week.
      deferPushAsk();
      write(BLOCKED_HINT_KEY, String(Date.now()));
      setCard('none');
    }
  };

  const notNow = () => {
    deferPushAsk();
    setCard('none');
  };

  const dismissBlocked = () => {
    write(BLOCKED_HINT_KEY, String(Date.now()));
    setCard('none');
  };

  const turnOffForGood = () => {
    setPushOptOut(true);
    setCard('none');
  };

  const dismissIos = () => {
    write(IOS_HINT_KEY, 'true');
    setCard('none');
  };

  if (card === 'none') return null;

  const shell = (icon: React.ReactNode, body: React.ReactNode, onClose?: () => void) => (
    <div className="fixed bottom-20 left-0 right-0 z-40 px-4 sm:bottom-6">
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/40">
          {icon}
        </div>
        <div className="min-w-0 flex-1">{body}</div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  if (card === 'ask') {
    return shell(
      <BellRing className="h-5 w-5 text-pink-600 dark:text-pink-400" />,
      <>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Turn on call alerts?</p>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
          So calls, messages and likes reach you after you leave Dates.care. If you say yes, your browser will ask
          once: tap Allow. You can switch them off any time in Settings.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={yes}
            disabled={busy}
            className="rounded-lg bg-pink-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-60"
          >
            {busy ? 'Turning on…' : 'Yes, turn on'}
          </button>
          <button
            type="button"
            onClick={notNow}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Not now
          </button>
        </div>
      </>
    );
  }

  if (card === 'blocked') {
    return shell(
      <Bell className="h-5 w-5 text-pink-600 dark:text-pink-400" />,
      <>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Call alerts are blocked in this browser</p>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{notificationUnblockSteps()}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Dates.care will notice as soon as you allow them and finish setting up by itself.
        </p>
        <button
          type="button"
          onClick={turnOffForGood}
          className="mt-2 text-xs font-medium text-gray-500 underline hover:no-underline dark:text-gray-400"
        >
          I don't want notifications
        </button>
      </>,
      dismissBlocked
    );
  }

  if (card === 'done') {
    return shell(
      <Check className="h-5 w-5 text-green-600" />,
      <>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Call alerts are on</p>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
          Calls and messages will reach this device even when Dates.care is closed.
        </p>
      </>,
      () => setCard('none')
    );
  }

  return shell(
    <Bell className="h-5 w-5 text-pink-600 dark:text-pink-400" />,
    <>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">Get notified on iPhone</p>
      <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
        iPhones only allow notifications for sites on the Home Screen. In Safari tap Share, then "Add to Home
        Screen", and open Dates.care from the new icon.
      </p>
    </>,
    dismissIos
  );
};

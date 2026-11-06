import React, { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  isPushSupported,
  getPushPermissionState,
  subscribeToPush,
  isPushOptedOut,
  setPushOptOut,
} from '@/lib/pushNotifications';

// When the phone's own "Allow notifications?" question was last shown and
// left unanswered. Asking again on every visit would be nagging, and Chrome
// blocks a site that keeps asking.
const LAST_ASKED_KEY = 'push-last-asked';
const ASK_AGAIN_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
// iPhone in Safari: notifications need the Home Screen app. Hint dismissed.
const IOS_HINT_KEY = 'push-ios-hint-dismissed';

const read = (k: string) => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const write = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* private mode */ }
};

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;

/**
 * Notifications are ON by default for every signed-in member.
 *
 * Members said they were never told about messages, likes or calls even
 * though they had not signed out. The cause: notifications only started if
 * the member found and pressed a one-time "Turn on" card - most dismissed it
 * or never saw it, so nothing could reach them once they left the site.
 *
 * Now, unless the member has switched notifications off in Settings:
 *  - a device that already allowed notifications is subscribed silently;
 *  - otherwise the phone's own permission question is asked on the member's
 *    next tap anywhere in the app (browsers only allow it from a tap), with a
 *    short card saying what it is and how to switch it off.
 * The browser's "Allow" is still the member's choice - no website can skip it.
 * Switching off in Settings unsubscribes this device and is remembered.
 */
export const EnablePushPrompt: React.FC = () => {
  const { user } = useAuth();
  const [card, setCard] = useState<'none' | 'asking' | 'ios'>('none');
  const askedThisVisit = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    if (!isPushSupported()) {
      if (isIos() && !isStandalone() && read(IOS_HINT_KEY) !== 'true') setCard('ios');
      return;
    }
    if (isPushOptedOut()) return;

    let cancelled = false;
    let removeListener: (() => void) | null = null;

    (async () => {
      const permission = await getPushPermissionState();
      if (cancelled) return;

      if (permission === 'granted') {
        // Allowed before (or on another account on this device): make sure
        // this member is subscribed. No question, no card.
        // Re-saving also moves a shared device's subscription to whoever is
        // signed in now.
        void subscribeToPush(userId);
        return;
      }
      if (permission !== 'default') return; // blocked in the browser: Settings explains

      const last = Number(read(LAST_ASKED_KEY) || 0);
      if (Date.now() - last < ASK_AGAIN_AFTER_MS) return;

      setCard('asking');
      // The very next tap anywhere asks the phone. `click` carries the user
      // gesture that browsers (Safari especially) require.
      const onTap = (e: Event) => {
        if (askedThisVisit.current) return;
        // The card's own "Turn off" button must not trigger the question.
        if ((e.target as Element | null)?.closest?.('[data-push-turn-off]')) return;
        askedThisVisit.current = true;
        removeListener?.();
        write(LAST_ASKED_KEY, String(Date.now()));
        void subscribeToPush(userId).finally(() => setCard('none'));
      };
      window.addEventListener('click', onTap, { capture: true });
      removeListener = () => window.removeEventListener('click', onTap, { capture: true });
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [user?.id]);

  const turnOff = () => {
    askedThisVisit.current = true;
    setPushOptOut(true);
    setCard('none');
  };

  const dismissIos = () => {
    write(IOS_HINT_KEY, 'true');
    setCard('none');
  };

  if (card === 'none') return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 px-4 sm:bottom-6">
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/40">
          <Bell className="h-5 w-5 text-pink-600 dark:text-pink-400" />
        </div>

        {card === 'asking' ? (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications are on</p>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
              So messages, likes and calls reach you after you leave Dates.care. Your phone will ask once - tap
              Allow. You can switch them off any time in Settings.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-pink-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pink-700"
              >
                OK
              </button>
              <button
                type="button"
                data-push-turn-off
                onClick={turnOff}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Turn off
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Get notified on iPhone</p>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
                iPhones only allow notifications for sites on the Home Screen. In Safari tap Share, then
                "Add to Home Screen", and open Dates.care from the new icon.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissIos}
              aria-label="Dismiss"
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

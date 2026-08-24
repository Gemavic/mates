import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  isPushSupported,
  getPushPermissionState,
  hasActivePushSubscription,
  subscribeToPush,
} from '@/lib/pushNotifications';

const DISMISSED_KEY = 'push-prompt-dismissed';

/**
 * Asks for notification permission somewhere people will actually see it.
 *
 * Push was already built, but the only way to turn it on was a toggle buried in
 * Settings - so almost nobody had, and calls to a closed app reached no one.
 * A call can only ring a phone that is locked or has the app closed if this
 * permission was granted first, so it has to be asked for up front.
 *
 * Shown once: dismissing it is remembered, and it never appears for anyone who
 * has already decided (granted or denied).
 */
export const EnablePushPrompt: React.FC = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id || !isPushSupported()) return;
    if (localStorage.getItem(DISMISSED_KEY) === 'true') return;

    let cancelled = false;

    (async () => {
      // 'default' means never asked. 'granted'/'denied' are decisions already
      // made, and re-prompting a denied browser does nothing anyway.
      const permission = await getPushPermissionState();
      if (permission !== 'default') {
        // Granted on this browser but no row saved (cleared storage, new
        // account on the same device) - re-subscribe quietly, no banner.
        if (permission === 'granted' && !(await hasActivePushSubscription())) {
          void subscribeToPush(user.id);
        }
        return;
      }
      if (!cancelled) setVisible(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
  };

  const enable = async () => {
    if (!user?.id) return;
    setBusy(true);
    // Must run from this click: browsers only accept a permission request
    // that comes from a real user gesture.
    await subscribeToPush(user.id);
    setBusy(false);
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 px-4 sm:bottom-6">
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/40">
          <Bell className="h-5 w-5 text-pink-600 dark:text-pink-400" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Never miss a call
          </p>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
            Turn on notifications so calls and messages reach you even when
            Dates is closed.
          </p>

          <div className="mt-3 flex gap-2">
            <button
              onClick={enable}
              disabled={busy}
              className="rounded-lg bg-pink-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-60"
            >
              {busy ? 'Turning on…' : 'Turn on'}
            </button>
            <button
              onClick={dismiss}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Not now
            </button>
          </div>
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

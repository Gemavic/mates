import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  isPushSupported,
  getPushPermissionState,
  hasActivePushSubscription,
  subscribeToPush,
} from '@/lib/pushNotifications';

/**
 * Says plainly when calls cannot reach this person, and fixes it in one tap.
 *
 * A web app can only make a phone ring while it is open on screen. With the
 * app closed or the phone locked, the only thing that reaches the person is a
 * push notification - and almost nobody had turned those on: the one-time
 * prompt is easy to dismiss and then never comes back. Most missed calls were
 * to people with no notification permission at all. This banner sits on the
 * call screens and stays until call alerts work on this device.
 */
type State = 'checking' | 'on' | 'off' | 'blocked' | 'ios-install' | 'unsupported';

const isIos = () =>
  typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);

export const CallAlertsBanner: React.FC = () => {
  const { user } = useAuth();
  const [state, setState] = useState<State>('checking');
  const [busy, setBusy] = useState(false);

  const check = async () => {
    if (!isPushSupported()) {
      // iPhone and iPad only allow web notifications for apps added to the
      // Home Screen.
      setState(isIos() && !isStandalone() ? 'ios-install' : 'unsupported');
      return;
    }
    const permission = await getPushPermissionState();
    if (permission === 'denied') return setState('blocked');
    if (permission === 'granted' && (await hasActivePushSubscription())) return setState('on');
    setState('off');
  };

  useEffect(() => {
    if (user?.id) void check();
  }, [user?.id]);

  const enable = async () => {
    if (!user?.id) return;
    setBusy(true);
    // Must run straight from the tap: browsers only grant this to a gesture.
    await subscribeToPush(user.id);
    setBusy(false);
    await check();
  };

  if (state === 'checking' || state === 'on' || state === 'unsupported') return null;

  return (
    <div className="mb-3 flex items-start gap-3 rounded-2xl border border-amber-300/50 bg-amber-400/20 p-4" role="note">
      <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
      <div className="min-w-0 flex-1 text-sm text-white">
        {state === 'off' && (
          <>
            <p className="font-semibold">Call alerts are off on this device</p>
            <p className="mt-1 text-white/85">Calls can only ring while this app is open. Turn on alerts so your phone tells you about a call when the app is closed or the screen is locked.</p>
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              className="mt-3 rounded-xl bg-white px-4 py-2 font-semibold text-rose-600 disabled:opacity-60"
            >
              {busy ? 'Turning on...' : 'Turn on call alerts'}
            </button>
          </>
        )}
        {state === 'blocked' && (
          <>
            <p className="font-semibold">Call alerts are blocked</p>
            <p className="mt-1 text-white/85">Notifications for dates.care are switched off in this browser, so calls only ring while the app is open. Allow notifications for dates.care in your browser or phone settings, then come back to this screen.</p>
          </>
        )}
        {state === 'ios-install' && (
          <>
            <p className="font-semibold">On iPhone, add Dates.care to your Home Screen</p>
            <p className="mt-1 text-white/85">iPhones only allow call alerts for sites added to the Home Screen. In Safari, tap Share, then "Add to Home Screen", open Dates.care from the new icon, and turn on call alerts here.</p>
          </>
        )}
      </div>
    </div>
  );
};

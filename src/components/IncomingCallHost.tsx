import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToIncomingCalls, fetchRingingInviteFor, type CallInvite } from '@/lib/callSignals';
import { IncomingCallModal } from './IncomingCallModal';
import {
  primeNotificationSettings,
  currentNotificationSettings,
  playAlert,
} from '@/lib/notificationSettings';

interface IncomingCallHostProps {
  onNavigate: (screen: string) => void;
}

/**
 * Mounted once at the app root so a call reaches you wherever you are, not only
 * while the Video screen happens to be open.
 */
export const IncomingCallHost: React.FC<IncomingCallHostProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [invite, setInvite] = useState<CallInvite | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // This component is mounted once at the app root, which makes it the
    // right place to load the person's alert preferences: everything that
    // needs to decide whether to make a sound reads them from the cache
    // this fills, and nothing has to await a query at the moment a
    // message or a call arrives.
    void primeNotificationSettings(user.id);

    const ring = (incoming: CallInvite) =>
      setInvite((current) => {
        // Keep the first ring: a second caller should not hijack the screen
        // while you are deciding on the first.
        if (current) return current;
        if (currentNotificationSettings().sound_calls) playAlert('call');
        return incoming;
      });

    // The realtime channel only reports invites written while this page is
    // open and its socket awake. A phone that was locked, or had the app
    // closed, gets the push notification, opens the app - and finds nothing,
    // because the row was inserted before anyone was listening. So on
    // arrival, and every time the app comes back to the foreground, ask
    // whether somebody is ringing right now.
    const catchUp = () => {
      void fetchRingingInviteFor(user.id).then((pending) => {
        if (pending) ring(pending);
      });
    };
    catchUp();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') catchUp();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const unsubscribe = subscribeToIncomingCalls(user.id, {
      onRing: ring,
      // Caller hung up, or you answered on another device.
      onWithdrawn: (settled) =>
        setInvite((current) => (current && current.id === settled.id ? null : current)),
    });

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      unsubscribe();
    };
  }, [user?.id]);

  if (!invite) return null;

  return (
    <IncomingCallModal
      invite={invite}
      onDismiss={() => setInvite(null)}
      onNavigate={onNavigate}
    />
  );
};

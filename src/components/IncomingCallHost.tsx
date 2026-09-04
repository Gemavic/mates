import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToIncomingCalls, type CallInvite } from '@/lib/callSignals';
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

    return subscribeToIncomingCalls(user.id, {
      // Keep the first ring: a second caller should not hijack the screen while
      // you are deciding on the first.
      onRing: (incoming) =>
        setInvite((current) => {
          if (current) return current;
          if (currentNotificationSettings().sound_calls) playAlert('call');
          return incoming;
        }),
      // Caller hung up, or you answered on another device.
      onWithdrawn: (settled) =>
        setInvite((current) => (current && current.id === settled.id ? null : current)),
    });
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

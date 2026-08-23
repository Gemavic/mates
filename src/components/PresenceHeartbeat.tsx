import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { startPresenceHeartbeat } from '@/lib/presence';

/**
 * Keeps the signed-in user's presence fresh for as long as the app is open.
 * Mounted once at the App root - presence should not depend on which screen
 * happens to be showing.
 */
export const PresenceHeartbeat: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    return startPresenceHeartbeat(user.id);
  }, [user?.id]);

  return null;
};

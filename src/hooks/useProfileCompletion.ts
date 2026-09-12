import { useCallback, useEffect, useState } from 'react';
import { fetchMyCompletion, PROFILE_UPDATED_EVENT, type ProfileCompletion } from '@/lib/profileCompletion';

/**
 * The app's one answer to "does this member still need onboarding?".
 * `known` is false until the server has been asked once, so callers can
 * avoid flashing the wrong screen.
 */
export function useProfileCompletion(userId: string | null | undefined, enabled = true) {
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [known, setKnown] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId || !enabled) { setCompletion(null); setKnown(true); return; }
    const c = await fetchMyCompletion();
    setCompletion(c);
    setKnown(true);
  }, [userId, enabled]);

  useEffect(() => {
    let alive = true;
    setKnown(false);
    (async () => {
      if (!userId || !enabled) { if (alive) { setCompletion(null); setKnown(true); } return; }
      const c = await fetchMyCompletion();
      if (alive) { setCompletion(c); setKnown(true); }
    })();
    const onUpdate = () => { void refresh(); };
    window.addEventListener(PROFILE_UPDATED_EVENT, onUpdate);
    return () => { alive = false; window.removeEventListener(PROFILE_UPDATED_EVENT, onUpdate); };
  }, [userId, enabled, refresh]);

  return { completion, known, refresh, needsOnboarding: known && !!userId && enabled && completion !== null && !completion.complete };
}

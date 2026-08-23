import { supabaseClient } from './supabase';

/**
 * Presence.
 *
 * user_profiles.is_online was never written by anything in the app - it was only
 * ever read - so it was whatever some earlier process last left there. In
 * practice it lied in both directions: a member idle for an hour still showed
 * "Online" while someone actively placing a call showed "Offline". That matters
 * because the Call button is gated on it, so people rang users who were not
 * there.
 *
 * Presence is now derived from a heartbeat: the app stamps last_active while it
 * is open, and anyone stamped within ONLINE_WINDOW_MS counts as online.
 */

/** Someone is "online" if they were active this recently. */
export const ONLINE_WINDOW_MS = 3 * 60 * 1000;

/** Comfortably inside the window, so a live session never flickers offline. */
const HEARTBEAT_MS = 60 * 1000;

export function isOnlineFrom(lastActive: string | null | undefined): boolean {
  if (!lastActive) return false;
  const seen = new Date(lastActive).getTime();
  if (Number.isNaN(seen)) return false;
  return Date.now() - seen < ONLINE_WINDOW_MS;
}

async function stamp(userId: string, online: boolean): Promise<void> {
  const { error } = await supabaseClient
    .from('user_profiles')
    .update({ last_active: new Date().toISOString(), is_online: online })
    .eq('user_id', userId);

  if (error) console.error('Failed to update presence:', error);
}

/**
 * Keep this user's presence fresh while the app is open. Returns a stop
 * function; call it on sign-out or unmount.
 */
export function startPresenceHeartbeat(userId: string): () => void {
  let stopped = false;

  const beat = () => {
    if (stopped || document.visibilityState === 'hidden') return;
    void stamp(userId, true);
  };

  beat();
  const timer = setInterval(beat, HEARTBEAT_MS);

  // Coming back to the tab should show you as online immediately rather than
  // after up to a minute.
  const onVisibility = () => {
    if (document.visibilityState === 'visible') beat();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // Best effort only - browsers do not guarantee this fires, which is exactly
  // why the reader side uses a time window instead of trusting the flag.
  const onLeave = () => {
    void stamp(userId, false);
  };
  window.addEventListener('pagehide', onLeave);

  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onLeave);
    void stamp(userId, false);
  };
}

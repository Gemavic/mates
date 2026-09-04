import { supabaseClient } from '@/lib/supabase';

// What a person has chosen to be told about, and how.
//
// Read by Settings, by the chat screens (for the alert sounds), and by the
// email sender on the server. A row that does not exist yet means the
// person has never changed anything — which is these defaults, so the app
// and the server agree without needing a row to be written at signup.
export interface NotificationSettings {
  email_notifications: boolean;
  email_messages: boolean;
  email_likes: boolean;
  email_matches: boolean;
  email_profile_views: boolean;
  sound_active_chats: boolean;
  sound_requests: boolean;
  sound_calls: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_notifications: true,
  email_messages: true,
  email_likes: true,
  email_matches: true,
  email_profile_views: false,
  sound_active_chats: true,
  sound_requests: true,
  sound_calls: true,
};

const COLUMNS = Object.keys(DEFAULT_NOTIFICATION_SETTINGS).join(', ');

export async function loadNotificationSettings(
  userId: string
): Promise<NotificationSettings> {
  const { data, error } = await supabaseClient
    .from('user_notification_settings')
    .select(COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return { ...DEFAULT_NOTIFICATION_SETTINGS };
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...(data as Partial<NotificationSettings>) };
}

export async function saveNotificationSetting(
  userId: string,
  key: keyof NotificationSettings,
  value: boolean
): Promise<boolean> {
  // Upsert rather than update: most people have no row until the first
  // time they touch one of these switches.
  const { error } = await supabaseClient
    .from('user_notification_settings')
    .upsert(
      {
        user_id: userId,
        [key]: value,
        ...(key === 'email_notifications' && !value
          ? { unsubscribed_at: new Date().toISOString() }
          : {}),
        ...(key === 'email_notifications' && value ? { unsubscribed_at: null } : {}),
      },
      { onConflict: 'user_id' }
    );
  if (error) {
    console.error('Failed to save notification setting:', error);
    return false;
  }
  return true;
}

// A short, quiet chime built in code so there is no audio file to ship and
// nothing to fail to load. Two notes for a message, one lower note for a
// request — different enough to tell apart without looking at the screen.
let audioCtx: AudioContext | null = null;

export function playAlert(kind: 'message' | 'request' | 'call' = 'message'): void {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === 'suspended') void audioCtx.resume();

    const notes =
      kind === 'message' ? [880, 1174] : kind === 'request' ? [660] : [520, 660, 880];

    notes.forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = audioCtx!.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  } catch {
    // Sound is a courtesy; a browser that refuses to make one is not an error.
  }
}

// ---------------------------------------------------------------------
// A one-entry cache, so the code that has to decide whether to make a
// sound does not have to await a database round-trip at the exact moment
// a message lands. Primed when the app learns who is signed in, and
// updated in place when Settings saves a change.
// ---------------------------------------------------------------------

let cached: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };
let cachedFor: string | null = null;

export async function primeNotificationSettings(userId: string): Promise<void> {
  if (cachedFor === userId) return;
  cachedFor = userId;
  cached = await loadNotificationSettings(userId);
}

export function currentNotificationSettings(): NotificationSettings {
  return cached;
}

export function updateCachedNotificationSettings(
  patch: Partial<NotificationSettings>
): void {
  cached = { ...cached, ...patch };
}

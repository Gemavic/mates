/**
 * Ring tones for calls, synthesised with WebAudio.
 *
 * Deliberately not an audio file: no asset to ship, license or fail to load,
 * and it starts instantly. Two profiles - the callee hears a proper two-tone
 * ring, the caller hears a quieter ringback so they know it is still trying.
 */

export type RingKind = 'incoming' | 'outgoing';

interface RingProfile {
  /** Classic ring is two tones sounded together. */
  frequencies: number[];
  onMs: number;
  gapMs: number;
  volume: number;
  vibrate?: number[];
}

const PROFILES: Record<RingKind, RingProfile> = {
  incoming: {
    frequencies: [440, 480],
    onMs: 1600,
    gapMs: 3000,
    volume: 0.2,
    vibrate: [600, 400, 600],
  },
  outgoing: {
    // Quieter: this plays into a live microphone, and it is only a progress cue.
    frequencies: [440, 480],
    onMs: 1200,
    gapMs: 3000,
    volume: 0.06,
  },
};

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

/**
 * Browsers refuse to start audio without a user gesture. The caller always has
 * one (they pressed Call); the callee may not, so if the context is suspended
 * we unlock it on their next tap or keypress rather than staying silent.
 */
function resumeWhenAllowed(ctx: AudioContext): () => void {
  if (ctx.state !== 'suspended') return () => {};

  const unlock = () => {
    void ctx.resume().catch(() => {});
  };
  void ctx.resume().catch(() => {});

  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });

  return () => {
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
  };
}

/**
 * Start ringing. Returns a stop function - always call it, including on
 * unmount, or the tone outlives the call.
 */
export function startRingtone(kind: RingKind): () => void {
  const profile = PROFILES[kind];
  const ctx = getContext();

  const canVibrate =
    !!profile.vibrate && typeof navigator !== 'undefined' && 'vibrate' in navigator;

  let stopped = false;
  let cycleTimer: ReturnType<typeof setTimeout> | null = null;
  const releaseUnlock = ctx ? resumeWhenAllowed(ctx) : () => {};

  const ringOnce = () => {
    if (stopped) return;

    if (ctx && ctx.state === 'running') {
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      const seconds = profile.onMs / 1000;
      // Short ramps instead of hard starts/stops, which click audibly.
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(profile.volume, now + 0.05);
      gain.gain.setValueAtTime(profile.volume, now + seconds - 0.05);
      gain.gain.linearRampToValueAtTime(0, now + seconds);

      for (const frequency of profile.frequencies) {
        const oscillator = ctx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.connect(gain);
        oscillator.start(now);
        oscillator.stop(now + seconds);
      }
    }

    if (canVibrate) {
      try {
        navigator.vibrate(profile.vibrate!);
      } catch {
        /* vibration is best-effort */
      }
    }

    cycleTimer = setTimeout(ringOnce, profile.onMs + profile.gapMs);
  };

  ringOnce();

  return () => {
    stopped = true;
    if (cycleTimer) clearTimeout(cycleTimer);
    releaseUnlock();
    if (canVibrate) {
      try {
        navigator.vibrate(0);
      } catch {
        /* ignore */
      }
    }
  };
}

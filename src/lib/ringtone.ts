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
  /** Alternate between the frequencies this many times a second, like a phone bell. */
  warbleHz?: number;
  vibrate?: number[];
}

const PROFILES: Record<RingKind, RingProfile> = {
  incoming: {
    // Phone speakers barely reproduce 440 Hz, and a 0.2 sine through them was
    // easy to miss in a noisy room. A warbling ring between two tones in the
    // range small speakers are loudest at, at near full volume (a compressor
    // on the output keeps it from distorting), with a shorter gap, carries.
    frequencies: [880, 1320],
    onMs: 1800,
    gapMs: 1200,
    volume: 0.9,
    warbleHz: 16,
    vibrate: [800, 300, 800],
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
let compressor: DynamicsCompressorNode | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

function output(ctx: AudioContext): AudioNode {
  if (!compressor) {
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 6;
    compressor.connect(ctx.destination);
  }
  return compressor;
}

/**
 * Unlock sound ahead of time. Browsers only let a page start audio after the
 * person has tapped or pressed something, and an incoming call arrives without
 * one - so the ring used to stay silent until the callee touched the screen.
 * Calling this once at start-up resumes the audio context on the first tap
 * anywhere in the app, so a call that arrives later can ring straight away.
 */
export function primeRingtone(): () => void {
  if (typeof document === 'undefined') return () => {};
  const unlock = () => {
    const ctx = getContext();
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {});
  };
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock);
  document.addEventListener('touchstart', unlock, { passive: true });
  return () => {
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
    document.removeEventListener('touchstart', unlock);
  };
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
      gain.connect(output(ctx));

      const now = ctx.currentTime;
      const seconds = profile.onMs / 1000;
      // Short ramps instead of hard starts/stops, which click audibly.
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(profile.volume, now + 0.05);
      gain.gain.setValueAtTime(profile.volume, now + seconds - 0.05);
      gain.gain.linearRampToValueAtTime(0, now + seconds);

      if (profile.warbleHz) {
        // One oscillator stepping between the tones, like a bell's clapper.
        const oscillator = ctx.createOscillator();
        oscillator.type = 'triangle';
        const step = 1 / profile.warbleHz;
        let i = 0;
        for (let t = 0; t < seconds; t += step, i++) {
          oscillator.frequency.setValueAtTime(profile.frequencies[i % profile.frequencies.length], now + t);
        }
        oscillator.connect(gain);
        oscillator.start(now);
        oscillator.stop(now + seconds);
      } else {
        for (const frequency of profile.frequencies) {
          const oscillator = ctx.createOscillator();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(frequency, now);
          oscillator.connect(gain);
          oscillator.start(now);
          oscillator.stop(now + seconds);
        }
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

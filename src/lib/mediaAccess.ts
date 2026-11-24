// Plain-language reasons a call could not use the camera or microphone.
//
// Browsers report these as terse errors ("Permission denied by system",
// "NotReadableError"), which tell a caller nothing about what to do. This
// turns each one into the specific fix for their device: Windows privacy
// settings, the browser's site permissions, another app holding the camera,
// and so on.
//
// checkMediaAccess() is also run BEFORE anyone is rung, so a blocked camera
// or microphone is caught on the caller's side instead of ringing the other
// person's phone for a call that cannot start.

export type MediaKind = 'video' | 'audio';

const ua = () => (typeof navigator !== 'undefined' ? navigator.userAgent : '');
const isIOS = () =>
  /iPhone|iPad|iPod/i.test(ua()) ||
  (/Macintosh/i.test(ua()) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/i.test(ua());
const isWindows = () => /Windows/i.test(ua());
const isMac = () => /Macintosh|Mac OS X/i.test(ua()) && !isIOS();

const devices = (kind: MediaKind) => (kind === 'video' ? 'camera and microphone' : 'microphone');

function blockedBySystem(kind: MediaKind): string {
  if (isWindows()) {
    const steps =
      kind === 'video'
        ? 'Open Windows Settings → Privacy & security → Camera and turn on "Camera access", "Let apps access your camera" and "Let desktop apps access your camera". Then do the same under Microphone. If your laptop has a camera privacy switch, key or cover, open it.'
        : 'Open Windows Settings → Privacy & security → Microphone and turn on "Microphone access", "Let apps access your microphone" and "Let desktop apps access your microphone".';
    return `Windows is blocking your ${devices(kind)} for this browser, so the call could not start. ${steps} Then close your browser completely, reopen it and call again.`;
  }
  if (isMac()) {
    const where = kind === 'video' ? 'Camera, then Microphone' : 'Microphone';
    return `macOS is blocking your ${devices(kind)} for this browser, so the call could not start. Open System Settings → Privacy & Security → ${where}, and turn on access for your browser. Then quit the browser, reopen it and call again.`;
  }
  if (isAndroid()) {
    return `Your phone is blocking the ${devices(kind)} for this browser. Open your phone's Settings → Apps → your browser → Permissions, allow Camera and Microphone, then call again.`;
  }
  if (isIOS()) {
    return `Your iPhone or iPad is blocking the ${devices(kind)} for this browser. Open Settings, find your browser in the list, turn on Camera and Microphone, then call again.`;
  }
  return `Your device's privacy settings are blocking the ${devices(kind)} for this browser. Allow camera and microphone access for your browser, reopen it and call again.`;
}

function blockedByBrowser(kind: MediaKind, dismissed: boolean): string {
  if (dismissed) {
    return `The request to use your ${devices(kind)} was closed. Press Call again and choose "Allow" when your browser asks.`;
  }
  if (isIOS()) {
    return `Your browser has blocked the ${devices(kind)} for dates.care. In Safari, tap "aA" in the address bar → Website Settings, set Camera and Microphone to Allow, then call again.`;
  }
  if (isAndroid()) {
    return `Your browser has blocked the ${devices(kind)} for dates.care. Tap the icon to the left of the web address → Permissions, allow Camera and Microphone, then call again.`;
  }
  return `Your browser has blocked the ${devices(kind)} for dates.care. Click the icon to the left of the web address (a padlock or sliders), set Camera and Microphone to Allow, reload the page and call again.`;
}

/**
 * A plain explanation for a camera/microphone error, or null when the error
 * is not about media devices (network, credits, Twilio set-up and so on).
 */
export function describeMediaError(error: unknown, kind: MediaKind): string | null {
  const e = (error ?? {}) as { name?: string; message?: string; code?: number; originalError?: { name?: string; message?: string } };
  const name = e.name || e.originalError?.name || '';
  const message = `${e.message || ''} ${e.originalError?.message || ''}`;

  // Twilio Voice wraps media failures in its own codes.
  if (e.code === 31401 || e.code === 31208) {
    return /system/i.test(message) ? blockedBySystem(kind) : blockedByBrowser(kind, /dismiss/i.test(message));
  }
  if (e.code === 31402) {
    return `Your ${devices(kind)} could not be started. Check that ${kind === 'video' ? 'they are' : 'it is'} connected and not in use by another app, then call again.`;
  }

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      // Chrome and Edge say "Permission denied by system" when the operating
      // system blocks the browser, and plain "Permission denied" when the
      // browser or the user blocked the site.
      return /system/i.test(message) ? blockedBySystem(kind) : blockedByBrowser(kind, /dismiss/i.test(message));
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return kind === 'video'
        ? 'No camera or microphone was found on this device. Connect one, or check it is switched on, then call again. You can still make an audio call.'
        : 'No microphone was found on this device. Connect one, or check it is switched on, then call again.';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return `Your ${devices(kind)} ${kind === 'video' ? 'are' : 'is'} being used by another app, such as Zoom, Teams, WhatsApp or another browser tab, or could not be started. Close the other app and call again.`;
    case 'SecurityError':
      return 'Calls only work on the secure dates.care website. Open https://dates.care and try again.';
    default:
      return null;
  }
}

/**
 * Asks for the camera/microphone and releases them straight away.
 * Returns null when access works, or a plain explanation when it does not.
 */
export async function checkMediaAccess(kind: MediaKind): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'This browser cannot make calls. Use an up-to-date Chrome, Edge, Safari or Firefox.';
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' });
    stream.getTracks().forEach((t) => t.stop());
    return null;
  } catch (error) {
    return (
      describeMediaError(error, kind) ||
      `Your ${devices(kind)} could not be started (${(error as Error)?.message || 'unknown error'}). Check your device settings and call again.`
    );
  }
}

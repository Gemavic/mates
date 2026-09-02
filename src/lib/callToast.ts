/**
 * A brief on-screen notice during a call.
 *
 * Deliberately not alert(): a modal dialog during a live call steals focus,
 * pauses the page, and on mobile covers the hang-up button. This floats above
 * the call and goes away by itself.
 */
export function showCallToast(message: string, tone: 'warn' | 'error' = 'warn', ms = 6000) {
  if (typeof document === 'undefined') return;

  const el = document.createElement('div');
  el.className =
    'fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-lg shadow-lg text-sm font-medium text-white ' +
    (tone === 'error' ? 'bg-red-500' : 'bg-amber-500');
  el.textContent = message;
  document.body.appendChild(el);

  setTimeout(() => el.remove(), ms);
}

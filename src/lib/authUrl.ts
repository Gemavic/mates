/**
 * Repairs the URL an OAuth sign-in lands on, before the Supabase client reads it.
 *
 * The app asks Supabase to send users back to `https://dates.care/#auth-callback`.
 * GoTrue does not merge that fragment - on the implicit flow it appends its own
 * with plain string concatenation (`redirectURL + "#" + params`), so the browser
 * actually lands on:
 *
 *     https://dates.care/#auth-callback#access_token=eyJ...&expires_in=3600&...
 *
 * Everything after the FIRST `#` is the fragment, so the fragment is
 * `auth-callback#access_token=...`. Parsing that with URLSearchParams - which is
 * exactly what @supabase/auth-js does - yields a key called
 * `auth-callback#access_token`, and no key called `access_token`. The client
 * therefore finds no tokens, no session is ever created, and the user is
 * silently returned to the site signed out.
 *
 * The same malformed fragment also defeated the hash router in App.tsx, which
 * compared the whole fragment against screen names and fell through to the
 * default screen - the grey never-loading skeletons users were seeing.
 *
 * This module flattens the double fragment back to the shape auth-js expects and
 * remembers which screen the redirect was aiming at. It must run before
 * `createClient`, so it is imported at the top of lib/supabase.ts rather than
 * being wired into the React tree.
 */

/** Fragment keys that mean "this fragment is an auth payload, not a route". */
const AUTH_PARAM = /(?:^|&)(access_token|refresh_token|provider_token|provider_refresh_token|error|error_code|error_description|code|type)=/;

let landingScreen: string | null = null;

/** True when the fragment carries an auth payload rather than a screen name. */
const isAuthPayload = (fragment: string): boolean => AUTH_PARAM.test(fragment);

export function normaliseAuthCallbackUrl(): void {
  if (typeof window === 'undefined') return;

  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return;

  const split = raw.indexOf('#');

  if (split === -1) {
    // Single fragment. If it is an auth payload with no route in front of it,
    // the redirect still needs to land on the callback screen once auth-js has
    // consumed and cleared it.
    if (isAuthPayload(raw) && !landingScreen) landingScreen = 'auth-callback';
    return;
  }

  const route = raw.slice(0, split);
  const params = raw.slice(split + 1);

  // Only rewrite when the tail really is an auth payload. A stray second `#`
  // in an ordinary route is left alone.
  if (!isAuthPayload(params)) return;

  landingScreen = route || 'auth-callback';

  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}#${params}`
  );
}

/**
 * The screen an in-flight auth redirect was aiming at, or null on a normal load.
 * Read synchronously by App on first render - auth-js clears the fragment
 * asynchronously once it has consumed the tokens, so the URL cannot be trusted
 * to still describe the journey by the time React mounts.
 */
export function getAuthLandingScreen(): string | null {
  return landingScreen;
}

/**
 * Turns a raw URL fragment into a screen name.
 *
 * `#discovery`                     -> 'discovery'
 * `#auth-callback#access_token=..` -> 'auth-callback'
 * `#access_token=...`              -> null  (a payload, not a route)
 * `#`                              -> null
 */
export function screenFromHash(rawHash: string): string | null {
  const raw = rawHash.replace(/^#/, '');
  if (!raw) return null;

  const token = raw.split(/[#?&]/)[0];
  if (!token) return null;

  // `access_token=eyJ...` is a parameter, not a route. Screen names never
  // contain `=`.
  if (token.includes('=')) return null;

  return token;
}

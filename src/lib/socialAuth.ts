import { supabaseClient } from '@/lib/supabase';

/**
 * Social sign-in.
 *
 * Only providers that are actually switched on in Supabase are offered.
 * The sign-in screen used to show Google, Facebook and Apple buttons while
 * only Google was enabled, so two of the three failed with "not enabled"
 * the moment anyone tapped them. The list now comes from Supabase's own
 * public settings endpoint, so a button appears when its provider is
 * turned on and disappears when it is turned off - nothing to redeploy,
 * and no button that promises what the site cannot do.
 */

export type SocialProvider = 'google' | 'facebook';

/** Every provider this app knows how to draw a button for, in display order. */
export const KNOWN_PROVIDERS: SocialProvider[] = ['google', 'facebook'];

/** Shown while the settings call is in flight or if it fails: what we know is on. */
const ASSUMED_ENABLED: SocialProvider[] = ['google'];

interface SocialAuthResult {
  success: boolean;
  error?: string;
}

let enabledCache: Promise<SocialProvider[]> | null = null;

/** Providers Supabase reports as enabled, cached for the page's lifetime. */
export function enabledSocialProviders(): Promise<SocialProvider[]> {
  if (enabledCache) return enabledCache;
  enabledCache = (async () => {
    const url = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    if (!url || !key) return ASSUMED_ENABLED;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: key },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return ASSUMED_ENABLED;
      const json = await res.json();
      const external = (json && json.external) || {};
      const on = KNOWN_PROVIDERS.filter((p) => external[p] === true);
      return on;
    } catch {
      return ASSUMED_ENABLED;
    }
  })();
  return enabledCache;
}

export const handleSocialSignIn = async (provider: SocialProvider): Promise<SocialAuthResult> => {
  try {
    const currentUrl = window.location.origin;
    const redirectUrl = `${currentUrl}/#auth-callback`;

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : {},
        skipBrowserRedirect: false,
      },
    });

    if (error) {
      console.error(`${provider} OAuth error:`, error);

      let errorMessage = error.message;

      if (error.message?.includes('not enabled')) {
        errorMessage = `${getSocialProviderDisplayName(provider)} sign-in is not available right now. Please use your email address instead.`;
      } else if (error.message?.includes('redirect')) {
        errorMessage = 'Sign-in could not be started. Please try again in a moment.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (error: any) {
    console.error(`${provider} OAuth exception:`, error);

    let errorMessage = `Failed to sign in with ${getSocialProviderDisplayName(provider)}`;

    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
};

export const getSocialProviderDisplayName = (provider: SocialProvider): string => {
  const names: Record<SocialProvider, string> = {
    google: 'Google',
    facebook: 'Facebook',
  };
  return names[provider];
};

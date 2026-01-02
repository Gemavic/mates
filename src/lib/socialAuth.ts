import { supabaseClient } from '@/lib/supabase';

export type SocialProvider = 'google' | 'facebook' | 'apple';

interface SocialAuthResult {
  success: boolean;
  error?: string;
}

export const handleSocialSignIn = async (provider: SocialProvider): Promise<SocialAuthResult> => {
  try {
    const currentUrl = window.location.origin;
    const redirectUrl = `${currentUrl}/#auth-callback`;

    console.log(`Initiating ${provider} OAuth with redirect:`, redirectUrl);

    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        skipBrowserRedirect: false,
      },
    });

    if (error) {
      console.error(`${provider} OAuth error:`, error);

      let errorMessage = error.message;

      if (error.message?.includes('not enabled')) {
        errorMessage = `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not enabled. Please contact support.`;
      } else if (error.message?.includes('redirect')) {
        errorMessage = 'OAuth redirect configuration error. Please contact support.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      return { success: false, error: errorMessage };
    }

    console.log(`${provider} OAuth initiated successfully`);
    return { success: true };
  } catch (error: any) {
    console.error(`${provider} OAuth exception:`, error);

    let errorMessage = `Failed to sign in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`;

    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
};

export const getSocialProviderDisplayName = (provider: SocialProvider): string => {
  const names = {
    google: 'Google',
    facebook: 'Facebook',
    apple: 'Apple',
  };
  return names[provider];
};

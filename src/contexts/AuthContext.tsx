import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabaseClient, supabaseConfigError } from '@/lib/supabase';
import { createUserProfile, ProfileManager } from '@/lib/database';
import { anonymousAuth } from '@/lib/anonymousAuth';
import type { User } from '@supabase/supabase-js';

const parseArrayField = (value: unknown, defaultValue: string[]): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
};

/**
 * Single source of truth for auth state.
 *
 * WHY THIS EXISTS: useAuth was previously a plain hook using useState.
 * Every one of the ~38 components calling useAuth() therefore got its OWN
 * independent copy of `loading`/`user`, its OWN getSession() network call,
 * and its OWN onAuthStateChange listener. On a real mobile connection that
 * meant dozens of concurrent getSession() calls contending for GoTrue's
 * internal lock — and because the 8s timeout resolves to "no session",
 * any instance that lost that race would report the person as logged OUT
 * and ProtectedRoute would bounce them to sign-in. That is why signing in
 * appeared impossible even with correct credentials.
 *
 * Now: one initialization, one listener, one shared state for the whole app.
 */

interface AuthContextValue {
  user: User | null;
  profile: any;
  loading: boolean;
  isLoadingProfile: boolean;
  isAnonymous: boolean;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<any>;
  signUp: (email: string, password: string, fullName: string, dateOfBirth?: string, captchaToken?: string) => Promise<any>;
  signOut: () => Promise<void>;
  signInAnonymously: (captchaToken?: string) => Promise<any>;
  upgradeToEmailPassword: (email: string, password: string) => Promise<any>;
  getAnonymousUserData: () => Promise<any>;
  getFirstName: () => string;
  getFullName: () => string;
  isReturningUser: () => boolean;
  markAsReturningUser: () => void;
  loadUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The user saved on this device by the Supabase client, without asking the
 * server. Used only when the server cannot be reached in time, so a slow
 * connection does not look like a sign-out. Anything the app then asks of the
 * server still needs a valid token, which the client keeps trying to refresh.
 */
function storedSessionUser(): User | null {
  try {
    const raw = localStorage.getItem('dates-auth-token');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const user = parsed?.user ?? parsed?.currentSession?.user ?? null;
    return user && typeof user.id === 'string' && parsed?.refresh_token ? (user as User) : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Guards against a late-resolving getSession() overwriting fresher state
  // that onAuthStateChange already delivered (e.g. a sign-in that completed
  // while initial session lookup was still in flight).
  const resolvedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      if (supabaseConfigError) {
        console.warn('Skipping auth initialization - Supabase not configured');
        setUser(null);
        setIsAnonymous(false);
        setLoading(false);
        return;
      }

      try {
        // getSession() has no built-in timeout, so race it against one to
        // guarantee the app never hangs on the loading screen. Because this
        // now runs exactly once for the whole app rather than once per
        // component, it is no longer competing with itself for the auth lock.
        const sessionPromise = supabaseClient.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: null }), 15000)
        );
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);

        if (cancelled || resolvedRef.current) return;

        if (error && error.message?.includes('refresh_token_not_found')) {
          // The server has really forgotten this session. Clear it on THIS
          // device only - a global sign-out here would also end the
          // member's sessions on their other devices.
          console.warn('Session has stale refresh token, clearing:', error.message);
          await supabaseClient.auth.signOut({ scope: 'local' });
          setUser(null);
          setIsAnonymous(false);
        } else if (error || !session) {
          // No answer yet is not the same as signed out. Coming back to the
          // app after a while means the access token has expired and must be
          // refreshed over the network; on a slow or dropped mobile
          // connection that refresh fails or outlasts the timeout above, and
          // the app used to treat the member as signed out and send them to
          // the sign-in screen. If a session is stored on this device, keep
          // them signed in and let the client keep retrying the refresh.
          if (error) console.warn('Session check failed, keeping stored session:', error.message);
          const stored = storedSessionUser();
          setUser(stored);
          setIsAnonymous(stored?.is_anonymous || false);
        } else {
          setUser(session.user ?? null);
          setIsAnonymous(session.user?.is_anonymous || false);
        }
      } catch (error) {
        console.warn('Failed to initialize auth:', error);
        if (!cancelled) {
          const stored = storedSessionUser();
          setUser(stored);
          setIsAnonymous(stored?.is_anonymous || false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initializeAuth();

    if (supabaseConfigError) {
      return () => {
        cancelled = true;
      };
    }

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      // onAuthStateChange is authoritative — mark resolved so a slow
      // getSession() cannot roll this back to a stale "logged out".
      resolvedRef.current = true;
      setUser(session?.user ?? null);
      setIsAnonymous(session?.user?.is_anonymous || false);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const loadUserProfile = useCallback(async () => {
    if (!user) return;

    setIsLoadingProfile(true);
    try {
      const userProfile = await ProfileManager.getProfile(user.id);
      if (userProfile) {
        setProfile({
          ...userProfile,
          interests: parseArrayField(userProfile.interests, [])
        });
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    } else {
      setProfile(null);
    }
  }, [user, loadUserProfile]);

  const signIn = useCallback(async (email: string, password: string, captchaToken?: string) => {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
        ...(captchaToken ? { options: { captchaToken } } : {}),
      });

      if (error) {
        console.error('Sign in error:', error);
        let errorMessage = error.message;

        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email address before signing in. Check your inbox for the confirmation link.';
        } else if (error.message?.includes('User not found')) {
          errorMessage = 'No account found with this email address.';
        }

        return { data: null, error: { message: errorMessage } };
      }

      console.log('Sign in successful:', data.user?.email);
      return { data, error: null };
    } catch (err: any) {
      console.error('Sign in network error:', err);

      let errorMessage = 'Network error. Please check your internet connection and try again.';
      if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
        errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
      } else if (err?.message) {
        errorMessage = err.message;
      }

      return { data: null, error: { message: errorMessage } };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string, dateOfBirth?: string, captchaToken?: string) => {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            date_of_birth: dateOfBirth || null,
            age_confirmed_18_plus: true,
            age_confirmed_at: new Date().toISOString(),
          },
          // Was `undefined`, which silently fell back to the project's Site
          // URL — so if that was ever wrong, every confirmation link in every
          // email pointed somewhere broken. Anchor it to the real origin.
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          // Only sent when a token exists. Supabase ignores the field
          // entirely while captcha is disabled, so this is inert until
          // both the site key and the Supabase setting are in place.
          ...(captchaToken ? { captchaToken } : {}),
        },
      });

      if (error) {
        console.error('Auth signup error:', error);
        let errorMessage = error.message;

        if (error.message?.includes('already registered')) {
          errorMessage = 'This email is already registered. Please sign in instead.';
        } else if (error.message?.includes('invalid')) {
          errorMessage = 'Invalid email or password format. Please check your input.';
        }

        return { data: null, error: { message: errorMessage } };
      }

      // Only attempt the profile fallback when a real session exists.
      // Without one the client is unauthenticated, RLS rejects the insert,
      // and the failure was previously swallowed by console.warn.
      if (data.user && data.session) {
        const newUser = data.user;
        setTimeout(async () => {
          try {
            const existing = await ProfileManager.getProfile(newUser.id);
            if (!existing) {
              await createUserProfile(newUser.id, { email, full_name: fullName });
            }
          } catch (err) {
            console.warn('Background profile creation failed:', err);
          }
        }, 100);
      }

      return { data, error };
    } catch (err: any) {
      console.error('SignUp network error:', err);

      let errorMessage = 'Network error. Please check your internet connection and try again.';
      if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
        errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
      } else if (err?.message) {
        errorMessage = err.message;
      }

      return { data: null, error: { message: errorMessage } };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // This device only. Signing out on the phone must not sign the member
      // out of their laptop too.
      await supabaseClient.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.warn('Sign out error:', error);
    } finally {
      setUser(null);
      setProfile(null);
      setIsAnonymous(false);
    }
  }, []);

  const getFirstName = useCallback(() => {
    if (profile?.first_name) return profile.first_name;
    if (!user?.user_metadata?.full_name) return 'Friend';
    return user.user_metadata.full_name.split(' ')[0];
  }, [profile, user]);

  const getFullName = useCallback(() => {
    if (profile?.full_name) return profile.full_name;
    if (!user?.user_metadata?.full_name) return 'User';
    return user.user_metadata.full_name;
  }, [profile, user]);

  const isReturningUser = useCallback(() => localStorage.getItem('hasLoggedInBefore') === 'true', []);
  const markAsReturningUser = useCallback(() => localStorage.setItem('hasLoggedInBefore', 'true'), []);

  const signInAnonymously = useCallback(async (captchaToken?: string) => {
    const { data, error } = await anonymousAuth.signInAnonymously(captchaToken);
    if (error) return { data: null, error: { message: error.message } };
    return { data, error: null };
  }, []);

  const upgradeToEmailPassword = useCallback(async (email: string, password: string) => {
    const result = await anonymousAuth.upgradeToEmailPassword(email, password);
    if (result.success) return { data: result, error: null };
    return { data: null, error: { message: result.error || 'Upgrade failed' } };
  }, []);

  const getAnonymousUserData = useCallback(async () => {
    if (!user || !isAnonymous) return null;
    return await anonymousAuth.getAnonymousUserDataSummary(user.id);
  }, [user, isAnonymous]);

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    isLoadingProfile,
    isAnonymous,
    signIn,
    signUp,
    signOut,
    signInAnonymously,
    upgradeToEmailPassword,
    getAnonymousUserData,
    getFirstName,
    getFullName,
    isReturningUser,
    markAsReturningUser,
    loadUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

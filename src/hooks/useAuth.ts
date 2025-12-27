import { useState, useEffect } from 'react';
import { supabaseClient, supabaseConfigError } from '@/lib/supabase';
import { createUserProfile, getUserProfile, ProfileManager } from '@/lib/database';
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

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      // Skip auth initialization if Supabase isn't configured
      if (supabaseConfigError) {
        console.warn('Skipping auth initialization - Supabase not configured');
        setUser(null);
        setIsAnonymous(false);
        setLoading(false);
        return;
      }

      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        // Only clear session if it's a refresh token error
        if (error && error.message && error.message.includes('refresh_token_not_found')) {
          console.warn('Session has stale refresh token, clearing:', error.message);
          await supabaseClient.auth.signOut();
          setUser(null);
          setIsAnonymous(false);
        } else if (error) {
          // For other errors, just log but don't clear session
          console.warn('Session error (not clearing):', error.message);
          setUser(null);
          setIsAnonymous(false);
        } else {
          setUser(session?.user ?? null);
          setIsAnonymous(session?.user?.is_anonymous || false);
        }
      } catch (error) {
        console.warn('Failed to initialize auth:', error);
        setUser(null);
        setIsAnonymous(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes - only if Supabase is configured
    if (supabaseConfigError) {
      return () => {};
    }

    const authClient = supabaseClient;
    const subscription = authClient.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null);
          setIsAnonymous(session?.user?.is_anonymous || false);
        } else if (event === 'SIGNED_IN') {
          setUser(session?.user ?? null);
          setIsAnonymous(session?.user?.is_anonymous || false);
        } else {
          setUser(session?.user ?? null);
          setIsAnonymous(session?.user?.is_anonymous || false);
        }
        setLoading(false);
      })();
    });

    return () => {
      if (subscription?.data?.subscription) {
        subscription.data.subscription.unsubscribe();
      }
    };
  }, []);

  // Load user profile when user changes
  useEffect(() => {
    if (user) {
      loadUserProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  const loadUserProfile = async () => {
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
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        let errorMessage = error.message;

        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email address before signing in.';
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
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    console.log('useAuth.signUp called with:', { email, fullName });

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: undefined,
        },
      });

      console.log('Supabase auth.signUp response:', { data, error });

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

      if (data.user) {
        console.log('User created successfully');

        setTimeout(async () => {
          try {
            const profile = await ProfileManager.getProfile(data.user.id);
            if (!profile) {
              console.log('Creating profile as fallback...');
              await createUserProfile(data.user.id, {
                email,
                full_name: fullName,
              });
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
  };

  const signOut = async () => {
    const authClient = supabaseClient;
    try {
      await authClient.auth.signOut();
    } catch (error) {
      console.warn('Sign out error:', error);
    } finally {
      setUser(null);
    }
  };

  const getFirstName = () => {
    if (profile?.first_name) return profile.first_name;
    if (!user?.user_metadata?.full_name) return 'Friend';
    return user.user_metadata.full_name.split(' ')[0];
  };

  const getFullName = () => {
    if (profile?.full_name) return profile.full_name;
    if (!user?.user_metadata?.full_name) return 'User';
    return user.user_metadata.full_name;
  };

  const isReturningUser = () => {
    return localStorage.getItem('hasLoggedInBefore') === 'true';
  };

  const markAsReturningUser = () => {
    localStorage.setItem('hasLoggedInBefore', 'true');
  };

  const signInAnonymously = async () => {
    const { data, error } = await anonymousAuth.signInAnonymously();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data, error: null };
  };

  const upgradeToEmailPassword = async (email: string, password: string) => {
    const result = await anonymousAuth.upgradeToEmailPassword(email, password);

    if (result.success) {
      return { data: result, error: null };
    }

    return { data: null, error: { message: result.error || 'Upgrade failed' } };
  };

  const getAnonymousUserData = async () => {
    if (!user || !isAnonymous) {
      return null;
    }

    return await anonymousAuth.getAnonymousUserDataSummary(user.id);
  };

  return {
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
    loadUserProfile
  };
};
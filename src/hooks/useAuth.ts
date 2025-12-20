import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { createUserProfile, getUserProfile, ProfileManager } from '@/lib/database';
import { anonymousAuth } from '@/lib/anonymousAuth';
import type { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
          console.warn('Session recovery failed, clearing invalid session:', error.message);
          await supabaseClient.auth.signOut();
          setUser(null);
          setIsAnonymous(false);
        } else {
          setUser(session?.user ?? null);
          setIsAnonymous(session?.user?.is_anonymous || false);
        }
      } catch (error) {
        console.warn('Failed to initialize auth, clearing session:', error);
        try {
          await supabaseClient.auth.signOut();
        } catch (signOutError) {
          console.warn('Failed to clear session:', signOutError);
        }
        setUser(null);
        setIsAnonymous(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
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

    return () => subscription.data.subscription.unsubscribe();
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
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data, error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    console.log('useAuth.signUp called with:', { email, fullName });

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
      return { data: null, error: { message: error.message } };
    }

    // Profile is now created automatically by database trigger
    // Allow signup to succeed even if profile creation has delays
    if (data.user) {
      console.log('User created successfully');

      // Try to create profile in background (non-blocking)
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
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { createUserProfile, getUserProfile, ProfileManager } from '@/lib/database';
import type { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.warn('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    };
      
    initializeAuth();

    // Listen for auth changes
    const authClient = supabaseClient;
    const subscription = authClient.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
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

    try {
      const userProfile = await ProfileManager.getProfile(user.id);
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setProfile(null);
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
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    if (data.user) {
      try {
        await createUserProfile(data.user.id, {
          email,
          full_name: fullName,
        });
      } catch (profileError) {
        console.error('Failed to create profile:', profileError);
      }
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

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    getFirstName,
    getFullName,
    isReturningUser,
    markAsReturningUser,
    loadUserProfile
  };
};
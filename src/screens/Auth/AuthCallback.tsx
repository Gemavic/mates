import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseClient } from '@/lib/supabase';
import { creditManager } from '@/lib/creditSystem';
import { ProfileManager } from '@/lib/database';
import { Heart } from 'lucide-react';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setStatus('Sign in failed. Redirecting...');
          setTimeout(() => navigate('/signin'), 2000);
          return;
        }

        if (session?.user) {
          const user = session.user;
          setStatus('Setting up your account...');

          try {
            creditManager.initializeUser(user.id);

            const { data: existingProfile } = await supabaseClient
              .from('user_profiles')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();

            if (!existingProfile) {
              setStatus('Creating your profile...');

              const oauthMetadata = user.user_metadata || {};
              const fullName = oauthMetadata.full_name || oauthMetadata.name || user.email?.split('@')[0] || 'User';
              const avatarUrl = oauthMetadata.avatar_url || oauthMetadata.picture || null;

              try {
                await supabaseClient
                  .from('user_profiles')
                  .insert({
                    user_id: user.id,
                    email: user.email,
                    full_name: fullName,
                    profile_photo: avatarUrl,
                    bio: '',
                    is_verified: false,
                    created_at: new Date().toISOString()
                  });

                console.log('OAuth user profile created successfully');
              } catch (insertError: any) {
                if (!insertError.message?.includes('already exists')) {
                  console.error('Failed to create profile:', insertError);
                }
              }

              await new Promise(resolve => setTimeout(resolve, 500));
            }

            const { data: profileData } = await supabaseClient
              .from('user_profiles')
              .select('is_verified, full_name')
              .eq('user_id', user.id)
              .maybeSingle();

            if (profileData) {
              setStatus(`Welcome${profileData.full_name ? ', ' + profileData.full_name.split(' ')[0] : ''}!`);

              await new Promise(resolve => setTimeout(resolve, 1000));

              if (profileData.is_verified) {
                navigate('/discovery');
              } else {
                navigate('/verification');
              }
            } else {
              navigate('/onboarding');
            }
          } catch (profileError) {
            console.warn('Could not check verification status:', profileError);
            setStatus('Almost there...');
            setTimeout(() => navigate('/discovery'), 1000);
          }
        } else {
          setStatus('Sign in failed. Redirecting...');
          setTimeout(() => navigate('/signin'), 2000);
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        setStatus('Something went wrong. Redirecting...');
        setTimeout(() => navigate('/signin'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center">
          <Heart className="w-10 h-10 text-white animate-pulse" fill="currentColor" />
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-lg font-medium">{status}</p>
      </div>
    </div>
  );
};

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { creditManager } from '@/lib/creditSystem';
import { fetchMyCompletion } from '@/lib/profileCompletion';
import { Heart } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface AuthCallbackProps {
  onNavigate?: (screen: string) => void;
}

export const AuthCallback: React.FC<AuthCallbackProps> = ({ onNavigate }) => {
  const [status, setStatus] = useState('Completing sign in...');
  const { theme } = useTheme();

  const navigate = (screen: string) => {
    if (onNavigate) {
      onNavigate(screen);
    } else {
      window.location.hash = screen;
    }
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setStatus('Sign in failed. Redirecting...');
          setTimeout(() => navigate('signin'), 2000);
          return;
        }

        if (session?.user) {
          const user = session.user;
          setStatus('Setting up your account...');

          try {
            creditManager.initializeUser(user.id);

            // The profile row is created by a database trigger the moment
            // the account exists, so there is nothing to insert here. What
            // matters is whether it is complete enough to show: photo,
            // gender, who they seek, country, city. If not, onboarding.
            const [{ data: profileData }, completion] = await Promise.all([
              supabaseClient.from('user_profiles').select('full_name, first_name').eq('user_id', user.id).maybeSingle(),
              fetchMyCompletion(),
            ]);

            const firstName = profileData?.first_name || profileData?.full_name?.split(' ')[0]
              || user.user_metadata?.full_name?.split(' ')[0] || '';
            setStatus(`Welcome${firstName ? ', ' + firstName : ''}!`);
            await new Promise(resolve => setTimeout(resolve, 600));

            if (completion && !completion.complete) {
              navigate('onboarding');
            } else {
              navigate('discovery');
            }
          } catch (profileError) {
            console.warn('Could not check the profile after sign-in:', profileError);
            setStatus('Almost there...');
            setTimeout(() => navigate('discovery'), 1000);
          }
        } else {
          setStatus('Sign in failed. Redirecting...');
          setTimeout(() => navigate('signin'), 2000);
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        setStatus('Something went wrong. Redirecting...');
        setTimeout(() => navigate('signin'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${theme === 'dark' ? 'from-slate-900 via-purple-950 to-slate-900' : 'from-pink-500 via-rose-500 to-purple-600'}`}>
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

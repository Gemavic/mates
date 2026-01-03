import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onNavigate: (screen: string) => void;
  requireAuth?: boolean;
  redirectTo?: string;
  allowAnonymous?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  onNavigate,
  requireAuth = true,
  redirectTo = 'signin',
  allowAnonymous = false,
}) => {
  const { user, loading, isAnonymous } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (requireAuth) {
      if (!user) {
        console.log('🚫 No user found, redirecting to:', redirectTo);
        onNavigate(redirectTo);
        return;
      }

      if (!allowAnonymous && isAnonymous) {
        console.log('🚫 Anonymous user on protected route, redirecting to upgrade');
        onNavigate('signin');
        return;
      }
    }
  }, [user, loading, isAnonymous, requireAuth, allowAnonymous, redirectTo, onNavigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-center space-y-4">
          <div className="w-20 h-20 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-2xl">💕</span>
          </div>
          <p className="text-white/80 animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null;
  }

  if (requireAuth && !allowAnonymous && isAnonymous) {
    return null;
  }

  return <>{children}</>;
};

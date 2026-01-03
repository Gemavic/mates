import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PublicRouteProps {
  children: React.ReactNode;
  onNavigate: (screen: string) => void;
  redirectIfAuthenticated?: boolean;
  redirectTo?: string;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({
  children,
  onNavigate,
  redirectIfAuthenticated = true,
  redirectTo = 'discovery',
}) => {
  const { user, loading, isAnonymous } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (redirectIfAuthenticated && user && !isAnonymous) {
      console.log('✅ Authenticated user on public route, redirecting to:', redirectTo);
      onNavigate(redirectTo);
    }
  }, [user, loading, isAnonymous, redirectIfAuthenticated, redirectTo, onNavigate]);

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

  return <>{children}</>;
};

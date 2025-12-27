import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Menu } from '@/components/Menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Heart, Mail, Lock, Shield, AlertTriangle } from 'lucide-react';
import { SecurityManager } from '@/lib/security';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';

interface SignInProps {
  onNavigate: (screen: string) => void;
}

export const SignIn: React.FC<SignInProps> = ({ onNavigate }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { signIn } = useAuth();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!resetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      setErrors(['Please enter a valid email address']);
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        setErrors([error.message]);
      } else {
        setResetSent(true);
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetSent(false);
          setResetEmail('');
        }, 5000);
      }
    } catch (error: any) {
      setErrors([error?.message || 'Failed to send reset email']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    setErrors([]);

    try {
      // Validate input
      if (!formData.email || !formData.password) {
        setErrors(['Please enter both email and password']);
        setIsLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setErrors(['Please enter a valid email address']);
        setIsLoading(false);
        return;
      }

      // Attempt sign in
      let signInResult;
      try {
        signInResult = await signIn(formData.email, formData.password);
      } catch (networkError: any) {
        console.error('Network error during signin:', networkError);
        setErrors(['Unable to connect to server. Please check your internet connection and try again.']);
        setIsLoading(false);
        return;
      }

      const { data, error } = signInResult;

      if (error) {
        console.error('Sign in error:', error);
        let errorMessage = error.message || 'Failed to sign in. Please check your credentials.';

        if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('connect')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }

        setErrors([errorMessage]);
        setIsLoading(false);
        return;
      }

      // Success - check if user needs verification
      if (data?.user) {
        try {
          const { data: profileData } = await supabaseClient
            .from('user_profiles')
            .select('is_verified')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (profileData?.is_verified) {
            console.log('User is verified, going to discovery');
            onNavigate('discovery');
          } else {
            console.log('User not verified, going to verification');
            onNavigate('verification');
          }
        } catch (profileError) {
          console.warn('Could not check verification status:', profileError);
          onNavigate('discovery');
        }
      } else {
        onNavigate('discovery');
      }
    } catch (error: any) {
      console.error('Sign in exception:', error);

      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setErrors([errorMessage]);
      setIsLoading(false);
    }
  };

  return (
    <Layout
      title="Sign In"
      onBack={() => onNavigate('welcome')}
      showClose={true}
      onClose={() => onNavigate('welcome')}
    >
        <div className="px-4 sm:px-6 py-6 sm:py-8">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-white mr-2" />
              <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
            </div>
            <p className="text-white/80">Sign in to continue your journey</p>
          </div>

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center text-red-300 mb-2">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span className="font-medium">Sign In Failed</span>
              </div>
              {errors.map((error, index) => (
                <p key={index} className="text-red-200 text-sm">{error}</p>
              ))}
            </div>
          )}

          {/* Security Features */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-center text-green-600 text-sm mb-2">
              <Shield className="w-4 h-4 mr-2" />
              <strong>Your Security Matters</strong>
            </div>
            <ul className="text-green-600 text-xs space-y-1 ml-6">
              <li>• End-to-end encryption</li>
              <li>• Secure data storage</li>
              <li>• Content moderation</li>
              <li>• Safe reporting system</li>
            </ul>
          </div>

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-white font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  className="pl-10 bg-white/90 h-11 sm:h-12"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 bg-white/90 h-11 sm:h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(!showForgotPassword)}
                  className="text-white/90 text-sm hover:text-white hover:underline transition-all"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* Forgot Password Form */}
            {showForgotPassword && (
              <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">Reset Password</h3>
                {resetSent ? (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                    <p className="text-green-200 text-sm">
                      Password reset link sent! Check your email inbox.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <div>
                      <Input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="bg-white/90 h-11"
                        required
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                        className="flex-1 h-10 bg-gray-500 text-white rounded-xl hover:bg-gray-600"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 h-10 bg-pink-500 text-white rounded-xl hover:bg-pink-600"
                      >
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 sm:h-11 md:h-12 bg-pink-500 text-white font-semibold rounded-xl hover:bg-pink-600 transition-all duration-200 cursor-pointer touch-manipulation active:scale-95 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-4 sm:mt-6 text-center">
            <span className="text-white/80">Don't have an account? </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                onNavigate('signup');
              }}
              className="text-white font-semibold hover:underline cursor-pointer touch-manipulation transition-all duration-200 active:scale-95"
              type="button"
            >
              Sign Up
            </button>
          </div>
          
          {/* Safe area padding */}
          <div className="pb-safe-bottom h-6 sm:h-8 md:h-12"></div>
        </div>
    </Layout>
  );
};
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
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { signIn } = useAuth();

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
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        console.error('Sign in error:', error);
        setErrors([error.message || 'Failed to sign in. Please check your credentials.']);
        setIsLoading(false);
        return;
      }

      // Success - check if user needs verification
      // Load user profile to check verification status
      const { user: signedInUser } = data;
      if (signedInUser) {
        const { data: profileData } = await supabaseClient
          .from('user_profiles')
          .select('is_verified')
          .eq('user_id', signedInUser.id)
          .maybeSingle();

        if (profileData?.is_verified) {
          console.log('✅ User is verified, going to discovery');
          onNavigate('discovery');
        } else {
          console.log('⚠️ User not verified, going to verification');
          onNavigate('verification');
        }
      } else {
        onNavigate('discovery');
      }
    } catch (error: any) {
      console.error('Sign in exception:', error);
      setErrors([error?.message || 'An unexpected error occurred. Please try again.']);
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
            </div>

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
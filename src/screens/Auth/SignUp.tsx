import React, { useEffect, useState } from 'react';
import { trackSignup } from '@/lib/analytics';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Heart, Mail, Lock, User, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Captcha, isCaptchaEnabled } from '@/components/Captcha';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { creditManager } from '@/lib/creditSystem';
import { SocialAuthButtons } from '@/components/SocialAuthButtons';
import { InvitedByNote } from '@/components/InvitedByNote';
import {
  checkRegistration, describeExisting, lastAccountOnDevice, setSignInPrefill,
  type ExistingAccount,
} from '@/lib/accountGuard';

interface SignUpProps {
  onNavigate?: (screen: string) => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onNavigate = () => {} }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialError, setSocialError] = useState<string>('');
  // Set when this person already has an account. The form is replaced by
  // the way back in: sign in, or reset the password. Never a second account.
  const [existing, setExisting] = useState<ExistingAccount | null>(null);
  const [deviceAccount] = useState(() => lastAccountOnDevice());
  // The answer appears at the top of the form; the button that asked is at
  // the bottom. Bring the answer into view.
  useEffect(() => {
    if (existing) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [existing]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: ''
  });

  const { signUp } = useAuth();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Bumped after every attempt: a captcha token can only be used once.
  const [captchaReset, setCaptchaReset] = useState(0);
  const { toast } = useToast();

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const passwordValidation = validatePassword(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);

    try {
      // Validate input
      // Mandatory 18+ age gate (compliance requirement)
      if (!formData.dateOfBirth) {
        toast({ title: 'Date of birth required', description: 'You must confirm you are 18 or older to join.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (isNaN(dob.getTime()) || age < 18) {
        toast({ title: 'You must be 18 or older', description: 'Dates is strictly for adults aged 18 and over.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      if (age > 100) {
        toast({ title: 'Invalid date of birth', description: 'Please enter your real date of birth.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        toast({
          title: 'Error',
          description: 'Please fill in all fields',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({
          title: 'Error',
          description: 'Please enter a valid email address',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Validate password
      if (!passwordValidation.isValid) {
        toast({
          title: 'Error',
          description: passwordValidation.errors[0],
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Confirm passwords match
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: 'Error',
          description: 'Passwords do not match',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Does this person already have an account - this email, or the same
      // name and birth date under another email? Asked before anything is
      // created, so a second account is never made in the first place.
      const check = await checkRegistration(formData.email, formData.name, formData.dateOfBirth);
      if (check.status === 'under_18') {
        toast({ title: 'You must be 18 or older', description: 'Dates.care is strictly for adults aged 18 and over.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      if (check.status === 'implausible_birth_date') {
        toast({ title: 'Invalid date of birth', description: 'Please enter your real date of birth.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      if (check.status === 'email_exists') {
        setExisting({ kind: 'email', email: formData.email.trim(), method: check.method ?? null });
        setIsLoading(false);
        return;
      }
      if (check.status === 'possible_duplicate') {
        setExisting({ kind: 'duplicate', hint: check.hint ?? null, method: check.method ?? null });
        setIsLoading(false);
        return;
      }

      // Attempt sign up

      let signUpResult;
      try {
        signUpResult = await signUp(formData.email, formData.password, formData.name, formData.dateOfBirth, captchaToken ?? undefined);
        setCaptchaReset((n) => n + 1);
      } catch (networkError: any) {
        console.error('Network error during signup:', networkError);
        toast({
          title: 'Connection Error',
          description: 'Unable to connect to server. Please check your internet connection and try again.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      const { error, data } = signUpResult;

      if (error) {
        console.error('Sign up error details:', {
          message: error.message,
          error: error,
          data: data
        });

        let errorMessage = error.message || 'Failed to create account. Please try again.';

        if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
          setExisting({ kind: 'email', email: formData.email.trim() });
          setIsLoading(false);
          return;
        }

        if (error.message?.includes('confirmation') || error.message?.includes('verify')) {
          toast({
            title: 'Account Created',
            description: 'Please check your email to verify your account, or sign in directly.',
            variant: 'default'
          });
          setTimeout(() => {
            onNavigate('signin');
          }, 2000);
          setIsLoading(false);
          return;
        }

        if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('connect')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // With email confirmation on, Supabase answers a sign-up for an address
      // that is already registered with a look-alike success: a user with no
      // identities and no session, and no email is sent. It used to say
      // "check your email" - for an email that would never come.
      if (data?.user && !data.session && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setExisting({ kind: 'email', email: formData.email.trim() });
        setIsLoading(false);
        return;
      }

      trackSignup();

      // When email confirmation is enabled, signUp() succeeds but returns
      // session: null. The app previously congratulated the person and sent
      // them to onboarding with no session at all — every screen past that
      // point then failed silently. Branch explicitly on session.
      if (data?.user && !data.session) {
        toast({
          title: 'Almost there \u2014 check your email',
          description: `We sent a confirmation link to ${formData.email}. Click it to finish setting up your account.`,
          variant: 'default'
        });
        setTimeout(() => {
          onNavigate('signin');
        }, 2500);
        setIsLoading(false);
        return;
      }

      if (data?.user?.id) {
        creditManager.initializeUser(data.user.id);

        // ⚠️ SECURITY FIX: Removed automatic credit grant for @dates.care emails
        // Previous vulnerability: Anyone could register with @dates.care email to get unlimited credits
        //
        // PROPER IMPLEMENTATION:
        // - Staff roles should be assigned in database by super admin only
        // - Use Supabase Auth custom claims for staff identification
        // - Verify email ownership before granting any privileges
        // - Credits should be managed server-side with proper validation
      }

      toast({
        title: 'Welcome to Dates!',
        description: 'Your account has been created successfully!',
        variant: 'default'
      });

      setTimeout(() => {
        onNavigate('onboarding');
      }, 1000);
    } catch (unexpectedError: any) {
      console.error('Unexpected signup error:', unexpectedError);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 200);
    }
  };

  return (
    <Layout
      showFooter={false}
      title="Sign Up"
      onBack={() => onNavigate('welcome')}
      showClose={true}
      onClose={() => onNavigate('welcome')}
    >
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
            <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="currentColor" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Join Dates!</h2>
          <p className="text-white/80">Create your account to find love</p>
          <InvitedByNote className="mt-3" />
        </div>

        {/* Security Features */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 sm:mb-6">
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

        {existing && (
          <div className="mb-6 p-4 bg-white rounded-xl shadow-lg" role="alert">
            <h3 className="text-gray-900 font-bold text-lg mb-1">You already have an account</h3>
            <p className="text-gray-700 text-sm mb-4">{describeExisting(existing)}</p>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={() => { setSignInPrefill({ email: existing.email ?? null }); onNavigate('signin'); }}
                className="w-full h-11 bg-pink-500 text-white font-semibold rounded-xl hover:bg-pink-600"
              >
                {existing.method === 'google' ? 'Sign in with Google' : 'Sign in'}
              </Button>
              {existing.method !== 'google' && (
                <Button
                  type="button"
                  onClick={() => { setSignInPrefill({ email: existing.email ?? null, forgot: true }); onNavigate('signin'); }}
                  className="w-full h-11 bg-gray-100 text-gray-900 font-semibold rounded-xl hover:bg-gray-200"
                >
                  Reset my password
                </Button>
              )}
              <button
                type="button"
                onClick={() => setExisting(null)}
                className="text-gray-500 text-xs underline mt-1"
              >
                Go back and change what I typed
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-3">Each person may have one account. If you think this is a mistake, write to admin@dates.care.</p>
          </div>
        )}

        {!existing && deviceAccount && (
          <div className="mb-6 p-3 bg-white/15 border border-white/30 rounded-lg text-white text-sm">
            This device was last signed in as <strong>{deviceAccount.hint}</strong>. If that is you,{' '}
            <button type="button" className="underline font-semibold" onClick={() => onNavigate('signin')}>sign in</button>{' '}
            instead of making a new account.
          </div>
        )}

        {/* Social Auth Error */}
        {socialError && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-200 text-sm">{socialError}</p>
          </div>
        )}

        {/* Social Auth Section */}
        <div className="mb-6">
          <SocialAuthButtons
            isLoading={isLoading}
            onError={(error) => setSocialError(error)}
          />
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 text-white/80">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-white font-medium mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
                className="pl-9 sm:pl-10 bg-white/90 h-11 sm:h-12"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Date of Birth</label>
            <div className="relative">
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0]}
                className="bg-white/90 h-11 sm:h-12"
                required
              />
            </div>
            <p className="text-white/60 text-xs mt-1">You must be 18 or older. Your age is worked out from this date and cannot be changed later. Members see your age, never your birth date.</p>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                className="pl-9 sm:pl-10 bg-white/90 h-11 sm:h-12"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Create a password"
                className="pl-9 sm:pl-10 pr-9 sm:pr-10 bg-white/90 h-11 sm:h-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>

          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3">
              <div className="flex items-center mb-2">
                {passwordValidation.isValid ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
                )}
                <span className="text-sm font-medium">
                  Password {passwordValidation.isValid ? 'Strong' : 'Requirements'}
                </span>
              </div>
              {!passwordValidation.isValid && (
                <ul className="text-xs text-gray-600 space-y-1">
                  {passwordValidation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <label className="block text-white font-medium mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm your password"
                className="pl-9 sm:pl-10 pr-9 sm:pr-10 bg-white/90 h-11 sm:h-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>

          {/* Renders nothing until VITE_TURNSTILE_SITE_KEY is set. */}
          <Captcha onToken={setCaptchaToken} resetSignal={captchaReset} className="mb-3" />

          <Button
            type="submit"
            className="w-full h-10 sm:h-11 md:h-12 bg-pink-500 text-white font-semibold rounded-xl hover:bg-pink-600 transition-all duration-200 cursor-pointer touch-manipulation active:scale-95 disabled:opacity-50"
            disabled={isLoading || !passwordValidation.isValid || (isCaptchaEnabled() && !captchaToken)}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        {/* Terms */}
        <div className="mt-3 sm:mt-4 text-center">
          <p className="text-white/70 text-xs sm:text-sm px-2">
            By signing up, you agree to our{' '}
            <button 
              onClick={() => onNavigate?.('terms')}
              className="text-white underline cursor-pointer touch-manipulation"
            >
              Terms of Service
            </button>
            {' '}and{' '}
            <button 
              onClick={() => onNavigate?.('privacy')}
              className="text-white underline cursor-pointer touch-manipulation"
            >
              Privacy Policy
            </button>
          </p>
        </div>

        {/* Sign In Link */}
        <div className="mt-3 sm:mt-4 text-center">
          <span className="text-white/80">Already have an account? </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              onNavigate('signin');
            }}
            className="text-white font-semibold hover:underline cursor-pointer touch-manipulation transition-all duration-200 active:scale-95"
            type="button"
          >
            Sign In
          </button>
        </div>

        {/* Safe area padding */}
        <div className="pb-safe-bottom h-6 sm:h-8 md:h-12"></div>
      </div>
    </Layout>
  );
};
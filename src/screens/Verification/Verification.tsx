import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, CheckCircle, AlertCircle, Shield, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { supabaseClient } from '@/lib/supabase';

// Every column of verification_requests EXCEPT otp_code and otp_expires_at.
//
// The one-time code is deliberately unreadable by the member who is being
// verified - that is the whole point of generating it server-side. Postgres
// enforces that with a column-level grant, and a `select('*')` therefore asks
// for a column this role cannot see and is refused outright:
//
//   permission denied for table verification_requests
//
// which surfaced as "Failed to upload" on a photo that had in fact already
// been stored. The write was never the problem; reading the row back was.
// Ask for the columns we are allowed to have, by name.
const VERIFICATION_FIELDS = [
  'id',
  'user_id',
  'full_name',
  'phone_number',
  'phone_verified',
  'selfie_url',
  'government_id_url',
  'address_proof_url',
  'address_info',
  'verification_status',
  'rejection_reason',
  'reviewed_at',
  'reviewed_by',
  'submitted_at',
  'created_at',
  'updated_at',
].join(', ');

/**
 * Shape of the row VERIFICATION_FIELDS selects. supabase-js cannot infer
 * column types from a string assembled at runtime, so it falls back to an
 * error type and every property access fails to typecheck. Naming the shape
 * keeps the compiler honest about the columns we actually read.
 */
interface VerificationRow {
  id: string;
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  phone_verified: boolean | null;
  selfie_url: string | null;
  government_id_url: string | null;
  address_proof_url: string | null;
  address_info: unknown;
  verification_status: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  submitted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  required: boolean;
}

interface VerificationProps {
  onNavigate: (screen: string) => void;
}

/**
 * Mints a short-lived signed URL for a verification document.
 *
 * verification-documents is private, so it cannot be linked directly.
 * Pass the stored path (e.g. "<uid>/selfie-1765418398348.jpg").
 * Returns null if the document cannot be read.
 */
export async function getVerificationDocUrl(
  path: string,
  expiresInSeconds = 300
): Promise<string | null> {
  if (!path) return null;
  // Legacy rows may hold a full URL rather than a path; pass those through.
  if (path.startsWith('http')) return path;
  try {
    const { data, error } = await supabaseClient.storage
      .from('verification-documents')
      .createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data?.signedUrl ?? null;
  } catch (err) {
    console.warn('Could not sign verification document URL:', err);
    return null;
  }
}

export const Verification: React.FC<VerificationProps> = ({ onNavigate }) => {
  const { user, profile, loadUserProfile } = useAuth();
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [, setVerificationRequest] = useState<any>(null);
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({
    email: true // Email is always verified via Supabase auth
  });

  // Someone who was ALREADY verified before opening this screen has nothing
  // to do here, so they go straight on.
  //
  // This used to redirect on every change to `profile`, which meant it also
  // fired the moment verification succeeded *during* the flow: confirming the
  // phone code awards the badge, the refreshed profile came back with
  // is_verified true, and the browser jumped to Discovery mid-wizard. The
  // person never reached the ID step, and nothing explained why the screen
  // had vanished - it reads as the app breaking at the exact moment it
  // actually worked.
  //
  // So latch on the first profile we see. Arriving verified redirects.
  // Becoming verified while you are standing here does not.
  const arrivedVerified = useRef<boolean | null>(null);
  useEffect(() => {
    if (!user || !profile) return;
    if (arrivedVerified.current !== null) return;
    arrivedVerified.current = profile.is_verified === true;
    if (arrivedVerified.current) {
      onNavigate('discovery');
    }
  }, [user, profile, onNavigate]);

  // Load existing verification request
  useEffect(() => {
    if (user) {
      loadVerificationRequest();
      setFullName(profile?.full_name || '');
    }
  }, [user, profile]);

  const loadVerificationRequest = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabaseClient
        .from('verification_requests')
        .select(VERIFICATION_FIELDS)
        .eq('user_id', user.id)
        .maybeSingle<VerificationRow>();

      if (error && error.code !== 'PGRST116') throw error;
      setVerificationRequest(data);

      if (data) {
        // Load completed steps from database
        const newCompletedSteps: Record<string, boolean> = { email: true };

        if (data.phone_verified) {
          newCompletedSteps.phone = true;
          setPhoneNumber(data.phone_number || '');
        }

        if (data.selfie_url) {
          newCompletedSteps.photo = true;
        }

        if (data.government_id_url) {
          newCompletedSteps.identity = true;
        }

        setCompletedSteps(newCompletedSteps);
      }
    } catch (error) {
      console.error('Failed to load verification request:', error);
    }
  };

  const verificationSteps: VerificationStep[] = [
    {
      id: 'photo',
      title: 'Photo Verification',
      description: 'Upload a clear photo of yourself holding your ID',
      status: completedSteps.photo ? 'completed' : 'pending',
      required: true
    },
    {
      id: 'phone',
      title: 'Phone Verification',
      description: 'Verify your phone number with SMS code',
      status: completedSteps.phone ? 'completed' : 'pending',
      required: true
    },
    {
      id: 'email',
      title: 'Email Verification',
      description: 'Confirm your email address',
      status: 'completed',
      required: true
    },
    {
      id: 'identity',
      title: 'Identity Verification',
      description: 'Upload government-issued ID',
      status: completedSteps.identity ? 'completed' : 'pending',
      required: false
    }
  ];

  const handlePhotoUpload = async (type: 'selfie' | 'government_id' | 'address_proof') => {
    if (!user) {
      alert('Please sign in to upload verification documents');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(true);

      try {
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabaseClient.storage
          .from('verification-documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Store the storage PATH, not a URL.
        //
        // verification-documents is a private bucket, so getPublicUrl()
        // returns a URL that does not resolve - it was producing dead links
        // for the most sensitive documents on the platform. Private objects
        // need a signed URL, and signed URLs expire, so persisting one in
        // the database would be wrong too.
        //
        // The path is stable. Anything that needs to display the document
        // calls getVerificationDocUrl() below to mint a short-lived signed
        // URL at view time.
        const photoUrl = fileName;

        // Create or update verification request
        // verification_status is deliberately absent. It is set by the
        // server now, and a client UPDATE that changes it is refused - so
        // including it here made every re-upload fail with a raw database
        // message in an alert box.
        const updateData: any = {
          full_name: fullName || profile?.full_name || 'User',
          phone_number: phoneNumber || null,
        };

        if (type === 'selfie') updateData.selfie_url = photoUrl;
        if (type === 'government_id') updateData.government_id_url = photoUrl;
        if (type === 'address_proof') updateData.address_proof_url = photoUrl;

        const { data, error } = await supabaseClient
          .from('verification_requests')
          .upsert({
            user_id: user.id,
            ...updateData,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
          .select(VERIFICATION_FIELDS)
          .single();

        if (error) throw error;

        setVerificationRequest(data);

        // Update completed steps
        setCompletedSteps(prev => ({
          ...prev,
          [type === 'selfie' ? 'photo' : 'identity']: true
        }));

        alert('✅ Document uploaded successfully!');

        // Check if verification is complete
        await checkVerificationComplete();
      } catch (error: any) {
        console.error('Upload error:', error);
        alert('Failed to upload: ' + (error?.message || 'Unknown error'));
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleSendCode = async () => {
    if (phoneNumber.length < 10) {
      alert('Please enter a valid phone number, including the country code.');
      return;
    }

    try {
      // The browser no longer generates, stores, or ever sees the code.
      //
      // It used to do all three: it made the six digits, wrote them to the
      // database, and - whenever Twilio was unconfigured or refused the
      // message - displayed them in an alert box. Anyone could therefore
      // "verify" a phone number they did not own, which made the verified
      // badge meaningless. The badge is a safety signal on a site where
      // people arrange to meet strangers, so it has to mean something.
      //
      // Now the edge function generates it, stores it, and sends it. If the
      // SMS cannot be sent, verification simply does not happen.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        alert('Your session has expired. Please sign in again.');
        return;
      }

      const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms-verification`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const smsResult = await smsResponse.json().catch(() => ({}));

      if (!smsResult.success) {
        // Say what is actually wrong. "Failed to send" tells a member
        // nothing they can act on, and told us nothing either.
        const reason =
          smsResult.errorCode === 'SMS_NOT_CONFIGURED'
            ? 'Text-message verification is not switched on yet. Please contact admin@dates.care and we will verify you by hand.'
            : smsResult.errorCode === 'UNVERIFIED_TRIAL_NUMBER'
              ? 'This number cannot receive our texts yet because our SMS account is still in trial mode. Please contact admin@dates.care.'
              : smsResult.errorCode === 'RATE_LIMIT_EXCEEDED'
                ? 'Too many attempts. Please wait a few minutes and try again.'
                : smsResult.error || 'We could not send the code. Please check the number and try again.';
        alert(reason);
        return;
      }

      alert(`A verification code has been sent to ${phoneNumber}. It expires in 10 minutes.`);

      setShowCodeInput(true);

      // Start resend timer (60 seconds)
      setIsResendDisabled(true);
      setResendTimer(60);
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error: any) {
      console.error('Failed to request a verification code:', error);
      alert('We could not send a code just now. Please try again in a moment.');
    }
  };

  const handleVerifyCode = async () => {
    if (!user) return;
    try {
      // Compared on the server. The client cannot read otp_code any more -
      // the column-level SELECT grant was revoked - so there is nothing to
      // compare against here even if it wanted to.
      const { data, error } = await supabaseClient.rpc('confirm_phone_verification', {
        p_code: verificationCode,
      });

      if (error) throw error;

      if (!data?.success) {
        const message =
          data?.error === 'code_expired'
            ? 'That code has expired. Please request a new one.'
            : data?.error === 'no_code_requested'
              ? 'No code has been requested for this account yet.'
              : 'That code is not correct. Please check and try again.';
        alert(message);
        return;
      }

      setCompletedSteps((prev) => ({ ...prev, phone: true }));
      setShowCodeInput(false);
      setVerificationCode('');
      await loadVerificationRequest();
      const nowVerified = await checkVerificationComplete();

      // Say what actually happened. A selfie plus a confirmed phone number is
      // all the platform checks, so the badge is awarded here - but the ID
      // step is still on screen and still worth doing, and being told nothing
      // while the wizard moves under you is how a working flow feels broken.
      alert(nowVerified
        ? 'Phone number verified - your account is now verified.\n\nGovernment ID is optional and adds credibility to your profile.'
        : 'Phone number verified.');

      // Move to whatever is still outstanding. Email is confirmed at sign-up,
      // so from here that is the ID upload - the step people expect next.
      const doneNow: Record<string, boolean> = { ...completedSteps, phone: true };
      const nextIndex = verificationSteps.findIndex((s, i) => i > currentStep && !doneNow[s.id]);
      if (nextIndex !== -1) setCurrentStep(nextIndex);
    } catch (err: any) {
      console.error('Phone verification failed:', err);
      alert('We could not check that code just now. Please try again.');
    }
  };

  /** Returns true if this call is what tipped the account into verified. */
  const checkVerificationComplete = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // The badge is awarded by the server, which re-reads the row and
      // checks the evidence itself. This used to be two direct writes from
      // the browser - verification_status here, is_verified on the profile -
      // which meant the badge was granted because the browser said the
      // checklist looked done, not because anything had been verified.
      //
      // Those writes are now refused by the database, and supabase-js
      // returns errors rather than throwing, so had they been left in place
      // they would have failed silently and nobody would ever have been
      // marked verified again.
      const { data, error } = await supabaseClient.rpc('submit_verification');
      if (error) {
        console.error('Could not submit verification:', error);
        return false;
      }
      if (!data?.success) {
        // 'incomplete' is the normal case while steps are still outstanding.
        if (data?.error && data.error !== 'incomplete') {
          console.warn('Verification not submitted:', data.error);
        }
        return false;
      }

      await loadUserProfile();
      await loadVerificationRequest();
      return true;
    } catch (error) {
      console.error('Error completing verification:', error);
      return false;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const handleCompleteVerification = async () => {
    // Check if all required steps are complete
    const hasPhoto = completedSteps.photo;
    const hasPhone = completedSteps.phone;
    const hasEmail = completedSteps.email;

    if (!hasPhoto || !hasPhone || !hasEmail) {
      alert('❌ Please complete all required verification steps:\n\n' +
            (!hasPhoto ? '• Photo Verification\n' : '') +
            (!hasPhone ? '• Phone Verification\n' : '') +
            (!hasEmail ? '• Email Verification\n' : ''));
      return;
    }

    try {
      // Mark as verified
      await checkVerificationComplete();

      alert('🎉 Verification complete! Welcome to Dates.');

      // Navigate to discovery
      onNavigate('discovery');
    } catch (error) {
      console.error('Error completing verification:', error);
      alert('Failed to complete verification. Please try again.');
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme === 'dark' ? 'from-slate-900 via-purple-950 to-slate-900' : 'from-pink-500 via-rose-500 to-purple-600'}`}>
      <div className="max-w-md mx-auto min-h-screen relative">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-white/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-blue-600" />
              Verification
            </h1>
            <div className="text-sm text-gray-600">
              Step {currentStep + 1} of {verificationSteps.length}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/90 backdrop-blur-sm px-4 py-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / verificationSteps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Verification Steps */}
        <div className="p-4 space-y-4 pb-32">
          {verificationSteps.map((step, index) => (
            <div
              key={step.id}
              className={`bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 p-6 shadow-lg ${
                index === currentStep ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(step.status)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    {step.required && (
                      <span className="text-xs text-red-500 font-medium">Required</span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {step.status === 'completed' ? 'Verified' : 'Pending'}
                </div>
              </div>

              <p className="text-gray-600 mb-4">{step.description}</p>

              {/* Step-specific content */}
              {step.id === 'photo' && index === currentStep && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Take a selfie holding your ID</p>
                    <Button
                      onClick={() => handlePhotoUpload('selfie')}
                      disabled={uploading || completedSteps.photo}
                      className="bg-blue-500 text-white hover:bg-blue-600"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : completedSteps.photo ? 'Photo Uploaded ✓' : 'Upload Photo'}
                    </Button>
                  </div>
                </div>
              )}

              {step.id === 'phone' && index === currentStep && (
                <div className="space-y-4">
                  {!showCodeInput ? (
                    <div className="space-y-3">
                      <Input
                        type="tel"
                        placeholder="Enter your phone number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full"
                        disabled={completedSteps.phone}
                      />
                      <Button
                        onClick={handleSendCode}
                        className="w-full bg-blue-500 text-white hover:bg-blue-600"
                        disabled={phoneNumber.length < 10 || completedSteps.phone}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        {completedSteps.phone ? 'Phone Verified ✓' : 'Send Verification Code'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Enter the 6-digit code sent to {phoneNumber}
                      </p>
                      <Input
                        type="text"
                        placeholder="Enter verification code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        maxLength={6}
                        className="w-full text-center text-lg tracking-widest"
                      />
                      <Button
                        onClick={handleVerifyCode}
                        className="w-full bg-green-500 text-white hover:bg-green-600"
                        disabled={verificationCode.length !== 6}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify Code
                      </Button>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={handleSendCode}
                          disabled={isResendDisabled}
                          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          {isResendDisabled ? `Resend in ${resendTimer}s` : 'Resend Code'}
                        </button>
                        <button
                          onClick={() => {
                            setShowCodeInput(false);
                            setVerificationCode('');
                          }}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          Change Number
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step.id === 'email' && (
                <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-green-700 font-medium">Email verified</span>
                </div>
              )}

              {step.id === 'identity' && index === currentStep && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Upload government-issued ID</p>
                    <Button
                      onClick={() => handlePhotoUpload('government_id')}
                      disabled={uploading || completedSteps.identity}
                      className="bg-blue-500 text-white hover:bg-blue-600"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : completedSteps.identity ? 'ID Uploaded ✓' : 'Upload ID'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Optional: Increases your profile credibility
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-sm border-t border-white/20 p-4">
          <div className="flex space-x-3">
            <Button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="flex-1 bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50"
            >
              Previous
            </Button>
            <Button
              onClick={() => {
                if (currentStep === verificationSteps.length - 1) {
                  handleCompleteVerification();
                } else {
                  setCurrentStep(Math.min(verificationSteps.length - 1, currentStep + 1));
                }
              }}
              className="flex-1 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              type="button"
            >
              {currentStep === verificationSteps.length - 1 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

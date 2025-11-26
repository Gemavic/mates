import React, { useState, useEffect } from 'react';
import { Camera, Upload, CheckCircle, AlertCircle, Shield, User, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';

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

export const Verification: React.FC<VerificationProps> = ({ onNavigate }) => {
  const { user, profile, loadUserProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [verificationRequest, setVerificationRequest] = useState<any>(null);
  const [sentOTP, setSentOTP] = useState<string>('');
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({
    email: true // Email is always verified via Supabase auth
  });

  // Check if user is already verified - if so, skip to discovery
  useEffect(() => {
    if (user && profile) {
      if (profile.is_verified === true) {
        console.log('✅ User already verified, skipping verification');
        onNavigate('discovery');
      }
    }
  }, [user, profile]);

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
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

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

        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('verification-documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabaseClient.storage
          .from('verification-documents')
          .getPublicUrl(fileName);

        const photoUrl = urlData.publicUrl;

        // Create or update verification request
        const updateData: any = {
          full_name: fullName || profile?.full_name || 'User',
          phone_number: phoneNumber || null,
          verification_status: 'incomplete'
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
          .select()
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
      alert('Please enter a valid phone number');
      return;
    }

    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setSentOTP(otp);

      // Save OTP and phone to database
      if (user) {
        const { error } = await supabaseClient
          .from('verification_requests')
          .upsert({
            user_id: user.id,
            phone_number: phoneNumber,
            otp_code: otp,
            otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
            full_name: fullName || profile?.full_name || 'User',
            verification_status: 'incomplete',
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (error) throw error;

        // Send SMS via Twilio Edge Function
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms-verification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumber: phoneNumber,
              otp: otp
            })
          });

          const smsResult = await smsResponse.json();
          console.log('SMS Response:', smsResult);

          if (smsResult.success) {
            alert(`✅ Verification code sent to ${phoneNumber}\n\nPlease check your phone for the SMS message.`);
          } else if (smsResult.testMode) {
            // Twilio not configured - show code in alert for testing
            alert(`✅ Verification code: ${otp}\n\n⚠️ SMS service is in test mode.\nYour code is shown here for testing.\n\nTo enable real SMS, configure Twilio credentials.`);
          } else {
            // Show detailed error message
            const errorMsg = smsResult.error || 'Failed to send SMS';
            const details = smsResult.details ? `\n\n${smsResult.details}` : '';
            console.error('Twilio error:', smsResult);

            // Still show the code to user even if SMS fails
            alert(`⚠️ SMS delivery failed\n\nYour verification code: ${otp}\n\nError: ${errorMsg}${details}\n\nYou can still use the code above to verify.`);
          }
        } catch (smsError: any) {
          console.error('SMS sending failed:', smsError);
          // Fallback to showing code in alert
          alert(`✅ Verification code: ${otp}\n\n⚠️ SMS delivery failed.\nYour code is shown here.\n\nError: ${smsError.message}`);
        }
      }

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

      console.log(`📱 OTP sent: ${otp} to ${phoneNumber}`);
    } catch (error: any) {
      console.error('Failed to send OTP:', error);
      alert('Failed to send verification code. Please try again.');
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      alert('Please enter a 6-digit code');
      return;
    }

    try {
      // Verify OTP from database
      if (user) {
        const { data, error } = await supabaseClient
          .from('verification_requests')
          .select('otp_code, otp_expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data || !data.otp_code) {
          alert('No verification code found. Please request a new code.');
          return;
        }

        // Check if OTP expired
        const expiresAt = new Date(data.otp_expires_at);
        if (expiresAt < new Date()) {
          alert('Verification code expired. Please request a new code.');
          setShowCodeInput(false);
          return;
        }

        // Verify OTP
        if (verificationCode === data.otp_code) {
          // Update verification status
          await supabaseClient
            .from('verification_requests')
            .update({
              phone_verified: true,
              otp_code: null, // Clear OTP after successful verification
              otp_expires_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          // Update completed steps
          setCompletedSteps(prev => ({ ...prev, phone: true }));

          alert('✅ Phone number verified successfully!');
          setShowCodeInput(false);
          setVerificationCode('');

          // Check if verification is complete
          await checkVerificationComplete();

          // Move to next step
          setCurrentStep(Math.min(verificationSteps.length - 1, currentStep + 1));
        } else {
          alert('❌ Invalid verification code. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Failed to verify OTP:', error);
      alert('Failed to verify code. Please try again.');
    }
  };

  const checkVerificationComplete = async () => {
    if (!user) return;

    try {
      // Get latest verification request
      const { data } = await supabaseClient
        .from('verification_requests')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data) return;

      // Check if all required steps are complete
      const hasPhoto = !!data.selfie_url;
      const hasPhone = !!data.phone_verified;
      const hasEmail = true; // Email is always verified via Supabase

      const allRequiredComplete = hasPhoto && hasPhone && hasEmail;

      if (allRequiredComplete) {
        // Mark verification as complete
        await supabaseClient
          .from('verification_requests')
          .update({
            verification_status: 'submitted',
            submitted_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        // Update user profile to mark as verified
        await supabaseClient
          .from('user_profiles')
          .update({
            is_verified: true,
            verification_status: 'verified'
          })
          .eq('user_id', user.id);

        // Reload profile
        await loadUserProfile();

        console.log('✅ Verification complete!');
      }
    } catch (error) {
      console.error('Error checking verification completion:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600">
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

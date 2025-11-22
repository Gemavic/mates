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

      if (data?.phone_number) {
        setPhoneNumber(data.phone_number);
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
      status: 'pending',
      required: true
    },
    {
      id: 'phone',
      title: 'Phone Verification',
      description: 'Verify your phone number with SMS code',
      status: 'pending',
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
      status: 'pending',
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
        // Convert to data URL
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;

          // Create or update verification request
          const updateData: any = {
            full_name: fullName || profile?.full_name || 'User',
            phone_number: phoneNumber || null,
            verification_status: 'incomplete'
          };

          if (type === 'selfie') updateData.selfie_url = dataUrl;
          if (type === 'government_id') updateData.government_id_url = dataUrl;
          if (type === 'address_proof') updateData.address_proof_url = dataUrl;

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

          alert('✅ Document uploaded successfully!');
        };
        reader.readAsDataURL(file);
      } catch (error: any) {
        console.error('Upload error:', error);
        alert('Failed to upload: ' + (error?.message || 'Unknown error'));
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleSendCode = () => {
    if (phoneNumber.length >= 10) {
      setShowCodeInput(true);
      alert(`Verification code sent to ${phoneNumber}`);
    } else {
      alert('Please enter a valid phone number');
    }
  };

  const handleVerifyCode = () => {
    if (verificationCode === '123456') {
      alert('Phone number verified successfully!');
      setShowCodeInput(false);
    } else {
      alert('Invalid verification code. Please try again.');
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
        <div className="p-4 space-y-4">
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
                      disabled={uploading}
                      className="bg-blue-500 text-white hover:bg-blue-600"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                    {verificationRequest?.selfie_url && (
                      <p className="text-green-600 text-sm mt-2">✓ Photo uploaded</p>
                    )}
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
                      />
                      <Button 
                        onClick={handleSendCode}
                        className="w-full bg-blue-500 text-white hover:bg-blue-600"
                        disabled={phoneNumber.length < 10}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Send Verification Code
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
                      disabled={uploading}
                      className="bg-blue-500 text-white hover:bg-blue-600"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload ID'}
                    </Button>
                    {verificationRequest?.government_id_url && (
                      <p className="text-green-600 text-sm mt-2">✓ ID uploaded</p>
                    )}
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
                  console.log('Verification complete, navigating to discovery');
                  onNavigate('discovery');
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
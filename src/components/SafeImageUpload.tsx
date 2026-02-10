import React, { useState, useRef } from 'react';
import { contentModeration } from '../lib/contentModeration';

interface SafeImageUploadProps {
  userId: string;
  onImageApproved: (file: File, preview: string) => void;
  onImageRejected?: (reason: string) => void;
  acceptedFormats?: string[];
  maxSizeMB?: number;
  purpose?: 'profile' | 'photo' | 'general';
  className?: string;
  buttonText?: string;
}

export const SafeImageUpload: React.FC<SafeImageUploadProps> = ({
  userId,
  onImageApproved,
  onImageRejected,
  acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  maxSizeMB = 10,
  purpose = 'general',
  className = '',
  buttonText = 'Upload Photo'
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'checking' | 'approved' | 'rejected'>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setValidationStatus('checking');
    setIsValidating(true);
    setValidationMessage('');

    try {
      if (!acceptedFormats.includes(file.type)) {
        setValidationStatus('rejected');
        setValidationMessage(`Please upload one of these formats: ${acceptedFormats.join(', ')}`);
        onImageRejected?.(`Invalid format: ${file.type}`);
        return;
      }

      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        setValidationStatus('rejected');
        setValidationMessage(`Image too large. Maximum size is ${maxSizeMB}MB`);
        onImageRejected?.(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
      }

      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      setValidationMessage('Scanning image for policy compliance...');

      const moderationResult = await contentModeration.scanImage(file, userId, purpose);

      if (moderationResult.shouldBlock) {
        setValidationStatus('rejected');
        setValidationMessage(
          moderationResult.reason ||
          'Image violates our content policy. Please upload a different image.'
        );
        onImageRejected?.(moderationResult.reason || 'Content policy violation');

        URL.revokeObjectURL(preview);
        setPreviewUrl(null);
        return;
      }

      setValidationStatus('approved');
      setValidationMessage('Image approved!');
      onImageApproved(file, preview);

    } catch (error) {
      console.error('Image validation error:', error);
      setValidationStatus('rejected');
      setValidationMessage('Validation failed. Please try again.');
      onImageRejected?.('Validation error');
    } finally {
      setIsValidating(false);

      setTimeout(() => {
        if (validationStatus !== 'checking') {
          setValidationStatus('idle');
          setValidationMessage('');
        }
      }, 5000);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setValidationStatus('idle');
    setValidationMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isValidating}
      />

      {previewUrl && (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <button
        onClick={handleButtonClick}
        type="button"
        disabled={isValidating}
        className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
          isValidating
            ? 'bg-gray-300 cursor-not-allowed text-gray-600'
            : 'bg-rose-500 hover:bg-rose-600 text-white'
        }`}
      >
        {isValidating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Validating...
          </span>
        ) : (
          buttonText
        )}
      </button>

      {validationMessage && (
        <div className={`p-3 rounded-lg text-sm ${
          validationStatus === 'checking'
            ? 'bg-blue-50 text-blue-800 border border-blue-200'
            : validationStatus === 'approved'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : validationStatus === 'rejected'
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-gray-50 text-gray-800 border border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            {validationStatus === 'checking' && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {validationStatus === 'approved' && (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {validationStatus === 'rejected' && (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{validationMessage}</span>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>Accepted formats: {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}</p>
        <p>Maximum size: {maxSizeMB}MB</p>
        <p className="font-medium text-gray-600">
          All images are scanned for policy compliance before upload
        </p>
      </div>
    </div>
  );
};

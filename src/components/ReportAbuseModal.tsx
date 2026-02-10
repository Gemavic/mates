import React, { useState } from 'react';
import { contentModeration } from '../lib/contentModeration';

interface ReportAbuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName: string;
  contextType?: 'message' | 'profile' | 'photo' | 'call' | 'other';
  contextId?: string;
  reporterId: string;
}

export const ReportAbuseModal: React.FC<ReportAbuseModalProps> = ({
  isOpen,
  onClose,
  reportedUserId,
  reportedUserName,
  contextType = 'other',
  contextId,
  reporterId
}) => {
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const reportTypes = [
    { value: 'harassment', label: 'Harassment or Bullying', critical: false },
    { value: 'nudity', label: 'Nudity or Sexual Content', critical: true },
    { value: 'solicitation', label: 'Solicitation (Prostitution/Escort)', critical: true },
    { value: 'fraud', label: 'Scam or Fraud', critical: false },
    { value: 'underage', label: 'Underage User', critical: true },
    { value: 'violence', label: 'Threats or Violence', critical: true },
    { value: 'hate_speech', label: 'Hate Speech', critical: false },
    { value: 'spam', label: 'Spam', critical: false },
    { value: 'other', label: 'Other', critical: false }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reportType || !description.trim()) {
      alert('Please select a report type and provide details');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await contentModeration.submitAbuseReport(
        reporterId,
        reportedUserId,
        reportType,
        description,
        contextType,
        contextId
      );

      if (result.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
          setReportType('');
          setDescription('');
          setSubmitStatus('idle');
        }, 2000);
      } else {
        setSubmitStatus('error');
        console.error('Report submission failed:', result.error);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Report User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitStatus === 'success' ? (
          <div className="text-center py-8">
            <div className="text-green-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900">Report Submitted</p>
            <p className="text-sm text-gray-600 mt-2">Our team will review this report shortly</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                You are reporting: <span className="font-semibold">{reportedUserName}</span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Report <span className="text-red-500">*</span>
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                required
                disabled={isSubmitting}
              >
                <option value="">Select a reason...</option>
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} {type.critical ? '⚠️' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Details <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                placeholder="Please provide specific details about what happened..."
                required
                disabled={isSubmitting}
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {description.length}/1000 characters
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-800">
                <strong>Privacy Notice:</strong> Your report is confidential. The reported user will not be notified of your identity. Our Trust & Safety team will review this matter.
              </p>
            </div>

            {submitStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">
                  Failed to submit report. Please try again.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                disabled={isSubmitting || !reportType || !description.trim()}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

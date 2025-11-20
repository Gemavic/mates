import React from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';

interface CancelPageProps {
  onNavigate?: (screen: string) => void;
}

export const CancelPage: React.FC<CancelPageProps> = ({ onNavigate = () => {} }) => {
  return (
    <Layout
      title="Payment Cancelled"
      onBack={() => onNavigate?.('checkout') || (window.location.href = '/checkout')}
      showClose={false}
    >
      <div className="px-4 py-6">
        {/* Cancel Animation */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center">
            <XCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Payment Cancelled</h2>
          <p className="text-white/80 text-lg">Payment was cancelled - no charges made</p>
        </div>

        {/* Information */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h3 className="text-white font-semibold text-lg mb-4">What Happened?</h3>
          <div className="space-y-3 text-white/80 text-sm">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
              <span>Payment was cancelled during checkout process</span>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
              <span>No charges were made to your account</span>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2"></div>
              <span>You can retry your purchase anytime</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={() => onNavigate?.('checkout') || (window.location.href = '/checkout')}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:scale-105 transition-all duration-300"
            type="button"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <Button
            onClick={() => onNavigate?.('discovery') || (window.location.href = '/app')}
            className="w-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            type="button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to App
          </Button>
        </div>

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="text-white/60 text-sm mb-2">
            Need help with payment?
          </p>
          <p className="text-white/80 text-sm">
            Contact support: support@dates.care
          </p>
          <p className="text-white/60 text-xs mt-2">
            Multiple secure payment options available
          </p>
        </div>
      </div>
    </Layout>
  );
};
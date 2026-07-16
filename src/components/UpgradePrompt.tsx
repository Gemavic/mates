import React, { useState } from 'react';
import { Button } from './ui/button';
import { Crown, X, Zap, Heart, MessageCircle, Video, Star, Coins } from 'lucide-react';
import { PaymentModelChoice } from './PaymentModelChoice';

interface UpgradePromptProps {
  reason: string;
  feature?: string;
  currentTier?: string;
  currentUsage?: number;
  limit?: number;
  gracePeriodExpired?: boolean;
  daysRemaining?: number;
  paymentModel?: 'subscription' | 'credits';
  onUpgrade: () => void;
  onUpgradeCredits?: () => void;
  onClose: () => void;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  reason,
  feature,
  currentTier: _currentTier,
  currentUsage,
  limit,
  gracePeriodExpired,
  daysRemaining,
  paymentModel: _paymentModel,
  onUpgrade,
  onUpgradeCredits,
  onClose,
}) => {
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const getFeatureIcon = () => {
    switch (feature) {
      case 'video_calls':
        return <Video className="w-12 h-12 text-pink-500" />;
      case 'audio_calls':
        return <MessageCircle className="w-12 h-12 text-blue-500" />;
      case 'like':
        return <Heart className="w-12 h-12 text-red-500" />;
      case 'message':
        return <MessageCircle className="w-12 h-12 text-purple-500" />;
      default:
        return <Crown className="w-12 h-12 text-yellow-500" />;
    }
  };

  const getTitle = () => {
    if (gracePeriodExpired) {
      return 'Your 15-Day Trial Has Ended';
    }
    if (currentUsage !== undefined && limit !== undefined) {
      return `Daily Limit Reached (${currentUsage}/${limit})`;
    }
    return 'Upgrade to Premium';
  };

  const getMessage = () => {
    if (gracePeriodExpired) {
      return "Thank you for trying our platform! Your free trial period has ended. Choose a payment option to continue enjoying all features and connecting with amazing people.";
    }
    if (feature === 'video_calls' || feature === 'audio_calls') {
      return `${reason}. Choose a payment option to unlock unlimited video and audio calls with your matches!`;
    }
    if (currentUsage !== undefined && limit !== undefined) {
      return `You've used all your daily ${feature}s. Choose Premium Subscription for unlimited access or buy credits for pay-as-you-go!`;
    }
    return reason;
  };

  const handleUpgradeClick = () => {
    setShowPaymentChoice(true);
  };

  const handleSubscriptionChoice = () => {
    setShowPaymentChoice(false);
    onUpgrade();
  };

  const handleCreditsChoice = () => {
    setShowPaymentChoice(false);
    if (onUpgradeCredits) {
      onUpgradeCredits();
    } else {
      onUpgrade();
    }
  };

  if (showPaymentChoice) {
    return (
      <PaymentModelChoice
        onSelectSubscription={handleSubscriptionChoice}
        onSelectCredits={handleCreditsChoice}
        onClose={() => setShowPaymentChoice(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl max-w-md w-full p-8 relative border-2 border-pink-500/20 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 mb-4 animate-pulse">
            {getFeatureIcon()}
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{getTitle()}</h2>
          <p className="text-white/80 text-sm leading-relaxed">{getMessage()}</p>

          {daysRemaining !== undefined && daysRemaining > 0 && !gracePeriodExpired && (
            <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <p className="text-yellow-400 text-sm font-medium">
                <Zap className="w-4 h-4 inline mr-1" />
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left in your trial
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center space-x-3 text-white/90">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Star className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-sm">Unlimited likes and messages</span>
          </div>

          <div className="flex items-center space-x-3 text-white/90">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Video className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-sm">Video & audio calls</span>
          </div>

          <div className="flex items-center space-x-3 text-white/90">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Heart className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-sm">See who liked you</span>
          </div>

          <div className="flex items-center space-x-3 text-white/90">
            <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
              <Crown className="w-4 h-4 text-pink-400" />
            </div>
            <span className="text-sm">Priority support & advanced filters</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleUpgradeClick}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <Crown className="w-5 h-5 mr-2" />
            Choose Payment Option
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSubscriptionChoice}
              className="flex items-center justify-center space-x-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-4 py-2 rounded-lg transition-all duration-200 text-sm"
            >
              <Crown className="w-4 h-4" />
              <span>Subscription</span>
            </button>
            <button
              onClick={handleCreditsChoice}
              className="flex items-center justify-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-lg transition-all duration-200 text-sm"
            >
              <Coins className="w-4 h-4" />
              <span>Pay-as-You-Go</span>
            </button>
          </div>
        </div>

        <p className="text-center text-white/50 text-xs mt-4">
          Subscription from $19.99/month • Credits from $9.99 • Choose what works for you
        </p>
      </div>
    </div>
  );
};

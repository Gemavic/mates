import React from 'react';
import { Button } from './ui/button';
import { Crown, X, Zap, Heart, MessageCircle, Video, Star } from 'lucide-react';

interface UpgradePromptProps {
  reason: string;
  feature?: string;
  currentTier?: string;
  currentUsage?: number;
  limit?: number;
  gracePeriodExpired?: boolean;
  daysRemaining?: number;
  onUpgrade: () => void;
  onClose: () => void;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  reason,
  feature,
  currentTier,
  currentUsage,
  limit,
  gracePeriodExpired,
  daysRemaining,
  onUpgrade,
  onClose,
}) => {
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
      return "Thank you for trying our platform! Your free trial period has ended. Upgrade now to continue enjoying all features and connecting with amazing people.";
    }
    if (feature === 'video_calls' || feature === 'audio_calls') {
      return `${reason}. Upgrade to unlock unlimited video and audio calls with your matches!`;
    }
    if (currentUsage !== undefined && limit !== undefined) {
      return `You've used all your daily ${feature}s. Upgrade to Premium for unlimited access!`;
    }
    return reason;
  };

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

        <Button
          onClick={onUpgrade}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          <Crown className="w-5 h-5 mr-2" />
          Upgrade to Premium
        </Button>

        <p className="text-center text-white/50 text-xs mt-4">
          Starting at $19.99/month • Cancel anytime
        </p>
      </div>
    </div>
  );
};

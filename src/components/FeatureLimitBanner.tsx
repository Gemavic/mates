import React from 'react';
import { AlertCircle, Crown, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';

interface FeatureLimitBannerProps {
  currentUsage: number;
  limit: number;
  featureName: string;
  onUpgrade: () => void;
}

export const FeatureLimitBanner: React.FC<FeatureLimitBannerProps> = ({
  currentUsage,
  limit,
  featureName,
  onUpgrade,
}) => {
  const percentage = (currentUsage / limit) * 100;
  const remaining = limit - currentUsage;
  const isNearLimit = percentage >= 70;
  const isAtLimit = currentUsage >= limit;

  if (!isNearLimit && !isAtLimit) return null;

  return (
    <div
      className={`rounded-xl p-4 mb-4 border ${
        isAtLimit
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-yellow-500/10 border-yellow-500/30'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <AlertCircle
            className={`w-5 h-5 mt-0.5 ${
              isAtLimit ? 'text-red-400' : 'text-yellow-400'
            }`}
          />
          <div className="flex-1">
            <h3
              className={`font-semibold mb-1 ${
                isAtLimit ? 'text-red-300' : 'text-yellow-300'
              }`}
            >
              {isAtLimit ? `Daily ${featureName} Limit Reached` : `Running Low on ${featureName}s`}
            </h3>
            <p className="text-white/80 text-sm mb-3">
              {isAtLimit
                ? `You've used all ${limit} of your daily ${featureName.toLowerCase()}s.`
                : `You have ${remaining} ${featureName.toLowerCase()}${remaining !== 1 ? 's' : ''} remaining today.`}
            </p>

            <div className="mb-3">
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>
                  {currentUsage}/{limit}
                </span>
                <span>{percentage.toFixed(0)}% used</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isAtLimit
                      ? 'bg-gradient-to-r from-red-500 to-pink-500'
                      : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>

            <Button
              onClick={onUpgrade}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white text-sm px-4 py-2 rounded-lg transition-all duration-300"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade for Unlimited
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GracePeriodBannerProps {
  daysRemaining: number;
  onUpgrade: () => void;
}

export const GracePeriodBanner: React.FC<GracePeriodBannerProps> = ({
  daysRemaining,
  onUpgrade,
}) => {
  if (daysRemaining > 5) return null;

  const isUrgent = daysRemaining <= 2;

  return (
    <div
      className={`rounded-xl p-4 mb-4 border ${
        isUrgent
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-blue-500/10 border-blue-500/30'
      }`}
    >
      <div className="flex items-start space-x-3">
        <TrendingUp
          className={`w-5 h-5 mt-0.5 ${
            isUrgent ? 'text-red-400' : 'text-blue-400'
          }`}
        />
        <div className="flex-1">
          <h3
            className={`font-semibold mb-1 ${
              isUrgent ? 'text-red-300' : 'text-blue-300'
            }`}
          >
            {isUrgent ? 'Trial Ending Soon!' : 'Your Trial is Almost Over'}
          </h3>
          <p className="text-white/80 text-sm mb-3">
            Only {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left in your free trial.
            Upgrade now to keep enjoying all features without interruption!
          </p>
          <Button
            onClick={onUpgrade}
            className={`${
              isUrgent
                ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
            } text-white text-sm px-4 py-2 rounded-lg transition-all duration-300`}
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Premium
          </Button>
        </div>
      </div>
    </div>
  );
};

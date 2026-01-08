import React from 'react';
import { Button } from './ui/button';
import { Crown, X, Coins, CreditCard, Check, Zap } from 'lucide-react';

interface PaymentModelChoiceProps {
  onSelectSubscription: () => void;
  onSelectCredits: () => void;
  onClose: () => void;
}

export const PaymentModelChoice: React.FC<PaymentModelChoiceProps> = ({
  onSelectSubscription,
  onSelectCredits,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl max-w-4xl w-full p-8 relative border-2 border-pink-500/20 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Choose Your Payment Model</h2>
          <p className="text-white/80 text-sm">Select the option that works best for you</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Monthly Subscription Option */}
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl p-6 border-2 border-purple-500/30 hover:border-purple-500/60 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Monthly Subscription</h3>
                  <p className="text-purple-300 text-sm">Best for active users</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start space-x-2 text-white/90">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Unlimited likes, messages, and profile views</span>
              </div>
              <div className="flex items-start space-x-2 text-white/90">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Video & audio calls included (Platinum+)</span>
              </div>
              <div className="flex items-start space-x-2 text-white/90">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">See who liked you</span>
              </div>
              <div className="flex items-start space-x-2 text-white/90">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Advanced filters & priority support</span>
              </div>
              <div className="flex items-start space-x-2 text-white/90">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">No hidden costs - one flat rate</span>
              </div>
            </div>

            <div className="bg-purple-500/10 rounded-lg p-3 mb-4">
              <p className="text-white/80 text-xs text-center">
                Starting at <span className="text-purple-300 font-bold text-lg">$19.99/month</span>
              </p>
            </div>

            <Button
              onClick={onSelectSubscription}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Choose Subscription
            </Button>
          </div>

          {/* Pay-as-You-Go Credits Option */}
          <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-2xl p-6 border-2 border-blue-500/30 hover:border-blue-500/60 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Pay-as-You-Go</h3>
                  <p className="text-blue-300 text-sm">Flexible credit system</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start space-x-2 text-white/90">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Pay only for what you use</span>
              </div>
              <div className="flex items-start space-x-2 text-white/90">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">No recurring monthly charges</span>
              </div>
              <div className="flex items-start space-x-2 text-white/90">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Credits never expire</span>
              </div>
              <div className="flex items-start space-x-2 text-white/90">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Full access to all features</span>
              </div>
              <div className="flex items-start space-x-2 text-white/90">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Buy more credits anytime</span>
              </div>
            </div>

            <div className="bg-blue-500/10 rounded-lg p-3 mb-4">
              <p className="text-white/80 text-xs text-center">
                Starting at <span className="text-blue-300 font-bold text-lg">$9.99</span> for 100 credits
              </p>
            </div>

            <Button
              onClick={onSelectCredits}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              <Zap className="w-5 h-5 mr-2" />
              Choose Credits
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-white/60 text-xs">
            You can switch between payment models anytime
          </p>
        </div>
      </div>
    </div>
  );
};

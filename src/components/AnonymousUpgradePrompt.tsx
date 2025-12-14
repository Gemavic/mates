import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { anonymousAuth, type AnonymousUserDataSummary } from '@/lib/anonymousAuth';
import { X, Lock, Heart, MessageCircle, Users, Gift } from 'lucide-react';

interface AnonymousUpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess?: () => void;
  reason?: string;
}

export const AnonymousUpgradePrompt: React.FC<AnonymousUpgradePromptProps> = ({
  isOpen,
  onClose,
  onUpgradeSuccess,
  reason
}) => {
  const { user, isAnonymous, upgradeToEmailPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataSummary, setDataSummary] = useState<AnonymousUserDataSummary | null>(null);

  useEffect(() => {
    if (isOpen && user && isAnonymous) {
      loadDataSummary();
    }
  }, [isOpen, user, isAnonymous]);

  const loadDataSummary = async () => {
    if (!user) return;

    const summary = await anonymousAuth.getAnonymousUserDataSummary(user.id);
    setDataSummary(summary);
  };

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data, error: upgradeError } = await upgradeToEmailPassword(email, password);

      if (upgradeError) {
        setError(upgradeError.message);
        return;
      }

      if (data?.success) {
        if (onUpgradeSuccess) {
          onUpgradeSuccess();
        }
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const getActivityStats = () => {
    if (!dataSummary) return [];

    const stats = [];
    if (dataSummary.matches_count > 0) {
      stats.push({ icon: Users, label: 'Matches', count: dataSummary.matches_count });
    }
    if (dataSummary.messages_sent > 0) {
      stats.push({ icon: MessageCircle, label: 'Messages', count: dataSummary.messages_sent });
    }
    if (dataSummary.likes_count > 0) {
      stats.push({ icon: Heart, label: 'Likes', count: dataSummary.likes_count });
    }
    if (dataSummary.gifts_sent > 0 || dataSummary.gifts_received > 0) {
      stats.push({ icon: Gift, label: 'Gifts', count: dataSummary.gifts_sent + dataSummary.gifts_received });
    }
    return stats;
  };

  if (!isOpen || !isAnonymous) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-8 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          <div className="flex items-center justify-center mb-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full">
              <Lock size={32} />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">
            Create Your Account
          </h2>
          <p className="text-white/90 text-center text-sm">
            {reason || 'Save your progress and unlock all features'}
          </p>
        </div>

        <div className="px-6 py-6">
          {dataSummary && getActivityStats().length > 0 && (
            <div className="mb-6 p-4 bg-pink-50 rounded-xl">
              <p className="text-sm text-gray-700 mb-3 font-medium">
                Your activity will be saved:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {getActivityStats().map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div className="bg-white p-2 rounded-lg">
                        <Icon size={16} className="text-pink-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                        <p className="text-sm font-bold text-gray-900">{stat.count}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleUpgrade} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                placeholder="At least 6 characters"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                placeholder="Repeat your password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export const useAnonymousUpgradePrompt = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const { isAnonymous } = useAuth();

  const showPrompt = (customReason?: string) => {
    if (isAnonymous) {
      setReason(customReason || '');
      setIsOpen(true);
    }
  };

  const hidePrompt = () => {
    setIsOpen(false);
    setReason('');
  };

  return {
    isOpen,
    showPrompt,
    hidePrompt,
    reason,
  };
};

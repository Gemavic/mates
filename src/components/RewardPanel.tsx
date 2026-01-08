import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Gift, Coins, Zap, Award, TrendingUp } from 'lucide-react';

interface RewardPanelProps {
  selectedUserId: string;
  staffId: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

type RewardType = 'bonus_credits' | 'purchased_credits' | 'kobos' | 'combo';

export const RewardPanel: React.FC<RewardPanelProps> = ({
  selectedUserId,
  staffId,
  onSuccess,
  onError,
}) => {
  const [rewardType, setRewardType] = useState<RewardType>('bonus_credits');
  const [credits, setCredits] = useState('');
  const [kobos, setKobos] = useState('');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAwardReward = async () => {
    if (!selectedUserId) {
      onError('Please select a user first');
      return;
    }

    if (!reason.trim()) {
      onError('Please provide a reason for the reward');
      return;
    }

    setIsProcessing(true);

    try {
      const { supabaseClient } = await import('@/lib/supabase');
      let result: any;

      switch (rewardType) {
        case 'bonus_credits': {
          const amount = parseInt(credits);
          if (isNaN(amount) || amount <= 0) {
            onError('Please enter a valid credit amount');
            setIsProcessing(false);
            return;
          }

          const { data, error } = await supabaseClient.rpc('award_bonus_credits', {
            p_user_id: selectedUserId,
            p_amount: amount,
            p_reason: reason,
            p_staff_id: staffId,
            p_awarded_by: 'staff'
          });

          if (error) throw error;
          result = data;
          break;
        }

        case 'purchased_credits': {
          const amount = parseInt(credits);
          if (isNaN(amount) || amount <= 0) {
            onError('Please enter a valid credit amount');
            setIsProcessing(false);
            return;
          }

          const { data, error } = await supabaseClient.rpc('award_purchased_credits', {
            p_user_id: selectedUserId,
            p_amount: amount,
            p_reason: reason,
            p_staff_id: staffId
          });

          if (error) throw error;
          result = data;
          break;
        }

        case 'kobos': {
          const amount = parseInt(kobos);
          if (isNaN(amount) || amount <= 0) {
            onError('Please enter a valid kobo amount');
            setIsProcessing(false);
            return;
          }

          const { data, error } = await supabaseClient.rpc('award_kobos', {
            p_user_id: selectedUserId,
            p_amount: amount,
            p_reason: reason,
            p_staff_id: staffId,
            p_awarded_by: 'staff'
          });

          if (error) throw error;
          result = data;
          break;
        }

        case 'combo': {
          const creditAmount = parseInt(credits) || 0;
          const koboAmount = parseInt(kobos) || 0;

          if (creditAmount <= 0 && koboAmount <= 0) {
            onError('Please enter at least credits or kobos');
            setIsProcessing(false);
            return;
          }

          const { data, error } = await supabaseClient.rpc('award_combo_reward', {
            p_user_id: selectedUserId,
            p_credits: creditAmount,
            p_kobos: koboAmount,
            p_credit_type: 'complimentary',
            p_reason: reason,
            p_staff_id: staffId,
            p_awarded_by: 'staff'
          });

          if (error) throw error;
          result = data;
          break;
        }
      }

      if (result.success) {
        let message = '';
        if (result.credits_awarded && result.kobos_awarded) {
          message = `Successfully awarded ${result.credits_awarded} credits and ${result.kobos_awarded} kobos!`;
        } else if (result.credits_awarded) {
          message = `Successfully awarded ${result.credits_awarded} credits! New balance: ${result.new_balance}`;
        } else if (result.kobos_awarded) {
          message = `Successfully awarded ${result.kobos_awarded} kobos! New balance: ${result.new_balance}`;
        }
        onSuccess(message);

        setCredits('');
        setKobos('');
        setReason('');
      } else {
        onError(result.error || 'Failed to award reward');
      }
    } catch (error: any) {
      console.error('Error awarding reward:', error);
      onError(error.message || 'Failed to award reward');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
          <Gift className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">Award Rewards</h3>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={() => setRewardType('bonus_credits')}
          className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
            rewardType === 'bonus_credits'
              ? 'border-yellow-500 bg-yellow-500/10'
              : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <Gift className="w-7 h-7 text-yellow-500 mb-2" />
          <p className="text-white text-xs font-semibold">Bonus</p>
        </button>

        <button
          onClick={() => setRewardType('purchased_credits')}
          className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
            rewardType === 'purchased_credits'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <TrendingUp className="w-7 h-7 text-blue-500 mb-2" />
          <p className="text-white text-xs font-semibold">Paid</p>
        </button>

        <button
          onClick={() => setRewardType('kobos')}
          className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
            rewardType === 'kobos'
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <Coins className="w-7 h-7 text-purple-500 mb-2" />
          <p className="text-white text-xs font-semibold">Kobos</p>
        </button>

        <button
          onClick={() => setRewardType('combo')}
          className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
            rewardType === 'combo'
              ? 'border-pink-500 bg-pink-500/10'
              : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <Award className="w-7 h-7 text-pink-500 mb-2" />
          <p className="text-white text-xs font-semibold">Both</p>
        </button>
      </div>

      <div className="space-y-4">
        {(rewardType === 'bonus_credits' || rewardType === 'purchased_credits' || rewardType === 'combo') && (
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Credits Amount
            </label>
            <Input
              type="number"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              placeholder="Enter credits amount"
              className="bg-gray-700 border-gray-600 text-white"
              min="0"
            />
          </div>
        )}

        {(rewardType === 'kobos' || rewardType === 'combo') && (
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Kobos Amount
            </label>
            <Input
              type="number"
              value={kobos}
              onChange={(e) => setKobos(e.target.value)}
              placeholder="Enter kobos amount"
              className="bg-gray-700 border-gray-600 text-white"
              min="0"
            />
          </div>
        )}

        <div>
          <label className="block text-white text-sm font-medium mb-2">
            Reason for Reward
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Customer support compensation, Event prize, Special promotion"
            className="w-full bg-gray-700 border-gray-600 text-white rounded-lg p-3 min-h-[100px]"
          />
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Reward Types Explained:</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><span className="text-yellow-500">Bonus Credits:</span> Complimentary credits (free rewards)</li>
            <li><span className="text-blue-500">Purchased Credits:</span> Credits counted as purchased (for compensation)</li>
            <li><span className="text-purple-500">Kobos:</span> Platform currency for special features</li>
            <li><span className="text-pink-500">Combo:</span> Award both credits and kobos together</li>
          </ul>
        </div>

        <Button
          onClick={handleAwardReward}
          disabled={isProcessing || !selectedUserId}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 rounded-lg"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <Zap className="w-5 h-5 mr-2 animate-pulse" />
              Processing...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <Gift className="w-5 h-5 mr-2" />
              Award Reward
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};

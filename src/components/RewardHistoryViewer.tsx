import React, { useState, useEffect } from 'react';
import { History, Calendar, User, Gift, Coins, Award, Filter } from 'lucide-react';

interface RewardRecord {
  id: string;
  user_id: string;
  reward_type: string;
  credits_awarded: number;
  kobos_awarded: number;
  reason: string;
  awarded_by: string;
  created_at: string;
  staff_id?: string;
  metadata?: any;
}

interface RewardHistoryViewerProps {
  selectedUserId?: string;
  onError: (message: string) => void;
}

export const RewardHistoryViewer: React.FC<RewardHistoryViewerProps> = ({
  selectedUserId,
  onError,
}) => {
  const [history, setHistory] = useState<RewardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [stats, setStats] = useState({
    totalCredits: 0,
    totalKobos: 0,
    totalRewards: 0,
  });

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const { supabaseClient } = await import('@/lib/supabase');
      let query = supabaseClient
        .from('reward_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedUserId) {
        query = query.eq('user_id', selectedUserId);
      }

      if (filterType !== 'all') {
        query = query.eq('reward_type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;

      setHistory(data || []);

      const totalCredits = data?.reduce((sum, r) => sum + (r.credits_awarded || 0), 0) || 0;
      const totalKobos = data?.reduce((sum, r) => sum + (r.kobos_awarded || 0), 0) || 0;
      setStats({
        totalCredits,
        totalKobos,
        totalRewards: data?.length || 0,
      });
    } catch (error: any) {
      console.error('Error loading reward history:', error);
      onError('Failed to load reward history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [selectedUserId, filterType]);

  const getRewardTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      bonus_credits: 'bg-yellow-500/20 text-yellow-400',
      purchased_credits: 'bg-blue-500/20 text-blue-400',
      kobos: 'bg-purple-500/20 text-purple-400',
      combo: 'bg-pink-500/20 text-pink-400',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  const getRewardTypeIcon = (type: string) => {
    switch (type) {
      case 'bonus_credits':
        return <Gift className="w-5 h-5 text-yellow-500" />;
      case 'purchased_credits':
        return <Gift className="w-5 h-5 text-blue-500" />;
      case 'kobos':
        return <Coins className="w-5 h-5 text-purple-500" />;
      case 'combo':
        return <Award className="w-5 h-5 text-pink-500" />;
      default:
        return <Gift className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
            <History className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">Reward History</h3>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-white text-sm border-none focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="bonus_credits">Bonus Credits</option>
              <option value="purchased_credits">Purchased Credits</option>
              <option value="kobos">Kobos</option>
              <option value="combo">Combo</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-400 text-sm font-medium">Total Credits</span>
            <Gift className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalCredits.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-400 text-sm font-medium">Total Kobos</span>
            <Coins className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalKobos.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-400 text-sm font-medium">Total Rewards</span>
            <Award className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalRewards}</p>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <History className="w-8 h-8 text-gray-600 animate-pulse mx-auto mb-3" />
            <p className="text-gray-400">Loading reward history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No reward history found</p>
          </div>
        ) : (
          history.map((record) => (
            <div
              key={record.id}
              className="bg-gray-800 rounded-xl p-4 hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="mt-1">{getRewardTypeIcon(record.reward_type)}</div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs ${getRewardTypeColor(record.reward_type)}`}>
                        {record.reward_type.replace('_', ' ')}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {record.awarded_by === 'staff' ? 'Staff Award' : 'System Reward'}
                      </span>
                    </div>

                    <p className="text-white font-medium mb-1">{record.reason}</p>

                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      {record.credits_awarded > 0 && (
                        <span>+{record.credits_awarded} credits</span>
                      )}
                      {record.kobos_awarded > 0 && (
                        <span>+{record.kobos_awarded} kobos</span>
                      )}
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(record.created_at).toLocaleString()}
                      </span>
                      {!selectedUserId && (
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          User: {record.user_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {record.credits_awarded > 0 && record.kobos_awarded > 0 ? (
                    <div className="space-y-1">
                      <div className="text-yellow-400 font-bold">+{record.credits_awarded}</div>
                      <div className="text-purple-400 font-bold">+{record.kobos_awarded}</div>
                    </div>
                  ) : record.credits_awarded > 0 ? (
                    <div className="text-yellow-400 font-bold text-lg">
                      +{record.credits_awarded}
                    </div>
                  ) : (
                    <div className="text-purple-400 font-bold text-lg">
                      +{record.kobos_awarded}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!selectedUserId && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-300 text-sm">
            Showing last 50 rewards across all users. Select a specific user to see their complete history.
          </p>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, Calendar, Target } from 'lucide-react';

interface RewardRule {
  id: string;
  rule_name: string;
  rule_type: string;
  is_active: boolean;
  reward_config: {
    credits?: number;
    kobos?: number;
    credit_type?: string;
  };
  max_awards_per_user: number;
  valid_from: string;
  valid_until?: string;
  trigger_condition: any;
}

interface AutomatedRulesPanelProps {
  staffId: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export const AutomatedRulesPanel: React.FC<AutomatedRulesPanelProps> = ({
  staffId,
  onSuccess,
  onError,
}) => {
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [newRule, setNewRule] = useState({
    rule_name: '',
    rule_type: 'custom',
    credits: '',
    kobos: '',
    max_awards: '1',
    valid_until: '',
  });

  const loadRules = async () => {
    try {
      const { supabaseClient } = await import('@/lib/supabase');
      const { data, error } = await supabaseClient
        .from('reward_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRules(data || []);
    } catch (error: any) {
      console.error('Error loading rules:', error);
      onError('Failed to load reward rules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const toggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      const { supabaseClient } = await import('@/lib/supabase');
      const { error } = await supabaseClient
        .from('reward_rules')
        .update({ is_active: !currentStatus })
        .eq('id', ruleId);

      if (error) throw error;

      onSuccess(`Rule ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      loadRules();
    } catch (error: any) {
      console.error('Error toggling rule:', error);
      onError('Failed to toggle rule');
    }
  };

  const createRule = async () => {
    if (!newRule.rule_name.trim()) {
      onError('Please enter a rule name');
      return;
    }

    const credits = parseInt(newRule.credits) || 0;
    const kobos = parseInt(newRule.kobos) || 0;

    if (credits <= 0 && kobos <= 0) {
      onError('Please enter at least credits or kobos to award');
      return;
    }

    try {
      const { supabaseClient } = await import('@/lib/supabase');
      const { error } = await supabaseClient.from('reward_rules').insert({
        rule_name: newRule.rule_name,
        rule_type: newRule.rule_type,
        trigger_condition: { custom: true },
        reward_config: {
          credits,
          kobos,
          credit_type: 'complimentary',
        },
        max_awards_per_user: parseInt(newRule.max_awards) || 1,
        valid_until: newRule.valid_until || null,
        created_by: staffId,
        is_active: true,
      });

      if (error) throw error;

      onSuccess('Reward rule created successfully!');
      setShowCreateForm(false);
      setNewRule({
        rule_name: '',
        rule_type: 'custom',
        credits: '',
        kobos: '',
        max_awards: '1',
        valid_until: '',
      });
      loadRules();
    } catch (error: any) {
      console.error('Error creating rule:', error);
      onError('Failed to create rule');
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const { supabaseClient } = await import('@/lib/supabase');
      const { error } = await supabaseClient
        .from('reward_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      onSuccess('Rule deleted successfully');
      loadRules();
    } catch (error: any) {
      console.error('Error deleting rule:', error);
      onError('Failed to delete rule');
    }
  };

  const getRuleTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      signup_bonus: 'bg-green-500/20 text-green-400',
      daily_login: 'bg-blue-500/20 text-blue-400',
      profile_completion: 'bg-purple-500/20 text-purple-400',
      referral: 'bg-pink-500/20 text-pink-400',
      milestone: 'bg-yellow-500/20 text-yellow-400',
      promotion: 'bg-orange-500/20 text-orange-400',
      custom: 'bg-gray-500/20 text-gray-400',
    };
    return colors[type] || colors.custom;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Zap className="w-8 h-8 text-purple-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">Automated Reward Rules</h3>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Rule
        </Button>
      </div>

      {showCreateForm && (
        <div className="bg-gray-800 rounded-xl p-6 space-y-4">
          <h4 className="text-white font-semibold">Create New Reward Rule</h4>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Rule Name</label>
            <Input
              value={newRule.rule_name}
              onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
              placeholder="e.g., Weekend Special Bonus"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Rule Type</label>
            <select
              value={newRule.rule_type}
              onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}
              className="w-full bg-gray-700 border-gray-600 text-white rounded-lg p-2"
            >
              <option value="custom">Custom</option>
              <option value="signup_bonus">Signup Bonus</option>
              <option value="daily_login">Daily Login</option>
              <option value="profile_completion">Profile Completion</option>
              <option value="referral">Referral</option>
              <option value="milestone">Milestone</option>
              <option value="promotion">Promotion</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">Credits</label>
              <Input
                type="number"
                value={newRule.credits}
                onChange={(e) => setNewRule({ ...newRule, credits: e.target.value })}
                placeholder="0"
                className="bg-gray-700 border-gray-600 text-white"
                min="0"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Kobos</label>
              <Input
                type="number"
                value={newRule.kobos}
                onChange={(e) => setNewRule({ ...newRule, kobos: e.target.value })}
                placeholder="0"
                className="bg-gray-700 border-gray-600 text-white"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">Max Awards Per User</label>
              <Input
                type="number"
                value={newRule.max_awards}
                onChange={(e) => setNewRule({ ...newRule, max_awards: e.target.value })}
                placeholder="1"
                className="bg-gray-700 border-gray-600 text-white"
                min="1"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Valid Until (Optional)</label>
              <Input
                type="date"
                value={newRule.valid_until}
                onChange={(e) => setNewRule({ ...newRule, valid_until: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <Button onClick={createRule} className="flex-1 bg-green-600 hover:bg-green-700">
              Create Rule
            </Button>
            <Button
              onClick={() => setShowCreateForm(false)}
              className="flex-1 bg-gray-600 hover:bg-gray-700"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No reward rules created yet</p>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-gray-800 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-white font-semibold">{rule.rule_name}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs ${getRuleTypeColor(rule.rule_type)}`}>
                    {rule.rule_type.replace('_', ' ')}
                  </span>
                  {rule.is_active ? (
                    <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs bg-gray-600 text-gray-400">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  {rule.reward_config.credits && (
                    <span>Credits: {rule.reward_config.credits}</span>
                  )}
                  {rule.reward_config.kobos && (
                    <span>Kobos: {rule.reward_config.kobos}</span>
                  )}
                  <span>Max: {rule.max_awards_per_user}x per user</span>
                  {rule.valid_until && (
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Until {new Date(rule.valid_until).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleRule(rule.id, rule.is_active)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title={rule.is_active ? 'Deactivate' : 'Activate'}
                >
                  {rule.is_active ? (
                    <ToggleRight className="w-6 h-6 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-500" />
                  )}
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="p-2 hover:bg-red-600/20 rounded-lg transition-colors"
                  title="Delete Rule"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-blue-400 font-semibold mb-2">How Automated Rules Work:</h4>
        <ul className="space-y-1 text-sm text-blue-300/80">
          <li>• Rules automatically award rewards when triggers are met</li>
          <li>• System checks rules on signup, login, profile completion, etc.</li>
          <li>• Max awards per user prevents duplicate rewards</li>
          <li>• Inactive rules won't trigger but remain in database</li>
          <li>• Set expiry dates for limited-time promotions</li>
        </ul>
      </div>
    </div>
  );
};

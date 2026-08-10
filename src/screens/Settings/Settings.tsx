import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Bell, Shield, Heart, MapPin, Users, Moon, HelpCircle, LogOut, ChevronRight, AlertTriangle, Lock, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { isPushSupported, hasActivePushSubscription, subscribeToPush, unsubscribeFromPush } from '@/lib/pushNotifications';

interface SettingsProps {
  onNavigate: (screen: string) => void;
}

interface BlockedUser {
  blockId: string;
  userId: string;
  name: string;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showOnline, setShowOnline] = useState(true);
  const [savingOnlineStatus, setSavingOnlineStatus] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSaving, setPushSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  const [location, setLocation] = useState('');
  const [distancePreference, setDistancePreference] = useState(50);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(60);
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Load real show_online_status on mount
  useEffect(() => {
    if (!user) return;
    supabaseClient
      .from('user_profiles')
      .select('show_online_status')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.show_online_status !== null) {
          setShowOnline(data.show_online_status);
        }
      });
  }, [user]);

  useEffect(() => {
    if (!isPushSupported()) {
      setPushSupported(false);
      return;
    }
    hasActivePushSubscription().then(setPushEnabled);
  }, []);

  const togglePushNotifications = async (value: boolean) => {
    if (!user) return;
    setPushSaving(true);
    const success = value ? await subscribeToPush(user.id) : await unsubscribeFromPush();
    if (success) {
      setPushEnabled(value);
    }
    setPushSaving(false);
  };

  const toggleOnlineStatus = async (value: boolean) => {
    if (!user) return;
    setShowOnline(value);
    setSavingOnlineStatus(true);
    const { error } = await supabaseClient
      .from('user_profiles')
      .update({ show_online_status: value })
      .eq('user_id', user.id);
    setSavingOnlineStatus(false);
    if (error) {
      console.error('Failed to update online status:', error);
      setShowOnline(!value); // revert on failure
    }
  };

  const loadBlockedUsers = async () => {
    if (!user) return;
    setLoadingBlocked(true);

    const { data: blocks, error: blocksError } = await supabaseClient
      .from('user_blocks')
      .select('id, blocked_id')
      .eq('blocker_id', user.id);

    if (blocksError || !blocks || blocks.length === 0) {
      if (blocksError) console.error('Failed to load blocked users:', blocksError);
      setBlockedUsers([]);
      setLoadingBlocked(false);
      return;
    }

    const blockedIds = blocks.map((b) => b.blocked_id);
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('user_profiles')
      .select('user_id, full_name, first_name')
      .in('user_id', blockedIds);

    if (profilesError) console.error('Failed to load blocked users\' profiles:', profilesError);

    const nameByUserId = new Map(
      (profiles || []).map((p: any) => [p.user_id, p.first_name || p.full_name || 'Unknown user'])
    );

    setBlockedUsers(
      blocks.map((b) => ({
        blockId: b.id,
        userId: b.blocked_id,
        name: nameByUserId.get(b.blocked_id) || 'Unknown user',
      }))
    );
    setLoadingBlocked(false);
  };

  const unblockUser = async (blockId: string) => {
    const { error } = await supabaseClient.from('user_blocks').delete().eq('id', blockId);
    if (error) {
      console.error('Failed to unblock:', error);
      return;
    }
    setBlockedUsers((prev) => prev.filter((b) => b.blockId !== blockId));
  };

  const loadPreferences = async () => {
    if (!user) return;
    setLoadingPreferences(true);
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .select('location, distance_preference, age_range_min, age_range_max, profile_visibility')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setLocation(data.location || '');
      setDistancePreference(data.distance_preference ?? 50);
      setAgeMin(data.age_range_min ?? 18);
      setAgeMax(data.age_range_max ?? 60);
      setProfileVisibility((data as any).profile_visibility === 'private' ? 'private' : 'public');
    }
    setLoadingPreferences(false);
  };

  const savePreferences = async () => {
    if (!user) return;
    setSavingPreferences(true);
    const { error } = await supabaseClient
      .from('user_profiles')
      .update({
        location: location || null,
        distance_preference: distancePreference,
        age_range_min: ageMin,
        age_range_max: ageMax,
        profile_visibility: profileVisibility,
      })
      .eq('user_id', user.id);
    setSavingPreferences(false);
    if (!error) setShowPreferences(false);
  };

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        { icon: Users, label: 'Discovery & Matching Preferences', action: () => { setShowPreferences(true); loadPreferences(); } },
        { icon: Shield, label: 'ID Verification', action: () => onNavigate('verification') },
        { icon: CreditCard, label: 'Credits & Billing', action: () => onNavigate('credits') },
      ]
    },
    {
      title: 'Privacy & Safety',
      items: [
        { icon: AlertTriangle, label: 'Block & Report', action: () => { setShowBlockedUsers(true); loadBlockedUsers(); } },
        {
          icon: Lock,
          label: 'Two-Factor Authentication',
          comingSoon: true,
        },
      ]
    },
    {
      title: 'Notifications',
      items: [
        pushSupported
          ? {
              icon: Bell,
              label: 'Push Notifications',
              toggle: true,
              value: pushEnabled,
              onChange: togglePushNotifications,
              saving: pushSaving,
            }
          : {
              icon: Bell,
              label: 'Push Notifications',
              comingSoon: true,
            },
        {
          icon: Users,
          label: 'Show Online Status',
          toggle: true,
          value: showOnline,
          onChange: toggleOnlineStatus,
          saving: savingOnlineStatus,
        },
      ]
    },
    {
      title: 'App Settings',
      items: [
        {
          icon: Moon,
          label: 'Dark Mode',
          toggle: true,
          value: theme === 'dark',
          onChange: toggleTheme,
        },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & Support', action: () => onNavigate('help') },
        { icon: Shield, label: 'Safety Tips', action: () => onNavigate('help') },
        { icon: Shield, label: 'Terms of Service', action: () => onNavigate('terms') },
        { icon: Shield, label: 'Privacy Policy', action: () => onNavigate('privacy') },
        { icon: HelpCircle, label: 'Dispute Resolution', action: () => onNavigate('dispute') },
        { icon: AlertTriangle, label: 'Legal Disclaimer', action: () => onNavigate('disclaimer') },
      ]
    }
  ];

  if (showPreferences) {
    return (
      <Layout title="Discovery & Matching" onBack={() => setShowPreferences(false)} showClose={false}>
        <div className="px-4 py-6">
          {loadingPreferences ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Country"
                  className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Search distance: {distancePreference} km
                </label>
                <input
                  type="range"
                  min={5}
                  max={500}
                  step={5}
                  value={distancePreference}
                  onChange={(e) => setDistancePreference(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4" /> Age range: {ageMin} - {ageMax}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={18}
                    max={ageMax}
                    value={ageMin}
                    onChange={(e) => setAgeMin(Number(e.target.value))}
                    className="w-20 bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2"
                  />
                  <span className="text-white/60">to</span>
                  <input
                    type="number"
                    min={ageMin}
                    max={99}
                    value={ageMax}
                    onChange={(e) => setAgeMax(Number(e.target.value))}
                    className="w-20 bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Profile Visibility</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setProfileVisibility('public')}
                    className={`py-3 rounded-lg font-medium transition-colors ${
                      profileVisibility === 'public' ? 'bg-white text-gray-900' : 'bg-white/20 text-white'
                    }`}
                    type="button"
                  >
                    Public
                  </button>
                  <button
                    onClick={() => setProfileVisibility('private')}
                    className={`py-3 rounded-lg font-medium transition-colors ${
                      profileVisibility === 'private' ? 'bg-white text-gray-900' : 'bg-white/20 text-white'
                    }`}
                    type="button"
                  >
                    Private
                  </button>
                </div>
                <p className="text-white/60 text-xs mt-2">
                  {profileVisibility === 'public'
                    ? "Your profile is visible to everyone browsing Discovery."
                    : "Your profile won't appear in Discovery for others to find."}
                </p>
              </div>

              <Button
                onClick={savePreferences}
                disabled={savingPreferences}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-3 rounded-2xl"
                type="button"
              >
                {savingPreferences ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  if (showBlockedUsers) {
    return (
      <Layout
        title="Blocked Users"
        onBack={() => setShowBlockedUsers(false)}
        showClose={false}
      >
        <div className="px-4 py-6">
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center text-red-600 mb-2">
                <Shield className="w-5 h-5 mr-2" />
                <strong>Safety First</strong>
              </div>
              <p className="text-red-600 text-sm">
                You can block users who make you feel uncomfortable. Blocked users cannot contact you
                and won't appear in your Discovery feed. To block or report someone, use the block/report
                buttons on their profile.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-gray-800 font-semibold text-lg">Blocked Users ({blockedUsers.length})</h3>

            {loadingBlocked ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : blockedUsers.length > 0 ? (
              <div className="space-y-3">
                {blockedUsers.map((blocked) => (
                  <div key={blocked.blockId} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-gray-800 font-medium">{blocked.name}</h4>
                      <Button
                        className="bg-blue-500 text-white text-sm px-4 py-2 hover:bg-blue-600"
                        onClick={() => unblockUser(blocked.blockId)}
                      >
                        Unblock
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-gray-600 text-lg font-medium mb-2">No Blocked Users</h3>
                <p className="text-gray-500">You haven't blocked anyone yet.</p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Settings"
      onBack={() => onNavigate('discovery')}
      showClose={false}
      showFooter={true}
      activeTab="settings"
      onNavigate={onNavigate}
    >
      <div className="px-4 py-6">
        {/* Header Image */}
        <div className="mb-6">
          <img
            src="https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg?auto=compress&cs=tinysrgb&w=800"
            alt="Settings Header"
            loading="lazy"
            className="w-full h-24 object-cover rounded-2xl shadow-lg"
          />
        </div>

        {settingsGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            <h3 className="text-white font-semibold text-lg mb-3 px-2">
              {group.title}
            </h3>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden">
              {group.items.map((item: any, itemIndex) => {
                const Icon = item.icon;
                return (
                  <div
                    key={itemIndex}
                    className={`flex items-center justify-between p-4 ${
                      itemIndex < group.items.length - 1 ? 'border-b border-white/10' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-white/80" />
                      <span className={`font-medium ${item.comingSoon ? 'text-white/50' : 'text-white'}`}>
                        {item.label}
                      </span>
                    </div>

                    {item.comingSoon ? (
                      <span className="text-xs font-medium text-white/50 bg-white/10 px-2.5 py-1 rounded-full">
                        Coming Soon
                      </span>
                    ) : item.toggle ? (
                      <button
                        onClick={() => item.onChange && item.onChange(!item.value)}
                        disabled={item.saving}
                        className={`w-12 h-6 rounded-full transition-colors disabled:opacity-60 ${
                          item.value ? 'bg-pink-500' : 'bg-white/30'
                        }`}
                        type="button"
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full transition-transform ${
                            item.value ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    ) : (
                      <button
                        onClick={item.action}
                        className="text-white/60 hover:text-white transition-colors"
                        type="button"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <div className="mt-8">
          <Button
            onClick={() => onNavigate('welcome')}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-2xl cursor-pointer touch-manipulation active:scale-95"
            type="button"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Log Out
          </Button>
        </div>

        {/* App Info */}
        <div className="mt-6 text-center">
          <p className="text-white/60 text-sm">
            Dates v1.0.0
          </p>
          <p className="text-white/40 text-xs mt-1">
            Made with ❤️ for finding love
          </p>
        </div>
      </div>
    </Layout>
  );
};

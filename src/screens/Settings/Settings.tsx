import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Bell, Shield, Heart, MapPin, Users, Moon, HelpCircle, LogOut, ChevronRight, AlertTriangle, Lock, Eye, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SecurityManager } from '@/lib/security';

interface SettingsProps {
  onNavigate: (screen: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showOnline, setShowOnline] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [dataEncryption, setDataEncryption] = useState(true);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        { icon: Users, label: 'Discovery Settings', action: () => {} },
        { icon: MapPin, label: 'Location', action: () => {} },
        { icon: Heart, label: 'Dating Preferences', action: () => {} },
        { icon: CreditCard, label: 'Credits & Billing', action: () => onNavigate('credits') },
      ]
    },
    {
      title: 'Privacy & Safety',
      items: [
        { icon: Shield, label: 'Privacy Settings', action: () => {} },
        { icon: AlertTriangle, label: 'Block & Report', action: () => setShowBlockedUsers(true) },
        { 
          icon: Lock, 
          label: 'Two-Factor Authentication', 
          toggle: true,
          value: twoFactorEnabled,
          onChange: setTwoFactorEnabled
        },
        { 
          icon: Shield, 
          label: 'Data Encryption', 
          toggle: true,
          value: dataEncryption,
          onChange: setDataEncryption
        },
      ]
    },
    {
      title: 'Notifications',
      items: [
        { 
          icon: Bell, 
          label: 'Push Notifications', 
          toggle: true,
          value: notifications,
          onChange: setNotifications
        },
        { 
          icon: Users, 
          label: 'Show Online Status', 
          toggle: true,
          value: showOnline,
          onChange: setShowOnline
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
          value: darkMode,
          onChange: setDarkMode
        },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & Support', action: () => {} },
        { icon: Shield, label: 'Safety Tips', action: () => {} },
        { icon: Shield, label: 'Terms of Service', action: () => onNavigate('terms') },
        { icon: Shield, label: 'Privacy Policy', action: () => onNavigate('privacy') },
        { icon: HelpCircle, label: 'Dispute Resolution', action: () => onNavigate('dispute') },
        { icon: AlertTriangle, label: 'Legal Disclaimer', action: () => onNavigate('disclaimer') },
      ]
    }
  ];

  const blockedUsers = [
    { id: '1', name: 'Blocked User 1', reason: 'Inappropriate behavior' },
    { id: '2', name: 'Blocked User 2', reason: 'Spam messages' }
  ];

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
                You can block users who make you feel uncomfortable. Blocked users cannot contact you.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-gray-800 font-semibold text-lg">Blocked Users ({blockedUsers.length})</h3>
            
            {blockedUsers.length > 0 ? (
              <div className="space-y-3">
                {blockedUsers.map((user) => (
                  <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-gray-800 font-medium">{user.name}</h4>
                        <p className="text-gray-600 text-sm">Reason: {user.reason}</p>
                      </div>
                      <Button
                        className="bg-blue-500 text-white text-sm px-4 py-2 hover:bg-blue-600"
                        onClick={() => console.log(`Unblocked ${user.name}`)}
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

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-blue-800 font-medium mb-2">How to Report Users</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Go to the user's profile</li>
                <li>• Tap the menu button (⋯)</li>
                <li>• Select "Report User"</li>
                <li>• Choose a reason and submit</li>
              </ul>
            </div>
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
            className="w-full h-24 object-cover rounded-2xl shadow-lg"
          />
        </div>

        {settingsGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            <h3 className="text-white font-semibold text-lg mb-3 px-2">
              {group.title}
            </h3>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden">
              {group.items.map((item, itemIndex) => {
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
                      <span className="text-white font-medium">{item.label}</span>
                    </div>
                    
                    {item.toggle ? (
                      <button
                        onClick={() => item.onChange && item.onChange(!item.value)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          item.value ? 'bg-pink-500' : 'bg-white/30'
                        }`}
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

        {/* Security Status */}
        <div className="mb-6">
          <h3 className="text-white font-semibold text-lg mb-3 px-2">
            Security Status
          </h3>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${twoFactorEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-white text-sm">Two-Factor Authentication</span>
                </div>
                <span className="text-white/70 text-xs">
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${dataEncryption ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-white text-sm">Data Encryption</span>
                </div>
                <span className="text-white/70 text-xs">
                  {dataEncryption ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

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
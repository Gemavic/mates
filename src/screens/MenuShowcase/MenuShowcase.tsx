import React from 'react';
import { Layout } from '@/components/Layout';
import { 
  Home, Heart, Star, User, Settings, LogIn, UserPlus, CreditCard, 
  Video, Phone, Gift, Crown, Users, MessageCircle, HelpCircle,
  ChevronRight, Menu as MenuIcon, Shield, AlertTriangle, Newspaper, Mail
} from 'lucide-react';

interface MenuShowcaseProps {
  onNavigate: (screen: string) => void;
}

export const MenuShowcase: React.FC<MenuShowcaseProps> = ({ onNavigate }) => {
  const menuSections = [
    {
      title: 'Main Navigation',
      color: 'from-pink-500 to-rose-500',
      items: [
        { id: 'discovery', icon: Home, label: 'Home', description: 'Discover new matches' },
        { id: 'matches', icon: Heart, label: 'Matches', description: 'Your connections' },
        { id: 'likes', icon: Star, label: 'Likes', description: 'Who likes you' },
        { id: 'profile', icon: User, label: 'Profile', description: 'Your profile' },
      ]
    },
    {
      title: 'Account',
      color: 'from-blue-500 to-cyan-500',
      items: [
        { id: 'signin', icon: LogIn, label: 'Sign In', description: 'Access your account' },
        { id: 'signup', icon: UserPlus, label: 'Sign Up', description: 'Create new account' },
        { id: 'settings', icon: Settings, label: 'Settings', description: 'App preferences' },
      ]
    },
    {
      title: 'Premium Features',
      color: 'from-yellow-400 to-orange-500',
      items: [
        { id: 'credits', icon: CreditCard, label: 'Credits', description: 'Purchase credits' },
        { id: 'gift-shop', icon: Gift, label: 'Gift Shop', description: 'Send virtual gifts' },
        { id: 'match-suitor', icon: Crown, label: 'Match Suitor', description: 'Premium matching' },
      ]
    },
    {
      title: 'Communication',
      color: 'from-green-500 to-teal-500',
      items: [
        { id: 'video-chat', icon: Video, label: 'Video Chat', description: 'Video calls with matches' },
        { id: 'audio-chat', icon: Phone, label: 'Audio Chat', description: 'Voice calls with matches' },
      ]
    },
    {
      title: 'Support & Wellness',
      color: 'from-purple-500 to-indigo-500',
      items: [
        { id: 'couple-therapy', icon: Users, label: 'Couple Therapy', description: 'Professional guidance' },
        { id: 'counselling', icon: MessageCircle, label: 'Counselling', description: 'Personal support' },
        { id: 'help', icon: HelpCircle, label: 'Help & Support', description: 'Get assistance' },
      ]
    },
    {
      title: 'Legal & Privacy',
      color: 'from-gray-500 to-slate-600',
      items: [
        { id: 'terms', icon: Shield, label: 'Terms of Service', description: 'User agreement' },
        { id: 'privacy', icon: Shield, label: 'Privacy Policy', description: 'Data protection' },
        { id: 'dispute', icon: HelpCircle, label: 'Dispute Resolution', description: 'Conflict resolution' },
        { id: 'disclaimer', icon: AlertTriangle, label: 'Legal Disclaimer', description: 'Legal notices' },
      ]
    }
  ];

  return (
    <Layout
      title="Menu Navigation"
      onBack={() => onNavigate('discovery')}
      showClose={false}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400" 
            alt="Menu Navigation" 
            className="w-20 h-20 mx-auto mb-4 rounded-full object-cover shadow-lg"
          />
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
            <MenuIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Navigation Menu</h2>
          <p className="text-white/80">All available screens and features</p>
        </div>

        {/* Menu Access Instructions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
              <MenuIcon className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-white font-semibold">How to Access Menu</h3>
          </div>
          <p className="text-white/80 text-sm">
            Click the hamburger menu button (☰) in the top-left corner of any screen to access all navigation options.
          </p>
        </div>

        {/* Menu Sections */}
        <div className="space-y-6">
          {menuSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-3 h-8 bg-gradient-to-b ${section.color} rounded-full`}></div>
                <h3 className="text-white font-bold text-lg">{section.title}</h3>
              </div>
              
              <div className="space-y-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className="w-full flex items-center justify-between p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-300 hover:scale-105"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 bg-gradient-to-r ${section.color} rounded-full flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                          <div className="text-white font-medium">{item.label}</div>
                          <div className="text-white/70 text-xs">{item.description}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/60" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Navigation Info */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="text-white font-semibold text-lg mb-3">Footer Navigation</h3>
          <p className="text-white/80 text-sm mb-3">
            Quick access tabs at the bottom of most screens:
          </p>
          <div className="flex justify-between">
            {[
              { icon: Home, label: 'Discover' },
              { icon: Heart, label: 'Matches' },
              { icon: Star, label: 'Likes' },
              { icon: User, label: 'Profile' },
              { icon: Settings, label: 'Settings' }
            ].map((tab, index) => {
              const Icon = tab.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-1">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white/70 text-xs">{tab.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Count */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 rounded-full">
            <span className="text-white font-bold text-lg">15+</span>
            <span className="text-white text-sm">Available Screens</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};
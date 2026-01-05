import React from 'react';
import { Users, Heart, Star, Video, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionCTAProps {
  onNavigate: (screen: string) => void;
  className?: string;
}

export const QuickActionCTA: React.FC<QuickActionCTAProps> = ({ onNavigate, className }) => {
  const quickActions = [
    {
      id: 'browse-profiles',
      icon: Users,
      label: 'Browse All',
      description: 'View all profiles',
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
    },
    {
      id: 'matches',
      icon: Heart,
      label: 'My Matches',
      description: 'Your connections',
      color: 'from-rose-500 to-pink-600',
      hoverColor: 'hover:from-rose-600 hover:to-pink-700',
    },
    {
      id: 'likes',
      icon: Star,
      label: 'Likes',
      description: 'Who likes you',
      color: 'from-amber-500 to-orange-600',
      hoverColor: 'hover:from-amber-600 hover:to-orange-700',
    },
    {
      id: 'video-chat',
      icon: Video,
      label: 'Video Chat',
      description: 'Face-to-face',
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700',
    },
    {
      id: 'audio-chat',
      icon: Phone,
      label: 'Audio Chat',
      description: 'Voice calls',
      color: 'from-green-500 to-emerald-600',
      hoverColor: 'hover:from-green-600 hover:to-emerald-700',
    },
    {
      id: 'mail',
      icon: Mail,
      label: 'Messages',
      description: 'Your inbox',
      color: 'from-indigo-500 to-indigo-600',
      hoverColor: 'hover:from-indigo-600 hover:to-indigo-700',
    },
  ];

  return (
    <div className={cn('w-full', className)}>
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
        <h2 className="text-white text-lg sm:text-xl font-bold mb-4 text-center sm:text-left">
          Quick Actions
        </h2>

        {/* Mobile: 2-column Grid */}
        <div className="grid grid-cols-2 sm:hidden gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-xl',
                  'bg-gradient-to-br',
                  action.color,
                  action.hoverColor,
                  'text-white shadow-lg',
                  'transform transition-all duration-200',
                  'active:scale-95 hover:scale-105',
                  'cursor-pointer touch-manipulation'
                )}
                type="button"
              >
                <Icon className="w-8 h-8 mb-2" />
                <span className="text-sm font-semibold text-center">{action.label}</span>
                <span className="text-xs opacity-90 mt-1 text-center">{action.description}</span>
              </button>
            );
          })}
        </div>

        {/* Tablet/Desktop: 3-column Grid */}
        <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-xl',
                  'bg-gradient-to-br',
                  action.color,
                  action.hoverColor,
                  'text-white shadow-lg',
                  'transform transition-all duration-200',
                  'active:scale-95 hover:scale-105',
                  'cursor-pointer touch-manipulation'
                )}
                type="button"
              >
                <Icon className="w-10 h-10 mb-2" />
                <span className="text-sm font-semibold text-center">{action.label}</span>
                <span className="text-xs opacity-90 mt-1 text-center">{action.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

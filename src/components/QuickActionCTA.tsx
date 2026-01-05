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
      label: 'Browse',
      color: 'bg-blue-500/90',
      hoverColor: 'hover:bg-blue-600',
    },
    {
      id: 'matches',
      icon: Heart,
      label: 'Matches',
      color: 'bg-rose-500/90',
      hoverColor: 'hover:bg-rose-600',
    },
    {
      id: 'likes',
      icon: Star,
      label: 'Likes',
      color: 'bg-amber-500/90',
      hoverColor: 'hover:bg-amber-600',
    },
    {
      id: 'video-chat',
      icon: Video,
      label: 'Video',
      color: 'bg-purple-500/90',
      hoverColor: 'hover:bg-purple-600',
    },
    {
      id: 'audio-chat',
      icon: Phone,
      label: 'Audio',
      color: 'bg-green-500/90',
      hoverColor: 'hover:bg-green-600',
    },
    {
      id: 'mail',
      icon: Mail,
      label: 'Messages',
      color: 'bg-blue-600/90',
      hoverColor: 'hover:bg-blue-700',
    },
  ];

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile: Horizontal Scroll */}
      <div className="sm:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onNavigate(action.id)}
              className={cn(
                'flex flex-col items-center justify-center min-w-[70px] p-2.5 rounded-lg',
                action.color,
                action.hoverColor,
                'text-white shadow-md backdrop-blur-sm',
                'transform transition-all duration-200',
                'active:scale-95',
                'cursor-pointer touch-manipulation'
              )}
              type="button"
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium whitespace-nowrap">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tablet/Desktop: Grid */}
      <div className="hidden sm:grid sm:grid-cols-6 gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onNavigate(action.id)}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg',
                action.color,
                action.hoverColor,
                'text-white shadow-md backdrop-blur-sm',
                'transform transition-all duration-200',
                'active:scale-95 hover:scale-105',
                'cursor-pointer touch-manipulation'
              )}
              type="button"
            >
              <Icon className="w-6 h-6 mb-1.5" />
              <span className="text-xs font-medium text-center">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

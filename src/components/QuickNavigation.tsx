import React from 'react';
import {
  Users,
  Heart,
  Star,
  MessageCircle,
  Mail,
  Phone,
  Video,
  CreditCard,
  Gift,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickNavigationProps {
  onNavigate: (screen: string) => void;
  className?: string;
}

export const QuickNavigation: React.FC<QuickNavigationProps> = ({ onNavigate, className }) => {
  const quickActions = [
    { id: 'browse-profiles', icon: Users, label: 'Browse', color: 'bg-gradient-to-br from-blue-500 to-blue-600', route: 'browse-profiles' },
    { id: 'matches', icon: Heart, label: 'Matches', color: 'bg-gradient-to-br from-rose-500 to-rose-600', route: 'matches' },
    { id: 'likes', icon: Star, label: 'Likes', color: 'bg-gradient-to-br from-amber-500 to-amber-600', route: 'likes' },
    { id: 'video', icon: Video, label: 'Video', color: 'bg-gradient-to-br from-purple-500 to-purple-600', route: 'video-chat' },
    { id: 'audio', icon: Phone, label: 'Audio', color: 'bg-gradient-to-br from-green-500 to-green-600', route: 'audio-chat' },
    { id: 'messages', icon: Mail, label: 'Messages', color: 'bg-gradient-to-br from-blue-600 to-blue-700', route: 'mail' },
  ];

  return (
    <div className={cn('w-full', className)}>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onNavigate(action.route)}
              className={cn(
                'flex flex-col items-center justify-center min-w-[80px] p-3 rounded-xl snap-start',
                action.color,
                'text-white shadow-lg',
                'transform transition-all duration-200',
                'active:scale-95 hover:scale-105',
                'cursor-pointer touch-manipulation'
              )}
              type="button"
            >
              <Icon className="w-6 h-6 mb-1.5" strokeWidth={2.5} />
              <span className="text-xs font-semibold whitespace-nowrap">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

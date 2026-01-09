import React from 'react';
import { Mail, MessageCircle, Phone, Video, Users, Heart, Gift, CreditCard, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickNavBarProps {
  onNavigate: (screen: string) => void;
  activeScreen?: string;
  className?: string;
}

export const QuickNavBar: React.FC<QuickNavBarProps> = ({ onNavigate, activeScreen, className }) => {
  const navItems = [
    { id: 'browse-profiles', label: 'Browse', icon: Users, color: 'text-blue-600', activeColor: 'bg-blue-100' },
    { id: 'matches', label: 'Chat', icon: MessageCircle, color: 'text-green-600', activeColor: 'bg-green-100' },
    { id: 'mail', label: 'Mail', icon: Mail, color: 'text-purple-600', activeColor: 'bg-purple-100' },
    { id: 'audio-chat', label: 'Audio', icon: Phone, color: 'text-emerald-600', activeColor: 'bg-emerald-100' },
    { id: 'video-chat', label: 'Video', icon: Video, color: 'text-teal-600', activeColor: 'bg-teal-100' },
    { id: 'likes', label: 'Likes', icon: Heart, color: 'text-red-600', activeColor: 'bg-red-100' },
    { id: 'gift-shop', label: 'Gifts', icon: Gift, color: 'text-pink-600', activeColor: 'bg-pink-100' },
    { id: 'credits', label: 'Credits', icon: CreditCard, color: 'text-orange-600', activeColor: 'bg-orange-100' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-gray-600', activeColor: 'bg-gray-100' },
  ];

  return (
    <div className={cn(
      'w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20',
      className
    )}>
      <div className="flex overflow-x-auto scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex flex-col items-center justify-center min-w-[80px] py-3 px-2 transition-all duration-200 touch-manipulation',
                'hover:bg-gray-50 active:scale-95 cursor-pointer',
                isActive ? item.activeColor : 'bg-white'
              )}
              type="button"
            >
              <Icon className={cn(
                'w-5 h-5 mb-1',
                isActive ? item.color : 'text-gray-500'
              )} />
              <span className={cn(
                'text-xs font-medium',
                isActive ? item.color : 'text-gray-600'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

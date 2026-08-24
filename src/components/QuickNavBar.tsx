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
    { id: 'discovery', label: 'Browse', icon: Users, color: 'text-blue-600 dark:text-blue-300', activeColor: 'bg-blue-100 dark:bg-blue-900/40' },
    { id: 'matches', label: 'Chat', icon: MessageCircle, color: 'text-green-600 dark:text-green-300', activeColor: 'bg-green-100 dark:bg-green-900/40' },
    { id: 'mail', label: 'Mail', icon: Mail, color: 'text-purple-600 dark:text-purple-300', activeColor: 'bg-purple-100 dark:bg-purple-900/40' },
    { id: 'audio-chat', label: 'Audio', icon: Phone, color: 'text-emerald-600 dark:text-emerald-300', activeColor: 'bg-emerald-100 dark:bg-emerald-900/40' },
    { id: 'video-chat', label: 'Video', icon: Video, color: 'text-teal-600 dark:text-teal-300', activeColor: 'bg-teal-100 dark:bg-teal-900/40' },
    { id: 'likes', label: 'Likes', icon: Heart, color: 'text-red-600 dark:text-red-300', activeColor: 'bg-red-100 dark:bg-red-900/40' },
    { id: 'gift-shop', label: 'Gifts', icon: Gift, color: 'text-pink-600 dark:text-pink-300', activeColor: 'bg-pink-100 dark:bg-pink-900/40' },
    { id: 'credits', label: 'Credits', icon: CreditCard, color: 'text-orange-600 dark:text-orange-300', activeColor: 'bg-orange-100 dark:bg-orange-900/40' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-gray-600 dark:text-gray-300', activeColor: 'bg-gray-100 dark:bg-gray-900/40' },
  ];

  return (
    <div className={cn(
      'w-full bg-white dark:bg-night-900 border-b border-gray-200 dark:border-night-700 shadow-sm sticky top-0 z-20',
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
                'hover:bg-gray-50 dark:hover:bg-night-700 active:scale-95 cursor-pointer',
                isActive ? item.activeColor : 'bg-white dark:bg-night-900'
              )}
              type="button"
            >
              <Icon className={cn(
                'w-5 h-5 mb-1',
                isActive ? item.color : 'text-gray-500 dark:text-slate-400'
              )} />
              <span className={cn(
                'text-xs font-medium',
                isActive ? item.color : 'text-gray-600 dark:text-slate-300'
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

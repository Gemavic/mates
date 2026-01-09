import React from 'react';
import { Users, Heart, Star, Mail, Phone, Video, BookOpen, FileText, HelpCircle, CreditCard, Gift, Briefcase, MessageCircle, Sparkles, UserPlus, Award, Shield, Settings, TrendingUp, Bell, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryNavigationProps {
  onNavigate: (screen: string) => void;
  className?: string;
}

export const CategoryNavigation: React.FC<CategoryNavigationProps> = ({ onNavigate, className }) => {
  const navigationButtons = [
    { label: 'Browse', route: 'browse-profiles', icon: Users, color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' },
    { label: 'Matches', route: 'matches', icon: Heart, color: 'bg-red-500', hoverColor: 'hover:bg-red-600' },
    { label: 'Likes', route: 'likes', icon: Star, color: 'bg-amber-500', hoverColor: 'hover:bg-amber-600' },
    { label: 'VIP Match', route: 'match-suitor', icon: Sparkles, color: 'bg-purple-500', hoverColor: 'hover:bg-purple-600' },
    { label: 'Mail', route: 'mail', icon: Mail, color: 'bg-indigo-500', hoverColor: 'hover:bg-indigo-600' },
    { label: 'Audio', route: 'audio-chat', icon: Phone, color: 'bg-green-500', hoverColor: 'hover:bg-green-600' },
    { label: 'Video', route: 'video-chat', icon: Video, color: 'bg-teal-500', hoverColor: 'hover:bg-teal-600' },
    { label: 'Chat', route: 'matches', icon: MessageCircle, color: 'bg-cyan-500', hoverColor: 'hover:bg-cyan-600' },
    { label: 'Credits', route: 'credits', icon: CreditCard, color: 'bg-orange-500', hoverColor: 'hover:bg-orange-600' },
    { label: 'Gifts', route: 'gift-shop', icon: Gift, color: 'bg-pink-500', hoverColor: 'hover:bg-pink-600' },
    { label: 'Services', route: 'relationship-services', icon: Briefcase, color: 'bg-rose-500', hoverColor: 'hover:bg-rose-600' },
    { label: 'Education', route: 'education', icon: BookOpen, color: 'bg-emerald-500', hoverColor: 'hover:bg-emerald-600' },
    { label: 'Blog', route: 'care-blog', icon: FileText, color: 'bg-lime-500', hoverColor: 'hover:bg-lime-600' },
    { label: 'Quizzes', route: 'quizzes', icon: HelpCircle, color: 'bg-sky-500', hoverColor: 'hover:bg-sky-600' },
    { label: 'Help', route: 'help', icon: HelpCircle, color: 'bg-blue-400', hoverColor: 'hover:bg-blue-500' },
    { label: 'Profile', route: 'profile', icon: UserPlus, color: 'bg-violet-500', hoverColor: 'hover:bg-violet-600' },
    { label: 'Verify', route: 'verification', icon: Shield, color: 'bg-green-600', hoverColor: 'hover:bg-green-700' },
    { label: 'Settings', route: 'settings', icon: Settings, color: 'bg-gray-600', hoverColor: 'hover:bg-gray-700' },
    { label: 'Newsfeed', route: 'newsfeed', icon: TrendingUp, color: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-600' },
    { label: 'Feedback', route: 'feedback', icon: Bell, color: 'bg-red-400', hoverColor: 'hover:bg-red-500' },
  ];

  return (
    <div className={cn('w-full overflow-x-auto scrollbar-hide', className)} style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="flex gap-2 pb-2 px-1">
        {navigationButtons.map((button, index) => {
          const Icon = button.icon;
          return (
            <button
              key={index}
              onClick={() => onNavigate(button.route)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold shadow-md transition-all duration-200',
                button.color,
                button.hoverColor,
                'hover:scale-105 active:scale-95 touch-manipulation'
              )}
              type="button"
            >
              <Icon className="w-4 h-4" />
              <span className="whitespace-nowrap">{button.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

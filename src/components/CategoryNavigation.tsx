import React from 'react';
import { Users, Heart, Star, Mail, Phone, Video, BookOpen, FileText, HelpCircle, CreditCard, Gift, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryNavigationProps {
  onNavigate: (screen: string) => void;
  className?: string;
}

export const CategoryNavigation: React.FC<CategoryNavigationProps> = ({ onNavigate, className }) => {
  const navigationButtons = [
    { label: 'Browse All', route: 'browse-profiles', icon: Users, color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' },
    { label: 'My Matches', route: 'matches', icon: Heart, color: 'bg-red-500', hoverColor: 'hover:bg-red-600' },
    { label: 'Likes', route: 'likes', icon: Star, color: 'bg-amber-500', hoverColor: 'hover:bg-amber-600' },
    { label: 'VIP Matching', route: 'match-suitor', icon: Users, color: 'bg-violet-500', hoverColor: 'hover:bg-violet-600' },
    { label: 'Message', route: 'mail', icon: Mail, color: 'bg-indigo-500', hoverColor: 'hover:bg-indigo-600' },
    { label: 'Audio', route: 'audio-chat', icon: Phone, color: 'bg-green-500', hoverColor: 'hover:bg-green-600' },
    { label: 'Video', route: 'video-chat', icon: Video, color: 'bg-teal-500', hoverColor: 'hover:bg-teal-600' },
    { label: 'Education', route: 'education', icon: BookOpen, color: 'bg-emerald-500', hoverColor: 'hover:bg-emerald-600' },
    { label: 'Blogs', route: 'care-blog', icon: FileText, color: 'bg-lime-500', hoverColor: 'hover:bg-lime-600' },
    { label: 'Quizzes', route: 'quizzes', icon: HelpCircle, color: 'bg-cyan-500', hoverColor: 'hover:bg-cyan-600' },
    { label: 'Buy Credits', route: 'credits', icon: CreditCard, color: 'bg-orange-500', hoverColor: 'hover:bg-orange-600' },
    { label: 'Gift Shop', route: 'gift-shop', icon: Gift, color: 'bg-pink-500', hoverColor: 'hover:bg-pink-600' },
    { label: 'Services', route: 'relationship-services', icon: Briefcase, color: 'bg-rose-500', hoverColor: 'hover:bg-rose-600' },
    { label: 'Help & FAQs', route: 'help', icon: HelpCircle, color: 'bg-sky-500', hoverColor: 'hover:bg-sky-600' },
  ];

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <div className="flex gap-3 pb-4">
        {navigationButtons.map((button, index) => {
          const Icon = button.icon;
          return (
            <button
              key={index}
              onClick={() => onNavigate(button.route)}
              className={cn(
                'flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold shadow-lg transition-all duration-200',
                button.color,
                button.hoverColor,
                'hover:scale-105 active:scale-95'
              )}
              type="button"
            >
              <Icon className="w-5 h-5" />
              <span className="whitespace-nowrap">{button.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

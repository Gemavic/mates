import React from 'react';
import { Users, Heart, Star, Mail, Phone, Video, BookOpen, FileText, HelpCircle, CreditCard, Gift, Briefcase } from 'lucide-react';
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
    { label: 'VIP Match', route: 'match-suitor', icon: Users, color: 'bg-violet-500', hoverColor: 'hover:bg-violet-600' },
  ];

  return (
    <div className={cn('w-full overflow-x-auto scrollbar-hide', className)}>
      <div className="flex gap-2 pb-2">
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
                'hover:scale-105 active:scale-95'
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

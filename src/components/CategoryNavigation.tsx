import React from 'react';
import { Users, Heart, Star, Video, Phone, BookOpen, CreditCard, Shield, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryNavigationProps {
  onNavigate: (screen: string) => void;
  className?: string;
}

export const CategoryNavigation: React.FC<CategoryNavigationProps> = ({ onNavigate, className }) => {
  const quickActions = [
    { label: 'Browse', route: 'browse-profiles', icon: Users, color: 'bg-blue-500' },
    { label: 'Matches', route: 'matches', icon: Heart, color: 'bg-red-500' },
    { label: 'Likes', route: 'likes', icon: Star, color: 'bg-amber-500' },
    { label: 'Video', route: 'video-chat', icon: Video, color: 'bg-purple-500' },
    { label: 'Audio', route: 'audio-chat', icon: Phone, color: 'bg-green-500' },
  ];

  const categories = [
    {
      id: 'user-profile',
      title: 'User Profile',
      icon: Users,
      color: 'bg-blue-500',
      items: [
        { label: 'Browse ALL', route: 'browse-profiles' },
        { label: 'My Matches', route: 'matches' },
        { label: 'Likes', route: 'likes' },
        { label: 'VIP Matching', route: 'match-suitor' },
      ],
    },
    {
      id: 'media-calls',
      title: 'Media/Calls',
      icon: Phone,
      color: 'bg-purple-500',
      items: [
        { label: 'Chat', route: 'matches' },
        { label: 'Message', route: 'mail' },
        { label: 'Audio', route: 'audio-chat' },
        { label: 'Video', route: 'video-chat' },
      ],
    },
    {
      id: 'educators',
      title: 'Educators',
      icon: BookOpen,
      color: 'bg-green-500',
      items: [
        { label: 'Education', route: 'education' },
        { label: 'Blogs', route: 'care-blog' },
        { label: 'Quizzes', route: 'quizzes' },
        { label: 'Date Ideas', route: 'education' },
      ],
    },
    {
      id: 'features',
      title: 'Features',
      icon: CreditCard,
      color: 'bg-amber-500',
      items: [
        { label: 'Buy Credits', route: 'credits' },
        { label: 'Gift Shop', route: 'gift-shop' },
        { label: 'Services', route: 'relationship-services' },
        { label: 'Help+FAQs', route: 'help' },
      ],
    },
    {
      id: 'about-us',
      title: 'About US',
      icon: Shield,
      color: 'bg-slate-500',
      items: [
        { label: 'Terms', route: 'terms' },
        { label: 'Privacy', route: 'privacy' },
        { label: 'Help', route: 'help' },
        { label: 'Disclaimer', route: 'disclaimer' },
        { label: 'Contact US', route: 'help' },
      ],
    },
  ];

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Quick Access Buttons Row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.route}
              onClick={() => onNavigate(action.route)}
              className={cn(
                'flex-shrink-0 flex flex-col items-center justify-center gap-2 rounded-2xl p-4 min-w-[100px] h-[100px] shadow-lg hover:scale-105 transition-transform',
                action.color
              )}
              type="button"
            >
              <Icon className="w-8 h-8 text-white" />
              <span className="text-white font-bold text-sm">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Category Columns - Mobile: Horizontal Scroll */}
      <div className="lg:hidden flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <div
              key={category.id}
              className="flex-shrink-0 w-[200px] bg-white/10 backdrop-blur-md rounded-2xl p-4 shadow-lg"
            >
              {/* Category Header */}
              <div className="flex flex-col items-center mb-4">
                <div className={cn('w-14 h-14 rounded-full flex items-center justify-center mb-2 shadow-md', category.color)}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-white font-bold text-sm text-center">{category.title}</h3>
              </div>

              {/* Category Items */}
              <div className="space-y-2">
                {category.items.map((item, index) => (
                  <React.Fragment key={index}>
                    <button
                      onClick={() => onNavigate(item.route)}
                      className="w-full text-center px-3 py-2.5 bg-white/10 hover:bg-white/25 rounded-xl transition-all duration-200 active:scale-95"
                      type="button"
                    >
                      <span className="text-white text-sm font-medium">{item.label}</span>
                    </button>
                    {index < category.items.length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <ArrowDown className="w-3.5 h-3.5 text-white/60" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Columns - Desktop: 5 Column Grid */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-5">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <div
              key={category.id}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-5 shadow-lg"
            >
              {/* Category Header */}
              <div className="flex flex-col items-center mb-5">
                <div className={cn('w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-md', category.color)}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-white font-bold text-base text-center">{category.title}</h3>
              </div>

              {/* Category Items */}
              <div className="space-y-2.5">
                {category.items.map((item, index) => (
                  <React.Fragment key={index}>
                    <button
                      onClick={() => onNavigate(item.route)}
                      className="w-full text-center px-4 py-3 bg-white/10 hover:bg-white/25 rounded-xl transition-all duration-200 hover:scale-[1.02] shadow-sm"
                      type="button"
                    >
                      <span className="text-white text-sm font-medium">{item.label}</span>
                    </button>
                    {index < category.items.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="w-4 h-4 text-white/60" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

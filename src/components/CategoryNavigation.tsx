import React from 'react';
import { Users, Phone, BookOpen, CreditCard, Shield, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryNavigationProps {
  onNavigate: (screen: string) => void;
  className?: string;
}

export const CategoryNavigation: React.FC<CategoryNavigationProps> = ({ onNavigate, className }) => {
  const categories = [
    {
      id: 'user-profile',
      title: 'User Profile',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      headerRoute: 'browse-profiles',
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
      color: 'from-purple-500 to-purple-600',
      headerRoute: 'likes',
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
      color: 'from-green-500 to-green-600',
      headerRoute: 'education',
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
      color: 'from-amber-500 to-amber-600',
      headerRoute: 'credits',
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
      color: 'from-slate-500 to-slate-600',
      headerRoute: 'terms',
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
    <div className={cn('w-full', className)}>
      {/* Mobile: Horizontal scroll */}
      <div className="lg:hidden flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <div
              key={category.id}
              className="flex-shrink-0 w-[160px] bg-white/10 backdrop-blur-sm rounded-xl p-3 snap-start"
            >
              {/* Category Header - Clickable */}
              <button
                onClick={() => onNavigate(category.headerRoute)}
                className="flex flex-col items-center mb-3 w-full hover:scale-105 transition-transform cursor-pointer"
                type="button"
              >
                <div className={cn('w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center mb-2', category.color)}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-bold text-xs text-center">{category.title}</h3>
              </button>

              {/* Category Items */}
              <div className="space-y-1">
                {category.items.map((item, index) => (
                  <React.Fragment key={index}>
                    <button
                      onClick={() => onNavigate(item.route)}
                      className="w-full text-center px-2 py-2 bg-white/5 hover:bg-white/20 rounded-lg transition-all duration-200 active:scale-95"
                      type="button"
                    >
                      <span className="text-white text-xs font-medium">{item.label}</span>
                    </button>
                    {index < category.items.length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <ArrowDown className="w-3 h-3 text-white/50" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: 5 Column Grid */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <div
              key={category.id}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
            >
              {/* Category Header - Clickable */}
              <button
                onClick={() => onNavigate(category.headerRoute)}
                className="flex flex-col items-center mb-4 w-full hover:scale-105 transition-transform cursor-pointer"
                type="button"
              >
                <div className={cn('w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center mb-2', category.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-bold text-sm text-center">{category.title}</h3>
              </button>

              {/* Category Items */}
              <div className="space-y-2">
                {category.items.map((item, index) => (
                  <React.Fragment key={index}>
                    <button
                      onClick={() => onNavigate(item.route)}
                      className="w-full text-center px-3 py-2 bg-white/5 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-105"
                      type="button"
                    >
                      <span className="text-white text-sm font-medium">{item.label}</span>
                    </button>
                    {index < category.items.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="w-4 h-4 text-white/50" />
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

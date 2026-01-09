import React, { useState } from 'react';
import { Users, Phone, BookOpen, CreditCard, Shield, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryNavigationProps {
  onNavigate: (screen: string) => void;
  className?: string;
}

export const CategoryNavigation: React.FC<CategoryNavigationProps> = ({ onNavigate, className }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const categories = [
    {
      id: 'user-profile',
      title: "User's Profile",
      icon: Users,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
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
      hoverColor: 'hover:bg-purple-600',
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
      hoverColor: 'hover:bg-green-600',
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
      hoverColor: 'hover:bg-amber-600',
      items: [
        { label: 'Buy Credits', route: 'credits' },
        { label: 'Gift Shop', route: 'gift-shop' },
        { label: 'Services', route: 'relationship-services' },
        { label: 'Help & FAQs', route: 'help' },
      ],
    },
    {
      id: 'about-us',
      title: 'About Us',
      icon: Shield,
      color: 'bg-slate-500',
      hoverColor: 'hover:bg-slate-600',
      items: [
        { label: 'Terms', route: 'terms' },
        { label: 'Privacy', route: 'privacy' },
        { label: 'Help', route: 'help' },
        { label: 'Disclaimer', route: 'disclaimer' },
        { label: 'Contact Us', route: 'help' },
      ],
    },
  ];

  const toggleDropdown = (categoryId: string) => {
    setOpenDropdown(openDropdown === categoryId ? null : categoryId);
  };

  const handleNavigation = (route: string) => {
    onNavigate(route);
    setOpenDropdown(null);
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: Horizontal Dropdown Navigation */}
      <div className="hidden lg:flex lg:justify-center lg:gap-2 lg:flex-wrap">
        {categories.map((category) => {
          const Icon = category.icon;
          const isOpen = openDropdown === category.id;

          return (
            <div key={category.id} className="relative">
              <button
                onClick={() => toggleDropdown(category.id)}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-all duration-200',
                  category.color,
                  category.hoverColor,
                  isOpen && 'scale-105'
                )}
                type="button"
              >
                <Icon className="w-5 h-5" />
                <span>{category.title}</span>
                <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div className="absolute top-full mt-2 left-0 min-w-[200px] bg-white rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {category.items.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleNavigation(item.route)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors text-gray-700 font-medium border-b last:border-b-0 border-gray-100"
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Accordion-style Navigation */}
      <div className="lg:hidden space-y-3">
        {categories.map((category) => {
          const Icon = category.icon;
          const isOpen = openDropdown === category.id;

          return (
            <div key={category.id} className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden shadow-lg">
              <button
                onClick={() => toggleDropdown(category.id)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 text-white font-semibold transition-all',
                  category.color
                )}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{category.title}</span>
                </div>
                <ChevronDown className={cn('w-5 h-5 transition-transform', isOpen && 'rotate-180')} />
              </button>

              {/* Dropdown Items */}
              {isOpen && (
                <div className="bg-white/95 backdrop-blur-sm">
                  {category.items.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleNavigation(item.route)}
                      className="w-full text-left px-6 py-3 hover:bg-gray-100 transition-colors text-gray-700 font-medium border-b last:border-b-0 border-gray-200"
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Click Outside to Close Dropdown */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  );
};

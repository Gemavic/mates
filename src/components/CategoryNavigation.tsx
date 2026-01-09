import React, { useState } from 'react';
import {
  Users,
  Heart,
  Star,
  Sparkles,
  MessageCircle,
  Mail,
  Phone,
  Video,
  BookOpen,
  Newspaper,
  HelpCircle,
  Lightbulb,
  CreditCard,
  Gift,
  HeartHandshake,
  FileText,
  Shield,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryNavigationProps {
  onNavigate: (screen: string) => void;
  className?: string;
}

export const CategoryNavigation: React.FC<CategoryNavigationProps> = ({ onNavigate, className }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

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

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className={cn('w-full space-y-2', className)}>
      {categories.map((category) => {
        const Icon = category.icon;
        const isExpanded = expandedCategory === category.id;

        return (
          <div key={category.id} className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
              type="button"
            >
              <div className="flex items-center space-x-2">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', category.color)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold text-sm">{category.title}</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-white" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white" />
              )}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-1">
                {category.items.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onNavigate(item.route);
                      setExpandedCategory(null);
                    }}
                    className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    type="button"
                  >
                    <span className="text-white text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

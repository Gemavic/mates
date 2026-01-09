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
  Info,
  FileText,
  Shield,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuCategory {
  id: string;
  title: string;
  icon: any;
  color: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  route: string;
  description?: string;
}

interface NavigationMenuProps {
  onNavigate: (screen: string) => void;
  className?: string;
  variant?: 'full' | 'compact';
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  onNavigate,
  className,
  variant = 'full',
}) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const menuCategories: MenuCategory[] = [
    {
      id: 'user-profile',
      title: 'User Profile',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      items: [
        { id: 'browse-all', label: 'Browse All', icon: Users, route: 'browse-profiles', description: 'Discover new connections' },
        { id: 'my-matches', label: 'My Matches', icon: Heart, route: 'matches', description: 'View mutual connections' },
        { id: 'likes', label: 'Likes', icon: Star, route: 'likes', description: 'See who liked you' },
        { id: 'vip-matching', label: 'VIP Matching', icon: Sparkles, route: 'match-suitor', description: 'Premium matchmaking' },
      ],
    },
    {
      id: 'media-calls',
      title: 'Media & Calls',
      icon: MessageCircle,
      color: 'from-purple-500 to-purple-600',
      items: [
        { id: 'chat', label: 'Chat', icon: MessageCircle, route: 'matches', description: 'Live chat' },
        { id: 'message', label: 'Messages', icon: Mail, route: 'mail', description: 'Private messages' },
        { id: 'audio', label: 'Audio', icon: Phone, route: 'audio-chat', description: 'Voice calls' },
        { id: 'video', label: 'Video', icon: Video, route: 'video-chat', description: 'Video calls' },
      ],
    },
    {
      id: 'educators',
      title: 'Education',
      icon: BookOpen,
      color: 'from-green-500 to-green-600',
      items: [
        { id: 'education', label: 'Relationship Tips', icon: BookOpen, route: 'education', description: 'Learn and grow' },
        { id: 'blogs', label: 'Blog', icon: Newspaper, route: 'care-blog', description: 'Articles and advice' },
        { id: 'quizzes', label: 'Quizzes', icon: HelpCircle, route: 'quizzes', description: 'Fun compatibility tests' },
        { id: 'date-ideas', label: 'Date Ideas', icon: Lightbulb, route: 'education', description: 'Creative suggestions' },
      ],
    },
    {
      id: 'features',
      title: 'Features',
      icon: CreditCard,
      color: 'from-amber-500 to-amber-600',
      items: [
        { id: 'buy-credits', label: 'Buy Credits', icon: CreditCard, route: 'credits', description: 'Get more credits' },
        { id: 'gift-shop', label: 'Gift Shop', icon: Gift, route: 'gift-shop', description: 'Send virtual gifts' },
        { id: 'services', label: 'Services', icon: HeartHandshake, route: 'relationship-services', description: 'Expert support' },
        { id: 'help-faqs', label: 'Help & FAQs', icon: HelpCircle, route: 'help', description: 'Get assistance' },
      ],
    },
    {
      id: 'about-us',
      title: 'About Us',
      icon: Info,
      color: 'from-slate-500 to-slate-600',
      items: [
        { id: 'terms', label: 'Terms', icon: FileText, route: 'terms', description: 'Terms of Service' },
        { id: 'privacy', label: 'Privacy', icon: Shield, route: 'privacy', description: 'Privacy Policy' },
        { id: 'help', label: 'Help', icon: HelpCircle, route: 'help', description: 'Support center' },
        { id: 'disclaimer', label: 'Disclaimer', icon: AlertCircle, route: 'disclaimer', description: 'Legal information' },
        { id: 'contact', label: 'Contact Us', icon: MessageSquare, route: 'help', description: 'Get in touch' },
      ],
    },
  ];

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (variant === 'compact') {
    return (
      <div className={cn('w-full', className)}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {menuCategories.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <div
                key={category.id}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-all duration-200 cursor-pointer group"
                onClick={() => toggleCategory(category.id)}
              >
                <div className={cn('w-12 h-12 rounded-full bg-gradient-to-br', category.color, 'flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-transform')}>
                  <CategoryIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white text-sm font-semibold text-center">{category.title}</h3>
                <p className="text-white/70 text-xs text-center mt-1">{category.items.length} options</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full space-y-3', className)}>
      {menuCategories.map((category) => {
        const CategoryIcon = category.icon;
        const isExpanded = expandedCategories.includes(category.id);

        return (
          <div key={category.id} className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden">
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              type="button"
            >
              <div className="flex items-center space-x-3">
                <div className={cn('w-10 h-10 rounded-full bg-gradient-to-br', category.color, 'flex items-center justify-center')}>
                  <CategoryIcon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-white font-semibold">{category.title}</h3>
                  <p className="text-white/70 text-xs">{category.items.length} options</p>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-white" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white" />
              )}
            </button>

            {isExpanded && (
              <div className="p-3 pt-0 space-y-2">
                {category.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.route)}
                      className="w-full flex items-center space-x-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200 group"
                      type="button"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ItemIcon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium text-sm">{item.label}</p>
                        {item.description && (
                          <p className="text-white/60 text-xs">{item.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

import React, { useState } from 'react';
import { ChevronUp, Search, User, Mail, MessageCircle, MessageSquare, CreditCard, Facebook, Twitter, Instagram, Linkedin, Heart, Phone, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FooterProps {
  activeTab?: string;
  onNavigate: (screen: any) => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  activeTab = 'discovery',
  onNavigate,
  className = ""
}) => {
  const [showMore, setShowMore] = useState(false);

  const tabs = [
    { id: 'discovery', icon: Search, label: 'Search', onClick: () => onNavigate('discovery') },
    { id: 'chat', icon: MessageCircle, label: 'Chat', onClick: () => onNavigate('matches') },
    { id: 'profile', icon: User, label: 'Profile', onClick: () => onNavigate('profile') },
    { id: 'credits', icon: CreditCard, label: 'Credits', onClick: () => onNavigate('credits') },
    { id: 'mail', icon: Mail, label: 'Mail', onClick: () => onNavigate('mail') },
    { id: 'feedback', icon: MessageSquare, label: 'Feedback', onClick: () => onNavigate('feedback') },
  ];

  const socialLinks = [
    { icon: Facebook, label: 'Facebook', url: '#' },
    { icon: Twitter, label: 'Twitter', url: '#' },
    { icon: Instagram, label: 'Instagram', url: '#' },
    { icon: Linkedin, label: 'LinkedIn', url: '#' },
  ];

  const linkColumns = [
    {
      title: 'Features',
      links: [
        { label: 'Buy Credits', screen: 'credits' },
        { label: 'Gift Shop', screen: 'gift-shop' },
        { label: 'Services', screen: 'relationship-services' },
        { label: 'Help & FAQs', screen: 'help' },
      ],
    },
    {
      title: 'Education',
      links: [
        { label: 'Tips & Advice', screen: 'education' },
        { label: 'Blog', screen: 'care-blog' },
        { label: 'Quizzes', screen: 'quizzes' },
      ],
    },
    {
      title: 'About Us',
      links: [
        { label: 'Terms', screen: 'terms' },
        { label: 'Privacy', screen: 'privacy' },
        { label: 'Disclaimer', screen: 'disclaimer' },
        { label: 'Contact Us', screen: 'help' },
      ],
    },
  ];

  const handleTabClick = (tab: any) => {
    if (!tab?.id) return;
    try {
      if (tab.onClick) {
        tab.onClick();
      } else {
        onNavigate(tab.id);
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <>
      {/* Backdrop, only present while the "More" panel is open */}
      {showMore && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* Expandable panel — completely absent from layout when collapsed,
          so it takes up zero space and never crowds the screen above it.
          Slides up from just above the tab bar when opened. */}
      {showMore && (
        <div className="fixed bottom-16 sm:bottom-[4.5rem] left-0 right-0 z-40 max-h-[70vh] overflow-y-auto bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">More</h3>
            <button
              onClick={() => setShowMore(false)}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              type="button"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              {linkColumns.map((col) => (
                <div key={col.title}>
                  <h4 className="text-xs font-bold text-gray-800 mb-2">{col.title}</h4>
                  <div className="space-y-1.5">
                    {col.links.map((link) => (
                      <button
                        key={link.label}
                        onClick={() => { setShowMore(false); onNavigate(link.screen); }}
                        className="text-xs text-gray-600 hover:text-pink-600 font-medium transition-colors text-left block"
                        type="button"
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t border-gray-100">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.url}
                    aria-label={social.label}
                    className="w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white hover:from-pink-600 hover:to-purple-700 transition-all duration-300 hover:scale-110"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>

            <div className="text-center pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Need help? Contact support</p>
              <a
                href="tel:+1-289-270-9919"
                className="inline-flex items-center gap-1.5 text-sm font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-full hover:from-pink-600 hover:to-purple-700 transition-all"
              >
                <Phone className="w-3.5 h-3.5" />
                1-289-270-9919
              </a>
            </div>

            <div className="text-center pt-3 border-t border-gray-100 space-y-1">
              <p className="text-xs text-pink-600 font-medium">Live chat: first 2 messages free, then 10 credits each • Stickers: 5 credits • Photos: 10 credits</p>
              <p className="text-xs text-purple-600 font-medium">Mail: First letter 10 credits, following 30 credits • First photo FREE, following 10 credits</p>
              <p className="text-xs text-pink-600 font-medium">Video calls: 60 credits/min • Audio calls: 50 credits/min</p>
            </div>

            <div className="text-center pt-3 border-t border-gray-100 pb-2">
              <p className="text-xs text-gray-400">© 2025 Dates. All rights reserved.</p>
              <p className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-1">
                <Heart className="w-3 h-3 text-pink-400" fill="currentColor" />
                Made with love for genuine connections
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compact, always-visible tab bar — this is the ONLY thing
          permanently reserving screen space now. */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-sm border-t border-gray-200/50 shadow-2xl z-40",
        "safe-area-inset-bottom",
        className
      )}>
        <div className="w-full max-w-md mx-auto lg:max-w-full px-1 sm:px-2 lg:px-4">
          <div className="flex justify-around items-center py-1.5 sm:py-2 md:py-3 px-1 sm:px-2 md:px-4">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTabClick(tab);
                  }}
                  className={cn(
                    "flex flex-col items-center py-1 sm:py-2 px-1 sm:px-2 md:px-3 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation min-w-0",
                    "cursor-pointer select-none user-select-none",
                    isActive
                      ? 'text-white bg-pink-500 shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-pink-600 hover:bg-pink-50/80'
                  )}
                  type="button"
                  role="button"
                  tabIndex={0}
                  aria-label={`Navigate to ${tab.label}`}
                  aria-pressed={isActive}
                >
                  <Icon className={cn(
                    "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mb-0.5 drop-shadow-sm flex-shrink-0",
                    isActive && 'fill-current'
                  )} />
                  <span className="text-xs font-medium drop-shadow-sm truncate hidden sm:block">{tab.label}</span>
                  {isActive && (
                    <span className="text-xs font-medium drop-shadow-sm truncate sm:hidden">{tab.label}</span>
                  )}
                </button>
              );
            })}

            <button
              onClick={() => setShowMore(true)}
              className="flex flex-col items-center py-1 sm:py-2 px-1 sm:px-2 md:px-3 rounded-lg text-gray-600 hover:text-pink-600 hover:bg-pink-50/80 transition-all duration-200 touch-manipulation min-w-0"
              type="button"
              aria-label="More options"
            >
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mb-0.5 flex-shrink-0" />
              <span className="text-xs font-medium truncate hidden sm:block">More</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

import React from 'react';
import { Heart, Search, User, Settings, Newspaper, Mail, Users, MessageCircle, MessageSquare, CreditCard, BookOpen, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { MessageChatBox } from './MessageChatBox';
import { CategoryNavigation } from './CategoryNavigation';
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
  const tabs = [
    { id: 'discovery', icon: Search, label: 'Search', onClick: () => onNavigate('discovery') },
    { id: 'chat', icon: MessageCircle, label: 'Chat', isChat: true, onClick: () => onNavigate('matches') },
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

  const handleTabClick = (tab: any) => {
    if (!tab?.id) {
      return;
    }
    
    try {
      if (tab.isChat) {
        onNavigate('matches');
      } else if (tab.onClick) {
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
      <div className={cn(
        "fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-sm border-t border-gray-200/50 shadow-2xl z-40",
        "safe-area-inset-bottom",
        className
      )}>
        <style>
          {`
            @keyframes slideRightToLeft {
              0% {
                transform: translateX(0%);
              }
              100% {
                transform: translateX(-50%);
              }
            }

            .animate-scroll-tabs {
              animation: slideRightToLeft 10s linear infinite;
            }

            .animate-scroll-tabs:hover {
              animation-play-state: paused;
            }
          `}
        </style>
        <div className="w-full max-w-md mx-auto lg:max-w-full px-1 sm:px-2 lg:px-4">
          <div className="overflow-hidden">
            <div className="flex gap-2 py-1.5 sm:py-2 md:py-3 px-1 sm:px-2 md:px-4 animate-scroll-tabs">
          {[...tabs, ...tabs].map((tab, index) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            if (tab.isChat) {
              return (
                <div key={tab.id} className="flex flex-col items-center py-1 sm:py-2 px-1 sm:px-2 md:px-3 min-w-0 z-50 relative">
                  <MessageChatBox />
                  <span className="text-xs font-medium text-gray-600 mt-0.5 sm:mt-1 truncate hidden sm:block">{tab.label}</span>
                </div>
              );
            }
            
            return (
              <button
                key={`${tab.id}-${index}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTabClick(tab);
                }}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center py-1 sm:py-2 px-1 sm:px-2 md:px-3 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation min-w-0",
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
                {/* Mobile: Only show label for active tab */}
                {isActive && (
                  <span className="text-xs font-medium drop-shadow-sm truncate sm:hidden">{tab.label}</span>
                )}
              </button>
            );
          })}
          </div>
          </div>
        </div>

        {/* Category Navigation - All Screens */}
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 py-3 px-3 sm:px-4 border-t border-gray-200">
          <CategoryNavigation onNavigate={onNavigate} />
        </div>

        {/* Comprehensive Footer - Mobile */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 py-4 sm:py-5 px-3 sm:px-4 border-t border-gray-200 lg:hidden">
          <div className="max-w-md mx-auto space-y-4">
            {/* Grouped Navigation Links */}
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-gray-800 mb-2">Features</h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <button onClick={(e) => { e.preventDefault(); onNavigate('credits'); }} className="text-gray-700 hover:text-pink-600 font-medium transition-colors text-left" type="button">Buy Credits</button>
                  <button onClick={(e) => { e.preventDefault(); onNavigate('gift-shop'); }} className="text-gray-700 hover:text-pink-600 font-medium transition-colors text-left" type="button">Gift Shop</button>
                  <button onClick={(e) => { e.preventDefault(); onNavigate('relationship-services'); }} className="text-gray-700 hover:text-pink-600 font-medium transition-colors text-left" type="button">Services</button>
                  <button onClick={(e) => { e.preventDefault(); onNavigate('help'); }} className="text-gray-700 hover:text-pink-600 font-medium transition-colors text-left" type="button">Help & FAQs</button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <h4 className="text-xs font-bold text-gray-800 mb-2">Education</h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <button onClick={(e) => { e.preventDefault(); onNavigate('education'); }} className="text-gray-700 hover:text-pink-600 font-medium transition-colors text-left" type="button">Tips & Advice</button>
                  <button onClick={(e) => { e.preventDefault(); onNavigate('care-blog'); }} className="text-gray-700 hover:text-pink-600 font-medium transition-colors text-left" type="button">Blog</button>
                  <button onClick={(e) => { e.preventDefault(); onNavigate('quizzes'); }} className="text-gray-700 hover:text-pink-600 font-medium transition-colors text-left" type="button">Quizzes</button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <h4 className="text-xs font-bold text-gray-800 mb-2">About Us</h4>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <button onClick={(e) => { e.preventDefault(); onNavigate('terms'); }} className="text-gray-700 hover:text-pink-600 font-medium transition-colors text-left" type="button">Terms</button>
                  <button onClick={(e) => { e.preventDefault(); onNavigate('privacy'); }} className="text-gray-700 hover:text-pink-600 font-medium transition-colors text-left" type="button">Privacy</button>
                  <button onClick={(e) => { e.preventDefault(); onNavigate('disclaimer'); }} className="text-gray-700 hover:text-pink-600 font-medium transition-colors text-left" type="button">Disclaimer</button>
                  <button onClick={(e) => { e.preventDefault(); onNavigate('help'); }} className="text-gray-700 hover:text-pink-600 font-medium transition-colors text-left" type="button">Contact Us</button>
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center justify-center space-x-4 pt-2 border-t border-gray-200">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.url}
                    aria-label={social.label}
                    className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white hover:from-pink-600 hover:to-purple-700 transition-all duration-300 hover:scale-110"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>

            {/* Support Contact */}
            <div className="text-center pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Need Help? Contact Support</p>
              <a
                href="tel:+1-289-270-9919"
                className="inline-flex items-center space-x-1 text-sm font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-full hover:from-pink-600 hover:to-purple-700 transition-all duration-300 hover:scale-105"
              >
                <span>📞</span>
                <span>1-289-270-9919</span>
              </a>
            </div>

            {/* Copyright */}
            <div className="text-center pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">© 2025 Dates. All rights reserved.</p>
            </div>
          </div>
        </div>

        {/* Comprehensive Footer - Desktop */}
        <div className="hidden lg:block bg-gradient-to-br from-gray-50 to-gray-100 py-6 px-6 border-t border-gray-200">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-5 gap-6 mb-6">
              {/* User Profile */}
              <div>
                <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-pink-600" />
                  User Profile
                </h4>
                <ul className="space-y-2">
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('browse-profiles'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Browse All</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('matches'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">My Matches</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('likes'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Likes</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('match-suitor'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">VIP Matching</button></li>
                </ul>
              </div>

              {/* Media & Calls */}
              <div>
                <h4 className="font-bold text-gray-800 mb-3">Media & Calls</h4>
                <ul className="space-y-2">
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('matches'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Chat</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('mail'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Messages</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('audio-chat'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Audio</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('video-chat'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Video</button></li>
                </ul>
              </div>

              {/* Education */}
              <div>
                <h4 className="font-bold text-gray-800 mb-3">Education</h4>
                <ul className="space-y-2">
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('education'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Tips & Advice</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('care-blog'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Blog</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('quizzes'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Quizzes</button></li>
                </ul>
              </div>

              {/* Features */}
              <div>
                <h4 className="font-bold text-gray-800 mb-3">Features</h4>
                <ul className="space-y-2">
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('credits'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Buy Credits</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('gift-shop'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Gift Shop</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('relationship-services'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Services</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('help'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Help & FAQs</button></li>
                </ul>
              </div>

              {/* About Us */}
              <div>
                <h4 className="font-bold text-gray-800 mb-3">About Us</h4>
                <ul className="space-y-2">
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('terms'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Terms</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('privacy'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Privacy</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('disclaimer'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Disclaimer</button></li>
                  <li><button onClick={(e) => { e.preventDefault(); onNavigate('help'); }} className="text-sm text-gray-600 hover:text-pink-600 transition-colors" type="button">Contact Us</button></li>
                </ul>
              </div>

            </div>

            {/* Social & Support */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
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
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-600 mb-1">Need Help?</p>
                    <a
                      href="tel:+1-289-270-9919"
                      className="flex items-center space-x-1 text-pink-600 hover:text-pink-700 transition-colors"
                    >
                      <span className="text-sm">📞</span>
                      <span className="text-sm font-bold">1-289-270-9919</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-4 border-t border-gray-200 mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">© 2025 Dates. All rights reserved.</p>
              <div className="flex items-center space-x-2">
                <Heart className="w-3 h-3 text-pink-600" fill="currentColor" />
                <span className="text-xs text-gray-600">Made with love for genuine connections</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-pink-600 font-medium mt-1 px-2">Live chat: 2 credits/min • Stickers: 5 credits • Photos: 10 credits</p>
        <p className="text-xs text-purple-600 font-medium mt-1 px-2">Mail: First letter 10 credits, following 30 credits • First photo FREE, following 10 credits</p>
        <p className="text-xs text-pink-600 font-medium mt-1 mb-2 px-2">Video calls: 60 credits/min • Audio calls: 50 credits/min</p>
      </div>
    </>
  );
};
import React, { useState } from 'react';
import { Menu as MenuIcon, X, User, LogIn, LogOut, UserPlus, CreditCard, Video, Phone, Gift, Heart, Users, MessageCircle, Chrome as Home, Settings, CircleHelp as HelpCircle, Star, Crown, Newspaper, Mail, Shield, TriangleAlert as AlertTriangle, BookOpen, Sparkles } from 'lucide-react';
import { MessageChatBox } from './MessageChatBox';
import { cn } from '@/lib/utils';
import { creditManager } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';

interface MenuProps {
  onNavigate: (screen: any) => void;
  currentScreen: string;
}

export const Menu: React.FC<MenuProps> = ({ onNavigate, currentScreen }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut, getFirstName } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      setIsOpen(false);
      onNavigate('welcome');

      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = '✅ Logged out successfully!';
      document.body.appendChild(successMessage);
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 2000);
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  const menuSections = [
    {
      title: 'Discover',
      items: [
        { id: 'discovery', icon: Home, label: 'Home', description: 'Discover perfect matches' },
        { id: 'matches', icon: Heart, label: 'Matches', description: 'Your connections' },
        { id: 'likes', icon: Star, label: 'Likes', description: 'Who likes you' },
      ]
    },
    {
      title: 'Content & Advice',
      items: [
        { id: 'care-blog', icon: BookOpen, label: 'Blog', description: 'Dating tips & relationship advice' },
        { id: 'quizzes', icon: Sparkles, label: 'Quizzes', description: 'Fun interactive personality quizzes' },
        { id: 'newsfeed', icon: Newspaper, label: 'Date Ideas', description: 'Creative date inspiration' },
        { id: 'help', icon: HelpCircle, label: 'Advice', description: 'Expert guidance & FAQs' },
      ]
    },
    {
      title: 'Connect',
      items: [
        { id: 'mail', icon: Mail, label: 'Messages', description: 'Private conversations' },
        { id: 'video-chat', icon: Video, label: 'Video Chat', description: 'Face-to-face calls' },
        { id: 'audio-chat', icon: Phone, label: 'Voice Call', description: 'Audio conversations' },
      ]
    },
    {
      title: user ? `Account - ${getFirstName()}` : 'Account',
      items: user ? [
        // Logged in users see these options
        { id: 'profile', icon: User, label: 'My Profile', description: 'Edit your profile' },
        { id: 'settings', icon: Settings, label: 'Settings', description: 'Preferences & privacy' },
        { id: 'logout', icon: LogOut, label: 'Logout', description: 'Sign out of your account' },
      ] : [
        // Not logged in users see these options
        { id: 'signin', icon: LogIn, label: 'Sign In', description: 'Access your account' },
        { id: 'signup', icon: UserPlus, label: 'Sign Up', description: 'Join Dates today' },
      ]
    },
    {
      title: 'Premium',
      items: [
        { id: 'credits', icon: CreditCard, label: 'Buy Credits', description: 'Unlock premium features' },
        { id: 'gift-shop', icon: Gift, label: 'Gift Shop', description: 'Send special gifts' },
        { id: 'match-suitor', icon: Crown, label: 'VIP Matching', description: 'Elite matchmaking service' },
      ]
    },
    {
      title: 'Support',
      items: [
        { id: 'relationship-services', icon: Users, label: 'Relationship Services', description: 'Counselling & therapy' },
        { id: 'financial-education', icon: CreditCard, label: 'Financial Education', description: 'Money management advice' },
        { id: 'feedback', icon: MessageCircle, label: 'Contact Us', description: 'Questions & feedback' },
      ]
    },
    {
      title: 'About',
      items: [
        { id: 'terms', icon: Shield, label: 'Terms', description: 'Terms of service' },
        { id: 'privacy', icon: Shield, label: 'Privacy', description: 'Your data privacy' },
        { id: 'verification', icon: Shield, label: 'Get Verified', description: 'Verify your identity' },
      ]
    }
  ];

  // Add Staff Panel section with authentication requirement
  if (true) { 
    menuSections.push({
      title: 'Staff Access (Login Required)',
      items: [
        { id: 'staff-panel', icon: Shield, label: 'Staff Login', description: 'Restricted access - staff authentication required' },
      ]
    });
  }

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleNavigation = (screenId: string) => {
    // Handle logout specially
    if (screenId === 'logout') {
      handleLogout();
      return;
    }

    // Immediate feedback - close menu and navigate
    setIsOpen(false);
    onNavigate(screenId);
  };

  return (
    <>
      {/* Menu Button */}
      <button
        onClick={toggleMenu}
        onTouchStart={(e) => e.stopPropagation()}
        className={cn(
          "fixed bottom-20 left-4 z-50 p-3 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full shadow-2xl",
          "hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-white/20 cursor-pointer",
          "touch-manipulation"
        )}
        type="button"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white flex-shrink-0" />
        ) : (
          <MenuIcon className="w-5 h-5 text-white flex-shrink-0" />
        )}
      </button>

      {/* Message Chat Box */}
      <div className="fixed top-4 sm:top-6 right-2 sm:right-4 z-50 safe-area-inset-top">
        <MessageChatBox />
      </div>
      {/* Menu Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm touch-manipulation cursor-pointer" 
          onClick={(e) => {
            e.preventDefault();
            toggleMenu();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            toggleMenu();
          }}
          role="button"
          aria-label="Close menu overlay"
        />
      )}

      {/* Menu Panel */}
      <div className={cn(
        "fixed top-0 left-0 h-full w-72 sm:w-80 md:w-96 bg-gradient-to-br from-pink-600 via-rose-500 to-purple-600 shadow-2xl",
        "transform transition-transform duration-200 ease-out z-50 safe-area-inset-left",
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-3 sm:p-4 md:p-6 h-full overflow-y-auto pt-16 sm:pt-20 pb-safe-bottom">
          {/* Menu Header */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Dates Menu</h2>
            </div>
            <p className="text-white/80 text-xs sm:text-sm md:text-base">Navigate to any section</p>
          </div>

          {/* Menu Sections */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {menuSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <h3 className="text-white/90 font-semibold text-xs uppercase tracking-wider mb-2 sm:mb-3 px-1 sm:px-2">
                  {section.title}
                </h3>
                <div className="space-y-1 sm:space-y-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentScreen === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            handleNavigation(item.id);
                          } catch (error) {
                            console.error('Menu navigation error:', error);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl transition-all duration-200",
                          "touch-manipulation active:scale-95 hover:scale-[1.02] cursor-pointer select-none user-select-none",
                          isActive 
                            ? 'bg-white/25 text-white shadow-lg border border-white/40' 
                            : 'text-white/85 hover:bg-white/15 hover:text-white'
                        )}
                        type="button"
                        role="menuitem"
                        tabIndex={0}
                        aria-label={`Navigate to ${item.label}`}
                      >
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-medium text-xs sm:text-sm md:text-base truncate">{item.label}</div>
                          <div className="text-xs opacity-75 truncate hidden sm:block">{item.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Menu Footer */}
          <div className="mt-4 sm:mt-6 md:mt-8 pt-3 sm:pt-4 md:pt-6 border-t border-white/20">
            <div className="text-center text-white/60 text-xs sm:text-sm">
              <p>© 2025 Dates</p>
              <p className="mt-1 hidden sm:block">Made with ❤️ for finding love</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
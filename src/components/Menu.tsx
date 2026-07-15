import React, { useState } from 'react';
import { Menu as MenuIcon, X, User, LogIn, LogOut, UserPlus, CreditCard, Video, Phone, Gift, Heart, Users, Chrome as Home, Settings, CircleHelp as HelpCircle, Star, Crown, Newspaper, Mail, Shield, BookOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface SelectedChatUser {
  id: string;
  name: string;
  image: string;
}

interface MenuProps {
  onNavigate: (screen: any) => void;
  currentScreen: string;
  selectedChatUser?: SelectedChatUser | null;
  onSelectChatUser?: (user: SelectedChatUser | null) => void;
}

export const Menu: React.FC<MenuProps> = ({
  onNavigate,
  currentScreen,
  selectedChatUser,
  onSelectChatUser
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut, getFirstName } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      setIsOpen(false);
      onNavigate('welcome');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const [showMore, setShowMore] = useState(false);

  // Core-first navigation: Discover → Match → Message is the product.
  // Everything else lives behind "More" so the core loop stays obvious.
  const menuSections = [
    {
      title: user ? `Hi, ${getFirstName()}!` : 'Get Started',
      items: user ? [
        { id: 'profile', icon: User, label: 'My Profile', description: 'View & edit your profile' },
        { id: 'settings', icon: Settings, label: 'Settings', description: 'Preferences & privacy' },
      ] : [
        { id: 'signup', icon: UserPlus, label: 'Sign Up', description: 'Create your free profile' },
        { id: 'signin', icon: LogIn, label: 'Sign In', description: 'Access your account' },
      ]
    },
    {
      title: 'Meet People',
      items: [
        { id: 'discovery', icon: Home, label: 'Discover', description: 'Browse compatible singles' },
        { id: 'matches', icon: Heart, label: 'Matches', description: 'Your mutual connections' },
        { id: 'likes', icon: Star, label: 'Likes You', description: 'See who liked you' },
        { id: 'mail', icon: Mail, label: 'Messages', description: 'Your conversations' },
      ]
    },
    {
      title: 'Premium',
      items: [
        { id: 'credits', icon: CreditCard, label: 'Credits', description: 'Your balance & top-ups' },
        { id: 'gift-shop', icon: Gift, label: 'Gift Shop', description: 'Send a virtual gift' },
      ]
    },
  ];

  // Secondary features, collapsed by default
  const moreSection = {
    title: 'More',
    items: [
      { id: 'video-chat', icon: Video, label: 'Video Chat', description: 'Face-to-face calls' },
      { id: 'audio-chat', icon: Phone, label: 'Voice Call', description: 'Audio conversations' },
      { id: 'match-suitor', icon: Crown, label: 'VIP Matchmaking', description: 'Personalized matching' },
      { id: 'care-blog', icon: BookOpen, label: 'Dating Advice', description: 'Tips & relationship guides' },
      { id: 'quizzes', icon: Sparkles, label: 'Quizzes', description: 'Personality & compatibility' },
      { id: 'newsfeed', icon: Newspaper, label: 'Date Ideas', description: 'Creative date inspiration' },
      { id: 'relationship-services', icon: Users, label: 'Counselling', description: 'Relationship services' },
      { id: 'help', icon: HelpCircle, label: 'Help & Support', description: 'FAQs & contact us' },
    ]
  };

  const footerSection = {
    title: 'Legal',
    items: [
      { id: 'terms', icon: Shield, label: 'Terms of Service', description: 'Our terms & conditions' },
      { id: 'privacy', icon: Shield, label: 'Privacy Policy', description: 'How we protect your data' },
    ]
  };

  if (showMore) {
    menuSections.push(moreSection);
  }
  menuSections.push(footerSection);

  if (user) {
    menuSections.push({
      title: 'Account',
      items: [
        { id: 'logout', icon: LogOut, label: 'Log Out', description: 'Sign out of your account' },
      ]
    });
  }

  // NOTE: Staff access is intentionally NOT in the public menu.
  // Staff reach it directly at /#staff-panel (still protected by StaffLogin).

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

            {/* More / Less toggle */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMore(!showMore);
              }}
              className="w-full flex items-center justify-center space-x-2 p-2 sm:p-3 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 text-xs sm:text-sm font-medium"
              type="button"
              aria-expanded={showMore}
              aria-label={showMore ? 'Show fewer options' : 'Show more options'}
            >
              <span>{showMore ? 'Show less' : 'More features'}</span>
            </button>
          </div>

          {/* Menu Footer */}
          <div className="mt-4 sm:mt-6 md:mt-8 pt-3 sm:pt-4 md:pt-6 border-t border-white/20">
            <div className="text-center text-white/60 text-xs sm:text-sm">
              <p>© 2026 Dates</p>
              <p className="mt-1 hidden sm:block">Made with ❤️ for finding love</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
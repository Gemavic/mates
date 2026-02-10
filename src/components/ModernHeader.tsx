import React, { useState } from 'react';
import { ChevronLeft, Settings, Bell, Search, Menu, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernHeaderProps {
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  showSettings?: boolean;
  onBack?: () => void;
  onMenu?: () => void;
  onSearch?: () => void;
  onNotifications?: () => void;
  onSettings?: () => void;
  className?: string;
  transparent?: boolean;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  title,
  showBack = false,
  showMenu = true,
  showSearch = false,
  showNotifications = true,
  showSettings = false,
  onBack,
  onMenu,
  onSearch,
  onNotifications,
  onSettings,
  className = "",
  transparent = false
}) => {
  // Get user subscription status
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('Free');
  
  React.useEffect(() => {
    // Check for active subscription
    const checkSubscription = async () => {
      // In a real app, this would query the database
      // For now, show demo subscription status
      setSubscriptionPlan('Premium');
    };
    
    checkSubscription();
  }, []);

  return (
    <div className={cn(
      "relative w-full h-12 sm:h-14 md:h-16 z-30 transition-all duration-300 safe-area-inset-top",
      transparent 
        ? "bg-transparent" 
        : "bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-sm supports-backdrop-blur:bg-white/80",
      className
    )}>
      <div className="absolute inset-0 flex items-center justify-between px-2 sm:px-4 md:px-6">
        {/* Left Section */}
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
          {showBack && (
            <button 
              onClick={onBack}
              className="p-1.5 sm:p-2 md:p-3 hover:bg-gray-100 rounded-full transition-colors touch-manipulation active:scale-95 cursor-pointer"
              type="button"
              aria-label="Go back"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-700 flex-shrink-0" />
            </button>
          )}
          
          {showMenu && !showBack && (
            <button 
              onClick={onMenu}
              className="p-1.5 sm:p-2 md:p-3 hover:bg-gray-100 rounded-full transition-colors touch-manipulation active:scale-95 cursor-pointer"
              type="button"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-700 flex-shrink-0" />
            </button>
          )}

          {title && (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button 
                onClick={() => window.location.href = '/'}
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform cursor-pointer"
                type="button"
                aria-label="Go to home"
              >
                <Heart className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" fill="currentColor" />
              </button>
              <h1 className="text-sm sm:text-lg md:text-xl font-bold text-gray-900 truncate">{title}</h1>
            </div>
          )}
        </div>

        {/* Center Section */}
        <div className="flex-1 flex justify-center">
          {!title && (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button 
                onClick={() => window.location.href = '/'}
                className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform cursor-pointer"
                type="button"
                aria-label="Go to home"
              >
                <Heart className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" fill="currentColor" />
              </button>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Dates</h1>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-0.5 sm:space-x-1 md:space-x-2 flex-shrink-0">
              <span className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full font-bold">
                {subscriptionPlan}
              </span>
          {showSearch && (
            <button 
              onClick={onSearch}
              className="p-1.5 sm:p-2 md:p-3 hover:bg-gray-100 rounded-full transition-colors touch-manipulation active:scale-95 cursor-pointer"
              type="button"
              aria-label="Search"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-700 flex-shrink-0" />
            </button>
          )}

          {showNotifications && (
            <button 
              onClick={onNotifications}
              className="p-1.5 sm:p-2 md:p-3 hover:bg-gray-100 rounded-full transition-colors touch-manipulation active:scale-95 cursor-pointer relative"
              type="button"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-700 flex-shrink-0" />
              <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 md:top-1.5 md:right-1.5 w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse"></div>
            </button>
          )}

          {showSettings && (
            <button 
              onClick={onSettings}
              className="p-1.5 sm:p-2 md:p-3 hover:bg-gray-100 rounded-full transition-colors touch-manipulation active:scale-95 cursor-pointer"
              type="button"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-700 flex-shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
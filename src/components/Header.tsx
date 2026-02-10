import React, { useState } from 'react';
import { ChevronLeftIcon, XIcon, Settings, User, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showClose?: boolean;
  showProfile?: boolean;
  showSettings?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  showClose = false,
  showProfile = false,
  showSettings = false,
  onBack,
  onClose,
  onProfile,
  onSettings,
  className = ""
}) => {
  // Get user subscription status for authenticated users
  const [userPlan, setUserPlan] = useState<string>('');
  
  React.useEffect(() => {
    // Check if user has active subscription
    const checkUserPlan = async () => {
      // In a real app, this would check the database
      // For demo, show plan based on current context
      if (title && title.includes('Premium')) {
        setUserPlan('Premium');
      } else if (title && title.includes('VIP')) {
        setUserPlan('VIP');
      } else {
        setUserPlan('Standard');
      }
    };
    
    checkUserPlan();
  }, [title]);

  return (
    <div className={`relative w-full h-20 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 shadow-2xl z-30 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shadow-[0px_8px_32px_rgba(0,0,0,0.25)]" />
      
      {/* Left side buttons */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
        {showBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/30 rounded-full transition-all duration-300 hover:scale-110 cursor-pointer touch-manipulation active:scale-95"
            type="button"
            aria-label="Go back"
          >
            <ChevronLeftIcon className="w-6 h-6 text-white" />
          </button>
        )}
        {showProfile && (
          <button
            onClick={onProfile}
            className="p-2 hover:bg-white/30 rounded-full transition-all duration-300 hover:scale-110 cursor-pointer touch-manipulation active:scale-95"
            type="button"
            aria-label="View profile"
          >
            <User className="w-6 h-6 text-white" />
          </button>
        )}
      </div>
      
      {/* Center title */}
      <div className="absolute inset-0 flex items-center justify-center">
        {title && (
          <div className="flex items-center space-x-3">
            <div className="text-center">
              <h1 className="font-alegreya font-bold text-white text-2xl">
                Dates
              </h1>
              {userPlan && (
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                  {userPlan} Plan
                </span>
              )}
              <a 
                href="tel:+12892709919"
                className="hover:text-pink-600 underline transition-colors"
              >
                📞 Support
              </a>
            </div>
          </div>
        )}
      </div>
      
      {/* Right side buttons */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
        {/* Quick Support Access */}
        <a 
          href="tel:+1-289-270-9919"
          className="hidden md:flex items-center space-x-1 bg-green-500 hover:bg-green-600 rounded-lg px-3 py-1.5 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
        >
          <span className="text-white text-xs">📞</span>
          <span className="text-white text-xs font-medium">Support</span>
        </a>
        
        {showSettings && (
          <button 
            onClick={() => {
              if (onSettings) onSettings();
            }}
            className="p-2 hover:bg-white/30 rounded-full transition-all duration-300 hover:scale-110 cursor-pointer touch-manipulation active:scale-95"
            type="button"
          >
            <Settings className="w-6 h-6 text-white" />
          </button>
        )}
        {showClose && (
          <button 
            onClick={() => {
              if (onClose) onClose();
            }}
            className="p-2 hover:bg-white/30 rounded-full transition-all duration-300 hover:scale-110 cursor-pointer touch-manipulation active:scale-95"
            type="button"
          >
            <XIcon className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
};
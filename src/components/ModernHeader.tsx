import React, { useState } from 'react';
import { ChevronLeft, Settings, Bell, Search, Menu, Heart, LogOut, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

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
  const { user, getFirstName, signOut, isAnonymous, loading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

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

          {!loading && user && !isAnonymous && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-1 sm:space-x-2 p-1 sm:p-1.5 md:p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation active:scale-95 cursor-pointer"
                type="button"
                aria-label="User menu"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <span className="hidden sm:block text-xs md:text-sm font-medium text-gray-700 max-w-[80px] md:max-w-[120px] truncate">
                  Hi, {getFirstName()}
                </span>
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getFirstName()}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      type="button"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { ChevronLeftIcon, XIcon, Settings, User, Heart, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

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

        {!loading && user && !isAnonymous && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 px-3 py-1.5 hover:bg-white/30 rounded-full transition-all duration-300 hover:scale-105 cursor-pointer touch-manipulation active:scale-95"
              type="button"
              aria-label="User menu"
            >
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white">
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
  );
};
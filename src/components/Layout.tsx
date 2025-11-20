import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  showClose?: boolean;
  showProfile?: boolean;
  showSettings?: boolean;
  showFooter?: boolean;
  activeTab?: string;
  onBack?: () => void;
  onClose?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  onNavigate?: (screen: string) => void;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  showBack = true,
  showClose = true,
  showProfile = false,
  showSettings = false,
  showFooter = false,
  activeTab,
  onBack,
  onClose,
  onProfile,
  onSettings,
  onNavigate,
  className = ""
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 ${className}`}>
      <div className="w-full max-w-xs sm:max-w-md mx-auto min-h-screen relative overflow-hidden">
        {/* Header */}
        <Header
          title={title}
          showBack={showBack}
          showClose={showClose}
          showProfile={showProfile}
          showSettings={showSettings}
          onBack={() => {
            if (onBack) onBack();
          }}
          onClose={() => {
            if (onClose) onClose();
          }}
          onProfile={onProfile}
          onSettings={onSettings}
        />
        
        {/* Content */}
        <div className={`relative z-10 smooth-scroll ${showFooter ? 'pb-24 sm:pb-28 md:pb-32' : 'pb-6 sm:pb-8'}`}>
          {children}
        </div>
        
        {/* Footer */}
        {showFooter && onNavigate && (
          <Footer
            activeTab={activeTab}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </div>
  );
};
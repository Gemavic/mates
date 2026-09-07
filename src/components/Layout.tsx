import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { QuickNavBar } from './QuickNavBar';
import { useTheme } from '@/contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  showClose?: boolean;
  showProfile?: boolean;
  showSettings?: boolean;
  showFooter?: boolean;
  showQuickNav?: boolean;
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
  // Both default to false now. Navigation is rendered once, app-wide, in App
  // so that it is identical on every screen. Screens used to opt in by passing
  // onNavigate, and the six that forgot - video chat, voice chat, profile,
  // settings, onboarding, staff panel - rendered no navigation at all.
  showFooter = false,
  showQuickNav = false,
  activeTab,
  onBack,
  onClose,
  onProfile,
  onSettings,
  onNavigate,
  className = ""
}) => {
  const { theme } = useTheme();
  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme === 'dark' ? 'from-slate-900 via-purple-950 to-slate-900' : 'from-pink-500 via-rose-500 to-purple-600'} ${className}`}>
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

        {/* Quick Navigation Bar */}
        {showQuickNav && onNavigate && (
          <QuickNavBar
            onNavigate={onNavigate}
            activeScreen={activeTab}
          />
        )}

        {/* Content */}
        <div className={`relative z-10 smooth-scroll ${showFooter ? 'pb-20 sm:pb-24' : 'pb-6 sm:pb-8'}`}>
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
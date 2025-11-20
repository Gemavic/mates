import React from 'react';
import { cn } from '@/lib/utils';
import { Menu } from './Menu';
import { Footer } from './Footer';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
  showMenu?: boolean;
  showFooter?: boolean;
  currentScreen?: string;
  onNavigate?: (screen: string) => void;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ 
  children, 
  className = "",
  showMenu = true,
  showFooter = true,
  currentScreen = 'discovery',
  onNavigate = () => {}
}) => {
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600",
      "relative overflow-hidden",
      className
    )}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-32 right-16 w-24 h-24 bg-pink-300/20 rounded-full blur-lg animate-bounce"></div>
        <div className="absolute bottom-32 left-16 w-28 h-28 bg-purple-300/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-16 right-10 w-20 h-20 bg-rose-300/20 rounded-full blur-lg animate-bounce delay-500"></div>
      </div>

      {/* Menu Component */}
      {showMenu && (
        <Menu onNavigate={onNavigate} currentScreen={currentScreen} />
      )}

      {/* Main Content Container */}
      <div className="relative z-10 min-h-screen">
        {/* Mobile Layout (default) */}
        <div className="lg:hidden">
          <div className="w-full max-w-md mx-auto min-h-screen relative">
            <div className={cn(
              "relative z-10 min-h-screen",
              showFooter ? "pb-24" : "pb-8"
            )}>
              {children}
            </div>
            
            {/* Footer for mobile */}
            {showFooter && (
              <Footer
                activeTab={currentScreen}
                onNavigate={onNavigate}
                className="lg:hidden"
              />
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex min-h-screen">
          {/* Left Sidebar */}
          <div className="w-80 bg-white/10 backdrop-blur-sm border-r border-white/20 flex-shrink-0">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-8">
                <button 
                  onClick={() => onNavigate('discovery')}
                  className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                  type="button"
                >
                  <span className="text-white font-bold text-xl">D</span>
                </button>
                <button 
                  onClick={() => onNavigate('discovery')}
                  className="text-2xl font-bold text-white hover:text-white/80 transition-colors cursor-pointer"
                  type="button"
                >
                  Dates
                </button>
              </div>
              
              {/* Quick Stats */}
              <div className="space-y-4">
                <div className="bg-white/10 rounded-2xl p-4">
                  <h3 className="text-white font-semibold mb-2">Your Activity</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/80">Profile Views</span>
                      <span className="text-white font-medium">124</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/80">Matches</span>
                      <span className="text-white font-medium">8</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/80">Messages</span>
                      <span className="text-white font-medium">23</span>
                    </div>
                  </div>
                </div>
                
                {/* Quick Navigation */}
                <div className="bg-white/10 rounded-2xl p-4">
                  <h3 className="text-white font-semibold mb-3">Quick Access</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => onNavigate('matches')}
                      className="w-full text-left text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 cursor-pointer"
                      type="button"
                    >
                      💬 Messages
                    </button>
                    <button
                      onClick={() => onNavigate('credits')}
                      className="w-full text-left text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 cursor-pointer"
                      type="button"
                    >
                      💳 Buy Credits
                    </button>
                    <button
                      onClick={() => onNavigate('verification')}
                      className="w-full text-left text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 cursor-pointer"
                      type="button"
                    >
                      ✅ Get Verified
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
            <div className={cn(
              "flex-1 overflow-y-auto min-h-screen",
              showFooter ? "pb-24" : "pb-8"
            )}>
              {children}
            </div>
            
            {/* Footer for desktop */}
            {showFooter && (
              <Footer
                activeTab={currentScreen}
                onNavigate={onNavigate}
                className="hidden lg:block"
              />
            )}
          </div>

          {/* Right Sidebar */}
          <div className="hidden xl:block w-80 bg-white/10 backdrop-blur-sm border-l border-white/20 flex-shrink-0">
            <div className="p-6">
              <h3 className="text-white font-semibold mb-4">Online Now</h3>
              <div className="space-y-3">
                {[
                  { name: 'Emma', image: 'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=100' },
                  { name: 'Sarah', image: 'https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg?auto=compress&cs=tinysrgb&w=100' },
                  { name: 'Jessica', image: 'https://images.pexels.com/photos/1172207/pexels-photo-1172207.jpeg?auto=compress&cs=tinysrgb&w=100' },
                  { name: 'Alex', image: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100' }
                ].map((user, i) => (
                  <button 
                    key={i} 
                    onClick={() => onNavigate('matches')}
                    className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    type="button"
                  >
                    <div className="relative">
                      <img
                        src={user.image}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{user.name}</p>
                      <p className="text-white/70 text-xs">Online now</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
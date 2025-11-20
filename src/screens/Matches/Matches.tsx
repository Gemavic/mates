import React from 'react';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { MessageCircle, Heart, Mail as MailIcon, User, Users, Newspaper, MessageSquare, CreditCard } from 'lucide-react';
import { sendMessageNotification } from '@/lib/emailNotifications';
import { MessageChatBox } from '@/components/MessageChatBox';

interface MatchesProps {
  onNavigate: (screen: string) => void;
}

export const Matches: React.FC<MatchesProps> = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);
  
  // Updated matches to reflect La-Date style messaging
  const matches = [
    {
      id: '1',
      name: 'Gabriela',
      age: 23,
      image: 'https://images.pexels.com/photos/1102341/pexels-photo-1102341.jpeg?auto=compress&cs=tinysrgb&w=400',
      lastMessage: 'I believe in love that is nourished by everyday moments... 💕',
      time: '12:37 pm',
      unread: true,
      isNew: true
    },
    {
      id: '2',
      name: 'Astrid',
      age: 45,
      image: 'https://images.pexels.com/photos/3763714/pexels-photo-3763714.jpeg?auto=compress&cs=tinysrgb&w=400',
      lastMessage: 'The city\'s asleep. I\'m not. And you should know... 🌙',
      time: '11:46 am',
      unread: true,
      isNew: true
    },
    {
      id: '3',
      name: 'Jessica',
      age: 34,
      image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400',
      lastMessage: 'I\'m glad to meet you. I am a woman discovering... ✨',
      time: '11:11 am',
      unread: true,
      isNew: true
    },
    {
      id: '4',
      name: 'Aline Claudia',
      age: 44,
      image: 'https://images.pexels.com/photos/2709388/pexels-photo-2709388.jpeg?auto=compress&cs=tinysrgb&w=400',
      lastMessage: '🍓🍓 Sometimes after a hard day alone...',
      time: '10:59 am',
      unread: true,
      isNew: true
    },
    {
      id: '5',
      name: 'Yasmin',
      age: 29,
      image: 'https://images.pexels.com/photos/3228213/pexels-photo-3228213.jpeg?auto=compress&cs=tinysrgb&w=400',
      lastMessage: 'Imagine how cosy it is to sit at home... 🏠',
      time: '10:57 am',
      unread: true,
      isNew: true
    }
  ];

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-3 sm:p-4">
          <LoadingSkeleton type="message-list" count={5} />
        </div>
      );
    }
    
    if (matches.length === 0) {
      return (
        <EmptyState
          icon={MessageCircle}
          title="Your love story begins here!"
          description="Start discovering incredible people who share your values and interests. Every swipe could lead to something beautiful."
          actionText="Start Discovering"
          onAction={() => onNavigate('discovery')}
        />
      );
    }
    
    return (
      <>
        <div className="p-3 sm:p-4">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Messages</h2>
        </div>
        
        <div className="space-y-0">
          <div className="bg-white/90 backdrop-blur-sm py-2 px-3 sm:px-4 md:px-6 border-t border-white/20">
            {matches.map((match) => (
              <div
                key={match.id}
                onClick={(e) => {
                  e.preventDefault();
                  // Open chat with this match
                  onNavigate('matches');
                }}
                className="py-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-all duration-300 touch-manipulation active:scale-[0.98] rounded-lg hover:shadow-md"
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <div className="relative">
                    <img
                      src={match.image}
                      alt={match.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <div className="flex items-center space-x-2">
                        <h4 className={`font-medium text-sm sm:text-base truncate ${match.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                          {match.name}, {match.age}
                        </h4>
                        {match.isNew && (
                          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-medium flex-shrink-0 animate-pulse">
                            new
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">{match.time}</span>
                    </div>
                    <p className={`text-xs sm:text-sm truncate ${match.unread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {match.lastMessage}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  return (
    <PageTransition direction="slide-left">
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 overflow-x-hidden">
      <div className="w-full max-w-xs sm:max-w-md mx-auto min-h-screen relative">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-white/20 px-3 sm:px-4 py-2 sm:py-3 safe-area-inset-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Dates</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('mail');
                  }}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors cursor-pointer touch-manipulation active:scale-95"
                  type="button"
                  aria-label="Go to mail"
                >
                  <MailIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                </button>
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('credits');
                }}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors cursor-pointer touch-manipulation active:scale-95"
                type="button"
                aria-label="Buy credits"
              >
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              </button>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('profile');
                }}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors cursor-pointer touch-manipulation active:scale-95"
                type="button"
                aria-label="View profile"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto pb-16 sm:pb-20 md:pb-24 smooth-scroll">
          {renderContent()}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 w-full max-w-xs sm:max-w-md mx-auto bg-white/95 backdrop-blur-sm border-t border-white/20 shadow-lg lg:max-w-2xl safe-area-inset-bottom">
          <div className="flex justify-around py-1.5 sm:py-2 px-1 sm:px-2">
            {[
              { id: 'search', icon: Users, label: 'Search', count: 0, color: 'text-gray-600' },
              { id: 'chat', icon: MessageCircle, label: 'Chat', count: 0, color: 'text-gray-600', isChat: true },
              { id: 'mail', icon: MailIcon, label: 'Mail', count: 29, color: 'text-gray-600' },
              { id: 'newsfeed', icon: Newspaper, label: 'Newsfeed', count: 0, color: 'text-gray-600' },
              { id: 'feedback', icon: MessageSquare, label: 'Feedback', count: 0, color: 'text-gray-600' },
              { id: 'people', icon: User, label: 'People', count: 0, color: 'text-gray-600' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === 'chat';
              
              if (tab.isChat) {
                return (
                  <div key={tab.id} className="flex flex-col items-center py-1 sm:py-2 px-1 sm:px-2 md:px-3 min-w-0">
                    <MessageChatBox />
                    <span className="text-xs font-medium text-gray-600 mt-0.5 sm:mt-1 truncate hidden sm:block">{tab.label}</span>
                  </div>
                );
              }
              
              return (
                <button
                  key={tab.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (tab.id === 'mail') {
                      onNavigate('mail');
                    } else if (tab.id === 'newsfeed') {
                      onNavigate('newsfeed');
                    } else if (tab.id === 'people') {
                      onNavigate('discovery');
                    } else if (tab.id === 'search') {
                      onNavigate('discovery');
                    } else if (tab.id === 'feedback') {
                      onNavigate('feedback');
                    } else {
                      onNavigate(tab.id);
                    }
                  }}
                  className={`flex flex-col items-center py-1 sm:py-2 px-1 sm:px-2 md:px-3 rounded-lg transition-all duration-200 relative cursor-pointer touch-manipulation active:scale-95 min-w-0 ${
                    isActive 
                      ? tab.color
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                  type="button"
                  aria-label={`Navigate to ${tab.label}`}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                    {tab.count > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold leading-none">{tab.count > 99 ? '99+' : tab.count}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium mt-0.5 sm:mt-1 truncate hidden sm:block">{tab.label}</span>
                  {/* Show label on mobile only for active tab */}
                  {isActive && (
                    <span className="text-xs font-medium mt-0.5 truncate sm:hidden">{tab.label}</span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Safe area padding */}
          <div className="pb-safe-bottom"></div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};
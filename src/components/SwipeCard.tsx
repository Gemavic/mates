import React, { useState, useRef } from 'react';
import { HeartAnimation } from './HeartAnimation';
import { Heart, X, Star, MapPin, Briefcase, GraduationCap, MoreVertical, Flag, Shield, Zap, MessageCircle, Send, Paperclip, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendProfileViewNotification } from '@/lib/emailNotifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  id: string;
  name: string;
  age: number;
  location: string;
  occupation?: string;
  education?: string;
  images: string[];
  bio: string;
  interests: string[];
  online?: boolean;
  verified?: boolean;
  premium?: boolean;
  matchReason?: string;
  statusUpdate?: string;
  quoteOfTheDay?: string;
  lastActive?: string;
}

interface SwipeCardProps {
  profile: Profile;
  onLike: (id: string) => void;
  onPass: (id: string) => void;
  onSuperLike: (id: string) => void;
  onSendMessage: (id: string, message: string) => void;
  onBlink: (id: string) => void;
  onReport?: (id: string) => void;
  onBlock?: (id: string) => void;
  className?: string;
  onNavigate?: (screen: string, params?: any) => void;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  profile,
  onLike,
  onPass,
  onSuperLike,
  onSendMessage,
  onBlink,
  onReport,
  onBlock,
  className = "",
  onNavigate
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Send profile view notification when card is rendered
  React.useEffect(() => {
    if (user) {
      sendProfileViewNotification(profile.id, {
        name: 'You',
        image: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400',
        id: user.id
      });
    }
  }, [profile.id, user]);

  const handleImageClick = (direction: 'prev' | 'next') => {
    if (direction === 'next' && currentImageIndex < profile.images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    } else if (direction === 'prev' && currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveClientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const moveClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      setDragOffset({
        x: moveClientX - clientX,
        y: moveClientY - clientY
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      
      // Determine action based on drag distance
      if (Math.abs(dragOffset.x) > 100) {
        if (dragOffset.x > 0) {
          onLike(profile.id);
        } else {
          onPass(profile.id);
        }
      } else if (dragOffset.y < -100) {
        onSuperLike(profile.id);
      }
      
      setDragOffset({ x: 0, y: 0 });
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
  };
  const emojis = ['😊', '😍', '🥰', '😘', '💕', '❤️', '🔥', '✨', '🌹', '💖', '😉', '😎', '🤗', '💋', '🌟', '💫'];

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(profile.id, message);
      setMessage('');
      setShowMessageBox(false);
      setShowEmojiPicker(false);
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleBlink = () => {
    // Blink is now free
    onBlink(profile.id);
    
    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    successMessage.textContent = `👁️ FREE Blink sent to ${profile.name}!`;
    document.body.appendChild(successMessage);
    setTimeout(() => {
      if (document.body.contains(successMessage)) {
        document.body.removeChild(successMessage);
      }
    }, 3000);
    blinkElement.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl animate-ping pointer-events-none z-50';
    blinkElement.textContent = '👁️';
    document.body.appendChild(blinkElement);
    setTimeout(() => {
      if (document.body.contains(blinkElement)) {
        document.body.removeChild(blinkElement);
      }
    }, 1000);
  };

  return (
    <>
      <HeartAnimation 
        trigger={showHeartAnimation}
        onComplete={() => setShowHeartAnimation(false)}
      />
    <div
      ref={cardRef}
      className={cn(
        "relative w-full max-w-xs sm:max-w-sm mx-auto bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden",
        "transform transition-transform duration-200 select-none",
        isDragging && "cursor-grabbing",
        className
      )}
      style={{
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.1}deg)`,
      }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
    >
      {/* Safety Menu */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            onTouchEnd={(e) => e.stopPropagation()}
            className="w-7 h-7 sm:w-8 sm:h-8 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors"
            type="button"
            aria-label="Profile options"
          >
            <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </button>
          
          {showMenu && (
            <div className="absolute top-8 sm:top-10 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[120px] z-30">
              <button
                onClick={() => {
                  onReport?.(profile.id);
                  setShowMenu(false);
                  // Show report confirmation
                  const successMessage = document.createElement('div');
                  successMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                  successMessage.textContent = 'User reported. Thank you for keeping our community safe.';
                  document.body.appendChild(successMessage);
                  setTimeout(() => document.body.removeChild(successMessage), 3000);
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                type="button"
              >
                <Flag className="w-4 h-4 mr-2" />
                Report
              </button>
              <button
                onClick={() => {
                  onBlock?.(profile.id);
                  setShowMenu(false);
                  // Show block confirmation
                  const successMessage = document.createElement('div');
                  successMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                  successMessage.textContent = 'User blocked successfully.';
                  document.body.appendChild(successMessage);
                  setTimeout(() => document.body.removeChild(successMessage), 3000);
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                type="button"
              >
                <Shield className="w-4 h-4 mr-2" />
                Block
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="absolute top-2 sm:top-3 lg:top-4 left-2 sm:left-3 lg:left-4 flex flex-col space-y-1 z-10">
        {profile.online && (
          <div className="bg-green-500 text-white px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium flex items-center">
            <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
            Online
          </div>
        )}
        {profile.matchReason && (
          <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium animate-slide-up">
            💫 {profile.matchReason}
          </div>
        )}
        {profile.verified && (
          <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            ✓ Verified
          </div>
        )}
        {profile.premium && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
            <Zap className="w-3 h-3 mr-1" />
            Premium
          </div>
        )}
      </div>

      {/* Profile Image */}
      <div className="relative h-72 sm:h-80 md:h-96 lg:h-[500px] overflow-hidden">
        <img
          src={profile.images[currentImageIndex]}
          alt={profile.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        
        {/* Image Navigation */}
        {profile.images.length > 1 && (
          <>
            <button
              onClick={() => handleImageClick('prev')}
              onTouchEnd={(e) => e.stopPropagation()}
              className="absolute left-1 sm:left-2 top-1/2 transform -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors"
              disabled={currentImageIndex === 0}
              type="button"
              aria-label="Previous image"
            >
              <span className="text-white text-base sm:text-lg">‹</span>
            </button>
            <button
              onClick={() => handleImageClick('next')}
              onTouchEnd={(e) => e.stopPropagation()}
              className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors"
              disabled={currentImageIndex === profile.images.length - 1}
              type="button"
              aria-label="Next image"
            >
              <span className="text-white text-base sm:text-lg">›</span>
            </button>
            
            {/* Image Indicators */}
            <div className="absolute top-2 sm:top-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {profile.images.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors duration-200",
                    index === currentImageIndex ? "bg-white" : "bg-white/50"
                  )}
                />
              ))}
            </div>
          </>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {/* Profile Info Overlay */}
        <div
          className="absolute bottom-2 sm:bottom-3 lg:bottom-4 left-2 sm:left-3 lg:left-4 right-2 sm:right-3 lg:right-4 text-white cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (onNavigate) {
              onNavigate('view-profile', { userId: profile.id });
            }
          }}
        >
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 drop-shadow-lg truncate hover:underline">
            {profile.name}, {profile.age}
          </h2>
          <div className="flex items-center mb-1">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 drop-shadow-sm" />
            <span className="text-xs sm:text-sm drop-shadow-sm truncate">{profile.location}</span>
          </div>
          {profile.occupation && (
            <div className="flex items-center mb-1">
              <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 mr-1 drop-shadow-sm" />
              <span className="text-xs sm:text-sm drop-shadow-sm truncate">{profile.occupation}</span>
            </div>
          )}
          {profile.education && (
            <div className="flex items-center">
              <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4 mr-1 drop-shadow-sm" />
              <span className="text-xs sm:text-sm drop-shadow-sm truncate">{profile.education}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Bio and Interests */}
      <div className="p-3 sm:p-4 lg:p-6 bg-gradient-to-b from-white to-gray-50 max-h-32 sm:max-h-40 overflow-y-auto">
        {/* Status Update */}
        {profile.statusUpdate && (
          <div className="mb-3 p-2 bg-blue-50 border-l-4 border-blue-500 rounded">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-blue-700 text-xs font-medium">Status Update</span>
            </div>
            <p className="text-blue-800 text-sm mt-1">{profile.statusUpdate}</p>
          </div>
        )}
        
        {/* Quote of the Day */}
        {profile.quoteOfTheDay && (
          <div className="mb-3 p-2 bg-purple-50 border-l-4 border-purple-500 rounded">
            <div className="flex items-center space-x-2">
              <span className="text-purple-500 text-sm">💭</span>
              <span className="text-purple-700 text-xs font-medium">Quote of the Day</span>
            </div>
            <p className="text-purple-800 text-sm mt-1 italic">"{profile.quoteOfTheDay}"</p>
          </div>
        )}
        
        <p className="text-gray-800 text-xs sm:text-sm mb-2 sm:mb-3 leading-relaxed line-clamp-3">
          {profile.bio}
        </p>
        
        {/* Interests */}
        <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
          {(Array.isArray(profile.interests) ? profile.interests : []).map((interest, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 text-xs rounded-full border border-pink-200 hover:from-pink-200 hover:to-rose-200 transition-colors truncate"
            >
              {interest}
            </span>
          ))}
        </div>
        
        {/* Last Active */}
        {profile.lastActive && (
          <div className="text-center">
            <p className="text-gray-500 text-xs">Active {profile.lastActive}</p>
          </div>
        )}
      </div>
      
      {/* Message Box */}
      {showMessageBox && (
        <div className="p-3 sm:p-4 bg-white border-t border-gray-200 max-h-48 overflow-y-auto">
          <div className="space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Send a message to ${profile.name}...`}
              className="w-full min-h-[50px] sm:min-h-[60px] md:min-h-[80px] resize-none text-sm"
            />
            
            {/* Chat Controls */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button
                  onClick={() => setShowMessageBox(false)}
                  className="bg-gray-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 text-xs sm:text-sm touch-manipulation active:scale-95 transition-all duration-200"
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="bg-pink-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 flex items-center text-xs sm:text-sm touch-manipulation active:scale-95 transition-all duration-200 disabled:opacity-50"
                  type="button"
                >
                  <Send className="w-3 h-3 mr-1 flex-shrink-0" />
                  Send
                </Button>
              </div>
              <Button
                onClick={() => onNavigate?.('credits')}
                className="bg-white/20 text-white hover:bg-white/30 text-xs px-2 py-1 rounded-full cursor-pointer touch-manipulation active:scale-95 transition-all duration-200"
                type="button"
              >
                Buy Credits
              </Button>
            </div>
            
            {/* Message Input with Embedded Emoji */}
            <div className="relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Send a message to ${profile.name}...`}
                className="w-full min-h-[50px] sm:min-h-[60px] md:min-h-[80px] resize-none pl-8 sm:pl-10 md:pl-12 text-sm"
              />
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute left-2 sm:left-3 top-2 sm:top-3 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 touch-manipulation active:scale-95"
                title="Add emoji"
                type="button"
              >
                <Smile className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              </button>
            </div>
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="bg-gray-50 rounded-lg p-2 border max-h-24 sm:max-h-32 overflow-y-auto">
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1">
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => addEmoji(emoji)}
                      className="text-sm sm:text-base md:text-lg hover:bg-gray-200 rounded p-0.5 sm:p-1 transition-colors touch-manipulation active:scale-95"
                      type="button"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-center items-center gap-2 sm:gap-3 p-2 sm:p-3 lg:p-4 bg-white">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPass(profile.id);
          }}
          className={cn(
            "w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-gray-500 hover:bg-gray-600 rounded-full shadow-xl",
            "flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200",
            "hover:shadow-2xl group touch-manipulation cursor-pointer select-none"
          )}
          type="button"
          aria-label="Pass profile"
        >
          <X className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white drop-shadow-sm group-hover:scale-110 transition-transform flex-shrink-0" />
        </button>
        
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleBlink();
          }}
          className={cn(
            "w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-yellow-400 to-orange-500",
            "hover:from-yellow-500 hover:to-orange-600 rounded-full shadow-xl",
            "flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200",
            "hover:shadow-2xl group touch-manipulation cursor-pointer select-none"
          )}
          title="Send a Blink (1 Credit)"
          type="button"
          aria-label="Send blink"
        >
          <span className="text-white text-sm sm:text-base md:text-lg lg:text-xl drop-shadow-sm group-hover:scale-110 transition-transform">👁️</span>
        </button>
        
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMessageBox(!showMessageBox);
          }}
          className={cn(
            "w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-blue-500 to-cyan-500",
            "hover:from-blue-600 hover:to-cyan-600 rounded-full shadow-xl",
            "flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200",
            "hover:shadow-2xl group touch-manipulation cursor-pointer select-none"
          )}
          type="button"
          aria-label="Send message"
        >
          <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white drop-shadow-sm group-hover:scale-110 transition-transform flex-shrink-0" />
        </button>
        
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSuperLike(profile.id);
          }}
          className={cn(
            "w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-purple-500 to-pink-500",
            "hover:from-purple-600 hover:to-pink-600 rounded-full shadow-xl",
            "flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200",
            "hover:shadow-2xl group touch-manipulation cursor-pointer select-none"
          )}
          type="button"
          aria-label="Super like"
        >
          <Star className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white drop-shadow-sm group-hover:scale-110 transition-transform flex-shrink-0" />
        </button>
        
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowHeartAnimation(true);
            setTimeout(() => {
            onLike(profile.id);
            }, 300);
          }}
          className={cn(
            "w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-pink-500 to-red-500",
            "hover:from-pink-600 hover:to-red-600 rounded-full shadow-xl",
            "flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200",
            "hover:shadow-2xl group touch-manipulation cursor-pointer select-none"
          )}
          type="button"
          aria-label="Like profile"
        >
          <Heart className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white drop-shadow-sm group-hover:scale-110 transition-transform flex-shrink-0" />
        </button>
      </div>

      {/* Swipe Hints */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {dragOffset.x > 50 && (
            <div className="bg-green-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full font-bold text-sm sm:text-base md:text-lg shadow-lg animate-pulse">
              LIKE
            </div>
          )}
          {dragOffset.x < -50 && (
            <div className="bg-red-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full font-bold text-sm sm:text-base md:text-lg shadow-lg animate-pulse">
              PASS
            </div>
          )}
          {dragOffset.y < -50 && (
            <div className="bg-blue-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full font-bold text-sm sm:text-base md:text-lg shadow-lg animate-pulse">
              SUPER LIKE
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};
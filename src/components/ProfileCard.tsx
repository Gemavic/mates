import React from 'react';
import { X, Star, MapPin, Briefcase, GraduationCap, MoreVertical, Flag, Shield, MessageCircle, Send, Smile } from 'lucide-react';
import { SecurityManager } from '@/lib/security';
import { creditManager } from '@/lib/creditSystem';
import { sendProfileViewNotification } from '@/lib/emailNotifications';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';

interface ProfileCardProps {
  profile: {
    id: string;
    name: string;
    age: number;
    location: string;
    occupation?: string;
    education?: string;
    images: string[];
    bio: string;
    interests: string[];
  };
  onLike: (id: string) => void;
  onPass: (id: string) => void;
  onSuperLike: (id: string) => void;
  onSendMessage?: (id: string, message: string) => void;
  onBlink?: (id: string) => void;
  onReport?: (id: string) => void;
  onBlock?: (id: string) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onLike: _onLike,
  onPass,
  onSuperLike,
  onSendMessage,
  onBlink,
  onReport,
  onBlock
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showMessageBox, setShowMessageBox] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
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

  const handleReport = () => {
    if (!user) {
      alert('Please sign in to report users');
      return;
    }
    if (onReport) {
      onReport(profile.id);
    }
    SecurityManager.reportUser(profile.id, 'Inappropriate content', user.id);
    setShowMenu(false);
    alert('User reported. Thank you for keeping our community safe.');
  };

  const handleBlock = () => {
    if (!user) {
      alert('Please sign in to block users');
      return;
    }
    if (onBlock) {
      onBlock(profile.id);
    }
    SecurityManager.blockUser(profile.id, user.id);
    setShowMenu(false);
    alert('User blocked successfully.');
  };

  const handleSuperLike = async () => {
    if (!user) {
      alert('Please sign in to send Super Likes');
      return;
    }
    if (creditManager.canAfford(user.id, 5)) {
     const success = await creditManager.deductCredits(user.id, 5);
      if (success) {
        onSuperLike(profile.id);
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMessage.textContent = `⭐ Super Like sent for 5 credits!`;
        document.body.appendChild(successMessage);
        setTimeout(() => {
          if (document.body.contains(successMessage)) {
            document.body.removeChild(successMessage);
          }
        }, 3000);
      }
    } else {
      alert('You need 5 credits to send a Super Like! Regular likes are FREE.');
    }
  };

  const emojis = ['😊', '😍', '🥰', '😘', '💕', '❤️', '🔥', '✨', '🌹', '💖', '😉', '😎', '🤗', '💋', '🌟', '💫'];

  const handleSendMessage = () => {
    if (message.trim() && onSendMessage) {
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
    if (onBlink) {
      onBlink(profile.id);
    }
  };

  return (
    <div className="relative w-full max-w-sm mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray/20">
      {/* Safety Menu */}
      <div className="absolute top-4 right-4 z-10">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm"
          >
            <MoreVertical className="w-4 h-4 text-white" />
          </button>
          
          {showMenu && (
            <div className="absolute top-10 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[120px]">
              <button
                onClick={handleReport}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Flag className="w-4 h-4 mr-2" />
                Report
              </button>
              <button
                onClick={handleBlock}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Shield className="w-4 h-4 mr-2" />
                Block
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Image */}
      <div className="relative h-96 overflow-hidden">
        <img
          src={profile.images[0]}
          alt={profile.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {/* Profile Info Overlay */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h2 className="text-2xl font-bold mb-1">
            {profile.name}, {profile.age}
          </h2>
          <div className="flex items-center mb-2">
            <MapPin className="w-4 h-4 mr-1 drop-shadow-sm" />
            <span className="text-sm drop-shadow-sm">{profile.location}</span>
          </div>
          {profile.occupation && (
            <div className="flex items-center mb-1">
              <Briefcase className="w-4 h-4 mr-1 drop-shadow-sm" />
              <span className="text-sm drop-shadow-sm">{profile.occupation}</span>
            </div>
          )}
          {profile.education && (
            <div className="flex items-center">
              <GraduationCap className="w-4 h-4 mr-1 drop-shadow-sm" />
              <span className="text-sm drop-shadow-sm">{profile.education}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Bio and Interests */}
      <div className="p-4 bg-gray-50">
        <p className="text-gray-800 text-sm mb-3 leading-relaxed">
          {SecurityManager.filterProfanity(profile.bio)}
        </p>
        
        {/* Interests */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(Array.isArray(profile.interests) ? profile.interests : []).map((interest, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-pink-100 text-pink-700 text-xs rounded-full border border-pink-200"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>
      
      {/* Message Box */}
      {showMessageBox && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Send a message to ${profile.name}...`}
              className="w-full min-h-[80px] resize-none"
            />
            
            {/* Chat Controls */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button
                  onClick={() => setShowMessageBox(false)}
                  className="bg-gray-500 text-white px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="bg-pink-500 text-white px-4 py-2 flex items-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
            
            {/* Message Input with Embedded Emoji */}
            <div className="relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Send a message to ${profile.name}...`}
                className="w-full min-h-[80px] resize-none pl-12"
              />
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute left-3 top-3 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="bg-gray-50 rounded-lg p-3 border">
                <div className="grid grid-cols-8 gap-2">
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => addEmoji(emoji)}
                      className="text-xl hover:bg-gray-200 rounded p-1 transition-colors"
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
      <div className="flex justify-center items-center gap-3 p-4 bg-white">
        <button
          onClick={() => onPass(profile.id)}
          className="w-12 h-12 bg-gray-500 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-all duration-300 hover:shadow-2xl"
        >
          <X className="w-5 h-5 text-white drop-shadow-sm" />
        </button>
        
        <button
          onClick={handleBlink}
          className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-all duration-300 hover:shadow-2xl"
          title="Send a Blink"
        >
          <span className="text-white text-lg drop-shadow-sm">👁️</span>
        </button>
        
        <button
          onClick={() => setShowMessageBox(!showMessageBox)}
          className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-all duration-300 hover:shadow-2xl"
        >
          <MessageCircle className="w-5 h-5 text-white drop-shadow-sm" />
        </button>
        
        <button
          onClick={handleSuperLike}
          className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-all duration-300 hover:shadow-2xl"
        >
          <Star className="w-5 h-5 text-white drop-shadow-sm" />
        </button>
      </div>
    </div>
  );
};
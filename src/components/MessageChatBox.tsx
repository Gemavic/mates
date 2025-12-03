import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Smile, Paperclip, Image, Video, Phone, Users, Clock, Gift, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { sendMessageNotification } from '@/lib/emailNotifications';
import { useAuth } from '@/hooks/useAuth';
import { MessagingManager, CreditManager } from '@/lib/database';

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  category: string;
}

interface MessageChatBoxProps {
  className?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImage: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'emoji' | 'image' | 'video';
  edited?: boolean;
  editedAt?: Date;
}

interface ChatThread {
  id: string;
  participantId: string;
  participantName: string;
  participantImage: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  isOnline: boolean;
  isTyping: boolean;
}

export const MessageChatBox: React.FC<MessageChatBoxProps> = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getFirstName, user } = useAuth();

  // Load user credits from database
  useEffect(() => {
    if (user) {
      CreditManager.getUserCredits(user.id)
        .then(credits => {
          const total = (credits?.complimentary_credits || 0) + (credits?.purchased_credits || 0);
          setUserBalance(total);
        })
        .catch(err => console.error('Failed to load credits:', err));
    }
  }, [user]);

  // Quick gift items for chat
  const quickGifts: GiftItem[] = [
    { id: 'red_rose', name: 'Red Rose', emoji: '🌹', price: 5, category: 'romantic' },
    { id: 'love_heart', name: 'Love Heart', emoji: '💖', price: 3, category: 'romantic' },
    { id: 'coffee', name: 'Coffee', emoji: '☕', price: 3, category: 'casual' },
    { id: 'chocolate_box', name: 'Chocolate', emoji: '🍫', price: 12, category: 'romantic' },
    { id: 'bouquet', name: 'Bouquet', emoji: '💐', price: 15, category: 'romantic' },
    { id: 'teddy_bear', name: 'Teddy Bear', emoji: '🧸', price: 8, category: 'fun' },
    { id: 'diamond', name: 'Diamond', emoji: '💎', price: 100, category: 'luxury' },
    { id: 'crown', name: 'Crown', emoji: '👑', price: 50, category: 'luxury' },
    { id: 'champagne', name: 'Champagne', emoji: '🍾', price: 35, category: 'luxury' },
    { id: 'pizza_slice', name: 'Pizza', emoji: '🍕', price: 5, category: 'casual' },
    { id: 'ice_cream', name: 'Ice Cream', emoji: '🍦', price: 4, category: 'casual' },
    { id: 'birthday_cake', name: 'Cake', emoji: '🎂', price: 10, category: 'fun' }
  ];

  // Sample chat threads matching La-Date style
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([
    {
      id: 'thread-gabriela',
      participantId: 'gabriela-id',
      participantName: 'Gabriela',
      participantImage: 'https://images.pexels.com/photos/1441151/pexels-photo-1441151.jpeg?auto=compress&cs=tinysrgb&w=400',
      lastMessage: {
        id: 'msg-gabriela',
        senderId: 'gabriela-id',
        senderName: 'Gabriela',
        senderImage: 'https://images.pexels.com/photos/1441151/pexels-photo-1441151.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: `Hey! How's your day going? Would love to chat more 😊`,
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        type: 'text'
      },
      unreadCount: 1,
      isOnline: true,
      isTyping: false
    },
    {
      id: 'thread-astrid',
      participantId: 'astrid-id',
      participantName: 'Astrid',
      participantImage: 'https://images.pexels.com/photos/2100063/pexels-photo-2100063.jpeg?auto=compress&cs=tinysrgb&w=400',
      lastMessage: {
        id: 'msg-astrid',
        senderId: 'astrid-id',
        senderName: 'Astrid',
        senderImage: 'https://images.pexels.com/photos/2100063/pexels-photo-2100063.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: 'Thanks for the great conversation yesterday! 🌟',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        type: 'text'
      },
      unreadCount: 1,
      isOnline: true,
      isTyping: false
    },
    {
      id: 'thread-jessica',
      participantId: 'jessica-id',
      participantName: 'Jessica',
      participantImage: 'https://images.pexels.com/photos/3763714/pexels-photo-3763714.jpeg?auto=compress&cs=tinysrgb&w=400',
      lastMessage: {
        id: 'msg-jessica',
        senderId: 'jessica-id',
        senderName: 'Jessica',
        senderImage: 'https://images.pexels.com/photos/3763714/pexels-photo-3763714.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: 'Looking forward to our coffee date this weekend! ☕',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        type: 'text'
      },
      unreadCount: 1,
      isOnline: true,
      isTyping: false
    }
  ]);

  // Sample messages for active thread
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-gabriela-1',
      senderId: 'gabriela-id',
      senderName: 'Gabriela',
      senderImage: 'https://images.pexels.com/photos/1441151/pexels-photo-1441151.jpeg?auto=compress&cs=tinysrgb&w=400',
      message: 'Hey! How are you doing today? Hope you\'re having a great day! 😊',
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      type: 'text'
    },
    {
      id: 'msg-user-1',
      senderId: user?.id || 'demo-user',
      senderName: 'You',
      senderImage: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400',
      message: 'Winked',
      timestamp: new Date(Date.now() - 1 * 60 * 1000),
      type: 'text'
    }
  ]);

  const emojis = [
    '😊', '😍', '🥰', '😘', '💕', '❤️', '🔥', '✨', 
    '🌹', '💖', '😉', '😎', '🤗', '💋', '🌟', '💫',
    '👍', '👎', '🤔', '😂', '😭', '🥺', '😴', '🤤',
    '☕', '🍕', '🍔', '🍷', '🎉', '🎊', '🎈', '🎁'
  ];

  const totalUnread = chatThreads.reduce((sum, thread) => sum + thread.unreadCount, 0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    try {
      if (!message.trim()) return;

      const activeThreadData = chatThreads.find(t => t.id === activeThread);
      if (!activeThreadData) return;

      // ENFORCE: Check credits BEFORE sending message
      if (!user) {
        alert('Please sign in to send messages');
        return;
      }

      const result = creditManager.sendMessage(user.id, activeThread!, message.trim());

      if (!result.success) {
        alert(`Need ${formatCredits(result.cost)} to send this message!`);
        return;
      }

      // Update balance after successful credit deduction
      setUserBalance(creditManager.getTotalCredits(user.id));

      // Only NOW create and send the message (after credits are deducted)
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        senderId: user.id,
        senderName: 'You',
        senderImage: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: message.trim(),
        timestamp: new Date(),
        type: 'text'
      };

      // Add message to chat
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      setShowEmojiPicker(false);

      // Update thread with new message
      setChatThreads(prev => prev.map(thread =>
        thread.id === activeThread
          ? { ...thread, lastMessage: newMessage, unreadCount: 0 }
          : thread
      ));

      // Show feedback based on whether it was free or paid
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = result.isFree
        ? '💬 First message FREE!'
        : `💬 Message sent! (-${result.cost} credits)`;
      document.body.appendChild(successMessage);
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 2000);

      // Try to send email notification (non-blocking)
      try {
        if (user) {
          sendMessageNotification(activeThreadData.participantId, {
            name: 'You',
            image: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400',
            id: user.id
          });
        }
      } catch (notificationError) {
        console.log('Notification skipped:', notificationError);
      }

    } catch (error) {
      console.error('Message send error:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const addEmoji = (emoji: string) => {
    try {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    } catch (error) {
      console.error('Emoji add error:', error);
    }
  };

  const sendGift = (gift: GiftItem) => {
    try {
      const activeThreadData = chatThreads.find(t => t.id === activeThread);
      if (!activeThreadData) {
        alert('Please select a chat first');
        return;
      }

      // ENFORCE: Check if gift is free (price = 0)
      if (!user) {
        alert('Please sign in to send gifts');
        return;
      }

      const isFreeGift = gift.price === 0;
      const isStaff = creditManager.isStaffMember(user.id);

      // ENFORCE: Check credits BEFORE sending gift (unless free or staff)
      if (!isFreeGift && !isStaff) {
        if (!creditManager.canAfford(user.id, gift.price)) {
          alert(`Need ${formatCredits(gift.price)} to send ${gift.name}!`);
          return;
        }

        // Deduct credits BEFORE sending
        creditManager.deductCredits(user.id, gift.price);
        setUserBalance(creditManager.getTotalCredits(user.id));
      }

      // Only NOW create and send the gift (after credits are deducted or if free)
      const giftMessage: ChatMessage = {
        id: Date.now().toString(),
        senderId: user.id,
        senderName: 'You',
        senderImage: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400',
        message: `Sent ${gift.emoji} ${gift.name}`,
        timestamp: new Date(),
        type: 'text'
      };

      // Add message to chat
      setMessages(prev => [...prev, giftMessage]);
      setShowGiftPicker(false);

      // Update thread
      setChatThreads(prev => prev.map(thread =>
        thread.id === activeThread
          ? { ...thread, lastMessage: giftMessage, unreadCount: 0 }
          : thread
      ));

      // Show success toast with appropriate message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-purple-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';

      if (isFreeGift) {
        toast.textContent = `${gift.emoji} ${gift.name} sent! (FREE)`;
      } else if (isStaff) {
        toast.textContent = `${gift.emoji} ${gift.name} sent! (Staff - Free)`;
      } else {
        toast.textContent = `${gift.emoji} ${gift.name} sent! (-${gift.price} credits)`;
      }

      document.body.appendChild(toast);
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 2000);

    } catch (error) {
      console.error('Gift send error:', error);
      alert('Failed to send gift. Please try again.');
    }
  };

  const handleFileUpload = (type: 'image' | 'video' | 'file') => {
    try {
      const activeThreadData = chatThreads.find(t => t.id === activeThread);
      if (!activeThreadData) return;

      const isStaff = creditManager.isStaffMember(user?.id || 'demo-user');

      // ENFORCE: Determine cost based on type
      let cost = 0;
      if (type === 'image') {
        cost = 10; // Photos: 10 credits
      } else if (type === 'video') {
        cost = 60; // Video: 60 credits/min (upfront charge)
      } else if (type === 'file') {
        cost = 10; // Files: 10 credits
      }

      // ENFORCE: Check credits BEFORE allowing upload (unless staff)
      if (!isStaff && cost > 0) {
        if (!creditManager.canAfford(user?.id || 'demo-user', cost)) {
          alert(`Need ${formatCredits(cost)} to send ${type}!`);
          return;
        }
      }

      const input = document.createElement('input');
      input.type = 'file';

      if (type === 'image') {
        input.accept = 'image/*';
      } else if (type === 'video') {
        input.accept = 'video/*';
      } else {
        input.accept = '*/*';
      }

      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          // ENFORCE: Deduct credits BEFORE processing upload (unless staff)
          if (!isStaff && cost > 0) {
            creditManager.deductCredits(user?.id || 'demo-user', cost);
            setUserBalance(creditManager.getTotalCredits(user?.id || 'demo-user'));
          }

          const successMessage = document.createElement('div');
          successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';

          if (isStaff) {
            successMessage.textContent = `📎 ${file.name} uploaded! (Staff - Free)`;
          } else if (cost > 0) {
            successMessage.textContent = `📎 ${file.name} uploaded! (-${cost} credits)`;
          } else {
            successMessage.textContent = `📎 ${file.name} uploaded!`;
          }

          document.body.appendChild(successMessage);
          setTimeout(() => {
            if (document.body.contains(successMessage)) {
              document.body.removeChild(successMessage);
            }
          }, 2000);
        }
      };
      input.click();
    } catch (error) {
      console.error('File upload error:', error);
      alert('File upload failed. Please try again.');
    }
  };

  const renderThreadList = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-pink-200 bg-gradient-to-r from-pink-500 to-pink-400 text-white">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Messages</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm opacity-90">{totalUnread} unread messages</p>
      </div>

      {/* Credits Balance */}
      <div className="p-3 bg-pink-50 border-b border-pink-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-pink-700">Chat Balance:</span>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-pink-900">{formatCredits(userBalance)}</span>
            <span className="text-pink-600 font-bold">{creditManager.getKobos(user?.id || 'demo-user')} 💖</span>
          </div>
        </div>
        <p className="text-xs text-pink-600 mt-1">2 credits or 1 kobo per minute</p>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto bg-pink-50">
        {chatThreads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => setActiveThread(thread.id)}
            className="w-full p-4 border-b border-pink-100 hover:bg-pink-100 transition-colors text-left cursor-pointer touch-manipulation active:scale-95"
            type="button"
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={thread.participantImage}
                  alt={thread.participantName}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                />
                <div className={`absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white ${
                  thread.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                {thread.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-white text-xs font-bold">{thread.unreadCount > 9 ? '9+' : thread.unreadCount}</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{thread.participantName}</h4>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {thread.lastMessage?.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={cn(
                    "text-xs sm:text-sm truncate",
                    thread.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'
                  )}>
                    {thread.isTyping ? (
                      <span className="text-blue-500 italic">typing...</span>
                    ) : (
                      thread.lastMessage?.message || 'No messages yet'
                    )}
                  </p>
                  {thread.isOnline && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-pink-200 bg-pink-100">
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleFileUpload('video')}
            className="flex items-center space-x-1 px-2 sm:px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors touch-manipulation active:scale-95"
            disabled={!creditManager.canAfford(user?.id || 'demo-user', 60) && !creditManager.isStaffMember(user?.id || 'demo-user')}
          >
            <Video className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">Video</span>
          </button>
          <button
            onClick={() => handleFileUpload('video')}
            className="flex items-center space-x-1 px-2 sm:px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors touch-manipulation active:scale-95"
            disabled={!creditManager.canAfford(user?.id || 'demo-user', 50) && !creditManager.isStaffMember(user?.id || 'demo-user')}
          >
            <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">Audio</span>
          </button>
        </div>
        <p className="text-xs text-blue-600 mt-1">Chat: 2 credits/min • Mail: 10 credits • Super Like: 5 credits</p>
        <p className="text-xs text-green-600">FREE: Likes, Blinks, Messages</p>
      </div>
    </div>
  );

  const renderChatView = () => {
    const thread = chatThreads.find(t => t.id === activeThread);
    if (!thread) return null;

    return (
      <div className="h-full flex flex-col">
        {/* Chat Header */}
        <div className="p-3 border-b border-pink-200 bg-gradient-to-r from-pink-100 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <button
                onClick={() => setActiveThread(null)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="relative">
                <img
                  src={thread.participantImage}
                  alt={thread.participantName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  thread.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">{thread.participantName}</h3>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowGiftPicker(!showGiftPicker)}
                className="relative p-2.5 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation active:scale-95 border border-gray-200"
              >
                <Gift className="w-6 h-6 text-orange-500 flex-shrink-0" />
                <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></div>
              </button>
              <button
                onClick={() => alert('Mail feature')}
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation active:scale-95 border border-gray-200"
              >
                <Mail className="w-6 h-6 text-orange-500 flex-shrink-0" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="12" cy="19" r="2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-pink-100 to-pink-200">
          {/* Today Label */}
          <div className="flex justify-center my-6">
            <div className="bg-pink-400/80 text-white px-6 py-2 rounded-full text-sm font-medium shadow-md">
              Today
            </div>
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === (user?.id || 'demo-user') ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${msg.senderId === (user?.id || 'demo-user') ? 'order-2' : 'order-1'}`}>
                <div className="flex flex-col space-y-1">
                  <div className={`rounded-2xl p-4 shadow-md ${
                    msg.senderId === (user?.id || 'demo-user')
                      ? 'bg-gradient-to-br from-pink-200 to-pink-300 text-gray-800 border border-pink-400'
                      : 'bg-white text-gray-800 border border-pink-200'
                  }`}>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-4xl">😉</span>
                    </div>
                    <p className="text-center text-base font-medium mt-2">{msg.message}</p>
                  </div>
                  <div className={`flex items-center space-x-2 px-2 ${
                    msg.senderId === (user?.id || 'demo-user') ? 'justify-end' : 'justify-start'
                  }`}>
                    <p className="text-sm text-gray-600">
                      {msg.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                    {msg.senderId === (user?.id || 'demo-user') && (
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {/* Typing Indicator */}
          {thread.isTyping && (
            <div className="flex justify-start">
              <div className="flex items-end space-x-2">
                <img
                  src={thread.participantImage}
                  alt={thread.participantName}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="bg-white border border-gray-200 rounded-2xl p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-pink-200 bg-pink-50">
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="mb-3 bg-white rounded-lg p-3 border border-pink-300">
              <div className="grid grid-cols-8 gap-2">
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => addEmoji(emoji)}
                    className="text-xl hover:bg-pink-100 rounded p-1 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleFileUpload('image')}
              className="bg-pink-600 text-white p-3 rounded-full hover:bg-pink-700 transition-colors flex-shrink-0 touch-manipulation active:scale-95"
              title="Camera"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={() => setMessage('Hi')}
              className="bg-white text-pink-600 px-4 py-2 rounded-full border-2 border-pink-600 hover:bg-pink-50 transition-colors flex-shrink-0 touch-manipulation active:scale-95 font-bold text-lg"
              title="Send Hi"
              type="button"
            >
              Hi
            </button>

            <div className="flex-1 relative flex items-center">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message"
                rows={1}
                className="w-full min-h-[48px] max-h-[120px] py-3 px-4 pr-12 rounded-full border-2 border-pink-300 focus:border-pink-400 focus:ring-0 text-base bg-white resize-none overflow-y-auto"
                style={{ scrollbarWidth: 'thin' }}
              />
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-pink-400 hover:text-pink-600 transition-colors rounded-full hover:bg-pink-100 touch-manipulation"
                title="Add emoji"
              >
                <Smile className="w-6 h-6 flex-shrink-0" />
              </button>
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || (!creditManager.canAfford(user?.id || 'demo-user', 2) && creditManager.getKobos(user?.id || 'demo-user') === 0 && !creditManager.isStaffMember(user?.id || 'demo-user'))}
              className="bg-pink-500 text-white p-4 rounded-full hover:bg-pink-600 transition-all duration-300 hover:scale-105 active:scale-95 touch-manipulation flex-shrink-0 cursor-pointer"
              type="button"
            >
              <Send className="w-6 h-6 flex-shrink-0" />
            </Button>
          </div>

        </div>

        {/* Gift Bar - Bottom */}
        <div className="border-t border-pink-200 bg-pink-50">
          <div className="flex items-center justify-between px-2 py-3 overflow-x-auto">
            <div className="flex items-center space-x-4">
              <button onClick={() => sendGift(quickGifts[0])} className="flex flex-col items-center min-w-[60px] touch-manipulation active:scale-95">
                <div className="text-3xl mb-1">❤️</div>
                <span className="text-xs font-bold text-pink-700">2500</span>
              </button>
              <button onClick={() => sendGift(quickGifts[4])} className="flex flex-col items-center min-w-[60px] touch-manipulation active:scale-95">
                <div className="text-3xl mb-1">🌹</div>
                <span className="text-xs font-bold text-pink-700">89</span>
              </button>
              <button onClick={() => sendGift(quickGifts[5])} className="flex flex-col items-center min-w-[60px] touch-manipulation active:scale-95">
                <div className="text-3xl mb-1">🧸</div>
                <span className="text-xs font-bold text-pink-700">277</span>
              </button>
              <button onClick={() => sendGift(quickGifts[3])} className="flex flex-col items-center min-w-[60px] touch-manipulation active:scale-95">
                <div className="text-3xl mb-1">🍫</div>
                <span className="text-xs font-bold text-pink-700">32</span>
              </button>
              <button onClick={() => sendGift(quickGifts[4])} className="flex flex-col items-center min-w-[60px] touch-manipulation active:scale-95">
                <div className="text-3xl mb-1">💐</div>
                <span className="text-xs font-bold text-pink-700">79</span>
              </button>
              <button onClick={() => sendGift(quickGifts[6])} className="flex flex-col items-center min-w-[60px] touch-manipulation active:scale-95">
                <div className="text-3xl mb-1">💎</div>
                <span className="text-xs font-bold text-pink-700">529</span>
              </button>
              <button className="flex items-center justify-center w-10 h-10 bg-pink-100 rounded-full touch-manipulation active:scale-95">
                <span className="text-xl text-pink-600">⋯</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Chat Button in Navigation */}
      <button
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "relative w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-gradient-to-r from-pink-500 to-pink-400 rounded-full shadow-lg",
          "hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center",
          "touch-manipulation flex-shrink-0 cursor-pointer select-none",
          className
        )}
        type="button"
        aria-label="Open chat"
      >
        <MessageCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 text-white flex-shrink-0" />
        {totalUnread > 0 && (
          <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-white text-xs font-bold leading-none">{totalUnread > 9 ? '9+' : totalUnread}</span>
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={cn(
          "fixed z-50",
          "bottom-14 sm:bottom-16 md:bottom-20 lg:bottom-24",
          "left-1/2 transform -translate-x-1/2",
          "w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[420px] xl:w-[480px]",
          "max-w-[600px]",
          "h-[60vh] sm:h-[65vh] md:h-[70vh] lg:h-[500px]",
          "bg-pink-50 rounded-2xl shadow-2xl border border-pink-300 overflow-hidden",
          "animate-slide-up"
        )}>
          {activeThread ? renderChatView() : renderThreadList()}
        </div>
      )}
    </>
  );
};
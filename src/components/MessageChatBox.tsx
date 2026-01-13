import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Smile, Paperclip, Image, Video, Phone, Users, Clock, Gift, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { sendMessageNotification } from '@/lib/emailNotifications';
import { useAuth } from '@/hooks/useAuth';
import { MessagingManager, CreditManager } from '@/lib/database';
import { supabaseClient } from '@/lib/supabase';

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  category: string;
}

interface MessageChatBoxProps {
  className?: string;
  selectedUserId?: string;
  selectedUserName?: string;
  selectedUserImage?: string;
  onNavigate?: (screen: string) => void;
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
  isDelivered?: boolean;
  isRead?: boolean;
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

export const MessageChatBox: React.FC<MessageChatBoxProps> = ({
  className = "",
  selectedUserId,
  selectedUserName,
  selectedUserImage,
  onNavigate = () => {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [userProfileImage, setUserProfileImage] = useState('');
  const [defaultThreads, setDefaultThreads] = useState<ChatThread[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getFirstName, user, profile } = useAuth();

  // Load user credits from database and refresh periodically
  useEffect(() => {
    const loadCredits = async () => {
      if (user) {
        try {
          const credits = await CreditManager.getUserCredits(user.id);
          const total = (credits?.complimentary_credits || 0) + (credits?.purchased_credits || 0);
          setUserBalance(total);
          console.log('💰 Credits loaded:', total, 'credits for', user.id);
        } catch (err) {
          console.error('Failed to load credits:', err);
        }
      }
    };

    loadCredits();

    // Refresh credits every 10 seconds to stay in sync
    const interval = setInterval(loadCredits, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Update user profile image from profile data
  useEffect(() => {
    if (profile?.photo_url) {
      setUserProfileImage(profile.photo_url);
    }
  }, [profile]);

  // Return empty array instead of demo data
  const getEmptyThreads = (): ChatThread[] => [];

  // Load actual mail threads from database
  useEffect(() => {
    const loadMailThreads = async () => {
      if (!user) return;

      try {
        // Load actual mail threads
        const threads = await MessagingManager.getMailThreads(user.id);

        if (!threads || threads.length === 0) {
          console.log('📱 No mail threads found');
          setDefaultThreads([]);
          setChatThreads([]);
          return;
        }

        // Get all other user IDs
        const otherUserIds = threads.map((thread: any) =>
          thread.participant1_id === user.id
            ? thread.participant2_id
            : thread.participant1_id
        );

        // Fetch all profiles in a single query
        const { data: profiles } = await supabaseClient
          .from('user_profiles')
          .select('user_id, full_name, first_name, photo_url, profile_photo, is_online')
          .in('user_id', otherUserIds);

        // Fetch last message for each thread
        const { data: allMessages } = await supabaseClient
          .from('mail_messages')
          .select('thread_id, message_text, created_at, is_read, sender_id')
          .in('thread_id', threads.map((t: any) => t.id))
          .order('created_at', { ascending: false });

        // Create lookup maps
        const profileMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p;
          return acc;
        }, {} as Record<string, any>);

        const messagesByThread = (allMessages || []).reduce((acc, msg) => {
          if (!acc[msg.thread_id]) {
            acc[msg.thread_id] = {
              latest: msg,
              unreadCount: 0
            };
          }
          if (!msg.is_read && msg.sender_id !== user.id) {
            acc[msg.thread_id].unreadCount++;
          }
          return acc;
        }, {} as Record<string, any>);

        // Map to ChatThread format
        const chatThreads: ChatThread[] = threads.map((thread: any) => {
          const otherUserId = thread.participant1_id === user.id
            ? thread.participant2_id
            : thread.participant1_id;

          const profile = profileMap[otherUserId];
          const threadMessages = messagesByThread[thread.id];

          if (!profile) {
            console.warn('Profile not found for user:', otherUserId);
            return null;
          }

          const displayName = profile.first_name || profile.full_name || 'User';
          const displayImage = profile.photo_url || profile.profile_photo;

          if (!displayImage) {
            console.warn('No profile image for user:', otherUserId);
            return null;
          }

          return {
            id: thread.id,
            participantId: otherUserId,
            participantName: displayName,
            participantImage: displayImage,
            lastMessage: threadMessages?.latest ? {
              id: threadMessages.latest.id || 'msg-' + thread.id,
              senderId: threadMessages.latest.sender_id,
              senderName: threadMessages.latest.sender_id === user.id ? 'You' : displayName,
              senderImage: displayImage,
              message: threadMessages.latest.message_text,
              timestamp: new Date(threadMessages.latest.created_at),
              type: 'text'
            } : undefined,
            unreadCount: threadMessages?.unreadCount || 0,
            isOnline: profile.is_online || false,
            isTyping: false
          };
        }).filter((thread): thread is ChatThread => thread !== null);

        console.log('✅ Loaded', chatThreads.length, 'mail threads:', chatThreads.map(t => t.participantName));
        setDefaultThreads(chatThreads);
        setChatThreads(chatThreads);
      } catch (error) {
        console.error('Error loading mail threads:', error);
        setDefaultThreads([]);
        setChatThreads([]);
      }
    };

    loadMailThreads();
  }, [user]);

  // Load messages when a thread is selected
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeThread || !user) return;

      try {
        console.log('📨 Loading messages for thread:', activeThread);

        // Fetch messages from database
        const { data: messagesData, error } = await supabaseClient
          .from('mail_messages')
          .select('id, sender_id, message_text, created_at, is_read, is_delivered, thread_id')
          .eq('thread_id', activeThread)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Get unique sender IDs (exclude current user for optimization)
        const otherSenderIds = [...new Set(
          (messagesData?.map(m => m.sender_id) || []).filter(id => id !== user.id)
        )];

        // Only fetch data for other users (we have current user's data)
        let profileLookup: Record<string, any> = {};
        let photoLookup: Record<string, string> = {};

        if (otherSenderIds.length > 0) {
          // Parallel fetch for better performance
          const [profilesResult, photosResult] = await Promise.all([
            supabaseClient
              .from('user_profiles')
              .select('user_id, first_name, full_name, photo_url')
              .in('user_id', otherSenderIds),
            supabaseClient
              .from('user_photos')
              .select('user_id, photo_url')
              .in('user_id', otherSenderIds)
              .eq('is_primary', true)
          ]);

          // Create lookup maps
          profileLookup = (profilesResult.data || []).reduce((acc, p) => {
            acc[p.user_id] = p;
            return acc;
          }, {} as Record<string, any>);

          photoLookup = (photosResult.data || []).reduce((acc, p) => {
            acc[p.user_id] = p.photo_url;
            return acc;
          }, {} as Record<string, string>);
        }

        // Convert to ChatMessage format with real sender data
        const loadedMessages: ChatMessage[] = (messagesData || [])
          .map(msg => {
            const isCurrentUser = msg.sender_id === user.id;
            const senderProfile = profileLookup[msg.sender_id];

            let senderName: string;
            let senderImage: string;

            if (isCurrentUser) {
              senderName = 'You';
              senderImage = userProfileImage || photoLookup[user.id] || '';
            } else {
              senderName = senderProfile?.first_name || senderProfile?.full_name || 'User';
              senderImage = senderProfile?.photo_url || photoLookup[msg.sender_id] || '';
            }

            if (!senderImage) {
              console.warn('No image for sender:', msg.sender_id, senderName);
              return null;
            }

            return {
              id: msg.id,
              senderId: msg.sender_id,
              senderName,
              senderImage,
              message: msg.message_text,
              timestamp: new Date(msg.created_at),
              type: 'text' as const,
              isDelivered: msg.is_delivered ?? true,
              isRead: msg.is_read ?? false
            };
          })
          .filter((msg): msg is ChatMessage => msg !== null);

        setMessages(loadedMessages);
        console.log('✅ Loaded', loadedMessages.length, 'messages');

        // Mark messages as read (non-blocking for faster UI)
        supabaseClient
          .from('mail_messages')
          .update({
            is_read: true,
            read_at: new Date().toISOString()
          })
          .eq('thread_id', activeThread)
          .eq('is_read', false)
          .neq('sender_id', user.id)
          .then(() => console.log('Messages marked as read'))
          .catch(err => console.error('Failed to mark as read:', err));

      } catch (error) {
        console.error('Failed to load messages:', error);
        setMessages([]);
      }
    };

    loadMessages();

    // Set up real-time subscription for read receipts
    if (!activeThread || !user) return;

    const channel = supabaseClient
      .channel(`chat-${activeThread}`, {
        config: {
          broadcast: { self: false },
          presence: { key: user.id }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mail_messages',
          filter: `thread_id=eq.${activeThread}`
        },
        (payload) => {
          const newMessage = payload.new;

          // Only add if from other user (sender handles their own optimistically)
          if (newMessage.sender_id !== user.id) {
            const activeThreadData = chatThreads.find(t => t.id === activeThread);

            setMessages(prev => [...prev, {
              id: newMessage.id,
              senderId: newMessage.sender_id,
              senderName: activeThreadData?.participantName || 'User',
              senderImage: activeThreadData?.participantImage || '',
              message: newMessage.message_text,
              timestamp: new Date(newMessage.created_at),
              type: 'text',
              isDelivered: true,
              isRead: false
            }]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mail_messages',
          filter: `thread_id=eq.${activeThread}`
        },
        (payload) => {
          const updatedMessage = payload.new;

          // Update message status in state
          setMessages(prev =>
            prev.map(msg =>
              msg.id === updatedMessage.id
                ? {
                    ...msg,
                    isRead: updatedMessage.is_read,
                    isDelivered: updatedMessage.is_delivered
                  }
                : msg
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `thread_id=eq.${activeThread}`
        },
        (payload) => {
          const typingData = payload.new;

          // Only show typing if it's the other user
          if (typingData && typingData.user_id !== user.id) {
            setOtherUserTyping(typingData.is_typing ?? false);
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [activeThread, user, chatThreads, userProfileImage]);

  // Update chat threads when selected user changes
  useEffect(() => {
    const initializeThread = async () => {
      if (selectedUserId && selectedUserName && selectedUserImage && user) {
        try {
          // Check if a thread exists with this user
          const { data: existingThreads } = await supabaseClient
            .from('mail_threads')
            .select('id')
            .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${selectedUserId}),and(participant1_id.eq.${selectedUserId},participant2_id.eq.${user.id})`)
            .maybeSingle();

          let threadId: string;

          if (existingThreads) {
            // Use existing thread
            threadId = existingThreads.id;
            console.log('✅ Found existing thread:', threadId);
          } else {
            // Create new thread
            const { data: newThread, error } = await supabaseClient
              .from('mail_threads')
              .insert({
                participant1_id: user.id,
                participant2_id: selectedUserId
              })
              .select()
              .single();

            if (error) throw error;
            threadId = newThread.id;
            console.log('✅ Created new thread:', threadId);
          }

          // Create thread object for UI
          const newThreadObj: ChatThread = {
            id: threadId,
            participantId: selectedUserId,
            participantName: selectedUserName,
            participantImage: selectedUserImage,
            unreadCount: 0,
            isOnline: true,
            isTyping: false
          };

          setChatThreads([newThreadObj]);
          setActiveThread(threadId);
          setIsOpen(true);
        } catch (error) {
          console.error('Error initializing thread:', error);
        }
      } else if (defaultThreads.length > 0 && chatThreads.length === 0) {
        setChatThreads(defaultThreads);
      }
    };

    initializeThread();
  }, [selectedUserId, selectedUserName, selectedUserImage, defaultThreads, user]);

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

  const getInitialThreads = (): ChatThread[] => {
    if (selectedUserId && selectedUserName && selectedUserImage) {
      return [
        {
          id: `thread-${selectedUserId}`,
          participantId: selectedUserId,
          participantName: selectedUserName,
          participantImage: selectedUserImage,
          lastMessage: {
            id: `msg-${selectedUserId}`,
            senderId: selectedUserId,
            senderName: selectedUserName,
            senderImage: selectedUserImage,
            message: `Hey! Nice to meet you 😊`,
            timestamp: new Date(),
            type: 'text'
          },
          unreadCount: 0,
          isOnline: true,
          isTyping: false
        }
      ];
    }
    return [];
  };

  const getInitialMessages = (): ChatMessage[] => {
    return [];
  };

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

  // Function to update typing status
  const updateTypingStatus = async (typing: boolean) => {
    if (!activeThread || !user) return;

    try {
      await supabaseClient
        .from('typing_indicators')
        .upsert({
          user_id: user.id,
          thread_id: activeThread,
          is_typing: typing,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,thread_id'
        });
    } catch (error) {
      console.error('Failed to update typing status:', error);
    }
  };

  // Handle typing with debounce
  const handleTyping = () => {
    // Update typing indicator to true
    if (!isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to clear typing status after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 3000);
  };

  const handleSendMessage = async () => {
    try {
      if (!message.trim()) return;

      const activeThreadData = chatThreads.find(t => t.id === activeThread);
      if (!activeThreadData) return;

      // ENFORCE: User authentication
      if (!user) {
        alert('Please sign in to send messages');
        return;
      }

      // CHAT PRICING: 2 credits per minute OR 1 kobo per minute (time-based)
      // Chat messages are FREE - charging happens by TIME when chat session is active
      // TODO: Implement timer-based charging (2 credits/min or 1 kobo/min)
      // For now, messages are sent without per-message cost

      // Create optimistic message for immediate UI update
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        senderId: user.id,
        senderName: 'You',
        senderImage: userProfileImage,
        message: message.trim(),
        timestamp: new Date(),
        type: 'text',
        isDelivered: false,
        isRead: false
      };

      // Add message to UI immediately
      setMessages(prev => [...prev, optimisticMessage]);
      const messageToSend = message.trim();
      setMessage('');
      setShowEmojiPicker(false);

      // Clear typing indicator
      setIsTyping(false);
      updateTypingStatus(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Save to database
      const { data: savedMessage, error: messageError } = await supabaseClient
        .from('mail_messages')
        .insert({
          thread_id: activeThread,
          sender_id: user.id,
          subject: 'Chat Message',
          message_text: messageToSend,
          credits_spent: 0,
          has_photos: false,
          is_delivered: true,
          delivered_at: new Date().toISOString(),
          is_read: false
        })
        .select()
        .single();

      if (messageError) {
        console.error('Failed to save message:', messageError);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        alert('Failed to send message. Please try again.');
        return;
      }

      // Update with real message ID and mark as delivered
      const finalMessage: ChatMessage = {
        ...optimisticMessage,
        id: savedMessage.id,
        isDelivered: true,
        isRead: false
      };

      setMessages(prev =>
        prev.map(m => m.id === optimisticMessage.id ? finalMessage : m)
      );

      // Update thread with new message
      setChatThreads(prev => prev.map(thread =>
        thread.id === activeThread
          ? { ...thread, lastMessage: finalMessage, unreadCount: 0 }
          : thread
      ));

      // Update thread timestamp (non-blocking - don't await)
      supabaseClient
        .from('mail_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeThread)
        .then(() => console.log('Thread updated'))
        .catch(err => console.error('Thread update failed:', err));

      // Send email notification (non-blocking - fire and forget)
      Promise.resolve().then(() => {
        try {
          sendMessageNotification(activeThreadData.participantId, {
            name: 'You',
            image: userProfileImage,
            id: user.id
          });
        } catch (notificationError) {
          console.log('Notification skipped:', notificationError);
        }
      });

    } catch (error) {
      console.error('Message send error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      alert(`Failed to send message: ${errorMessage}`);
      // Refund credits on error
      if (user) {
        creditManager.addCredits(user.id, 2);
        setUserBalance(creditManager.getTotalCredits(user.id));
      }
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
        senderImage: userProfileImage,
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

  const renderThreadList = () => {
    console.log('🎨 Rendering thread list. Threads:', chatThreads.length, chatThreads.map(t => t.participantName));

    return (
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
        {chatThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageCircle className="w-16 h-16 text-pink-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Conversations Yet</h3>
            <p className="text-sm text-gray-500">Start chatting with someone to see your messages here!</p>
          </div>
        ) : (
          chatThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => {
                console.log('💬 Thread clicked:', thread.participantName);
                setActiveThread(thread.id);
              }}
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
        ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-pink-200 bg-pink-100">
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => onNavigate('video-chat')}
            className="flex items-center space-x-1 px-2 sm:px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors touch-manipulation active:scale-95"
            disabled={!creditManager.canAfford(user?.id || 'demo-user', 60) && !creditManager.isStaffMember(user?.id || 'demo-user')}
          >
            <Video className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">Video</span>
          </button>
          <button
            onClick={() => onNavigate('audio-chat')}
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
  };

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

          {messages.map((msg) => {
            const isCurrentUser = msg.senderId === (user?.id || 'demo-user');
            return (
              <div key={msg.id} className={`flex items-end space-x-2 ${isCurrentUser ? 'justify-end flex-row-reverse space-x-reverse' : 'justify-start'}`}>
                {/* Profile Photo */}
                <img
                  src={msg.senderImage}
                  alt={msg.senderName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-md"
                />

                {/* Message Bubble */}
                <div className="max-w-[75%]">
                  <div className="flex flex-col space-y-1">
                    <div className={`rounded-2xl p-4 shadow-md ${
                      isCurrentUser
                        ? 'bg-gradient-to-br from-pink-200 to-pink-300 text-gray-800 border border-pink-400'
                        : 'bg-white text-gray-800 border border-pink-200'
                    }`}>
                      <p className="text-base leading-relaxed">{msg.message}</p>
                    </div>
                    <div className={`flex items-center space-x-2 px-2 ${
                      isCurrentUser ? 'justify-end' : 'justify-start'
                    }`}>
                      <p className="text-xs text-gray-600">
                        {msg.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      {isCurrentUser && (
                        <div className="flex items-center">
                          {msg.isRead ? (
                            // 2 ticks - Read (Blue Double Checkmark)
                            <svg className="w-4 h-4 text-blue-500" viewBox="0 0 20 20" fill="none">
                              <path d="M1 10l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M6 10l3 3 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : msg.isDelivered ? (
                            // 1 tick - Delivered (Gray Single Checkmark)
                            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none">
                              <path d="M3 10l4 4 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            // Clock - Sending
                            <svg className="w-4 h-4 text-gray-300" viewBox="0 0 20 20" fill="none">
                              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2"/>
                              <path d="M10 5v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Typing Indicator */}
          {otherUserTyping && (
            <div className="flex justify-start">
              <div className="flex items-end space-x-2">
                <img
                  src={thread.participantImage}
                  alt={thread.participantName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-md"
                />
                <div className="bg-white border border-pink-200 rounded-2xl p-4 shadow-md">
                  <div className="flex space-x-1.5">
                    <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
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
          e.stopPropagation();
          console.log('Chat button clicked! isOpen:', !isOpen);
          setIsOpen(!isOpen);
        }}
        className={cn(
          "relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-r from-pink-500 to-pink-400 rounded-full shadow-xl",
          "hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center",
          "touch-manipulation flex-shrink-0 cursor-pointer select-none border-2 border-white/30",
          "z-50 pointer-events-auto",
          isOpen && "scale-110 ring-4 ring-pink-300/50",
          className
        )}
        type="button"
        aria-label="Open chat"
        title="Open Messages"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white flex-shrink-0" />
        {totalUnread > 0 && (
          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
            <span className="text-white text-xs font-bold leading-none">{totalUnread > 9 ? '9+' : totalUnread}</span>
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={cn(
          "fixed z-[9999]",
          "bottom-[90px] sm:bottom-[100px] md:bottom-[110px] lg:bottom-[120px]",
          "left-1/2 transform -translate-x-1/2",
          "w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[420px] xl:w-[480px]",
          "max-w-[600px]",
          "h-[60vh] sm:h-[65vh] md:h-[70vh] lg:h-[500px]",
          "bg-pink-50 rounded-2xl shadow-2xl border-2 border-pink-400 overflow-hidden",
          "animate-slide-up pointer-events-auto"
        )}>
          {activeThread ? renderChatView() : renderThreadList()}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProtectedMedia, looksLikeImage } from '@/components/ProtectedMedia';
import { MessageCircle, X, Send, Smile, Video, Gift, Mail, Heart, Flag, Phone, Lock } from 'lucide-react';
import { ReportAbuseModal } from '@/components/ReportAbuseModal';
import { contentModeration } from '@/lib/contentModeration';
import { moderateImage } from '@/lib/imageModeration';
import { compressImage } from '@/lib/photoUpload';
import { coverRegions } from '@/lib/coverContactText';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { maskContactInfo, containsContactInfo, CONTACT_MASK_NOTICE } from '@/lib/maskContacts';
import { FEATURES } from '@/lib/config';
import { EXCLUSIVE_SEND_COST, EXCLUSIVE_UNLOCK_COST } from '@/lib/exclusivePricing';
import { setPendingCall } from '@/lib/callSignals';
import { sendMessageNotification } from '@/lib/emailNotifications';
import { useAuth } from '@/hooks/useAuth';
import { MessagingManager, CreditManager } from '@/lib/database';
import { supabaseClient } from '@/lib/supabase';
import { QuickGiftBar } from '@/components/QuickGiftBar';
import { GiftMessage, type GiftPayload } from '@/components/GiftMessage';


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
  // Set when this message IS a gift rather than text.
  gift?: GiftPayload | null;
  giftNote?: string | null;
  giftOpenedAt?: string | null;
  // Exclusive photos: `message` holds a storage path rather than a URL, and
  // `signedUrl` is only ever filled in for someone allowed to see it.
  isExclusive?: boolean;
  unlockCost?: number;
  unlocked?: boolean;
  signedUrl?: string | null;
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
  matched?: boolean;
}

// A conversation opens on its most recent messages, not its whole history.
const MESSAGE_PAGE_SIZE = 50;

// Exclusive photos are kept in a private bucket and the row carries only the
// storage path, so the lock is enforced by the storage policy rather than by
// what this component chooses to render. Both prices live in one module so
// chat and mail cannot quote different numbers for the same thing.
const EXCLUSIVE_BUCKET = 'chat-exclusive';

function LockedItem({ cost, senderName, exclusive, busy, onUnlock }: {
  cost: number;
  senderName: string;
  exclusive: boolean;
  busy: boolean;
  onUnlock: () => void;
}) {
  return (
    <div className="w-56 max-w-full">
      <div className="relative h-40 rounded-xl overflow-hidden bg-gradient-to-br from-fuchsia-300 via-pink-300 to-amber-200 dark:from-fuchsia-800 dark:via-pink-800 dark:to-amber-700">
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-md">
          <Lock className="w-9 h-9 text-white/90 drop-shadow" />
        </div>
        <span className="absolute top-2 left-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white">
          Exclusive
        </span>
      </div>
      <p className="mt-2 text-xs text-gray-600 dark:text-slate-300">
        {senderName} sent {exclusive ? 'an exclusive photo' : 'private mail'}.
      </p>
      <button
        type="button"
        onClick={onUnlock}
        disabled={busy}
        className="mt-2 w-full rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
      >
        {busy ? 'Opening...' : `${exclusive ? 'Unlock' : 'Open'} for ${cost} credits`}
      </button>
    </div>
  );
}

/**
 * Asks for signed URLs only for the exclusive photos this reader is entitled
 * to - the ones they sent, and the ones they have paid to unlock. Anything
 * else keeps a null URL and renders as the locked card. The storage policy
 * would refuse the rest anyway; this just avoids asking.
 */
async function resolveExclusive(messages: ChatMessage[], userId: string): Promise<ChatMessage[]> {
  const locked = messages.filter(m => m.isExclusive);
  if (locked.length === 0) return messages;

  const { data: unlocks } = await supabaseClient
    .from('message_unlocks')
    .select('message_id')
    .in('message_id', locked.map(m => m.id));

  const unlockedIds = new Set((unlocks || []).map((row: { message_id: string }) => row.message_id));
  const viewable = locked.filter(m => m.senderId === userId || unlockedIds.has(m.id));
  const signed: Record<string, string> = {};

  if (viewable.length > 0) {
    const { data } = await supabaseClient.storage
      .from(EXCLUSIVE_BUCKET)
      .createSignedUrls(viewable.map(m => m.message), 60 * 60);

    for (const entry of data || []) {
      if (entry.path && entry.signedUrl) signed[entry.path] = entry.signedUrl;
    }
  }

  return messages.map(m => m.isExclusive
    ? {
        ...m,
        unlocked: m.senderId === userId || unlockedIds.has(m.id),
        signedUrl: signed[m.message] ?? null,
      }
    : m);
}

const DEFAULT_AVATAR = 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=100';

// The 12 hardcoded gifts lived here. Gifts now come from virtual_gifts.

const EMOJIS = [
  '😊', '😍', '🥰', '😘', '💕', '❤️', '🔥', '✨',
  '🌹', '💖', '😉', '😎', '🤗', '💋', '🌟', '💫',
  '👍', '👎', '🤔', '😂', '😭', '🥺', '😴', '🤤',
  '☕', '🍕', '🍔', '🍷', '🎉', '🎊', '🎈', '🎁'
];

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
  const [showReportModal, setShowReportModal] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [exclusiveMode, setExclusiveMode] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [userProfileImage, setUserProfileImage] = useState('');
  const [defaultThreads, setDefaultThreads] = useState<ChatThread[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatThreadsRef = useRef<ChatThread[]>([]);
  const userProfileImageRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, profile } = useAuth();

  chatThreadsRef.current = chatThreads;
  userProfileImageRef.current = userProfileImage;

  // Chat is free. It used to bill 2 credits a minute for merely having a
  // thread open, then 10 credits a message after the first two - and the
  // homepage advertised "first message free" while charging for the rest,
  // which is a bad thing to be caught doing. Messages now cost nothing, and
  // the money is in photos, gifts, mail and calls instead. Still routed
  // through spend_message() server-side, which records the send at zero so
  // volume stays visible and older clients keep working.

  useEffect(() => {
    const loadCredits = async () => {
      if (user) {
        try {
          const credits = await CreditManager.getUserCredits(user.id);
          const total = (credits?.complimentary_credits || 0) + (credits?.purchased_credits || 0);
          setUserBalance(total);
        } catch (err) {
          console.error('Failed to load credits:', err);
        }
      }
    };

    loadCredits();
    const interval = setInterval(loadCredits, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (profile?.photo_url) {
      setUserProfileImage(profile.photo_url);
    }
  }, [profile]);

  useEffect(() => {
    const loadMailThreads = async () => {
      if (!user) return;

      try {
        const threads = await MessagingManager.getMailThreads(user.id);

        if (!threads || threads.length === 0) {
          setDefaultThreads([]);
          setChatThreads([]);
          return;
        }

        const otherUserIds = threads.map((thread: any) =>
          thread.participant1_id === user.id
            ? thread.participant2_id
            : thread.participant1_id
        );

        const { data: profiles } = await supabaseClient
          .from('user_profiles')
          .select('user_id, full_name, first_name, is_online')
          .in('user_id', otherUserIds);

        // Avatars live in user_photos, not on the profile row.
        const { data: avatarRows } = await supabaseClient
          .from('user_photos')
          .select('user_id, photo_url, is_primary')
          .in('user_id', otherUserIds)
          .order('is_primary', { ascending: false });

        const avatarByUser: Record<string, string> = {};
        for (const row of (avatarRows || []) as any[]) {
          if (row.user_id && row.photo_url && !avatarByUser[row.user_id]) {
            avatarByUser[row.user_id] = row.photo_url;
          }
        }

        // One aggregated row per thread rather than every message in every
        // thread. RLS still decides what counts - the function runs as the
        // caller, so it sees nothing they could not already read.
        const { data: allMessages } = await supabaseClient.rpc('thread_summaries');

        const profileMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p;
          return acc;
        }, {} as Record<string, any>);

        const messagesByThread = (allMessages || []).reduce((acc: Record<string, any>, row: any) => {
          acc[row.thread_id] = {
            latest: row.last_message
              ? { message_text: row.last_message, created_at: row.last_created_at }
              : null,
            unreadCount: Number(row.unread_count) || 0,
          };
          return acc;
        }, {} as Record<string, any>);

        // Mutual likes = a match. One query for the whole list rather than
        // one per thread.
        let matchedIds = new Set<string>();
        try {
          const { data: likeRows } = await supabaseClient
            .from('user_likes')
            .select('user_id, target_user_id')
            .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);
          const iLiked = new Set<string>();
          const likedMe = new Set<string>();
          for (const row of (likeRows || []) as any[]) {
            if (row.user_id === user.id) iLiked.add(row.target_user_id);
            if (row.target_user_id === user.id) likedMe.add(row.user_id);
          }
          matchedIds = new Set([...iLiked].filter(id => likedMe.has(id)));
        } catch (err) {
          console.warn('Could not resolve matches for threads:', err);
        }

        const loadedThreads: ChatThread[] = threads.map((thread: any) => {
          const otherUserId = thread.participant1_id === user.id
            ? thread.participant2_id
            : thread.participant1_id;

          const userProfile = profileMap[otherUserId];
          const threadMessages = messagesByThread[thread.id];

          if (!userProfile) return null;

          const displayName = userProfile.first_name || userProfile.full_name || 'User';
          const displayImage = avatarByUser[otherUserId] || DEFAULT_AVATAR;

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
              type: 'text' as const
            } : undefined,
            matched: matchedIds.has(otherUserId),
            unreadCount: threadMessages?.unreadCount || 0,
            isOnline: userProfile.is_online || false,
            isTyping: false
          };
        }).filter((thread): thread is NonNullable<typeof thread> => thread !== null);

        setDefaultThreads(loadedThreads);
        setChatThreads(loadedThreads);
      } catch (error) {
        console.error('Error loading mail threads:', error);
        setDefaultThreads([]);
        setChatThreads([]);
      }
    };

    loadMailThreads();
  }, [user]);

  useEffect(() => {
    if (!activeThread || !user) return;

    let cancelled = false;

    const loadMessages = async () => {
      try {
        // Most recent page only, newest-first for the limit then flipped back
        // to chronological order. A long thread used to arrive in full.
        const { data: messagePage, error } = await supabaseClient
          .from('mail_messages')
          .select('id, sender_id, message_text, created_at, is_read, is_delivered, thread_id, gift_note, gift_opened_at, is_exclusive, unlock_cost, virtual_gifts:gift_id ( id, name, icon, image_url, credit_cost )')
          .eq('thread_id', activeThread)
          .order('created_at', { ascending: false })
          .limit(MESSAGE_PAGE_SIZE);

        const messagesData = (messagePage || []).slice().reverse();
        setHasOlderMessages((messagePage || []).length === MESSAGE_PAGE_SIZE);

        if (error) throw error;
        if (cancelled) return;

        const otherSenderIds = [...new Set(
          (messagesData?.map(m => m.sender_id) || []).filter(id => id !== user.id)
        )];

        let profileLookup: Record<string, any> = {};
        let photoLookup: Record<string, string> = {};

        if (otherSenderIds.length > 0) {
          const [profilesResult, photosResult] = await Promise.all([
            supabaseClient
              .from('user_profiles')
              .select('user_id, first_name, full_name')
              .in('user_id', otherSenderIds),
            supabaseClient
              .from('user_photos')
              .select('user_id, photo_url')
              .in('user_id', otherSenderIds)
              .eq('is_primary', true)
          ]);

          profileLookup = (profilesResult.data || []).reduce((acc, p) => {
            acc[p.user_id] = p;
            return acc;
          }, {} as Record<string, any>);

          photoLookup = (photosResult.data || []).reduce((acc, p) => {
            acc[p.user_id] = p.photo_url;
            return acc;
          }, {} as Record<string, string>);
        }

        if (cancelled) return;

        const currentProfileImage = userProfileImageRef.current;

        const loadedMessages: ChatMessage[] = (messagesData || []).map(msg => {
          const isCurrentUser = msg.sender_id === user.id;
          const senderProfile = profileLookup[msg.sender_id];

          let senderName: string;
          let senderImage: string;

          if (isCurrentUser) {
            senderName = 'You';
            senderImage = currentProfileImage || photoLookup[user.id] || DEFAULT_AVATAR;
          } else {
            senderName = senderProfile?.first_name || senderProfile?.full_name || 'User';
            senderImage = senderProfile?.photo_url || photoLookup[msg.sender_id] || DEFAULT_AVATAR;
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
            isRead: msg.is_read ?? false,
            gift: (msg as any).virtual_gifts ?? null,
            giftNote: (msg as any).gift_note ?? null,
            giftOpenedAt: (msg as any).gift_opened_at ?? null,
            isExclusive: (msg as any).is_exclusive ?? false,
            unlockCost: (msg as any).unlock_cost ?? EXCLUSIVE_UNLOCK_COST,
            unlocked: isCurrentUser || ((msg as any).unlock_cost ?? 0) === 0,
            signedUrl: null
          };
        });

        const resolvedMessages = await resolveExclusive(loadedMessages, user.id);
        if (cancelled) return;

        setMessages(resolvedMessages);

        supabaseClient
          .from('mail_messages')
          .update({
            is_read: true,
            read_at: new Date().toISOString()
          })
          .eq('thread_id', activeThread)
          .eq('is_read', false)
          .neq('sender_id', user.id)
          .then(
            () => {},
            (err: unknown) => console.error('Failed to mark as read:', err)
          );

      } catch (error) {
        console.error('Failed to load messages:', error);
        if (!cancelled) setMessages([]);
      }
    };

    loadMessages();

    const channel = supabaseClient
      .channel(`chat-${activeThread}`)
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
          if (newMessage.sender_id !== user.id) {
            const currentThreads = chatThreadsRef.current;
            const activeThreadData = currentThreads.find(t => t.id === activeThread);

            setMessages(prev => {
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, {
                id: newMessage.id,
                senderId: newMessage.sender_id,
                senderName: activeThreadData?.participantName || 'User',
                senderImage: activeThreadData?.participantImage || DEFAULT_AVATAR,
                message: newMessage.message_text,
                timestamp: new Date(newMessage.created_at),
                type: 'text',
                isDelivered: true,
                isRead: false
              }];
            });
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
          setMessages(prev =>
            prev.map(msg =>
              msg.id === updatedMessage.id
                ? { ...msg, isRead: updatedMessage.is_read, isDelivered: updatedMessage.is_delivered }
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
          const typingData = payload.new as { user_id?: string; is_typing?: boolean } | null;
          if (typingData && typingData.user_id !== user.id) {
            setOtherUserTyping(typingData.is_typing ?? false);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabaseClient.removeChannel(channel);
    };
  }, [activeThread, user]);

  useEffect(() => {
    const initializeThread = async () => {
      if (selectedUserId && selectedUserName && selectedUserImage && user) {
        try {
          const { data: existingThread } = await supabaseClient
            .from('mail_threads')
            .select('id')
            .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${selectedUserId}),and(participant1_id.eq.${selectedUserId},participant2_id.eq.${user.id})`)
            .maybeSingle();

          let threadId: string;

          if (existingThread) {
            threadId = existingThread.id;
          } else {
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
          }

          setChatThreads(prev => {
            const exists = prev.find(t => t.participantId === selectedUserId);
            if (exists) {
              if (exists.id !== threadId) {
                return prev.map(t => t.participantId === selectedUserId ? { ...t, id: threadId } : t);
              }
              return prev;
            }

            return [{
              id: threadId,
              participantId: selectedUserId,
              participantName: selectedUserName,
              participantImage: selectedUserImage,
              unreadCount: 0,
              isOnline: true,
              isTyping: false
            }];
          });

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

  const totalUnread = chatThreads.reduce((sum, thread) => sum + thread.unreadCount, 0);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const updateTypingStatusRef = useRef<NodeJS.Timeout | null>(null);

  const updateTypingStatus = useCallback(async (typing: boolean) => {
    if (!activeThread || !user) return;

    if (updateTypingStatusRef.current) {
      clearTimeout(updateTypingStatusRef.current);
    }

    updateTypingStatusRef.current = setTimeout(async () => {
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
        // silently fail
      }
    }, 300);
  }, [activeThread, user]);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 3000);
  }, [isTyping, updateTypingStatus]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const currentThreads = chatThreadsRef.current;
    const activeThreadData = currentThreads.find(t => t.id === activeThread);
    if (!activeThreadData) return;

    if (!user) {
      alert('Please sign in to send messages');
      return;
    }

    // Rate limit before anything else. 10/minute, 500/day - enough that a real
    // conversation never notices, low enough that a script cannot blast every
    // member on the site. Fails open: a limiter outage must not block chat.
    try {
      const { data: limit } = await supabaseClient.rpc('check_and_update_rate_limit', {
        p_user_id: user.id,
        p_action_type: 'message',
        p_increment: true,
      });
      if (limit && limit.allowed === false) {
        if (limit.error_code === 'RATE_LIMIT_DAY') {
          // Name the number and, for a free account, say what raises it -
          // "try again tomorrow" leaves the user with no idea why or what to do.
          alert(
            limit.tier === 'free'
              ? `You've reached today's limit of ${limit.limit} messages. Subscribers get ${500} a day, or you can continue tomorrow.`
              : `You've reached today's limit of ${limit.limit} messages. Please try again tomorrow.`
          );
        } else {
          alert("You're sending messages too quickly. Please wait a moment.");
        }
        return;
      }
    } catch (error) {
      console.error('Rate limit check failed, allowing message:', error);
    }

    // Keyword-based screen for the categories we refuse outright. Fails open by
    // design (see contentModeration.scanText) so a moderation outage cannot
    // silently swallow ordinary messages.
    try {
      const verdict = await contentModeration.scanText(trimmed, user.id, 'message');
      if (verdict.shouldBlock) {
        alert(
          verdict.reason ||
            'This message cannot be sent because it appears to break our community rules.'
        );
        return;
      }
    } catch (error) {
      console.error('Message moderation failed, allowing message:', error);
    }

    // Still called, though it no longer charges: it writes the ledger row and
    // returns the balance. A failure here means the server rejected the send,
    // so it must stop rather than let the message through unrecorded.
    const charge = await creditManager.sendMessage(user.id, activeThreadData.id, trimmed);
    if (!charge.success) {
      alert(
        'Your message could not be sent. Please check your connection and try again.'
      );
      return;
    }
    setUserBalance(creditManager.getTotalCredits(user.id));

    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      senderName: 'You',
      senderImage: userProfileImageRef.current || DEFAULT_AVATAR,
      message: trimmed,
      timestamp: new Date(),
      type: 'text',
      isDelivered: false,
      isRead: false
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setMessage('');
    setShowEmojiPicker(false);

    setIsTyping(false);
    updateTypingStatus(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      const { data: savedMessage, error: messageError } = await supabaseClient
        .from('mail_messages')
        .insert({
          thread_id: activeThread,
          sender_id: user.id,
          subject: 'Chat Message',
          message_text: trimmed,
          credits_spent: charge.cost,
          has_photos: false,
          is_delivered: true,
          delivered_at: new Date().toISOString(),
          is_read: false
        })
        .select()
        .single();

      if (messageError) {
        console.error('Failed to save message:', messageError);
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        alert('Failed to send message. Please try again.');
        return;
      }

      setMessages(prev =>
        prev.map(m => m.id === optimisticMessage.id
          ? { ...m, id: savedMessage.id, isDelivered: true }
          : m
        )
      );

      setChatThreads(prev => prev.map(thread =>
        thread.id === activeThread
          ? { ...thread, lastMessage: { ...optimisticMessage, id: savedMessage.id, isDelivered: true }, unreadCount: 0 }
          : thread
      ));

      supabaseClient
        .from('mail_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeThread)
        .then(() => {}, () => {});

      Promise.resolve().then(() => {
        try {
          sendMessageNotification(activeThreadData.participantId, {
            name: 'You',
            image: userProfileImageRef.current,
            id: user.id
          });
        } catch {
          // silently fail
        }
      });

    } catch (error) {
      console.error('Message send error:', error);
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      alert('Failed to send message. Please try again.');
    }
  }, [message, activeThread, user, updateTypingStatus]);

  const addEmoji = useCallback((emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  // sendGift lived here; QuickGiftBar now charges and delivers.

  const handleFileUpload = useCallback((
    type: 'image' | 'video' | 'file',
    options: { exclusive?: boolean } = {}
  ) => {
    const activeThreadData = chatThreadsRef.current.find(t => t.id === activeThread);
    if (!activeThreadData) return;

    if (!user) {
      alert('Please sign in to send attachments');
      return;
    }

    const exclusive = type === 'image' && options.exclusive === true;
    const isStaff = creditManager.isStaffMember(user.id);

    let cost = 0;
    if (exclusive) cost = EXCLUSIVE_SEND_COST;
    else if (type === 'image') cost = 10;
    else if (type === 'video') cost = 60;
    else if (type === 'file') cost = 10;

    if (!isStaff && cost > 0) {
      if (!creditManager.canAfford(user.id, cost)) {
        alert(`Need ${formatCredits(cost)} to send ${type}!`);
        return;
      }
    }

    const input = document.createElement('input');
    input.type = 'file';
    if (type === 'image') input.accept = 'image/*';
    else if (type === 'video') input.accept = 'video/*';
    else input.accept = '*/*';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (file.size > 25 * 1024 * 1024) {
        alert('File is too large. Please choose a file under 25MB.');
        return;
      }

      const bucket = exclusive ? EXCLUSIVE_BUCKET : 'chat-media';
      let path = '';

      try {
        // Compress images before upload, as profile photos already are. Beyond
        // saving bandwidth this keeps them under Vision's 10MB inline limit -
        // a raw phone photo is routinely 5-12MB, and an oversized image comes
        // back unscanned, which defeats the moderation below.
        const isImage = type === 'image';
        let payload: Blob = isImage ? await compressImage(file) : file;
        const extension = isImage ? 'jpg' : file.name.split('.').pop() || 'bin';

        // First path segment is the sender's id: that is what the storage
        // policy on the private bucket checks.
        path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

        const put = (body: Blob) => supabaseClient.storage
          .from(bucket)
          .upload(path, body, {
            contentType: isImage ? 'image/jpeg' : file.type,
            upsert: true,
          });

        const discard = () => supabaseClient.storage.from(bucket).remove([path]);

        // Vision has to be able to fetch the bytes. Public media has a plain
        // URL; an exclusive photo sits in a private bucket, so it gets a short
        // signed one that only the sender could have asked for.
        const scanUrl = async (): Promise<string | null> => {
          if (!exclusive) {
            return supabaseClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;
          }
          const { data } = await supabaseClient.storage.from(bucket).createSignedUrl(path, 600);
          return data?.signedUrl ?? null;
        };

        const { error: uploadError } = await put(payload);
        if (uploadError) {
          console.error('Attachment upload failed:', uploadError);
          alert('Failed to upload attachment. Please try again.');
          return;
        }

        if (isImage) {
          let url = await scanUrl();
          if (!url) {
            await discard();
            alert('Could not prepare that photo for checking. Please try again.');
            return;
          }

          // Sending an explicit photo straight to someone is the other half of
          // the nudity problem - profile photos are only the public half.
          // Refused media is deleted rather than left addressable in the bucket.
          let verdict = await moderateImage(url, user.id, 'chat_media', { scanText: true });

          if (!verdict.allowed) {
            await discard();
            alert(verdict.reason ?? 'This image does not meet our content rules.');
            return;
          }

          // A phone number written on a notepad leaks exactly as a typed one
          // would, and the typed one is already masked. Paint over the words
          // Vision located, replace the stored file, then read it again: if
          // anything is still legible after covering, the photo does not go.
          if (verdict.textScan.found && verdict.textScan.boxes.length > 0) {
            const covered = await coverRegions(payload, verdict.textScan.boxes);
            const { error: coverError } = await put(covered);

            if (coverError) {
              await discard();
              alert('Could not hide the contact details in that photo. Please try again.');
              return;
            }

            payload = covered;
            url = await scanUrl();

            if (url) {
              verdict = await moderateImage(url, user.id, 'chat_media', { scanText: true });
            }

            if (verdict.textScan.found) {
              await discard();
              alert(
                'That photo has contact details written in it that could not be hidden. ' +
                'Phone numbers, emails and links cannot be shared here.'
              );
              return;
            }

            alert('Contact details written in that photo were covered before it was sent.');
          }
        }

        // Charged only once the photo has passed. Charging up front meant a
        // member paid for a picture that was then refused and never delivered.
        if (!isStaff && cost > 0) {
          const deducted = await creditManager.deductCredits(user.id, cost, `Sent ${type} attachment`);
          if (!deducted) {
            await discard();
            alert(`Could not send ${type} - insufficient credits.`);
            return;
          }
          setUserBalance(creditManager.getTotalCredits(user.id));
        }

        // Public media travels as a URL. An exclusive photo travels as its
        // storage path: both people in the thread can read the row, so a URL
        // sitting in it would undo the lock entirely.
        const stored = exclusive
          ? path
          : supabaseClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;

        const ownSignedUrl = exclusive ? await scanUrl() : null;

        const optimisticMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          senderId: user.id,
          senderName: 'You',
          senderImage: userProfileImageRef.current || DEFAULT_AVATAR,
          message: stored,
          timestamp: new Date(),
          type: 'text',
          isDelivered: false,
          isRead: false,
          isExclusive: exclusive,
          unlockCost: exclusive ? EXCLUSIVE_UNLOCK_COST : 0,
          unlocked: true,
          signedUrl: ownSignedUrl
        };
        setMessages(prev => [...prev, optimisticMessage]);

        const { data: savedMessage, error: messageError } = await supabaseClient
          .from('mail_messages')
          .insert({
            thread_id: activeThread,
            sender_id: user.id,
            subject: exclusive ? 'Exclusive Photo' : 'Chat Message',
            message_text: stored,
            credits_spent: cost,
            has_photos: type === 'image',
            is_exclusive: exclusive,
            unlock_cost: exclusive ? EXCLUSIVE_UNLOCK_COST : 0,
            is_delivered: true,
            delivered_at: new Date().toISOString(),
            is_read: false
          })
          .select()
          .single();

        if (messageError) {
          console.error('Failed to save attachment message:', messageError);
          setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
          alert('Attachment uploaded, but could not be sent. Please try again.');
          return;
        }

        setMessages(prev =>
          prev.map(m => m.id === optimisticMessage.id
            ? { ...m, id: savedMessage.id, isDelivered: true }
            : m
          )
        );
        setChatThreads(prev => prev.map(thread =>
          thread.id === activeThread
            ? { ...thread, lastMessage: { ...optimisticMessage, id: savedMessage.id, isDelivered: true }, unreadCount: 0 }
            : thread
        ));
      } catch (err) {
        console.error('Attachment send error:', err);
        alert('Failed to send attachment. Please try again.');
      }
    };
    input.click();
  }, [activeThread, user]);

  /**
   * Pays for one exclusive photo. The RPC is the only thing that can write an
   * unlock row, and it charges before it does, so a member cannot talk their
   * way past this from the console.
   */
  const handleUnlockMessage = useCallback(async (messageId: string, storagePath: string, exclusive: boolean) => {
    if (!user) return;

    setUnlockingId(messageId);
    try {
      const { data, error } = await supabaseClient.rpc('unlock_message', {
        p_message_id: messageId,
      });

      if (error || !data?.success) {
        const why = data?.error ?? (error as any)?.message;
        alert(why === 'insufficient_credits'
          ? 'You do not have enough credits to unlock this photo.'
          : 'Could not unlock this photo. Please try again.');
        return;
      }

      let signedUrl: string | null = null;
      if (exclusive) {
        const { data: signed } = await supabaseClient.storage
          .from(EXCLUSIVE_BUCKET)
          .createSignedUrl(storagePath, 60 * 60);
        signedUrl = signed?.signedUrl ?? null;
      }

      setMessages(prev => prev.map(m => m.id === messageId
        ? { ...m, unlocked: true, signedUrl }
        : m));

      if (typeof data.total_credits === 'number') {
        setUserBalance(data.total_credits);
      } else {
        setUserBalance(creditManager.getTotalCredits(user.id));
      }
    } catch (err) {
      console.error('Unlock failed:', err);
      alert('Could not unlock this photo. Please try again.');
    } finally {
      setUnlockingId(null);
    }
  }, [user]);

  const renderThreadList = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-pink-200 dark:border-night-700 bg-gradient-to-r from-pink-500 to-pink-400 text-white">
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

      <div className="p-3 bg-pink-50 dark:bg-night-900 border-b border-pink-200 dark:border-night-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-pink-700">Chat Balance:</span>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-pink-900">{formatCredits(userBalance)}</span>
          </div>
        </div>
        <p className="text-xs text-pink-600 mt-1">Chatting is free</p>
      </div>

      <div className="flex-1 overflow-y-auto bg-pink-50 dark:bg-night-900">
        {chatThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageCircle className="w-16 h-16 text-pink-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-300 mb-2">No Conversations Yet</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">Start chatting with someone to see your messages here!</p>
          </div>
        ) : (
          chatThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setActiveThread(thread.id)}
              className="w-full p-4 border-b border-pink-100 dark:border-night-700 hover:bg-pink-100 dark:hover:bg-night-700 transition-colors text-left cursor-pointer touch-manipulation active:scale-95"
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
                  }`} />
                  {thread.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-white text-xs font-bold">{thread.unreadCount > 9 ? '9+' : thread.unreadCount}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-slate-100 text-sm sm:text-base truncate">{thread.participantName}</h4>
                      {thread.matched && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-semibold flex-shrink-0">
                          <Heart className="w-2.5 h-2.5" fill="currentColor" />
                          Matched
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex-shrink-0 ml-2">
                      {thread.lastMessage?.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-xs sm:text-sm truncate",
                      thread.unreadCount > 0 ? 'font-semibold text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'
                    )}>
                      {thread.isTyping ? (
                        <span className="text-blue-500 italic">typing...</span>
                      ) : (
                        thread.lastMessage?.message || 'No messages yet'
                      )}
                    </p>
                    {thread.isOnline && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="p-3 border-t border-pink-200 dark:border-night-700 bg-pink-100 dark:bg-night-800">
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => onNavigate('video-chat')}
            className="flex items-center space-x-1 px-2 sm:px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors touch-manipulation active:scale-95"
          >
            <Video className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">Video</span>
          </button>
          {FEATURES.audioChat && (
            <button
              onClick={() => {
                // Carry the person through, so the voice screen dials them
                // rather than making you pick out of a list you just left.
                const peer = chatThreads.find(t => t.id === activeThread);
                if (peer) setPendingCall({ peerId: peer.participantId, peerName: peer.participantName });
                onNavigate('audio-chat');
              }}
              className="flex items-center space-x-1 px-2 sm:px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors touch-manipulation active:scale-95"
            >
              <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Voice</span>
            </button>
          )}
        </div>
        <p className="text-xs text-blue-600 mt-1">Chat: free | Mail: 10 credits | Super Like: 5 credits</p>
        <p className="text-xs text-green-600">FREE: Likes, Blinks, Messages</p>
      </div>
    </div>
  );

  const renderChatView = () => {
    const thread = chatThreads.find(t => t.id === activeThread);
    if (!thread) return null;

    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-pink-200 dark:border-night-700 bg-gradient-to-r from-pink-100 dark:from-night-800 to-pink-50 dark:to-night-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <button
                onClick={() => setActiveThread(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-night-700 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-lg">{thread.participantName}</h3>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigate('gift-shop')}
                className="relative p-2.5 hover:bg-gray-100 dark:hover:bg-night-700 rounded-lg transition-colors touch-manipulation active:scale-95 border border-gray-200 dark:border-night-700"
              >
                <Gift className="w-6 h-6 text-orange-500 flex-shrink-0" />
                <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
              </button>
              <button
                onClick={() => onNavigate('mail')}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-night-700 rounded-lg transition-colors touch-manipulation active:scale-95 border border-gray-200 dark:border-night-700"
              >
                <Mail className="w-6 h-6 text-orange-500 flex-shrink-0" />
              </button>
              {/* Was a dead three-dot button. Reporting is the one control a
                  user needs at the exact moment something goes wrong, and it
                  had no entry point anywhere in the app. */}
              <button
                onClick={() => setShowReportModal(true)}
                title={`Report ${thread.participantName}`}
                aria-label={`Report ${thread.participantName}`}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-night-700 rounded-lg transition-colors touch-manipulation active:scale-95 border border-gray-200 dark:border-night-700"
              >
                <Flag className="w-6 h-6 text-gray-600 dark:text-slate-400 flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-pink-100 dark:from-slate-900 to-pink-200 dark:via-purple-950 dark:to-slate-900">
          <div className="flex justify-center my-6">
            <div className="bg-pink-400/80 text-white px-6 py-2 rounded-full text-sm font-medium shadow-md">
              Today
            </div>
          </div>

          {hasOlderMessages && (
            <div className="flex justify-center pb-2">
              <button
                onClick={async () => {
                  if (!activeThread || messages.length === 0 || loadingOlder) return;
                  setLoadingOlder(true);
                  try {
                    const oldest = messages[0].timestamp.toISOString();
                    const thread = chatThreads.find((t: ChatThread) => t.id === activeThread);
                    const { data } = await supabaseClient
                      .from('mail_messages')
                      .select('id, sender_id, message_text, created_at, is_read, is_delivered, gift_note, gift_opened_at, virtual_gifts:gift_id ( id, name, icon, image_url, credit_cost )')
                      .eq('thread_id', activeThread)
                      .lt('created_at', oldest)
                      .order('created_at', { ascending: false })
                      .limit(MESSAGE_PAGE_SIZE);
                    const older: ChatMessage[] = (data || []).slice().reverse().map((m: any) => ({
                      id: m.id,
                      senderId: m.sender_id,
                      senderName: m.sender_id === user?.id ? 'You' : (thread?.participantName || 'User'),
                      senderImage: m.sender_id === user?.id
                        ? (profile?.photo_url || DEFAULT_AVATAR)
                        : (thread?.participantImage || DEFAULT_AVATAR),
                      message: m.message_text,
                      timestamp: new Date(m.created_at),
                      type: 'text',
                      isDelivered: m.is_delivered ?? true,
                      isRead: m.is_read ?? false,
                      gift: (m as any).virtual_gifts ?? null,
                      giftNote: (m as any).gift_note ?? null,
                      giftOpenedAt: (m as any).gift_opened_at ?? null,
                    }));
                    setHasOlderMessages((data || []).length === MESSAGE_PAGE_SIZE);
                    setMessages(prev => [...older, ...prev]);
                  } catch (err) {
                    console.error('Could not load earlier messages:', err);
                  } finally {
                    setLoadingOlder(false);
                  }
                }}
                disabled={loadingOlder}
                className="text-xs font-medium text-pink-600 dark:text-pink-300 bg-white/80 dark:bg-night-800 border border-pink-200 dark:border-night-700 rounded-full px-4 py-1.5 disabled:opacity-60"
              >
                {loadingOlder ? 'Loading…' : 'Load earlier messages'}
              </button>
            </div>
          )}
          {messages.map((msg) => {
            const isCurrentUser = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex items-end space-x-2 ${isCurrentUser ? 'justify-end flex-row-reverse space-x-reverse' : 'justify-start'}`}>
                <img
                  src={msg.senderImage || DEFAULT_AVATAR}
                  alt={msg.senderName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-md"
                />
                <div className="max-w-[75%]">
                  <div className="flex flex-col space-y-1">
                    {msg.gift ? (
                      <GiftMessage
                        messageId={msg.id}
                        gift={msg.gift}
                        note={msg.giftNote ?? null}
                        senderName={msg.senderName}
                        isMine={isCurrentUser}
                        openedAt={msg.giftOpenedAt ?? null}
                        onSendYours={() => onNavigate('gift-shop')}
                      />
                    ) : (
                    <div className={`rounded-2xl p-4 shadow-md ${
                      isCurrentUser
                        // Your own messages keep their pink identity in dark
                        // mode. Tinting them the same blue as the page made a
                        // conversation read as one flat block.
                        ? 'bg-gradient-to-br from-pink-200 dark:from-pink-600 to-pink-300 dark:to-pink-700 text-gray-800 dark:text-white border border-pink-400 dark:border-pink-500'
                        : 'bg-white dark:bg-night-800 text-gray-800 dark:text-slate-100 border border-pink-200 dark:border-night-700'
                    }`}>
                      {msg.unlocked === false ? (
                        <LockedItem
                          cost={msg.unlockCost ?? EXCLUSIVE_UNLOCK_COST}
                          senderName={msg.senderName}
                          exclusive={msg.isExclusive === true}
                          busy={unlockingId === msg.id}
                          onUnlock={() => handleUnlockMessage(msg.id, msg.message, msg.isExclusive === true)}
                        />
                      ) : msg.isExclusive && msg.signedUrl ? (
                        <div>
                          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            <Lock className="w-3 h-3" />
                            Exclusive
                          </div>
                          <ProtectedMedia
                            src={msg.signedUrl}
                            isOwnMedia={isCurrentUser}
                            senderName={msg.senderName}
                          />
                        </div>
                      ) : looksLikeImage(msg.message) ? (
                        <ProtectedMedia
                          src={msg.message}
                          isOwnMedia={isCurrentUser}
                          senderName={msg.senderName}
                        />
                      ) : (
                        <p className="text-base leading-relaxed whitespace-pre-wrap">
                          {maskContactInfo(msg.message)}
                        </p>
                      )}
                    </div>
                    )}
                    <div className={`flex items-center space-x-2 px-2 ${
                      isCurrentUser ? 'justify-end' : 'justify-start'
                    }`}>
                      <p className="text-xs text-gray-600 dark:text-slate-400">
                        {msg.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      {isCurrentUser && (
                        <div className="flex items-center">
                          {msg.isRead ? (
                            <svg className="w-4 h-4 text-blue-500" viewBox="0 0 20 20" fill="none">
                              <path d="M1 10l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M6 10l3 3 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : msg.isDelivered ? (
                            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none">
                              <path d="M3 10l4 4 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
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

          {otherUserTyping && (
            <div className="flex justify-start">
              <div className="flex items-end space-x-2">
                <img
                  src={thread.participantImage}
                  alt={thread.participantName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-md"
                />
                <div className="bg-white dark:bg-night-900 border border-pink-200 dark:border-night-700 rounded-2xl p-4 shadow-md">
                  <div className="flex space-x-1.5">
                    <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-pink-200 dark:border-night-700 bg-pink-50 dark:bg-night-900 flex-shrink-0">
          {showEmojiPicker && (
            <div className="mb-3 bg-white dark:bg-night-900 rounded-lg p-3 border border-pink-300 dark:border-night-600">
              <div className="grid grid-cols-8 gap-2">
                {EMOJIS.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => addEmoji(emoji)}
                    className="text-xl hover:bg-pink-100 dark:hover:bg-night-700 rounded p-1 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-1.5">
            <p className="flex-1 min-w-0 text-xs text-gray-400">
              {containsContactInfo(message) ? CONTACT_MASK_NOTICE + ' · ' : ''}
              Live chat is free, for everyone, with no daily limit · photos, gifts, mail and calls are the paid extras
            </p>
            <button
              type="button"
              onClick={() => setExclusiveMode(v => !v)}
              title={`Send the next photo locked: ${EXCLUSIVE_SEND_COST} credits to send, ${EXCLUSIVE_UNLOCK_COST} for them to open it.`}
              className={`flex flex-shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                exclusiveMode
                  ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-300'
                  : 'border-gray-300 text-gray-500 dark:border-night-600 dark:text-slate-400'
              }`}
            >
              <Lock className="w-3 h-3" />
              Exclusive
            </button>
          </div>

          <div className="flex w-full min-w-0 items-center space-x-2">
            <button
              onClick={() => handleFileUpload('image', { exclusive: exclusiveMode })}
              className="bg-pink-600 text-white p-3 rounded-full hover:bg-pink-700 transition-colors flex-shrink-0 touch-manipulation active:scale-95"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={() => setMessage('Hi')}
              className="bg-white dark:bg-night-900 text-pink-600 px-4 py-2 rounded-full border-2 border-pink-600 hover:bg-pink-50 dark:hover:bg-night-700 transition-colors flex-shrink-0 touch-manipulation active:scale-95 font-bold text-lg"
              type="button"
            >
              Hi
            </button>

            <div className="flex-1 min-w-0 relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message"
                className="w-full h-[48px] py-3 px-4 pr-12 rounded-full border-2 border-pink-300 dark:border-night-600 focus:border-pink-400 focus:outline-none text-base bg-white dark:bg-night-900"
                autoComplete="off"
              />
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-pink-400 hover:text-pink-600 transition-colors rounded-full hover:bg-pink-100 dark:hover:bg-night-700 touch-manipulation"
              >
                <Smile className="w-6 h-6 flex-shrink-0" />
              </button>
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="bg-pink-500 text-white p-4 rounded-full hover:bg-pink-600 transition-all duration-300 hover:scale-105 active:scale-95 touch-manipulation flex-shrink-0 cursor-pointer"
              type="button"
            >
              <Send className="w-6 h-6 flex-shrink-0" />
            </Button>
          </div>
        </div>

        {/* Was six hand-written buttons whose emoji and price did not match the
            gift they sent: the first showed 2500 and charged 5 for a Red Rose,
            and two different-looking buttons sent the same item. This is the
            catalogue-driven bar, so what is shown is what is charged. */}
        {activeThread && (
          <QuickGiftBar
            threadId={activeThread}
            recipientName={chatThreads.find((t: ChatThread) => t.id === activeThread)?.participantName || 'them'}
            onSent={() => { /* it returns as a package on the next load */ }}
            onOpenShop={() => onNavigate('gift-shop')}
          />
        )}

        {user && (
          <ReportAbuseModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            reportedUserId={thread.participantId}
            reportedUserName={thread.participantName}
            contextType="message"
            contextId={thread.id}
            reporterId={user.id}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
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

      {isOpen && (
        <div
          className={cn(
            "fixed z-[9999]",
            "bottom-[90px] sm:bottom-[100px] md:bottom-[110px] lg:bottom-[120px]",
            "left-1/2 transform -translate-x-1/2",
            "w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[420px] xl:w-[480px]",
            "max-w-[600px]",
            "h-[60vh] sm:h-[65vh] md:h-[70vh] lg:h-[500px]",
            "bg-pink-50 dark:bg-night-900 rounded-2xl shadow-2xl border-2 border-pink-400 overflow-hidden",
            "animate-slide-up pointer-events-auto"
          )}
        >
          {activeThread ? renderChatView() : renderThreadList()}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { QuickNavBar } from '@/components/QuickNavBar';
import { MissedCallsNotice } from '@/components/MissedCallsNotice';
import { QuickGiftBar } from '@/components/QuickGiftBar';
import { GiftMessage, type GiftPayload } from '@/components/GiftMessage';
import { StickerPicker } from '@/components/StickerPicker';
import { Button } from '@/components/ui/button';
import {
  MessageCircle, Mail as MailIcon, User, Users,
  Newspaper, MessageSquare, CreditCard, ArrowLeft, Send,
  Smile, Gift, X, Image as ImageIcon, Camera, Lock
} from 'lucide-react';
import { ProtectedMedia, looksLikeImage } from '@/components/ProtectedMedia';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';
import { MessagingManager } from '@/lib/database';
import { creditManager } from '@/lib/creditSystem';
import { maskContactInfo } from '@/lib/maskContacts';
import { uploadScreenedImage } from '@/lib/screenedUpload';
import { compressImage } from '@/lib/photoUpload';
import { EXCLUSIVE_SEND_COST, EXCLUSIVE_UNLOCK_COST } from '@/lib/exclusivePricing';
import { sendMessageNotification } from '@/lib/emailNotifications';
import { cn } from '@/lib/utils';

// A conversation opens on its most recent messages, not its entire history.
// Loading every message meant a long thread sent megabytes over mobile data
// before the first bubble appeared.
const MESSAGE_PAGE_SIZE = 50;

// This screen is the chat members actually use. MessageChatBox is a second
// implementation of the same conversation, and photo sending was built there -
// which is why there was no camera here at all. Anything that costs money has
// to exist in both, or in neither.
const PHOTO_COST = 10;
const EXCLUSIVE_BUCKET = 'chat-exclusive';
const PUBLIC_CHAT_BUCKET = 'chat-media';

/**
 * Fills in signed URLs for the locked photos this reader is entitled to - the
 * ones they sent, and the ones they have paid for. Everything else keeps a
 * null URL and renders as the locked card. The storage policy would refuse the
 * rest anyway; this just avoids asking.
 */
async function resolveLocked(list: ChatMessage[], userId: string): Promise<ChatMessage[]> {
  const locked = list.filter(m => m.isExclusive);
  if (locked.length === 0) return list;

  const { data: unlocks } = await supabaseClient
    .from('message_unlocks')
    .select('message_id')
    .in('message_id', locked.map(m => m.id));

  const paid = new Set((unlocks || []).map((u: { message_id: string }) => u.message_id));
  const viewable = locked.filter(m => m.senderId === userId || paid.has(m.id));
  const signed: Record<string, string> = {};

  if (viewable.length > 0) {
    const { data } = await supabaseClient.storage
      .from(EXCLUSIVE_BUCKET)
      .createSignedUrls(viewable.map(m => m.message), 60 * 60);
    for (const entry of data || []) {
      if (entry.path && entry.signedUrl) signed[entry.path] = entry.signedUrl;
    }
  }

  return list.map(m => m.isExclusive
    ? { ...m, unlocked: m.senderId === userId || paid.has(m.id), signedUrl: signed[m.message] ?? null }
    : m);
}

const DEFAULT_AVATAR = 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=100';

const EMOJIS = [
  '😊', '😍', '🥰', '😘', '💕', '❤️', '🔥', '✨',
  '🌹', '💖', '😉', '😎', '🤗', '💋', '🌟', '💫',
  '👍', '👎', '🤔', '😂', '😭', '🥺', '😴', '🤤',
  '☕', '🍕', '🍔', '🍷', '🎉', '🎊', '🎈', '🎁'
];

const QUICK_MESSAGES = [
  'Do you like sports?',
  'Do you collect anything?',
  'Do you like black tea?',
  'Cable TV or Netflix? :)',
  'What is your life credo?',
  'Are you a family person?',
  'Words have power. Do you agree?',
  'Are you happy here?',
  'What do you do for fun?',
  'Do you have any hobbies?',
  'What kind of music do you like?',
  'Are you a morning or night person?',
  'What\'s your favorite cuisine?',
  'Do you like traveling?'
];

interface SelectedChatUser {
  id: string;
  name: string;
  image: string;
}

interface ChatThread {
  id: string;
  participantId: string;
  participantName: string;
  participantImage: string;
  participantAge: number;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  isVerified: boolean;
  hasMessages: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImage: string;
  message: string;
  timestamp: Date;
  isDelivered?: boolean;
  isRead?: boolean;
  replyToId?: string | null;
  // Set when this message IS a gift rather than text.
  gift?: GiftPayload | null;
  // A sticker renders large and on its own, not inside a bubble.
  stickerEmoji?: string | null;
  stickerImage?: string | null;
  giftNote?: string | null;
  giftOpenedAt?: string | null;
  // A locked photo: `message` holds a storage path, and signedUrl is only
  // filled in for someone entitled to see it.
  isExclusive?: boolean;
  unlockCost?: number;
  unlocked?: boolean;
  signedUrl?: string | null;
}

interface MatchesProps {
  onNavigate: (screen: string, params?: { userId?: string }) => void;
  onSelectChatUser?: (user: SelectedChatUser | null) => void;
  /** Arriving from "Message" on a profile: open this conversation directly. */
  initialRecipientId?: string | null;
}

export const Matches: React.FC<MatchesProps> = ({ onNavigate, initialRecipientId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadFilter, setThreadFilter] = useState<'active' | 'requests'>('active');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  // The message this one is answering. mail_messages already had a
  // reply_to_message_id column - nothing had ever written to it.
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [exclusiveMode, setExclusiveMode] = useState(false);
  const [sendingPhoto, setSendingPhoto] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, profile } = useAuth();

  const userProfileImage = profile?.photo_url || DEFAULT_AVATAR;

  useEffect(() => {
    if (user) {
      loadThreads();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Opens one conversation straight away when the member arrived by pressing
   * "Message" on a profile, rather than showing them a list they then have to
   * search. The threads are loaded first: renderChat looks the thread up by id
   * and sends the member back to the list if it cannot find it, so selecting
   * before the list exists would bounce them straight out again.
   */
  useEffect(() => {
    if (!user || !initialRecipientId || initialRecipientId === user.id) return;

    let cancelled = false;
    (async () => {
      try {
        const threadId = await MessagingManager.getOrCreateThread(user.id, initialRecipientId);
        await loadThreads();
        if (!cancelled) setSelectedThread(threadId);
      } catch (err) {
        console.error('Could not open that conversation:', err);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, initialRecipientId]);

  const loadThreads = async () => {
    if (!user) return;
    try {
      const threadData = await MessagingManager.getMailThreads(user.id);

      if (!threadData || threadData.length === 0) {
        setThreads([]);
        setIsLoading(false);
        return;
      }

      const otherUserIds = threadData.map((t: any) =>
        t.participant1_id === user.id ? t.participant2_id : t.participant1_id
      );

      const [profilesRes, photosRes, messagesRes] = await Promise.all([
        supabaseClient
          .from('user_profiles')
          .select('user_id, full_name, first_name, age, is_verified, is_online')
          .in('user_id', otherUserIds),
        supabaseClient
          .from('user_photos')
          .select('user_id, photo_url')
          .in('user_id', otherUserIds)
          .eq('is_primary', true),
        // One aggregated row per thread instead of every message in every
        // thread. RLS still decides what counts - the function runs as the
        // caller, so it can only see what they could already read.
        supabaseClient.rpc('thread_summaries')
      ]);

      const profileMap = (profilesRes.data || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, any>);

      const photoMap = (photosRes.data || []).reduce((acc, p) => {
        acc[p.user_id] = p.photo_url;
        return acc;
      }, {} as Record<string, string>);

      const messagesByThread = (messagesRes.data || []).reduce((acc: Record<string, any>, row: any) => {
        acc[row.thread_id] = {
          latest: row.last_message
            ? { message_text: row.last_message, created_at: row.last_created_at }
            : null,
          unreadCount: Number(row.unread_count) || 0,
        };
        return acc;
      }, {} as Record<string, any>);

      const formatted: ChatThread[] = threadData.map((thread: any) => {
        const otherUserId = thread.participant1_id === user.id
          ? thread.participant2_id : thread.participant1_id;
        const p = profileMap[otherUserId];
        const photo = photoMap[otherUserId];
        const threadMsgs = messagesByThread[thread.id];

        if (!p) return null;

        return {
          id: thread.id,
          participantId: otherUserId,
          participantName: p?.first_name || p?.full_name || 'User',
          participantImage: photo || p?.photo_url || DEFAULT_AVATAR,
          participantAge: p?.age || 25,
          lastMessage: threadMsgs?.latest?.message_text || 'Start a conversation...',
          timestamp: threadMsgs?.latest?.created_at || thread.created_at,
          unreadCount: threadMsgs?.unreadCount || 0,
          isOnline: p?.is_online || false,
          isVerified: p?.is_verified || false,
          hasMessages: !!threadMsgs?.latest,
        };
      }).filter((t): t is ChatThread => t !== null);

      setThreads(formatted);
    } catch (error) {
      console.error('Error loading threads:', error);
      setThreads([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedThread || !user) return;
    let cancelled = false;

    const loadMessages = async () => {
      try {
        // Newest first so the limit takes the most recent page, then flipped
        // back to chronological order for display.
        const { data: page, error } = await supabaseClient
          .from('mail_messages')
          .select('id, sender_id, message_text, created_at, is_read, is_delivered, reply_to_message_id, gift_id, gift_note, gift_opened_at, is_exclusive, unlock_cost, virtual_gifts:gift_id ( id, name, icon, image_url, credit_cost ), stickers:sticker_id ( emoji, image_url )')
          .eq('thread_id', selectedThread)
          .in('subject', ['Chat Message', 'Gift', 'Sticker'])
          .order('created_at', { ascending: false })
          .limit(MESSAGE_PAGE_SIZE);

        const data = (page || []).slice().reverse();
        setHasOlderMessages((page || []).length === MESSAGE_PAGE_SIZE);

        if (error) throw error;
        if (cancelled) return;

        const senderIds = [...new Set((data || []).map(m => m.sender_id).filter(id => id !== user.id))];
        let profileLookup: Record<string, any> = {};
        let photoLookup: Record<string, string> = {};

        if (senderIds.length > 0) {
          const [pRes, phRes] = await Promise.all([
            supabaseClient.from('user_profiles').select('user_id, first_name, full_name').in('user_id', senderIds),
            supabaseClient.from('user_photos').select('user_id, photo_url').in('user_id', senderIds).eq('is_primary', true)
          ]);
          profileLookup = (pRes.data || []).reduce((acc, p) => { acc[p.user_id] = p; return acc; }, {} as Record<string, any>);
          photoLookup = (phRes.data || []).reduce((acc, p) => { acc[p.user_id] = p.photo_url; return acc; }, {} as Record<string, string>);
        }

        if (cancelled) return;

        const loaded: ChatMessage[] = (data || []).map(msg => {
          const isMe = msg.sender_id === user.id;
          const sp = profileLookup[msg.sender_id];
          return {
            id: msg.id,
            senderId: msg.sender_id,
            senderName: isMe ? 'You' : (sp?.first_name || sp?.full_name || 'User'),
            senderImage: isMe ? userProfileImage : (sp?.photo_url || photoLookup[msg.sender_id] || DEFAULT_AVATAR),
            message: msg.message_text,
            timestamp: new Date(msg.created_at),
            isDelivered: msg.is_delivered ?? true,
            isRead: msg.is_read ?? false,
            replyToId: msg.reply_to_message_id ?? null,
            gift: (msg as any).virtual_gifts ?? null,
            giftNote: (msg as any).gift_note ?? null,
            giftOpenedAt: (msg as any).gift_opened_at ?? null,
            stickerEmoji: (msg as any).stickers?.emoji ?? null,
            stickerImage: (msg as any).stickers?.image_url ?? null,
            isExclusive: (msg as any).is_exclusive === true,
            unlockCost: (msg as any).unlock_cost ?? EXCLUSIVE_UNLOCK_COST,
            unlocked: isMe || ((msg as any).unlock_cost ?? 0) === 0,
            signedUrl: null,
          };
        });

        const resolved = await resolveLocked(loaded, user.id);
        if (cancelled) return;

        setMessages(resolved);

        supabaseClient
          .from('mail_messages')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('thread_id', selectedThread)
          .eq('is_read', false)
          .neq('sender_id', user.id)
          .then(() => {}, () => {});
      } catch (error) {
        console.error('Failed to load messages:', error);
        if (!cancelled) setMessages([]);
      }
    };

    loadMessages();

    const channel = supabaseClient
      .channel(`chat-${selectedThread}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mail_messages',
        filter: `thread_id=eq.${selectedThread}`
      }, (payload) => {
        const msg = payload.new;
        if (msg.sender_id !== user.id) {
          const thread = threads.find(t => t.id === selectedThread);
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, {
              id: msg.id, senderId: msg.sender_id,
              senderName: thread?.participantName || 'User',
              senderImage: thread?.participantImage || DEFAULT_AVATAR,
              message: msg.message_text, timestamp: new Date(msg.created_at),
              isDelivered: true, isRead: false,
              replyToId: msg.reply_to_message_id ?? null,
              isExclusive: msg.is_exclusive === true,
              unlockCost: msg.unlock_cost ?? EXCLUSIVE_UNLOCK_COST,
              unlocked: (msg.unlock_cost ?? 0) === 0,
              signedUrl: null
            }];
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'mail_messages',
        filter: `thread_id=eq.${selectedThread}`
      }, (payload) => {
        const updated = payload.new;
        setMessages(prev => prev.map(m =>
          m.id === updated.id ? { ...m, isRead: updated.is_read, isDelivered: updated.is_delivered } : m
        ));
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'typing_indicators',
        filter: `thread_id=eq.${selectedThread}`
      }, (payload) => {
        const d = payload.new as { user_id?: string; is_typing?: boolean } | null;
        if (d && d.user_id !== user.id) setOtherUserTyping(d.is_typing ?? false);
      })
      .subscribe();

    return () => { cancelled = true; supabaseClient.removeChannel(channel); };
  }, [selectedThread, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /** Fetch the page of messages just before the oldest one on screen. */
  const loadOlderMessages = useCallback(async () => {
    if (!user || !selectedThread || messages.length === 0 || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const oldest = messages[0].timestamp.toISOString();
      const thread = threads.find(t => t.id === selectedThread);

      const { data, error } = await supabaseClient
        .from('mail_messages')
        .select('id, sender_id, message_text, created_at, is_read, is_delivered, reply_to_message_id, gift_id, gift_note, gift_opened_at, is_exclusive, unlock_cost, virtual_gifts:gift_id ( id, name, icon, image_url, credit_cost ), stickers:sticker_id ( emoji, image_url )')
        .eq('thread_id', selectedThread)
        .in('subject', ['Chat Message', 'Gift', 'Sticker'])
        .lt('created_at', oldest)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_PAGE_SIZE);

      if (error) throw error;

      const older: ChatMessage[] = (data || []).slice().reverse().map(msg => {
        const isMe = msg.sender_id === user.id;
        return {
          id: msg.id,
          senderId: msg.sender_id,
          senderName: isMe ? 'You' : (thread?.participantName || 'User'),
          senderImage: isMe ? userProfileImage : (thread?.participantImage || DEFAULT_AVATAR),
          message: msg.message_text,
          timestamp: new Date(msg.created_at),
          isDelivered: msg.is_delivered ?? true,
          isRead: msg.is_read ?? false,
          replyToId: msg.reply_to_message_id ?? null,
          gift: (msg as any).virtual_gifts ?? null,
          giftNote: (msg as any).gift_note ?? null,
          giftOpenedAt: (msg as any).gift_opened_at ?? null,
          isExclusive: (msg as any).is_exclusive === true,
          unlockCost: (msg as any).unlock_cost ?? EXCLUSIVE_UNLOCK_COST,
          unlocked: isMe || ((msg as any).unlock_cost ?? 0) === 0,
          signedUrl: null,
        };
      });

      setHasOlderMessages((data || []).length === MESSAGE_PAGE_SIZE);
      const olderResolved = await resolveLocked(older, user.id);
      setMessages(prev => [...olderResolved, ...prev]);
    } catch (err) {
      console.error('Could not load earlier messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [user, selectedThread, messages, threads, userProfileImage, loadingOlder]);
  /**
   * Sends one photo. It goes through uploadScreenedImage first, so nudity is
   * refused and a phone number written on paper is painted over, and it is
   * only charged for once it has passed - a refused photo used to take the
   * credits anyway.
   */
  const handleSendPhoto = useCallback((source: 'library' | 'camera') => {
    if (!user || !selectedThread) return;

    const exclusive = exclusiveMode;
    const cost = exclusive ? EXCLUSIVE_SEND_COST : PHOTO_COST;
    const isStaff = creditManager.isStaffMember(user.id);

    if (!isStaff && !creditManager.canAfford(user.id, cost)) {
      alert(`You need ${cost} credits to send ${exclusive ? 'an exclusive photo' : 'a photo'}.`);
      onNavigate('credits');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.setAttribute('capture', 'environment');

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) {
        alert('That photo is too large. Please choose one under 25MB.');
        return;
      }

      setSendingPhoto(true);
      const bucket = exclusive ? EXCLUSIVE_BUCKET : PUBLIC_CHAT_BUCKET;
      let path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

      try {
        const payload = await compressImage(file);

        const screened = await uploadScreenedImage({
          bucket, path, blob: payload, userId: user.id, isPublicBucket: !exclusive,
        });

        if (!screened.ok) {
          alert(screened.error ?? 'That photo could not be sent.');
          return;
        }
        if (screened.notice) alert(screened.notice);
        // Covering writes a new file and deletes the original.
        path = screened.path ?? path;

        if (!isStaff && cost > 0) {
          const paid = await creditManager.deductCredits(user.id, cost, 'Sent photo');
          if (!paid) {
            await supabaseClient.storage.from(bucket).remove([path]);
            alert('Could not send that photo - insufficient credits.');
            return;
          }
        }

        // A public photo travels as a URL. A locked one travels as its storage
        // path, because both people can read the row.
        const stored = exclusive
          ? path
          : supabaseClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;

        const signedUrl = exclusive
          ? (await supabaseClient.storage.from(bucket).createSignedUrl(path, 60 * 60)).data?.signedUrl ?? null
          : null;

        const optimistic: ChatMessage = {
          id: `temp-${Date.now()}`, senderId: user.id, senderName: 'You',
          senderImage: userProfileImage, message: stored, timestamp: new Date(),
          isDelivered: false, isRead: false, replyToId: null,
          isExclusive: exclusive,
          unlockCost: exclusive ? EXCLUSIVE_UNLOCK_COST : 0,
          unlocked: true,
          signedUrl,
        };
        setMessages(prev => [...prev, optimistic]);
        setExclusiveMode(false);

        const { data: saved, error } = await supabaseClient
          .from('mail_messages')
          .insert({
            thread_id: selectedThread, sender_id: user.id,
            subject: 'Chat Message', message_text: stored,
            credits_spent: cost, has_photos: true,
            is_exclusive: exclusive,
            unlock_cost: exclusive ? EXCLUSIVE_UNLOCK_COST : 0,
            is_delivered: true, delivered_at: new Date().toISOString(), is_read: false,
          })
          .select().single();

        if (error) {
          console.error('Could not save photo message:', error);
          setMessages(prev => prev.filter(m => m.id !== optimistic.id));
          alert('The photo uploaded, but could not be sent. Please try again.');
          return;
        }

        setMessages(prev => prev.map(m =>
          m.id === optimistic.id ? { ...m, id: saved.id, isDelivered: true } : m
        ));
      } catch (err) {
        console.error('Photo send failed:', err);
        alert('Could not send that photo. Please try again.');
      } finally {
        setSendingPhoto(false);
      }
    };

    input.click();
  }, [user, selectedThread, exclusiveMode, userProfileImage, onNavigate]);

  /**
   * Pays for one locked photo. unlock_message() charges before it records
   * anything, and the unlock row is what the storage policy consults.
   */
  const handleUnlockPhoto = useCallback(async (messageId: string, storagePath: string) => {
    if (!user) return;
    setUnlockingId(messageId);
    try {
      const { data, error } = await supabaseClient.rpc('unlock_message', { p_message_id: messageId });

      if (error || !data?.success) {
        const why = data?.error ?? (error as any)?.message;
        alert(why === 'insufficient_credits'
          ? 'You do not have enough credits to unlock this photo.'
          : 'Could not unlock this photo. Please try again.');
        return;
      }

      const { data: signed } = await supabaseClient.storage
        .from(EXCLUSIVE_BUCKET)
        .createSignedUrl(storagePath, 60 * 60);

      setMessages(prev => prev.map(m => m.id === messageId
        ? { ...m, unlocked: true, signedUrl: signed?.signedUrl ?? null }
        : m));
    } catch (err) {
      console.error('Unlock failed:', err);
      alert('Could not unlock this photo. Please try again.');
    } finally {
      setUnlockingId(null);
    }
  }, [user]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !user || !selectedThread) return;

    const thread = threads.find(t => t.id === selectedThread);
    if (!thread) return;

    // This screen has its own chat implementation. It must charge on the same
    // terms as MessageChatBox - otherwise it is simply the free way to chat and
    // the pricing means nothing. First 2 messages per thread free, subscribers
    // free, 10 credits after that; enforced server-side in spend_message().
    const charge = await creditManager.sendMessage(user.id, selectedThread, trimmed);
    if (!charge.success) {
      alert(
        'Your message could not be sent. Please check your connection and try again.'
      );
      onNavigate('credits');
      return;
    }

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`, senderId: user.id, senderName: 'You',
      senderImage: userProfileImage, message: trimmed, timestamp: new Date(),
      isDelivered: false, isRead: false, replyToId: replyingTo?.id ?? null,
      unlocked: true
    };

    setMessages(prev => [...prev, optimistic]);
    setMessageText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);

    try {
      const { data: saved, error } = await supabaseClient
        .from('mail_messages')
        .insert({
          thread_id: selectedThread, sender_id: user.id,
          subject: 'Chat Message', message_text: trimmed,
          reply_to_message_id: replyingTo?.id ?? null,
          credits_spent: charge.cost, has_photos: false, is_delivered: true,
          delivered_at: new Date().toISOString(), is_read: false
        })
        .select().single();

      if (error) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        alert('Failed to send message. Please try again.');
        return;
      }

      setMessages(prev => prev.map(m =>
        m.id === optimistic.id ? { ...m, id: saved.id, isDelivered: true } : m
      ));

      supabaseClient.from('mail_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedThread).then(() => {}, () => {});

      try { sendMessageNotification(thread.participantId, { name: 'You', image: userProfileImage, id: user.id }); } catch {}
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      alert('Failed to send message. Please try again.');
    }
  }, [messageText, selectedThread, user, userProfileImage, threads, replyingTo]);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (selectedThread) {
    const thread = threads.find(t => t.id === selectedThread);
    if (!thread) { setSelectedThread(null); return null; }

    return (
      <PageTransition direction="slide-left">
        <div className="min-h-screen bg-gradient-to-b from-pink-50 to-pink-100 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 flex flex-col max-h-screen h-screen">
          <div className="bg-gradient-to-r from-pink-100 dark:from-night-800 to-pink-50 dark:to-night-800 border-b border-pink-200 dark:border-night-700 px-3 py-3 flex items-center gap-3 safe-area-inset-top flex-shrink-0">
            <button
              onClick={() => { setSelectedThread(null); setMessages([]); setShowEmojiPicker(false); loadThreads(); }}
              className="p-1.5 hover:bg-pink-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-slate-300" />
            </button>
            <div className="relative cursor-pointer" onClick={() => onNavigate('view-profile', { userId: thread.participantId })}>
              <img src={thread.participantImage} alt={thread.participantName}
                className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm" />
              {thread.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 dark:text-slate-100 text-base truncate">{thread.participantName}</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {otherUserTyping ? <span className="text-pink-500 font-medium">typing...</span> : thread.isOnline ? 'Online' : `Age ${thread.participantAge}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onNavigate('gift-shop')} className="relative p-2 hover:bg-pink-200 rounded-lg transition-colors border border-pink-200 dark:border-night-700">
                <Gift className="w-5 h-5 text-orange-500" />
                <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button onClick={() => onNavigate('mail')} className="p-2 hover:bg-pink-200 rounded-lg transition-colors border border-pink-200 dark:border-night-700">
                <MailIcon className="w-5 h-5 text-orange-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <div className="flex justify-center my-4">
              <div className="bg-pink-400/70 text-white px-5 py-1.5 rounded-full text-xs font-medium shadow">Today</div>
            </div>

            {hasOlderMessages && (
              <div className="flex justify-center pb-2">
                <button
                  onClick={loadOlderMessages}
                  disabled={loadingOlder}
                  className="text-xs font-medium text-pink-600 dark:text-pink-300 bg-white/80 dark:bg-night-800 border border-pink-200 dark:border-night-700 rounded-full px-4 py-1.5 disabled:opacity-60"
                >
                  {loadingOlder ? 'Loading…' : 'Load earlier messages'}
                </button>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={cn("flex items-end gap-2", isMe ? 'justify-end' : 'justify-start')}>
                  {!isMe && <img src={msg.senderImage || DEFAULT_AVATAR} alt={msg.senderName} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow flex-shrink-0" />}
                  <div className="max-w-[75%]">
                    {/* A gift is a package to unwrap, not a sentence in a bubble. */}
                    {/* A sticker is the message: large, unboxed, no bubble. */}
                    {msg.stickerEmoji || msg.stickerImage ? (
                      msg.stickerImage ? (
                        <>
                          <img
                            src={msg.stickerImage}
                            alt=""
                            className="w-28 h-28 object-contain"
                            onError={(e) => {
                              // Missing artwork reveals the emoji instead of an
                              // empty frame. Both render; one starts hidden, so
                              // there is actually something to reveal.
                              const img = e.currentTarget;
                              img.style.display = 'none';
                              const next = img.nextElementSibling as HTMLElement | null;
                              if (next) next.style.display = 'block';
                            }}
                          />
                          <span className="text-6xl leading-none" style={{ display: 'none' }}>
                            {msg.stickerEmoji}
                          </span>
                        </>
                      ) : (
                        <span className="text-6xl leading-none">{msg.stickerEmoji}</span>
                      )
                    ) : msg.gift ? (
                      <GiftMessage
                        messageId={msg.id}
                        gift={msg.gift}
                        note={msg.giftNote ?? null}
                        senderName={msg.senderName}
                        isMine={isMe}
                        openedAt={msg.giftOpenedAt ?? null}
                        onSendYours={() => onNavigate('gift-shop')}
                      />
                    ) : (
                    <div className={cn("rounded-2xl px-4 py-3 shadow-sm", isMe ? 'bg-gradient-to-br from-pink-400 to-pink-500 text-white' : 'bg-white dark:bg-night-800 text-gray-800 dark:text-slate-100 border border-pink-100 dark:border-night-700')}>
                      {/* Quoted original, so a reply arriving long after the
                          message it answers still makes sense in context. */}
                      {msg.replyToId && (() => {
                        const quoted = messages.find((m) => m.id === msg.replyToId);
                        return (
                          <div className={cn(
                            "mb-2 border-l-2 pl-2 py-0.5 rounded-sm text-xs",
                            isMe ? 'border-white/70 bg-white/15 text-white/90' : 'border-pink-400 bg-pink-50 dark:bg-night-700 text-gray-600 dark:text-slate-300'
                          )}>
                            <p className="font-medium truncate">{quoted ? quoted.senderName : 'Message'}</p>
                            <p className="truncate">{quoted ? quoted.message : 'Original message unavailable'}</p>
                          </div>
                        );
                      })()}
                      {msg.unlocked === false ? (
                        <div className="w-52 max-w-full">
                          <div className="relative h-32 overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-300 via-pink-300 to-amber-200">
                            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-md">
                              <Lock className="w-8 h-8 text-white/90 drop-shadow" />
                            </div>
                            <span className="absolute left-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white">
                              Exclusive
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnlockPhoto(msg.id, msg.message)}
                            disabled={unlockingId === msg.id}
                            className="mt-2 w-full rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                          >
                            {unlockingId === msg.id ? 'Unlocking...' : `Unlock for ${msg.unlockCost ?? EXCLUSIVE_UNLOCK_COST} credits`}
                          </button>
                        </div>
                      ) : msg.isExclusive && msg.signedUrl ? (
                        <div>
                          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            <Lock className="w-3 h-3" />
                            Exclusive
                          </div>
                          <ProtectedMedia src={msg.signedUrl} isOwnMedia={isMe} senderName={msg.senderName} />
                        </div>
                      ) : looksLikeImage(msg.message) ? (
                        <ProtectedMedia src={msg.message} isOwnMedia={isMe} senderName={msg.senderName} />
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {maskContactInfo(msg.message)}
                        </p>
                      )}
                    </div>
                    )}
                    <div className={cn("flex items-center gap-1.5 px-1 mt-1", isMe ? 'justify-end' : 'justify-start')}>
                      <button
                        onClick={() => setReplyingTo(msg)}
                        aria-label="Reply to this message"
                        className="text-[11px] text-pink-500 hover:text-pink-600 dark:text-pink-300 font-medium"
                      >
                        Reply
                      </button>
                      <span className="text-[11px] text-gray-500 dark:text-slate-400">{msg.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                      {isMe && (
                        msg.isRead ? (
                          <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 20 20" fill="none"><path d="M1 10l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 10l3 3 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ) : msg.isDelivered ? (
                          <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 20 20" fill="none"><path d="M3 10l4 4 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-gray-300 animate-pulse" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2"/></svg>
                        )
                      )}
                    </div>
                  </div>
                  {isMe && <img src={msg.senderImage || DEFAULT_AVATAR} alt="You" className="w-8 h-8 rounded-full object-cover border-2 border-white shadow flex-shrink-0" />}
                </div>
              );
            })}

            {otherUserTyping && (
              <div className="flex items-end gap-2">
                <img src={thread.participantImage} alt={thread.participantName} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow flex-shrink-0" />
                <div className="bg-white dark:bg-night-800 border border-pink-100 dark:border-night-700 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {showEmojiPicker && (
            <div className="bg-white dark:bg-night-900 border-t border-pink-200 dark:border-night-700 px-3 py-2 flex-shrink-0">
              <div className="grid grid-cols-8 gap-1.5">
                {EMOJIS.map((emoji, i) => (
                  <button key={i} onClick={() => { setMessageText(prev => prev + emoji); setShowEmojiPicker(false); }}
                    className="text-xl hover:bg-pink-100 dark:hover:bg-night-700 rounded p-1.5 transition-colors text-center">{emoji}</button>
                ))}
              </div>
            </div>
          )}

          {showQuickMessages && (
            <div className="bg-white dark:bg-night-900 border-t border-pink-200 dark:border-night-700 px-3 py-3 flex-shrink-0 max-h-[40vh] overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {QUICK_MESSAGES.map((msg, i) => (
                  <button key={i} onClick={() => { setMessageText(msg); setShowQuickMessages(false); inputRef.current?.focus(); }}
                    className="px-3 py-2 bg-gray-100 dark:bg-night-800 hover:bg-gray-200 text-gray-800 dark:text-slate-200 rounded-full text-sm transition-colors active:scale-95">
                    {msg}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showStickers && selectedThread && (
            <StickerPicker
              threadId={selectedThread}
              onClose={() => setShowStickers(false)}
              onSent={(sticker) => {
                if (!user) return;
                setMessages(prev => [...prev, {
                  id: `sticker-${Date.now()}`,
                  senderId: user.id,
                  senderName: 'You',
                  senderImage: userProfileImage,
                  message: sticker.emoji || sticker.name,
                  timestamp: new Date(),
                  isDelivered: true,
                  isRead: false,
                  replyToId: null,
                  unlocked: true,
                  stickerEmoji: sticker.emoji,
                  stickerImage: sticker.image_url,
                }]);
              }}
            />
          )}

          {/* Gifts within reach of the message box. Sending one used to mean
              leaving the conversation for the shop. */}
          {selectedThread && (
            <QuickGiftBar
              threadId={selectedThread}
              recipientName={threads.find(t => t.id === selectedThread)?.participantName || 'them'}
              onSent={(text, gift) => {
                if (!user) return;
                setMessages(prev => [...prev, {
                  id: `gift-${Date.now()}`,
                  senderId: user.id,
                  senderName: 'You',
                  senderImage: userProfileImage,
                  message: text,
                  timestamp: new Date(),
                  isDelivered: true,
                  isRead: false,
                  replyToId: null,
                  unlocked: true,
                  // Render as the package it is. It always came back as a gift
                  // on the next load; it just looked like typed text until then.
                  gift: gift as GiftPayload,
                  giftNote: null,
                  giftOpenedAt: null,
                }]);
              }}
              onOpenShop={() => onNavigate('gift-shop')}
            />
          )}
          <div className="bg-pink-50 dark:bg-night-900 border-t border-pink-200 dark:border-night-700 px-3 pt-2 flex flex-col gap-1.5 safe-area-inset-bottom flex-shrink-0">
            {replyingTo && (
              <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-night-800 border-l-4 border-pink-400 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-pink-600 dark:text-pink-300">
                    Replying to {replyingTo.senderName}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-300 truncate">
                    {replyingTo.message}
                  </p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  aria-label="Cancel reply"
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <p className="flex-1 min-w-0 text-xs text-gray-400">
                Live chat is free, for everyone, with no daily limit · photos, gifts, mail and calls are the paid extras
              </p>
              <button
                type="button"
                onClick={() => setExclusiveMode(v => !v)}
                title={`Send the next photo locked: ${EXCLUSIVE_SEND_COST} credits to send, ${EXCLUSIVE_UNLOCK_COST} for them to open it.`}
                className={cn(
                  "flex flex-shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  exclusiveMode
                    ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-300"
                    : "border-gray-300 text-gray-500 dark:border-night-600 dark:text-slate-400"
                )}
              >
                <Lock className="w-3 h-3" />
                Exclusive
              </button>
            </div>
            <div className="flex w-full min-w-0 items-center gap-2 pb-3">
            <button
              onClick={() => handleSendPhoto('library')}
              disabled={sendingPhoto}
              aria-label="Send a photo"
              className="text-pink-500 hover:text-pink-600 disabled:opacity-40 flex-shrink-0 p-1.5 active:scale-95"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleSendPhoto('camera')}
              disabled={sendingPhoto}
              aria-label="Take a photo"
              className="text-pink-500 hover:text-pink-600 disabled:opacity-40 flex-shrink-0 p-1.5 active:scale-95"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button onClick={() => { setShowQuickMessages(!showQuickMessages); setShowEmojiPicker(false); }}
              className="bg-white dark:bg-night-900 text-pink-600 px-3 py-2 rounded-full border-2 border-pink-400 hover:bg-pink-50 dark:hover:bg-night-700 transition-colors flex-shrink-0 font-bold text-sm active:scale-95">
              Hi
            </button>
            <div className="flex-1 relative flex items-center">
              <input ref={inputRef} type="text" value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); }}}
                placeholder="Type your message..."
                className="w-full h-[44px] py-2 px-4 pr-10 rounded-full border-2 border-pink-300 focus:border-pink-500 focus:outline-none text-sm bg-white dark:bg-night-900"
                autoComplete="off" />
              <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowQuickMessages(false); }}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600">
                <Smile className="w-5 h-5" />
              </button>
              {/* Stickers are a paid expression, so they get their own control
                  rather than hiding inside the free emoji tray. */}
              <button onClick={() => { setShowStickers(!showStickers); setShowEmojiPicker(false); setShowQuickMessages(false); }}
                aria-label="Stickers"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600 text-lg leading-none">
                🏷️
              </button>
            </div>
            <Button onClick={handleSendMessage} disabled={!messageText.trim()}
              className="bg-pink-500 text-white p-3 rounded-full hover:bg-pink-600 transition-all active:scale-95 flex-shrink-0 disabled:opacity-40">
              <Send className="w-5 h-5" />
            </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition direction="slide-left">
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 overflow-x-hidden">
        <div className="w-full max-w-xs sm:max-w-md mx-auto min-h-screen relative">
          <div className="bg-white/95 dark:bg-night-900/95 backdrop-blur-sm shadow-sm border-b border-white/20 dark:border-night-700 px-3 sm:px-4 py-2 sm:py-3 safe-area-inset-top">
            <div className="flex items-center justify-between">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">Chat</h1>
              <div className="flex items-center space-x-2">
                <button onClick={() => onNavigate('mail')}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors active:scale-95">
                  <MailIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </button>
                <button onClick={() => onNavigate('credits')}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors active:scale-95">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </button>
                <button onClick={() => onNavigate('profile')}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors active:scale-95">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          <QuickNavBar onNavigate={onNavigate} activeScreen="matches" />
<MissedCallsNotice onNavigate={onNavigate} />

          <div className="flex-1 overflow-y-auto pb-20">
            {isLoading ? (
              <div className="p-3 sm:p-4"><LoadingSkeleton type="message-list" count={5} /></div>
            ) : threads.length === 0 ? (
              <EmptyState icon={MessageCircle} title="Your love story begins here!"
                description="Start discovering incredible people who share your values and interests."
                actionText="Start Discovering" onAction={() => onNavigate('discovery')} />
            ) : (
              <div className="bg-white/90 dark:bg-night-900/90 backdrop-blur-sm py-2 px-3 sm:px-4 border-t border-white/20 dark:border-night-700">
                {/* Active / Requests — separates ongoing conversations from
                    new mutual matches nobody has messaged yet, so a full
                    inbox doesn't bury the matches still waiting for a
                    first hello. */}
                <div className="flex gap-1 px-1 py-2">
                  {(['active', 'requests'] as const).map((tab) => {
                    const count = threads.filter((t) =>
                      tab === 'active' ? t.hasMessages : !t.hasMessages
                    ).length;
                    return (
                      <button
                        key={tab}
                        onClick={() => setThreadFilter(tab)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          threadFilter === tab
                            ? 'bg-rose-500 text-white'
                            : 'bg-gray-100 dark:bg-night-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200'
                        }`}
                        type="button"
                      >
                        {tab === 'active' ? 'Active' : 'New Matches'}
                        {count > 0 && ` (${count})`}
                      </button>
                    );
                  })}
                </div>
                {threads.filter((t) => (threadFilter === 'active' ? t.hasMessages : !t.hasMessages)).length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm">
                    {threadFilter === 'active'
                      ? "No conversations yet — say hello to a new match!"
                      : 'No new matches waiting for a first message.'}
                  </div>
                ) : (
                  threads
                    .filter((t) => (threadFilter === 'active' ? t.hasMessages : !t.hasMessages))
                    .map((thread) => (
                  <button key={thread.id} onClick={() => setSelectedThread(thread.id)}
                    className="w-full py-3 px-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 dark:hover:bg-night-700 transition-all rounded-lg text-left active:scale-[0.98]">
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); onNavigate('view-profile', { userId: thread.participantId }); }}>
                        <img src={thread.participantImage} alt={thread.participantName}
                          className="w-11 h-11 rounded-full object-cover hover:ring-2 hover:ring-pink-400 transition-all" />
                        {thread.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <h4 className={cn("font-medium text-sm truncate", thread.unreadCount > 0 ? 'text-gray-900 dark:text-slate-100' : 'text-gray-700 dark:text-slate-300')}>
                              {thread.participantName}, {thread.participantAge}
                            </h4>
                            {thread.isVerified && (
                              <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            {thread.unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">{thread.unreadCount}</span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-500 dark:text-slate-400 flex-shrink-0">{formatTimestamp(thread.timestamp)}</span>
                        </div>
                        <p className={cn("text-xs truncate", thread.unreadCount > 0 ? 'font-medium text-gray-900 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400')}>
                          {thread.lastMessage}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
                )}
              </div>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 w-full max-w-xs sm:max-w-md mx-auto bg-white/95 dark:bg-night-900/95 backdrop-blur-sm border-t border-white/20 dark:border-night-700 shadow-lg safe-area-inset-bottom">
            <div className="flex justify-around py-1.5 px-1">
              {[
                { id: 'search', icon: Users, label: 'Search', screen: 'discovery' },
                { id: 'chat', icon: MessageCircle, label: 'Chat', screen: 'matches', active: true },
                { id: 'mail', icon: MailIcon, label: 'Mail', screen: 'mail' },
                { id: 'newsfeed', icon: Newspaper, label: 'Newsfeed', screen: 'newsfeed' },
                { id: 'feedback', icon: MessageSquare, label: 'Feedback', screen: 'feedback' },
                { id: 'people', icon: User, label: 'People', screen: 'discovery' }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => { if (!tab.active) onNavigate(tab.screen); }}
                    className={cn("flex flex-col items-center py-1 px-1.5 rounded-lg transition-all active:scale-95 min-w-0",
                      tab.active ? 'text-pink-600' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200')}>
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] mt-0.5 font-medium hidden sm:block">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

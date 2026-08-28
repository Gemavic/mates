import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { QuickNavBar } from '@/components/QuickNavBar';
import { MissedCallsNotice } from '@/components/MissedCallsNotice';
import { Button } from '@/components/ui/button';
import {
  MessageCircle, Mail as MailIcon, User, Users,
  Newspaper, MessageSquare, CreditCard, ArrowLeft, Send,
  Smile, Gift, X
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';
import { MessagingManager } from '@/lib/database';
import { creditManager } from '@/lib/creditSystem';
import { sendMessageNotification } from '@/lib/emailNotifications';
import { cn } from '@/lib/utils';

// A conversation opens on its most recent messages, not its entire history.
// Loading every message meant a long thread sent megabytes over mobile data
// before the first bubble appeared.
const MESSAGE_PAGE_SIZE = 50;

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
}

interface MatchesProps {
  onNavigate: (screen: string, params?: { userId?: string }) => void;
  onSelectChatUser?: (user: SelectedChatUser | null) => void;
}

export const Matches: React.FC<MatchesProps> = ({ onNavigate }) => {
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
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
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
          .select('id, sender_id, message_text, created_at, is_read, is_delivered, reply_to_message_id')
          .eq('thread_id', selectedThread)
          .eq('subject', 'Chat Message')
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
          };
        });

        setMessages(loaded);

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
              replyToId: msg.reply_to_message_id ?? null
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
        .select('id, sender_id, message_text, created_at, is_read, is_delivered, reply_to_message_id')
        .eq('thread_id', selectedThread)
        .eq('subject', 'Chat Message')
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
        };
      });

      setHasOlderMessages((data || []).length === MESSAGE_PAGE_SIZE);
      setMessages(prev => [...older, ...prev]);
    } catch (err) {
      console.error('Could not load earlier messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [user, selectedThread, messages, threads, userProfileImage, loadingOlder]);
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
        `You need ${charge.cost} credits to send this message. Your first 2 messages in each conversation are free.`
      );
      onNavigate('credits');
      return;
    }

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`, senderId: user.id, senderName: 'You',
      senderImage: userProfileImage, message: trimmed, timestamp: new Date(),
      isDelivered: false, isRead: false, replyToId: replyingTo?.id ?? null
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
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                    </div>
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
            <p className="text-xs text-gray-400 text-center">
              Live chat: first 2 messages in each conversation are free, then 10 credits per message · reading is always free · included free with any subscription
            </p>
            <div className="flex items-center gap-2 pb-3">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600">
                <Smile className="w-5 h-5" />
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

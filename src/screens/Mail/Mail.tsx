import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Mail as MailIcon, Send, Search, ArrowLeft, Image, Camera, File, X, Lock, Star, Paperclip, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { MessagingManager } from '@/lib/database';
import { creditManager } from '@/lib/creditSystem';
import { supabaseClient } from '@/lib/supabase';

interface MailProps {
  onNavigate: (screen: string) => void;
}

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  preview?: string;
}

interface MailThread {
  id: string;
  participantId: string;
  participantName: string;
  participantAge: number;
  participantImage: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isVerified: boolean;
  isOnline: boolean;
}

interface MailMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImage: string;
  subject: string;
  message: string;
  timestamp: string;
  hasPhotos: boolean;
  isRead: boolean;
  isExclusive: boolean;
  attachments?: AttachedFile[];
}

const DEFAULT_AVATAR = 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=100';

export const Mail: React.FC<MailProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'exclusive'>('inbox');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [subjectText, setSubjectText] = useState('');
  const [isExclusive, setIsExclusive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [, setShowAttachmentMenu] = useState(false);
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState(0);
  const [mailThreads, setMailThreads] = useState<MailThread[]>([]);
  const [currentMessages, setCurrentMessages] = useState<MailMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setAttachedFiles([]);
    setShowAttachmentMenu(false);
    setMessageText('');
    setSubjectText('');
    setIsExclusive(false);
    setComposing(false);
  }, [selectedThread]);

  useEffect(() => {
    const loadCredits = async () => {
      if (user) {
        try {
          creditManager.initializeUser(user.id);
          setUserBalance(creditManager.getTotalCredits(user.id));
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
    if (user) loadMailThreads();
  }, [user]);

  const loadMailThreads = async () => {
    if (!user) return;
    try {
      const threads = await MessagingManager.getMailThreads(user.id);
      if (!threads || threads.length === 0) { setMailThreads([]); return; }

      const otherUserIds = threads.map((t: any) =>
        t.participant1_id === user.id ? t.participant2_id : t.participant1_id
      );
      const threadIds = threads.map((t: any) => t.id);

      const [profilesRes, photosRes, messagesRes] = await Promise.all([
        supabaseClient.from('user_profiles')
          .select('user_id, full_name, first_name, age, is_verified, is_online')
          .in('user_id', otherUserIds),
        supabaseClient.from('user_photos')
          .select('user_id, photo_url')
          .in('user_id', otherUserIds)
          .eq('is_primary', true),
        supabaseClient.from('mail_messages')
          .select('thread_id, message_text, created_at, is_read, sender_id, subject')
          .in('thread_id', threadIds)
          .neq('subject', 'Chat Message')
          .order('created_at', { ascending: false })
      ]);

      const profileMap = (profilesRes.data || []).reduce((acc, p) => {
        acc[p.user_id] = p; return acc;
      }, {} as Record<string, any>);

      const photoMap = (photosRes.data || []).reduce((acc, p) => {
        acc[p.user_id] = p.photo_url; return acc;
      }, {} as Record<string, string>);

      const messagesByThread = (messagesRes.data || []).reduce((acc, msg) => {
        if (!acc[msg.thread_id]) acc[msg.thread_id] = { latest: msg, unreadCount: 0 };
        if (!msg.is_read && msg.sender_id !== user.id) acc[msg.thread_id].unreadCount++;
        return acc;
      }, {} as Record<string, any>);

      const formatted: MailThread[] = threads.map((thread: any) => {
        const otherUserId = thread.participant1_id === user.id ? thread.participant2_id : thread.participant1_id;
        const p = profileMap[otherUserId];
        const photo = photoMap[otherUserId];
        const msgs = messagesByThread[thread.id];
        if (!p) return null;
        return {
          id: thread.id, participantId: otherUserId,
          participantName: p?.first_name || p?.full_name || 'User',
          participantAge: p?.age || 25,
          participantImage: photo || p?.photo_url || DEFAULT_AVATAR,
          lastMessage: msgs?.latest?.message_text || 'No messages yet',
          timestamp: msgs?.latest?.created_at || thread.created_at,
          unreadCount: msgs?.unreadCount || 0,
          isVerified: p?.is_verified || false,
          isOnline: p?.is_online || false
        };
      }).filter((t): t is MailThread => t !== null);

      setMailThreads(formatted);
    } catch (error) {
      console.error('Failed to load mail threads:', error);
      setMailThreads([]);
    }
  };

  useEffect(() => {
    if (selectedThread && user) loadThreadMessages(selectedThread);
  }, [selectedThread, user]);

  const loadThreadMessages = async (threadId: string) => {
    if (!user) return;
    try {
      const { data: messages, error } = await supabaseClient
        .from('mail_messages')
        .select('*')
        .eq('thread_id', threadId)
        .neq('subject', 'Chat Message')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      const [profilesRes, photosRes] = await Promise.all([
        supabaseClient.from('user_profiles').select('user_id, first_name, full_name').in('user_id', senderIds),
        supabaseClient.from('user_photos').select('user_id, photo_url').in('user_id', senderIds).eq('is_primary', true)
      ]);

      const profileMap = (profilesRes.data || []).reduce((acc, p) => { acc[p.user_id] = p; return acc; }, {} as Record<string, any>);
      const photoMap = (photosRes.data || []).reduce((acc, p) => { acc[p.user_id] = p.photo_url; return acc; }, {} as Record<string, string>);

      const formatted: MailMessage[] = messages.map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        senderName: profileMap[msg.sender_id]?.first_name || profileMap[msg.sender_id]?.full_name || 'User',
        senderImage: photoMap[msg.sender_id] || DEFAULT_AVATAR,
        subject: msg.subject || '',
        message: msg.message_text,
        timestamp: new Date(msg.created_at).toLocaleString(),
        hasPhotos: msg.has_photos || false,
        isRead: msg.is_read || false,
        isExclusive: msg.subject?.includes('Exclusive') || false
      }));

      setCurrentMessages(formatted);

      await supabaseClient
        .from('mail_messages')
        .update({ is_read: true })
        .eq('thread_id', threadId)
        .neq('sender_id', user.id);

      await loadMailThreads();
    } catch (error) {
      console.error('Failed to load messages:', error);
      setCurrentMessages([]);
    }
  };

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && attachedFiles.length === 0) return;
    if (!user || !selectedThread) return;

    try {
      let totalCost = 10;
      if (attachedFiles.length > 0) totalCost += attachedFiles.length * 10;
      if (isExclusive) totalCost += 20;

      if (!creditManager.canAfford(user.id, totalCost) && !creditManager.isStaffMember(user.id)) {
        alert(`Insufficient credits! Need ${totalCost} credits. You have ${creditManager.getTotalCredits(user.id)}.`);
        onNavigate('credits');
        return;
      }

      const deducted = await creditManager.deductCredits(
        user.id,
        totalCost,
        isExclusive ? 'Exclusive mail' : 'Private mail'
      );
      if (!deducted) {
        alert('Credit deduction failed. Please try again.');
        return;
      }

      setUserBalance(creditManager.getTotalCredits(user.id));

      const subject = isExclusive ? 'Exclusive Private Mail' : (subjectText.trim() || 'Private Mail');

      const { data: currentProfile } = await supabaseClient
        .from('user_profiles').select('first_name, full_name').eq('user_id', user.id).single();
      const { data: currentPhoto } = await supabaseClient
        .from('user_photos').select('photo_url').eq('user_id', user.id).eq('is_primary', true).single();

      const optimistic: MailMessage = {
        id: `temp-${Date.now()}`, senderId: user.id,
        senderName: currentProfile?.first_name || currentProfile?.full_name || 'You',
        senderImage: currentPhoto?.photo_url || DEFAULT_AVATAR,
        subject, message: messageText.trim() || 'Sent attachments',
        timestamp: new Date().toLocaleString(),
        hasPhotos: attachedFiles.length > 0, isRead: false, isExclusive
      };

      setCurrentMessages(prev => [...prev, optimistic]);
      const savedText = messageText.trim();
      setMessageText('');
      setSubjectText('');
      setAttachedFiles([]);
      setShowAttachmentMenu(false);
      setIsExclusive(false);
      setComposing(false);

      const { data: saved, error } = await supabaseClient
        .from('mail_messages')
        .insert({
          thread_id: selectedThread, sender_id: user.id,
          subject, message_text: savedText || 'Sent attachments',
          credits_spent: totalCost, has_photos: attachedFiles.length > 0,
          is_delivered: true, delivered_at: new Date().toISOString(), is_read: false
        })
        .select().single();

      if (error) {
        setCurrentMessages(prev => prev.filter(m => m.id !== optimistic.id));
        alert('Failed to send mail.');
        return;
      }

      setCurrentMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, id: saved.id } : m));
      await supabaseClient.from('mail_threads').update({ updated_at: new Date().toISOString() }).eq('id', selectedThread);
      await loadMailThreads();

      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50 shadow-lg';
      toast.textContent = `Mail sent! (-${totalCost} credits)`;
      document.body.appendChild(toast);
      setTimeout(() => { if (document.body.contains(toast)) document.body.removeChild(toast); }, 3000);
    } catch (error: any) {
      alert(`Failed to send mail: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleFileUpload = (type: 'image' | 'camera' | 'file') => {
    if (!user) { alert('Please sign in to upload files'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    if (type === 'image') { input.accept = 'image/*'; input.multiple = true; }
    else if (type === 'camera') { input.accept = 'image/*'; input.setAttribute('capture', 'environment'); }
    else { input.accept = '*/*'; input.multiple = true; }

    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      files.forEach(file => {
        setAttachedFiles(prev => [...prev, {
          id: Math.random().toString(36).substring(2),
          name: file.name, size: file.size, type: file.type,
          url: URL.createObjectURL(file),
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        }]);
      });
      setShowAttachmentMenu(false);
    };
    input.click();
  };

  const removeAttachment = (fileId: string) => {
    setAttachedFiles(prev => {
      const f = prev.find(x => x.id === fileId);
      if (f?.url) URL.revokeObjectURL(f.url);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter(x => x.id !== fileId);
    });
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const activeThreadData = mailThreads.find(t => t.id === selectedThread);
  const filteredThreads = mailThreads.filter(t =>
    t.participantName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedThread && activeThreadData) {
    return (
      <PageTransition direction="slide-left">
        <div className="min-h-screen bg-gray-50 flex flex-col max-h-screen h-screen">
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setSelectedThread(null)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="relative">
              <img src={activeThreadData.participantImage} alt={activeThreadData.participantName}
                className="w-10 h-10 rounded-full object-cover" />
              {activeThreadData.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">{activeThreadData.participantName}</h2>
                {activeThreadData.isVerified && (
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-gray-500">{activeThreadData.isOnline ? 'Online' : `Age ${activeThreadData.participantAge}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-gray-500">Balance</p>
                <p className="text-sm font-bold text-green-600">{userBalance}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {currentMessages.map((msg) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={cn("flex gap-3", isMe ? 'justify-end' : 'justify-start')}>
                  {!isMe && (
                    <img src={msg.senderImage} alt={msg.senderName} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  )}
                  <div className={cn("max-w-[75%]", isMe ? 'items-end' : 'items-start')}>
                    {msg.isExclusive && (
                      <div className="flex items-center gap-1 mb-1 px-1">
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] font-medium text-amber-600">Exclusive Mail</span>
                      </div>
                    )}
                    {msg.subject && msg.subject !== 'Chat Message' && msg.subject !== 'Mail Message' && (
                      <p className={cn("text-[11px] font-medium mb-0.5 px-1", isMe ? 'text-right text-blue-400' : 'text-gray-500')}>
                        {msg.subject}
                      </p>
                    )}
                    <div className={cn(
                      "rounded-2xl px-4 py-3 shadow-sm",
                      msg.isExclusive
                        ? (isMe ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' : 'bg-gradient-to-br from-amber-50 to-amber-100 text-gray-800 border border-amber-200')
                        : (isMe ? 'bg-blue-500 text-white' : 'bg-white text-gray-800 border border-gray-100')
                    )}>
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      {msg.hasPhotos && (
                        <div className="mt-2 flex items-center gap-1 text-xs opacity-70">
                          <Image className="w-3 h-3" />
                          <span>Photo attached</span>
                        </div>
                      )}
                    </div>
                    <div className={cn("flex items-center gap-1.5 px-1 mt-1", isMe ? 'justify-end' : 'justify-start')}>
                      <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                      {isMe && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                    </div>
                  </div>
                  {isMe && (
                    <img src={msg.senderImage} alt="You" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {!composing ? (
            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
              <button
                onClick={() => setComposing(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Send className="w-4 h-4" />
                Compose Private Mail
              </button>
              <div className="flex items-center justify-center gap-4 mt-3">
                <span className="text-xs text-gray-400">Mail: 10 credits</span>
                <span className="text-xs text-gray-400">Photo: +10 credits</span>
                <span className="text-xs text-amber-500 font-medium">Exclusive: +20 credits</span>
              </div>
            </div>
          ) : (
            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-800 text-sm">Compose Mail</h3>
                <button onClick={() => { setComposing(false); setAttachedFiles([]); setMessageText(''); setSubjectText(''); }}
                  className="p-1 hover:bg-gray-100 rounded-full"><X className="w-4 h-4 text-gray-500" /></button>
              </div>

              <Input
                value={subjectText}
                onChange={(e) => setSubjectText(e.target.value)}
                placeholder="Subject (optional)"
                className="text-sm border-gray-200"
              />

              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Write your private mail..."
                className="min-h-[80px] max-h-[150px] resize-none text-sm border-gray-200"
                rows={3}
              />

              {attachedFiles.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {attachedFiles.map(file => (
                    <div key={file.id} className="relative flex-shrink-0">
                      {file.preview ? (
                        <img src={file.preview} alt={file.name} className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 rounded-lg flex flex-col items-center justify-center border border-gray-200">
                          <File className="w-5 h-5 text-gray-400" />
                          <span className="text-[8px] text-gray-400 mt-0.5 truncate max-w-[50px]">{file.name}</span>
                        </div>
                      )}
                      <button onClick={() => removeAttachment(file.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow">
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => handleFileUpload('image')}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="Attach photo">
                    <Image className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleFileUpload('camera')}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="Take photo">
                    <Camera className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleFileUpload('file')}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="Attach file">
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={() => setIsExclusive(!isExclusive)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                    isExclusive
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-amber-300'
                  )}
                >
                  <Lock className="w-3 h-3" />
                  Exclusive
                </button>

                <div className="flex-1" />

                <Button
                  onClick={handleSendMail}
                  disabled={!messageText.trim() && attachedFiles.length === 0}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-5 py-2 text-sm disabled:opacity-40"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  Send
                </Button>
              </div>

              {isExclusive && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-amber-700">Exclusive mail costs +20 extra credits</span>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-0.5">Only visible to the recipient. Cannot be forwarded.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition direction="slide-left">
      <Layout
        title="Private Mail"
        onBack={() => onNavigate('matches')}
        showClose={false}
        showFooter={true}
        showQuickNav={true}
        activeTab="mail"
        onNavigate={onNavigate}
      >
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Private Mail</h1>
                  <p className="text-xs text-gray-500">Send private messages, photos & exclusive content</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Credits</p>
                  <p className="text-base font-bold text-green-600">{userBalance}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {(['inbox', 'sent', 'exclusive'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-full transition-all capitalize",
                      activeTab === tab
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}>
                    {tab === 'exclusive' && <Lock className="w-3 h-3 inline mr-1" />}
                    {tab}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text" placeholder="Search mail..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-100 border-0 rounded-full text-sm"
                />
              </div>
            </div>
          </div>

          <div className="px-4 py-2 pb-24">
            {isLoading ? (
              <LoadingSkeleton type="mail-thread" count={5} />
            ) : filteredThreads.length === 0 ? (
              <EmptyState
                icon={MailIcon}
                title="No mail yet"
                description="Send a private mail to someone special. Include photos and exclusive content!"
                actionText="Browse Profiles"
                onAction={() => onNavigate('discovery')}
              />
            ) : (
              <div className="space-y-0">
                {filteredThreads.map(thread => (
                  <button key={thread.id} onClick={() => setSelectedThread(thread.id)}
                    className="w-full text-left px-3 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 rounded-lg transition-all active:scale-[0.98]">
                    <div className="relative flex-shrink-0">
                      <img src={thread.participantImage} alt={thread.participantName}
                        className="w-12 h-12 rounded-full object-cover" />
                      {thread.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{thread.participantName}</h3>
                          {thread.isVerified && (
                            <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">{formatTimestamp(thread.timestamp)}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{thread.lastMessage}</p>
                    </div>
                    {thread.unreadCount > 0 && (
                      <div className="bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {thread.unreadCount}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="fixed bottom-20 right-4 z-10">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-[10px] text-gray-500">
              <div className="flex items-center gap-3">
                <span>Mail: 10 cr</span>
                <span>Photo: +10 cr</span>
                <span className="text-amber-600 font-medium">Exclusive: +20 cr</span>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </PageTransition>
  );
};

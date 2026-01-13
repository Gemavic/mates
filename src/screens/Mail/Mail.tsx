import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Mail as MailIcon,
  Send,
  Search,
  ArrowLeft,
  Paperclip,
  Image,
  Camera,
  File,
  X,
  Heart
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { creditManager } from '@/lib/creditSystem';
import { cn } from '@/lib/utils';
import { MessagingManager, CreditManager } from '@/lib/database';
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
  hasPhotos: boolean;
  isVerified: boolean;
  isOnline: boolean;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderImage: string;
  message: string;
  timestamp: string;
  hasPhotos: boolean;
  attachments?: AttachedFile[];
}

export const Mail: React.FC<MailProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'requests'>('all');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState(0);

  const [mailThreads, setMailThreads] = useState<MailThread[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setAttachedFiles([]);
    setShowAttachmentMenu(false);
    setMessageText('');
  }, [selectedThread]);

  useEffect(() => {
    const loadCredits = async () => {
      if (user) {
        try {
          const credits = await CreditManager.getUserCredits(user.id);
          const total = (credits?.complimentary_credits || 0) + (credits?.total_kobos || 0) + (credits?.purchased_credits || 0);
          setUserBalance(total);
        } catch (err) {
          console.error('Failed to load credits:', err);
        }
      }
    };

    loadCredits();
    const interval = setInterval(loadCredits, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadMailThreads();
    }
  }, [user]);

  const loadMailThreads = async () => {
    if (!user) return;

    try {
      const threads = await MessagingManager.getMailThreads(user.id);

      if (threads.length === 0) {
        setMailThreads([]);
        return;
      }

      const otherUserIds = threads.map((thread: any) =>
        thread.participant1_id === user.id
          ? thread.participant2_id
          : thread.participant1_id
      );

      const threadIds = threads.map((t: any) => t.id);

      const { data: profiles } = await supabaseClient
        .from('user_profiles')
        .select('user_id, full_name, first_name, age, is_verified, is_online')
        .in('user_id', otherUserIds);

      const { data: photos } = await supabaseClient
        .from('user_photos')
        .select('user_id, photo_url')
        .in('user_id', otherUserIds)
        .eq('is_primary', true);

      const { data: allMessages } = await supabaseClient
        .from('mail_messages')
        .select('thread_id, message_text, created_at, is_read, sender_id')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false });

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, any>);

      const photoMap = (photos || []).reduce((acc, p) => {
        acc[p.user_id] = p.photo_url;
        return acc;
      }, {} as Record<string, string>);

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

      const formattedThreads: MailThread[] = threads.map((thread: any) => {
        const otherUserId = thread.participant1_id === user.id
          ? thread.participant2_id
          : thread.participant1_id;

        const profile = profileMap[otherUserId];
        const photoUrl = photoMap[otherUserId];
        const threadMessages = messagesByThread[thread.id];

        if (!profile || !photoUrl) {
          return null;
        }

        return {
          id: thread.id,
          participantId: otherUserId,
          participantName: profile?.first_name || profile?.full_name || 'User',
          participantAge: profile?.age || 25,
          participantImage: photoUrl,
          lastMessage: threadMessages?.latest?.message_text || 'Start a conversation',
          timestamp: threadMessages?.latest?.created_at || thread.created_at,
          unreadCount: threadMessages?.unreadCount || 0,
          hasPhotos: false,
          isVerified: profile?.is_verified || false,
          isOnline: profile?.is_online || false
        };
      }).filter((t): t is MailThread => t !== null);

      setMailThreads(formattedThreads);
    } catch (error) {
      console.error('Failed to load mail threads:', error);
      setMailThreads([]);
    }
  };

  useEffect(() => {
    if (selectedThread && user) {
      loadThreadMessages(selectedThread);
    }
  }, [selectedThread, user]);

  const loadThreadMessages = async (threadId: string) => {
    if (!user) return;

    try {
      const { data: messages, error } = await supabaseClient
        .from('mail_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const senderIds = [...new Set(messages.map(m => m.sender_id))];

      const { data: profiles } = await supabaseClient
        .from('user_profiles')
        .select('user_id, first_name, full_name')
        .in('user_id', senderIds);

      const { data: photos } = await supabaseClient
        .from('user_photos')
        .select('user_id, photo_url')
        .in('user_id', senderIds)
        .eq('is_primary', true);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, any>);

      const photoMap = (photos || []).reduce((acc, p) => {
        acc[p.user_id] = p.photo_url;
        return acc;
      }, {} as Record<string, string>);

      const formattedMessages: Message[] = messages.map(msg => {
        const profile = profileMap[msg.sender_id];
        const photoUrl = photoMap[msg.sender_id];

        return {
          id: msg.id,
          senderId: msg.sender_id,
          senderName: profile?.first_name || profile?.full_name || 'User',
          senderImage: photoUrl || 'https://via.placeholder.com/150',
          message: msg.message_text,
          timestamp: new Date(msg.created_at).toLocaleString(),
          hasPhotos: msg.has_photos || false
        };
      });

      setCurrentMessages(formattedMessages);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!messageText.trim() && attachedFiles.length === 0) return;

    try {
      if (!user) {
        alert('Please sign in to send messages');
        return;
      }

      let totalCost = 0;

      if (messageText.trim()) {
        totalCost += 10;
      }

      if (attachedFiles.length > 0) {
        const { data: existingAttachments } = await supabaseClient
          .from('mail_messages')
          .select('id')
          .eq('thread_id', selectedThread!)
          .eq('sender_id', user.id)
          .eq('has_photos', true)
          .limit(1);

        const hasFirstAttachment = !existingAttachments || existingAttachments.length === 0;
        if (!hasFirstAttachment) {
          totalCost += attachedFiles.length * 10;
        }
      }

      const isStaff = false;

      if (totalCost > 0 && !isStaff) {
        const userCredits = await CreditManager.getUserCredits(user.id);
        const availableCredits = (userCredits?.complimentary_credits || 0) + (userCredits?.total_kobos || 0) + (userCredits?.purchased_credits || 0);

        if (availableCredits < totalCost) {
          alert(`Insufficient credits! Need ${totalCost} credits to send this message.`);
          onNavigate('credits');
          return;
        }

        try {
          await CreditManager.spendCredits(user.id, totalCost, 'Mail message', 'mail');
        } catch (error: any) {
          console.error('Failed to deduct credits:', error);
          alert(`Credit deduction failed: ${error?.message || 'Unknown error'}`);
          return;
        }

        const updatedCredits = await CreditManager.getUserCredits(user.id);
        setUserBalance((updatedCredits?.complimentary_credits || 0) + (updatedCredits?.total_kobos || 0) + (updatedCredits?.purchased_credits || 0));
      }

      const currentThread = mailThreads.find(t => t.id === selectedThread);
      if (!currentThread) {
        throw new Error('No thread selected');
      }

      const { data: currentUserProfile } = await supabaseClient
        .from('user_profiles')
        .select('first_name, full_name')
        .eq('user_id', user.id)
        .single();

      const { data: currentUserPhoto } = await supabaseClient
        .from('user_photos')
        .select('photo_url')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        senderId: user.id,
        senderName: currentUserProfile?.first_name || currentUserProfile?.full_name || 'You',
        senderImage: currentUserPhoto?.photo_url || 'https://via.placeholder.com/150',
        message: messageText.trim() || 'Sent attachments',
        timestamp: new Date().toLocaleString(),
        hasPhotos: attachedFiles.length > 0
      };

      setCurrentMessages(prev => [...prev, optimisticMessage]);

      const messageToSend = messageText.trim();
      const filesToSend = [...attachedFiles];

      setMessageText('');
      setAttachedFiles([]);
      setShowAttachmentMenu(false);

      const { data: savedMessage, error: messageError } = await supabaseClient
        .from('mail_messages')
        .insert({
          thread_id: selectedThread,
          sender_id: user.id,
          subject: 'Mail Message',
          message_text: messageToSend || 'Sent attachments',
          credits_spent: totalCost,
          has_photos: filesToSend.length > 0
        })
        .select()
        .single();

      if (messageError) {
        console.error('Database save error:', messageError);
        setCurrentMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        alert(`Failed to save message`);
        throw new Error('Failed to save message');
      }

      await supabaseClient
        .from('mail_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedThread);

      setCurrentMessages(prev =>
        prev.map(m => m.id === optimisticMessage.id ? {
          ...m,
          id: savedMessage.id
        } : m)
      );

      await loadMailThreads();

      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
      toast.textContent = totalCost === 0 ? 'Message sent! (FREE)' : `Message sent! (-${totalCost} credits)`;
      document.body.appendChild(toast);
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);

    } catch (error: any) {
      console.error('Send message error:', error);
      alert(`Failed to send message: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleFileUpload = (type: 'image' | 'camera' | 'file') => {
    if (!user) {
      alert('Please sign in to upload files');
      return;
    }

    try {
      const input = document.createElement('input');
      input.type = 'file';

      switch (type) {
        case 'image':
          input.accept = 'image/*';
          input.multiple = true;
          break;
        case 'camera':
          input.accept = 'image/*';
          input.setAttribute('capture', 'environment');
          break;
        case 'file':
          input.accept = '*/*';
          input.multiple = true;
          break;
      }

      input.onchange = (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        if (files.length === 0) return;

        files.forEach((file) => {
          const newFile: AttachedFile = {
            id: Math.random().toString(36).substring(2),
            name: file.name,
            size: file.size,
            type: file.type,
            url: URL.createObjectURL(file),
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
          };

          setAttachedFiles(prev => [...prev, newFile]);
        });

        setShowAttachmentMenu(false);
      };

      input.click();
    } catch (error) {
      console.error('File upload error:', error);
      alert('File upload failed. Please try again.');
    }
  };

  const removeAttachment = (fileId: string) => {
    setAttachedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.url) {
        URL.revokeObjectURL(fileToRemove.url);
        if (fileToRemove.preview) {
          URL.revokeObjectURL(fileToRemove.preview);
        }
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;

    const diffInDays = Math.floor(diffInSeconds / 86400);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleThreadSelect = (threadId: string) => {
    setSelectedThread(threadId);
  };

  const activeThreadData = mailThreads.find(t => t.id === selectedThread);
  const activeThreadCount = mailThreads.filter(t => t.unreadCount > 0).length;
  const requestsCount = mailThreads.filter(t => t.unreadCount > 0).length;

  const filteredThreads = mailThreads.filter(thread => {
    if (!thread.participantName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    if (activeTab === 'active') {
      return thread.isOnline || thread.unreadCount > 0;
    }
    if (activeTab === 'requests') {
      return thread.unreadCount > 0;
    }
    return true;
  });

  if (selectedThread && activeThreadData) {
    return (
      <PageTransition direction="slide-left">
        <Layout
          title={activeThreadData.participantName}
          onBack={() => setSelectedThread(null)}
          showClose={false}
          showFooter={false}
          showQuickNav={false}
          activeTab="mail"
          onNavigate={onNavigate}
        >
          <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
              <div className="px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => setSelectedThread(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>

                <div className="relative">
                  <img
                    src={activeThreadData.participantImage}
                    alt={activeThreadData.participantName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {activeThreadData.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
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
              </div>
            </div>

            <div className="px-4 py-6 space-y-4 pb-32">
              {currentMessages.map((message) => {
                const isMe = message.senderId === user?.id;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2",
                      isMe ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isMe && (
                      <img
                        src={message.senderImage}
                        alt={message.senderName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}

                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2",
                      isMe ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
                    )}>
                      <p className="text-sm">{message.message}</p>
                      {message.hasPhotos && (
                        <div className="mt-2 flex items-center gap-1 text-xs opacity-70">
                          <Image className="w-3 h-3" />
                          <span>Photo</span>
                        </div>
                      )}
                    </div>

                    {isMe && (
                      <img
                        src={message.senderImage}
                        alt={message.senderName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
              {attachedFiles.length > 0 && (
                <div className="mb-3 flex gap-2 overflow-x-auto">
                  {attachedFiles.map((file) => (
                    <div key={file.id} className="relative">
                      {file.preview ? (
                        <img src={file.preview} alt={file.name} className="w-16 h-16 rounded-lg object-cover" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <File className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                      <button
                        onClick={() => removeAttachment(file.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFileUpload('image')}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                  rows={1}
                />

                <Button
                  type="submit"
                  disabled={!messageText.trim() && attachedFiles.length === 0}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-10 h-10 p-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </Layout>
      </PageTransition>
    );
  }

  return (
    <PageTransition direction="slide-left">
      <Layout
        title="Messages"
        onBack={() => onNavigate('discovery')}
        showClose={false}
        showFooter={true}
        showQuickNav={true}
        activeTab="mail"
        onNavigate={onNavigate}
      >
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Dates</h1>
                <button
                  onClick={() => onNavigate('profile')}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setActiveTab('all')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    activeTab === 'all'
                      ? 'text-gray-900 border-b-2 border-orange-500'
                      : 'text-gray-600'
                  )}
                >
                  All chats
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
                    activeTab === 'active'
                      ? 'text-gray-900 border-b-2 border-orange-500'
                      : 'text-gray-600'
                  )}
                >
                  Active
                  {activeThreadCount > 0 && (
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {activeThreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
                    activeTab === 'requests'
                      ? 'text-gray-900 border-b-2 border-orange-500'
                      : 'text-gray-600'
                  )}
                >
                  Requests
                  {requestsCount > 0 && (
                    <span className="bg-gray-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {requestsCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-100 border-0"
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
                title="No conversations yet"
                description="Start chatting with someone special"
                actionText="Browse Profiles"
                onAction={() => onNavigate('discovery')}
              />
            ) : (
              <div className="space-y-0">
                {filteredThreads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => handleThreadSelect(thread.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-3 border-b border-gray-100"
                  >
                    <div className="relative">
                      <img
                        src={thread.participantImage}
                        alt={thread.participantName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {thread.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 text-sm">{thread.participantName}</h3>
                          {thread.isVerified && (
                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{formatTimestamp(thread.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{thread.lastMessage}</p>
                    </div>

                    {thread.unreadCount > 0 && (
                      <div className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {thread.unreadCount}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </PageTransition>
  );
};

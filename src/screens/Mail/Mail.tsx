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
  Heart, 
  Gift, 
  Plus, 
  User, 
  Search, 
  Filter, 
  Paperclip,
  Image,
  Camera,
  File,
  X,
  Download,
  Eye,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { creditManager } from '@/lib/creditSystem';
import { cn } from '@/lib/utils';
import { MessagingManager, CreditManager } from '@/lib/database';
import { supabaseClient } from '@/lib/supabase';
import { staffManager } from '@/lib/staffManager';

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
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  hasPhotos: boolean;
  isVerified: boolean;
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
  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState(0);

  // Loading state management
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Clear attachments when switching threads
  React.useEffect(() => {
    setAttachedFiles([]);
    setShowAttachmentMenu(false);
    setMessageText('');
  }, [selectedThread]);

  // Load credits from database
  React.useEffect(() => {
    const loadCredits = async () => {
      if (user) {
        try {
          const credits = await CreditManager.getUserCredits(user.id);
          const total = (credits?.complimentary_credits || 0) + (credits?.total_kobos || 0) + (credits?.purchased_credits || 0);
          setUserBalance(total);
          console.log('Credits loaded:', {
            complimentary: credits?.complimentary_credits,
            kobos: credits?.total_kobos,
            purchased: credits?.purchased_credits,
            total
          });
        } catch (err) {
          console.error('Failed to load credits:', err);
        }
      }
    };

    loadCredits();

    // Refresh credits every 10 seconds
    const interval = setInterval(loadCredits, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // CRITICAL FIX: Load real threads from database
  const [mailThreads, setMailThreads] = useState<MailThread[]>([]);

  // Load mail threads on mount
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

      // Get all other user IDs
      const otherUserIds = threads.map((thread: any) =>
        thread.participant1_id === user.id
          ? thread.participant2_id
          : thread.participant1_id
      );

      const threadIds = threads.map((t: any) => t.id);

      // Fetch all profiles in a single query
      const { data: profiles } = await supabaseClient
        .from('user_profiles')
        .select('user_id, full_name, first_name, age, is_verified')
        .in('user_id', otherUserIds);

      // Fetch all messages in a single query
      const { data: allMessages } = await supabaseClient
        .from('mail_messages')
        .select('thread_id, message_text, created_at, is_read, sender_id')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false });

      // Create lookup maps
      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, any>);

      // Group messages by thread and get latest + unread count
      const messagesByThread = (allMessages || []).reduce((acc, msg) => {
        if (!acc[msg.thread_id]) {
          acc[msg.thread_id] = {
            latest: msg,
            unreadCount: 0
          };
        }
        // Count unread messages from other users
        if (!msg.is_read && msg.sender_id !== user.id) {
          acc[msg.thread_id].unreadCount++;
        }
        return acc;
      }, {} as Record<string, any>);

      // Map threads to formatted data
      const formattedThreads: MailThread[] = threads.map((thread: any) => {
        const otherUserId = thread.participant1_id === user.id
          ? thread.participant2_id
          : thread.participant1_id;

        const profile = profileMap[otherUserId];
        const threadMessages = messagesByThread[thread.id];

        return {
          id: thread.id,
          participantId: otherUserId,
          participantName: profile?.first_name || profile?.full_name || 'User',
          participantAge: profile?.age || 25,
          lastMessage: threadMessages?.latest?.message_text || 'Start a conversation',
          timestamp: threadMessages?.latest?.created_at || thread.created_at,
          unreadCount: threadMessages?.unreadCount || 0,
          hasPhotos: false,
          isVerified: profile?.is_verified || false
        };
      });

      setMailThreads(formattedThreads);
    } catch (error) {
      console.error('Failed to load mail threads:', error);
      // Show empty state if no threads
      setMailThreads([]);
    }
  };

  // CRITICAL FIX: Load real messages from database
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);

  // Load messages when thread is selected
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
        return {
          id: msg.id,
          senderId: msg.sender_id,
          senderName: profile?.first_name || profile?.full_name || 'User',
          senderImage: photoMap[msg.sender_id] || 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400',
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

      // Calculate total cost
      let totalCost = 0;

      // Message cost (10 credits for mail)
      if (messageText.trim()) {
        totalCost += 10;
      }

      // Attachment cost (first attachment per thread FREE, subsequent 10 credits each)
      if (attachedFiles.length > 0) {
        // Check if user has sent attachments in this thread before
        const { data: existingAttachments } = await supabaseClient
          .from('mail_messages')
          .select('id')
          .eq('thread_id', selectedThread!)
          .eq('sender_id', user.id)
          .eq('has_photos', true)
          .limit(1);

        const hasFirstAttachment = !existingAttachments || existingAttachments.length === 0;
        if (!hasFirstAttachment) {
          // Subsequent attachments cost 10 credits each
          totalCost += attachedFiles.length * 10;
        }
      }

      // Check if staff member (free for staff)
      const isStaff = await staffManager.isStaffMember(user.id);

      // Check credits (skip for staff)
      if (totalCost > 0 && !isStaff) {
        const userCredits = await CreditManager.getUserCredits(user.id);
        const availableCredits = (userCredits?.complimentary_credits || 0) + (userCredits?.total_kobos || 0) + (userCredits?.purchased_credits || 0);

        console.log('Credit check:', {
          complimentary: userCredits?.complimentary_credits,
          kobos: userCredits?.total_kobos,
          purchased: userCredits?.purchased_credits,
          total: availableCredits,
          needed: totalCost
        });

        if (availableCredits < totalCost) {
          alert(`Insufficient credits! Need ${totalCost} credits to send this message with attachments.`);
          onNavigate('credits');
          return;
        }

        // Deduct credits from database
        try {
          await CreditManager.spendCredits(user.id, totalCost, 'Mail message with attachments', 'mail');
        } catch (error) {
          console.error('Failed to deduct credits:', error);
          alert('Insufficient credits!');
          return;
        }

        // Reload balance (including kobos now)
        const updatedCredits = await CreditManager.getUserCredits(user.id);
        setUserBalance((updatedCredits?.complimentary_credits || 0) + (updatedCredits?.total_kobos || 0) + (updatedCredits?.purchased_credits || 0));
      }

      // CRITICAL FIX: Save message to database
      const currentThread = mailThreads.find(t => t.id === selectedThread);
      if (!currentThread) {
        throw new Error('No thread selected');
      }

      console.log('Sending message to:', currentThread.participantId, 'in thread:', selectedThread);

      const { data: savedMessage, error: messageError } = await MessagingManager.sendMessage(
        user.id,
        currentThread.participantId,
        messageText.trim() || 'Sent attachments',
        totalCost
      );

      if (messageError) {
        console.error('Database save error:', messageError);
        alert(`Failed to save message: ${messageError.message || 'Unknown error'}`);
        // Note: In production, implement proper transaction rollback
        // For now, credits are already deducted - consider refund logic if needed
        throw new Error('Failed to save message to database');
      }

      console.log('Message saved to database:', savedMessage);

      // Reload messages to show the new message
      await loadThreadMessages(selectedThread);

      setMessageText('');
      setAttachedFiles([]);
      setShowAttachmentMenu(false);

      // Show success feedback
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
      if (totalCost === 0) {
        toast.textContent = `📧 Message sent! ${attachedFiles.length > 0 ? '(First attachment FREE!)' : ''}`;
      } else {
        toast.textContent = `📧 Message sent! (-${totalCost} credits)`;
      }
      document.body.appendChild(toast);
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Send message error:', error);
      alert('Failed to send message. Please try again.');
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
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMessage.textContent = `📎 ${files.length} file(s) attached successfully!`;
        document.body.appendChild(successMessage);
        setTimeout(() => {
          if (document.body.contains(successMessage)) {
            document.body.removeChild(successMessage);
          }
        }, 3000);
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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.startsWith('video/')) return File;
    if (fileType.startsWith('audio/')) return File;
    return File;
  };

  const handleThreadSelect = (threadId: string) => {
    try {
      setSelectedThread(threadId);
      setActiveTab('conversation');
    } catch (error) {
      console.error('Thread selection error:', error);
    }
  };

  const renderInbox = () => (
    <div className="space-y-4">
      {isLoading ? (
        <LoadingSkeleton type="mail-thread" count={4} />
      ) : mailThreads.filter(thread => 
        thread.participantName.toLowerCase().includes(searchTerm.toLowerCase())
      ).length === 0 ? (
        <EmptyState
          icon={MailIcon}
          title="Where hearts connect through words!"
          description="Send thoughtful messages that show the real you. The most meaningful relationships often start with a single, heartfelt letter."
          actionText="Find Someone to Write To"
          onAction={() => onNavigate('discovery')}
        />
      ) : (
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/90"
              />
            </div>
            <Button className="bg-white/20 text-white hover:bg-white/30">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Mail Threads */}
          <div className="space-y-3">
            {mailThreads
              .filter(thread => 
                thread.participantName.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => handleThreadSelect(thread.id)}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:bg-white/20 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-semibold">{thread.participantName}</h3>
                          {thread.isVerified && (
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                        <p className="text-white/60 text-sm">Age {thread.participantAge}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white/60 text-xs">{thread.timestamp}</p>
                      {thread.unreadCount > 0 && (
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center mt-1">
                          <span className="text-white text-xs">{thread.unreadCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-white/80 text-sm truncate">{thread.lastMessage}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {thread.hasPhotos && (
                        <span className="text-pink-300 text-xs">📷 Photos</span>
                      )}
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleThreadSelect(thread.id);
                      }}
                      className="text-xs bg-pink-500 hover:bg-pink-600 text-white px-3 py-1 rounded-lg transition-all duration-200 cursor-pointer touch-manipulation active:scale-95"
                      type="button"
                    >
                      Open
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderConversation = () => {
    const currentThread = mailThreads.find(t => t.id === selectedThread);
    if (!currentThread) return null;

    return (
      <div className="space-y-4">
        {/* Conversation Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => {
                  setActiveTab('inbox');
                  setSelectedThread(null);
                }}
                className="bg-white/20 text-white hover:bg-white/30 px-3 py-2 text-sm rounded-lg transition-all duration-200 cursor-pointer touch-manipulation active:scale-95"
                type="button"
              >
                ← Back
              </Button>
              <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{currentThread.participantName}</h3>
                <p className="text-white/70 text-sm">Age {currentThread.participantAge}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => onNavigate('video-chat')}
                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all duration-200 cursor-pointer touch-manipulation active:scale-95"
                type="button"
                title="Video call"
              >
                📹
              </Button>
              <Button
                onClick={() => onNavigate('gift-shop')}
                className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-lg transition-all duration-200 cursor-pointer touch-manipulation active:scale-95"
                type="button"
                title="Send gift"
              >
                🎁
              </Button>
            </div>
          </div>
        </div>

        {/* Messages History */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {currentMessages.map((message) => {
              const isMe = message.senderId === user?.id;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    isMe ? 'justify-end' : 'justify-start'
                  )}
                >
                  {/* Profile Image - Left side for receiver */}
                  {!isMe && (
                    <div className="flex-shrink-0">
                      <img
                        src={message.senderImage}
                        alt={message.senderName}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
                      />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className="flex flex-col max-w-xs sm:max-w-sm md:max-w-md">
                    {/* Sender Name */}
                    <p className={cn(
                      "text-xs font-medium mb-1 px-1",
                      isMe ? 'text-pink-200 text-right' : 'text-white/80'
                    )}>
                      {isMe ? 'You' : message.senderName}
                    </p>

                    {/* Message Content */}
                    <div
                      className={cn(
                        "px-4 py-3 rounded-2xl shadow-md",
                        isMe
                          ? 'bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-tr-sm'
                          : 'bg-white text-gray-800 rounded-tl-sm'
                      )}
                    >
                      <p className="text-sm leading-relaxed break-words">{message.message}</p>
                      {message.hasPhotos && (
                        <div className={cn(
                          "mt-2 p-2 rounded-lg",
                          isMe ? 'bg-black/20' : 'bg-gray-100'
                        )}>
                          <div className="flex items-center text-xs">
                            <Image className="w-3 h-3 mr-1" />
                            <span>Photo attachment</span>
                          </div>
                        </div>
                      )}
                      <p className={cn(
                        "text-xs mt-2",
                        isMe ? 'opacity-70' : 'text-gray-500'
                      )}>
                        {message.timestamp}
                      </p>
                    </div>
                  </div>

                  {/* Profile Image - Right side for sender (you) */}
                  {isMe && (
                    <div className="flex-shrink-0">
                      <img
                        src={message.senderImage}
                        alt="You"
                        className="w-10 h-10 rounded-full object-cover border-2 border-pink-300"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium text-sm flex items-center">
                <Paperclip className="w-4 h-4 mr-2" />
                Attached Files ({attachedFiles.length})
              </h4>
              <button
                onClick={() => setAttachedFiles([])}
                className="text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
                type="button"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {attachedFiles.map((file) => {
                const FileIcon = getFileIcon(file.type);
                return (
                  <div key={file.id} className="flex items-center justify-between bg-white/10 rounded-lg p-2">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-500 rounded flex items-center justify-center flex-shrink-0">
                          <FileIcon className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{file.name}</p>
                        <p className="text-white/60 text-xs">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAttachment(file.id)}
                      className="text-white/70 hover:text-red-400 transition-colors p-1 cursor-pointer"
                      type="button"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
            
            {/* Attachment Cost Info */}
            <div className="mt-3 p-2 bg-blue-500/20 rounded-lg">
              <p className="text-blue-200 text-xs text-center">
                {localStorage.getItem(`thread_${selectedThread}_first_attachment`) ? 
                  `📎 ${attachedFiles.length} attachment(s) • ${attachedFiles.length * 10} credits` :
                  `📎 First attachment FREE! Additional: ${Math.max(0, attachedFiles.length - 1) * 10} credits`
                }
              </p>
            </div>
          </div>
        )}

        {/* Enhanced Message Composer */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <form onSubmit={handleSendMessage} className="space-y-4">
            {/* Message Input */}
            <div className="space-y-3">
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Write a message to ${currentThread.participantName}...`}
                className="w-full bg-white/90 border-white/30 min-h-[100px] resize-none text-gray-900 placeholder-gray-500"
                rows={4}
              />
              
              {/* Input Controls Row */}
              <div className="flex items-center justify-between gap-3">
                {/* Attachment Controls */}
                <div className="flex items-center space-x-2">
                  {/* Attachment Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      type="button"
                      className={cn(
                        "p-2 sm:p-3 rounded-full transition-all duration-200 cursor-pointer touch-manipulation active:scale-95",
                        showAttachmentMenu 
                          ? "bg-blue-500 text-white shadow-lg" 
                          : "bg-white/20 text-white hover:bg-white/30"
                      )}
                      aria-label="Attach files"
                    >
                      <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    
                    {/* Enhanced Attachment Menu */}
                    {showAttachmentMenu && (
                      <div className="absolute bottom-12 left-0 bg-white rounded-xl shadow-2xl border border-gray-200 py-3 min-w-[200px] z-30 animate-slide-up">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <h4 className="font-semibold text-gray-900 text-sm">Add Attachments</h4>
                          <p className="text-gray-500 text-xs">First attachment per thread is FREE</p>
                        </div>
                        
                        <button
                          onClick={() => handleFileUpload('image')}
                          className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors cursor-pointer group"
                          type="button"
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200">
                            <Image className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">Photos & Images</p>
                            <p className="text-xs text-gray-500">JPG, PNG, GIF, etc.</p>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => handleFileUpload('camera')}
                          className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition-colors cursor-pointer group"
                          type="button"
                        >
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-200">
                            <Camera className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">Take Photo</p>
                            <p className="text-xs text-gray-500">Use device camera</p>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => handleFileUpload('file')}
                          className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 transition-colors cursor-pointer group"
                          type="button"
                        >
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-200">
                            <File className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">Any File</p>
                            <p className="text-xs text-gray-500">Documents, videos, etc.</p>
                          </div>
                        </button>
                        
                        <div className="border-t border-gray-200 mt-2 pt-2 px-4">
                          <div className="bg-green-50 rounded-lg p-2">
                            <p className="text-xs text-green-700 font-medium">FREE: First attachment per thread</p>
                            <p className="text-xs text-blue-700">COST: 10 credits for additional files</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Attachment Counter Badge */}
                  {attachedFiles.length > 0 && (
                    <div className="flex items-center space-x-1 bg-blue-500/20 rounded-full px-2 py-1">
                      <Paperclip className="w-3 h-3 text-blue-300" />
                      <span className="text-blue-200 text-xs font-medium">{attachedFiles.length}</span>
                    </div>
                  )}
                </div>
                
                {/* Credit Balance Display */}
                <div className="text-center">
                  <p className="text-white/60 text-xs mb-1">Balance: {userBalance} credits</p>
                  <Button
                    onClick={() => onNavigate('credits')}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 text-xs rounded-lg transition-all duration-200 cursor-pointer touch-manipulation active:scale-95"
                    type="button"
                  >
                    Buy More
                  </Button>
                </div>
                
                {/* Send Button */}
                <Button
                  type="submit"
                  disabled={!messageText.trim() && attachedFiles.length === 0}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:scale-105 text-white px-6 py-2 disabled:opacity-50 transition-all duration-200 cursor-pointer touch-manipulation active:scale-95"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
            
            {/* Enhanced Cost Information */}
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-3">
              <div className="text-center">
                <p className="text-white/80 text-xs mb-1">
                  💳 <strong>Mail Message:</strong> 10 credits
                  {attachedFiles.length > 0 && (
                    <>
                      {' • '}📎 <strong>Attachments:</strong> 
                      {localStorage.getItem(`thread_${selectedThread}_first_attachment`) ? 
                        ` ${attachedFiles.length * 10} credits` :
                        ` First FREE, +${Math.max(0, attachedFiles.length - 1) * 10} credits`
                      }
                    </>
                  )}
                </p>
                <div className="flex items-center justify-center space-x-4 text-xs">
                  <span className="text-green-300">🆓 Opening first letters</span>
                  <span className="text-white/60">💳 10 credits for following letters</span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderCompose = () => (
    <div className="space-y-6">
      <h3 className="text-white font-semibold text-lg">Compose New Message</h3>
      
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-white font-medium mb-2">To:</label>
            <Input
              placeholder="Search for someone to message..."
              className="bg-white/20 text-white placeholder-white/50 border-white/30"
            />
          </div>
          
          <div>
            <label className="block text-white font-medium mb-2">Subject:</label>
            <Input
              placeholder="Enter subject..."
              className="bg-white/20 text-white placeholder-white/50 border-white/30"
            />
          </div>
          
          <div>
            <label className="block text-white font-medium mb-2">Message:</label>
            <Textarea
              placeholder="Write your message..."
              className="bg-white/20 text-white placeholder-white/50 border-white/30 min-h-[120px]"
            />
          </div>
          
          <Button
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold hover:scale-105 transition-all duration-300"
            type="button"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Message (10 Credits)
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <PageTransition direction="slide-left">
      <Layout
        title="Private Mail"
        onBack={() => onNavigate('discovery')}
        showClose={false}
        showFooter={true}
        activeTab="mail"
        onNavigate={onNavigate}
      >
        <div className="px-4 py-6 pb-24">
          {/* Header */}
          <div className="text-center mb-8">
            <img 
              src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800" 
              alt="Private Mail" 
              className="w-full h-24 object-cover rounded-2xl shadow-lg mb-4"
            />
            <h2 className="text-2xl font-bold text-white mb-2">Private Mail</h2>
            <p className="text-white/80">Send intimate letters and build connections</p>
          </div>

          {/* Mail Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{mailThreads.length}</p>
              <p className="text-white/70 text-xs">Conversations</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">
                {mailThreads.reduce((sum, thread) => sum + thread.unreadCount, 0)}
              </p>
              <p className="text-white/70 text-xs">Unread</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{userBalance}</p>
              <p className="text-white/70 text-xs">Credits</p>
            </div>
          </div>

          {/* Enhanced Tab Navigation */}
          <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-1 mb-6">
            {[
              { id: 'inbox', label: 'Inbox', icon: MailIcon },
              { id: 'conversation', label: 'Chat', icon: MessageCircle },
              { id: 'compose', label: 'Compose', icon: Plus }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'inbox') setSelectedThread(null);
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all duration-300 cursor-pointer touch-manipulation active:scale-95",
                    activeTab === tab.id 
                      ? 'bg-white text-gray-900 shadow-lg' 
                      : 'text-white hover:bg-white/10'
                  )}
                  type="button"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'inbox' && renderInbox()}
            {activeTab === 'conversation' && renderConversation()}
            {activeTab === 'compose' && renderCompose()}
          </div>

          {/* Mail Pricing Information */}
          <div className="mt-8 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl p-4">
            <h3 className="text-white font-semibold text-lg mb-3 text-center">📧 Mail Pricing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/80">📧 First letter</span>
                  <span className="text-white font-medium">10 credits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">📧 Following letters</span>
                  <span className="text-white font-medium">30 credits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">📖 Opening first letters</span>
                  <span className="text-green-400 font-medium">FREE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">📖 Opening following letters</span>
                  <span className="text-white font-medium">10 credits</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/80">📷 First photo in mail</span>
                  <span className="text-green-400 font-medium">FREE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">📷 Following photos</span>
                  <span className="text-white font-medium">10 credits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">📹 Opening videos</span>
                  <span className="text-white font-medium">50 credits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">📎 File attachments</span>
                  <span className="text-white font-medium">10 credits each</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </PageTransition>
  );
};
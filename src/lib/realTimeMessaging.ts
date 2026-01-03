import { supabaseClient } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  message_type: 'text' | 'image' | 'video' | 'gift' | 'voice';
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
  sender_profile?: {
    full_name: string;
    photo_url?: string;
  };
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  created_at: string;
}

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  timestamp: string;
}

export class RealtimeMessagingService {
  private static channels: Map<string, RealtimeChannel> = new Map();
  private static messageListeners: Map<string, ((message: RealtimeMessage) => void)[]> = new Map();
  private static typingListeners: Map<string, ((indicator: TypingIndicator) => void)[]> = new Map();

  /**
   * Subscribe to real-time messages for a conversation
   */
  static subscribeToConversation(
    conversationId: string,
    onMessage: (message: RealtimeMessage) => void,
    onTyping?: (indicator: TypingIndicator) => void
  ): () => void {
    const channelKey = `conversation_${conversationId}`;

    // Add message listener
    if (!this.messageListeners.has(conversationId)) {
      this.messageListeners.set(conversationId, []);
    }
    this.messageListeners.get(conversationId)!.push(onMessage);

    // Add typing listener if provided
    if (onTyping) {
      if (!this.typingListeners.has(conversationId)) {
        this.typingListeners.set(conversationId, []);
      }
      this.typingListeners.get(conversationId)!.push(onTyping);
    }

    // Create channel if it doesn't exist
    if (!this.channels.has(channelKey)) {
      const channel = supabaseClient
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          async (payload) => {
            const message = payload.new as RealtimeMessage;

            // Fetch sender profile
            const { data: profile } = await supabaseClient
              .from('user_profiles')
              .select('full_name, photo_url')
              .eq('user_id', message.sender_id)
              .single();

            if (profile) {
              message.sender_profile = profile;
            }

            // Notify all listeners
            const listeners = this.messageListeners.get(conversationId) || [];
            listeners.forEach(listener => listener(message));
          }
        )
        .on(
          'broadcast',
          { event: 'typing' },
          (payload) => {
            const indicator = payload.payload as TypingIndicator;
            const listeners = this.typingListeners.get(conversationId) || [];
            listeners.forEach(listener => listener(indicator));
          }
        )
        .subscribe();

      this.channels.set(channelKey, channel);
    }

    // Return unsubscribe function
    return () => {
      // Remove listeners
      const msgListeners = this.messageListeners.get(conversationId) || [];
      const msgIndex = msgListeners.indexOf(onMessage);
      if (msgIndex > -1) {
        msgListeners.splice(msgIndex, 1);
      }

      if (onTyping) {
        const typingListeners = this.typingListeners.get(conversationId) || [];
        const typingIndex = typingListeners.indexOf(onTyping);
        if (typingIndex > -1) {
          typingListeners.splice(typingIndex, 1);
        }
      }

      // Remove channel if no more listeners
      if (msgListeners.length === 0) {
        const channel = this.channels.get(channelKey);
        if (channel) {
          channel.unsubscribe();
          this.channels.delete(channelKey);
        }
        this.messageListeners.delete(conversationId);
        this.typingListeners.delete(conversationId);
      }
    };
  }

  /**
   * Send a typing indicator
   */
  static async sendTypingIndicator(conversationId: string, userId: string, isTyping: boolean) {
    const channelKey = `conversation_${conversationId}`;
    const channel = this.channels.get(channelKey);

    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          conversation_id: conversationId,
          user_id: userId,
          is_typing: isTyping,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get or create a conversation between two users
   */
  static async getOrCreateConversation(userId1: string, userId2: string): Promise<string | null> {
    try {
      // Check if conversation exists
      const { data: existing, error: fetchError } = await supabaseClient
        .from('conversations')
        .select('id')
        .or(`and(user1_id.eq.${userId1},user2_id.eq.${userId2}),and(user1_id.eq.${userId2},user2_id.eq.${userId1})`)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching conversation:', fetchError);
        return null;
      }

      if (existing) {
        return existing.id;
      }

      // Create new conversation
      const { data: newConversation, error: createError } = await supabaseClient
        .from('conversations')
        .insert({
          user1_id: userId1,
          user2_id: userId2,
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        return null;
      }

      return newConversation.id;
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      return null;
    }
  }

  /**
   * Send a message
   */
  static async sendMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    messageText: string,
    messageType: 'text' | 'image' | 'video' | 'gift' | 'voice' = 'text',
    attachmentUrl?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabaseClient
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          receiver_id: receiverId,
          message_text: messageText,
          message_type: messageType,
          attachment_url: attachmentUrl,
          is_read: false
        });

      if (error) {
        console.error('Error sending message:', error);
        return false;
      }

      // Update conversation last_message_at
      const { error: updateError } = await supabaseClient
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (updateError) console.warn('Failed to update conversation timestamp:', updateError);

      return true;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return false;
    }
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(conversationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseClient
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markMessagesAsRead:', error);
      return false;
    }
  }

  /**
   * Get conversation messages
   */
  static async getConversationMessages(conversationId: string, limit: number = 50): Promise<RealtimeMessage[]> {
    try {
      const { data, error } = await supabaseClient
        .from('messages')
        .select(`
          *,
          sender_profile:user_profiles!messages_sender_id_fkey(full_name, photo_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return (data || []).reverse() as RealtimeMessage[];
    } catch (error) {
      console.error('Error in getConversationMessages:', error);
      return [];
    }
  }

  /**
   * Get user conversations
   */
  static async getUserConversations(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabaseClient
        .from('conversations')
        .select(`
          id,
          user1_id,
          user2_id,
          last_message_at,
          user1:user_profiles!conversations_user1_id_fkey(user_id, full_name, photo_url),
          user2:user_profiles!conversations_user2_id_fkey(user_id, full_name, photo_url),
          last_message:messages!messages_conversation_id_fkey(message_text, created_at, sender_id)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserConversations:', error);
      return [];
    }
  }

  /**
   * Get unread message count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabaseClient
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  }

  /**
   * Subscribe to unread count changes
   */
  static subscribeToUnreadCount(userId: string, callback: (count: number) => void): () => void {
    const channelName = `unread_count_${userId}`;

    // Remove existing channel if any
    if (this.channels.has(channelName)) {
      const oldChannel = this.channels.get(channelName);
      oldChannel?.unsubscribe();
      this.channels.delete(channelName);
    }

    const channel = supabaseClient
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        },
        async () => {
          const count = await this.getUnreadCount(userId);
          callback(count);
        }
      )
      .subscribe();

    // Track the channel for cleanup
    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * Clean up all subscriptions
   */
  static cleanup() {
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();
    this.messageListeners.clear();
    this.typingListeners.clear();
  }
}

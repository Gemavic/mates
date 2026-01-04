import { supabaseClient } from './supabase';
import type { Database } from './supabase';

// Database types
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type UserCredits = Database['public']['Tables']['user_credits']['Row'];
export type CreditTransaction = Database['public']['Tables']['credit_transactions']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type MailMessage = Database['public']['Tables']['mail_messages']['Row'];

// User Profile Management
export class ProfileManager {
  static async createProfile(userId: string, profileData: {
    email: string;
    full_name: string;
    age?: number;
    location?: string;
    occupation?: string;
    education?: string;
    bio?: string;
    interests?: string[];
  }) {
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .insert({
        user_id: userId,
        ...profileData,
        first_name: profileData.full_name.split(' ')[0]
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getProfile(userId: string) {
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>) {
    // First check if profile exists
    const { data: existingProfile } = await supabaseClient
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingProfile) {
      // Profile doesn't exist, create it
      const { data, error } = await supabaseClient
        .from('user_profiles')
        .insert({
          user_id: userId,
          ...updates,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Profile exists, update it
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getDiscoveryProfiles(currentUserId?: string, limit = 50) {
    // Build query to fetch profiles for discovery
    let query = supabaseClient
      .from('user_profiles')
      .select('*');

    // Only exclude current user if provided
    if (currentUserId) {
      query = query.neq('user_id', currentUserId);
    }

    // Show all profiles that are either public OR don't have visibility set (default to public)
    // This ensures we show all users unless they explicitly set their profile to private
    query = query.or('profile_visibility.eq.public,profile_visibility.is.null');

    // PRIORITIZE ONLINE USERS FIRST
    // Order by: 1) Online status (online first), 2) Last active (recent first), 3) Created date (newest first)
    const { data, error } = await query
      .order('is_online', { ascending: false })
      .order('last_active', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

}

// Credit System Management
export class CreditManager {
  static async getUserCredits(userId: string) {
    const { data, error } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return this.initializeUserCredits(userId);
    }

    return data;
  }

  static async initializeUserCredits(userId: string) {
    const { data, error } = await supabaseClient
      .from('user_credits')
      .insert({
        user_id: userId,
        complimentary_credits: 20,
        total_kobos: 20
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getTransactions(userId: string, limit = 50) {
    const { data, error } = await supabaseClient
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async spendCredits(userId: string, amount: number, description: string, category: string = 'general') {
    const { data, error } = await supabaseClient.rpc('spend_credits_atomic', {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
      p_category: category
    });

    if (error) {
      console.error('Failed to spend credits:', error);
      throw error;
    }

    const result = data as any;
    if (!result.success) {
      throw new Error(result.error || 'Failed to spend credits');
    }

    return true;
  }

  static async addCredits(userId: string, amount: number, description: string, isPurchased = false) {
    const { data: credits, error: creditsError } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (creditsError) throw creditsError;

    const updateData = isPurchased 
      ? { purchased_credits: credits.purchased_credits + amount }
      : { complimentary_credits: credits.complimentary_credits + amount };

    const { error: updateError } = await supabaseClient
      .from('user_credits')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // Record transaction
    const { error: transactionError } = await supabaseClient
      .from('credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'earn',
        amount,
        description
      });

    if (transactionError) throw transactionError;

    return true;
  }
}

// Matching System
export class MatchManager {
  static async likeUser(userId: string, targetUserId: string, likeType: 'like' | 'super_like' | 'pass' | 'blink') {
    const { data, error } = await supabaseClient
      .from('user_likes')
      .upsert({
        user_id: userId,
        target_user_id: targetUserId,
        like_type: likeType
      }, { 
        onConflict: 'user_id,target_user_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getUserMatches(userId: string) {
    const { data, error } = await supabaseClient
      .from('matches')
      .select(`
        *,
        user1:user_profiles!matches_user1_id_fkey(*),
        user2:user_profiles!matches_user2_id_fkey(*)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('is_active', true)
      .order('last_activity', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getLikesReceived(userId: string) {
    const { data, error } = await supabaseClient
      .from('user_likes')
      .select(`
        *,
        user_profile:user_profiles!user_likes_user_id_fkey(*)
      `)
      .eq('target_user_id', userId)
      .in('like_type', ['like', 'super_like'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

// Messaging System
export class MessagingManager {
  static async getChatThreads(userId: string) {
    const { data, error } = await supabaseClient
      .from('chat_threads')
      .select(`
        *,
        match:matches!inner(*),
        latest_message:chat_messages(message_text, created_at)
      `)
      .eq('matches.user1_id', userId)
      .or(`matches.user2_id.eq.${userId}`)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async sendChatMessage(threadId: string, senderId: string, message: string, creditsSpent = 0) {
    const { data, error } = await supabaseClient
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        sender_id: senderId,
        message_text: message,
        credits_spent: creditsSpent
      })
      .select()
      .single();

    if (error) throw error;

    // Update thread activity
    const { error: updateThreadError } = await supabaseClient
      .from('chat_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

    if (updateThreadError) console.warn('Failed to update thread activity:', updateThreadError);

    return data;
  }

  // Simple message sending that auto-creates thread if needed
  static async sendMessage(senderId: string, recipientId: string, message: string, creditsSpent: number = 0) {
    try {
      console.log('Sending message:', { senderId, recipientId, message, creditsSpent });

      // Ensure participants are in correct order for constraint
      const [participant1, participant2] = [senderId, recipientId].sort();

      // Find or create mail thread
      let { data: thread, error: threadError } = await supabaseClient
        .from('mail_threads')
        .select('id')
        .eq('participant1_id', participant1)
        .eq('participant2_id', participant2)
        .maybeSingle();

      if (threadError) {
        console.error('Thread lookup error:', threadError);
        throw threadError;
      }

      if (!thread) {
        console.log('Creating new thread between', participant1, 'and', participant2);
        // Create new thread
        const { data: newThread, error: createError } = await supabaseClient
          .from('mail_threads')
          .insert({
            participant1_id: participant1,
            participant2_id: participant2
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Thread creation error:', createError);
          throw createError;
        }
        thread = newThread;
      }

      console.log('Using thread:', thread.id);

      // Send message
      const { data: messageData, error: messageError } = await supabaseClient
        .from('mail_messages')
        .insert({
          thread_id: thread.id,
          sender_id: senderId,
          subject: 'Mail Message',
          message_text: message,
          credits_spent: creditsSpent
        })
        .select()
        .single();

      if (messageError) {
        console.error('Message insert error:', messageError);
        throw messageError;
      }

      console.log('Message inserted successfully:', messageData);

      // Update thread timestamp
      const { error: updateThreadError } = await supabaseClient
        .from('mail_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', thread.id);

      if (updateThreadError) {
        console.warn('Failed to update thread timestamp:', updateThreadError);
      }

      return { data: messageData, error: null };
    } catch (error) {
      console.error('Send message error:', error);
      return { data: null, error };
    }
  }

  static async getMailThreads(userId: string) {
    const { data, error } = await supabaseClient
      .from('mail_threads')
      .select(`
        *,
        latest_message:mail_messages(subject, message_text, created_at, is_read)
      `)
      .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async sendMailMessage(
    threadId: string, 
    senderId: string, 
    subject: string, 
    message: string, 
    creditsSpent = 0
  ) {
    const { data, error } = await supabaseClient
      .from('mail_messages')
      .insert({
        thread_id: threadId,
        sender_id: senderId,
        subject,
        message_text: message,
        credits_spent: creditsSpent
      })
      .select()
      .single();

    if (error) throw error;

    // Update thread activity
    const { error: updateThreadError } = await supabaseClient
      .from('mail_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

    if (updateThreadError) console.warn('Failed to update thread activity:', updateThreadError);

    return data;
  }
}

// Gift System
export class GiftManager {
  static async getGiftCatalog() {
    const { data, error } = await supabaseClient
      .from('virtual_gifts')
      .select('*')
      .eq('is_active', true)
      .order('popularity_score', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async sendGift(senderId: string, recipientId: string, giftId: string, creditsSpent: number, message = '') {
    const { data, error } = await supabaseClient
      .from('sent_gifts')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        gift_id: giftId,
        credits_spent: creditsSpent,
        message
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getReceivedGifts(userId: string) {
    const { data, error } = await supabaseClient
      .from('sent_gifts')
      .select(`
        *,
        gift:virtual_gifts(*),
        sender:user_profiles!sent_gifts_sender_id_fkey(*)
      `)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

// Utility functions
export const createUserProfile = ProfileManager.createProfile;
export const getUserProfile = ProfileManager.getProfile;
export const updateUserProfile = ProfileManager.updateProfile;
export const getDiscoveryProfiles = ProfileManager.getDiscoveryProfiles;

export const getUserCredits = CreditManager.getUserCredits;
export const spendCredits = CreditManager.spendCredits;
export const addCredits = CreditManager.addCredits;
export const getCreditTransactions = CreditManager.getTransactions;

export const likeUser = MatchManager.likeUser;
export const getUserMatches = MatchManager.getUserMatches;
export const getLikesReceived = MatchManager.getLikesReceived;

export const getChatThreads = MessagingManager.getChatThreads;
export const sendChatMessage = MessagingManager.sendChatMessage;
export const getMailThreads = MessagingManager.getMailThreads;
export const sendMailMessage = MessagingManager.sendMailMessage;

export const getGiftCatalog = GiftManager.getGiftCatalog;
export const sendGift = GiftManager.sendGift;
export const getReceivedGifts = GiftManager.getReceivedGifts;
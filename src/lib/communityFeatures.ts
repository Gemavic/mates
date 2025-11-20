import { supabase } from './supabase';

export interface SavedFavorite {
  id: string;
  user_id: string;
  content_type: 'date_idea' | 'blog_post' | 'quiz' | 'profile';
  content_id: string;
  content_data: any;
  saved_at: string;
  notes?: string;
}

export interface UserComment {
  id: string;
  user_id: string;
  content_type: string;
  content_id: string;
  comment_text: string;
  parent_comment_id?: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  is_deleted: boolean;
  user?: {
    email: string;
  };
}

export interface UserPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  newsletter_frequency: 'daily' | 'weekly' | 'monthly';
  favorite_topics: string[];
  privacy_settings: {
    profile_visible: boolean;
    show_activity: boolean;
  };
  updated_at: string;
}

export const communityFeatures = {
  async saveFavorite(
    userId: string,
    contentType: string,
    contentId: string,
    contentData: any,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('saved_favorites')
        .insert([{
          user_id: userId,
          content_type: contentType,
          content_id: contentId,
          content_data: contentData,
          notes
        }]);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error saving favorite:', error);
      return { success: false, error: error.message };
    }
  },

  async removeFavorite(
    userId: string,
    contentType: string,
    contentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('saved_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('content_type', contentType)
        .eq('content_id', contentId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      return { success: false, error: error.message };
    }
  },

  async getFavorites(
    userId: string,
    contentType?: string
  ): Promise<{ favorites: SavedFavorite[]; error?: string }> {
    try {
      let query = supabase
        .from('saved_favorites')
        .select('*')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { favorites: data || [] };
    } catch (error: any) {
      console.error('Error getting favorites:', error);
      return { favorites: [], error: error.message };
    }
  },

  async isFavorited(
    userId: string,
    contentType: string,
    contentId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('saved_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .maybeSingle();

      if (error) throw error;

      return !!data;
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  },

  async addComment(
    userId: string,
    contentType: string,
    contentId: string,
    commentText: string,
    parentCommentId?: string
  ): Promise<{ success: boolean; comment?: UserComment; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_comments')
        .insert([{
          user_id: userId,
          content_type: contentType,
          content_id: contentId,
          comment_text: commentText,
          parent_comment_id: parentCommentId
        }])
        .select()
        .single();

      if (error) throw error;

      return { success: true, comment: data };
    } catch (error: any) {
      console.error('Error adding comment:', error);
      return { success: false, error: error.message };
    }
  },

  async getComments(
    contentType: string,
    contentId: string,
    limit: number = 50
  ): Promise<{ comments: UserComment[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_comments')
        .select(`
          *,
          user:auth.users(email)
        `)
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { comments: data || [] };
    } catch (error: any) {
      console.error('Error getting comments:', error);
      return { comments: [], error: error.message };
    }
  },

  async likeComment(
    userId: string,
    commentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error: likeError } = await supabase
        .from('comment_likes')
        .insert([{
          user_id: userId,
          comment_id: commentId
        }]);

      if (likeError) throw likeError;

      const { error: updateError } = await supabase.rpc('increment_comment_likes', {
        comment_id: commentId
      });

      if (updateError) throw updateError;

      return { success: true };
    } catch (error: any) {
      console.error('Error liking comment:', error);
      return { success: false, error: error.message };
    }
  },

  async unlikeComment(
    userId: string,
    commentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error: unlikeError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('user_id', userId)
        .eq('comment_id', commentId);

      if (unlikeError) throw unlikeError;

      const { error: updateError } = await supabase.rpc('decrement_comment_likes', {
        comment_id: commentId
      });

      if (updateError) throw updateError;

      return { success: true };
    } catch (error: any) {
      console.error('Error unliking comment:', error);
      return { success: false, error: error.message };
    }
  },

  async hasLikedComment(
    userId: string,
    commentId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('comment_id', commentId)
        .maybeSingle();

      if (error) throw error;

      return !!data;
    } catch (error) {
      console.error('Error checking like status:', error);
      return false;
    }
  },

  async getUserPreferences(
    userId: string
  ): Promise<{ preferences?: UserPreferences; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        const { data: newPrefs, error: createError } = await supabase
          .from('user_preferences')
          .insert([{
            user_id: userId,
            email_notifications: true,
            push_notifications: true,
            newsletter_frequency: 'weekly',
            favorite_topics: [],
            privacy_settings: {
              profile_visible: true,
              show_activity: true
            }
          }])
          .select()
          .single();

        if (createError) throw createError;

        return { preferences: newPrefs };
      }

      return { preferences: data };
    } catch (error: any) {
      console.error('Error getting user preferences:', error);
      return { error: error.message };
    }
  },

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert([{
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error updating user preferences:', error);
      return { success: false, error: error.message };
    }
  }
};

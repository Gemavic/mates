import { createClient } from '@supabase/supabase-js';

// Environment variables only - no hardcoded fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase configuration missing. Please check your environment variables.');
  throw new Error('Supabase configuration is required. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

console.log('✅ Supabase configuration loaded successfully');

// Additional validation for API key format
if (supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ')) {
  console.error('❌ Invalid Supabase API key format. Please get your anon key from Supabase Dashboard > Settings > API');
}

// Check if using placeholder values or malformed JWT
if (supabaseAnonKey && (supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY_HERE') || supabaseAnonKey.split('.').length !== 3)) {
  console.error('❌ Please replace YOUR_SUPABASE_ANON_KEY_HERE with your actual anon key from Supabase Dashboard');
}

// Validate URL and key match
if (supabaseUrl && supabaseAnonKey) {
  try {
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    const keyPayload = JSON.parse(atob(supabaseAnonKey.split('.')[1]));
    
    if (urlMatch && keyPayload.ref && urlMatch[1] !== keyPayload.ref) {
      console.warn('Supabase URL and API key mismatch. Please ensure both belong to the same project.');
    }
  } catch (error) {
    console.warn('Could not validate Supabase configuration:', error);
  }
}
// Create Supabase client with validated configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'dates-care-app'
    }
  }
});

// Export supabase as supabaseClient for backward compatibility
export const supabaseClient = supabase;

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          user_id: string;
          email: string | null;
          full_name: string | null;
          first_name: string | null;
          age: number | null;
          location: string | null;
          occupation: string | null;
          education: string | null;
          bio: string | null;
          interests: any;
          looking_for: string | null;
          distance_preference: number | null;
          age_range_min: number | null;
          age_range_max: number | null;
          is_verified: boolean;
          verification_status: string | null;
          is_online: boolean;
          last_active: string | null;
          show_online_status: boolean;
          profile_visibility: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email?: string | null;
          full_name: string;
          first_name?: string | null;
          age?: number | null;
          location?: string | null;
          occupation?: string | null;
          education?: string | null;
          bio?: string;
          interests?: string[];
          looking_for?: string;
          distance_preference?: number;
          age_range_min?: number;
          age_range_max?: number;
          is_verified?: boolean;
          verification_status?: string;
          is_online?: boolean;
          last_active?: string;
          show_online_status?: boolean;
          profile_visibility?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string;
          first_name?: string | null;
          age?: number | null;
          location?: string | null;
          occupation?: string | null;
          education?: string | null;
          bio?: string;
          interests?: string[];
          looking_for?: string;
          distance_preference?: number;
          age_range_min?: number;
          age_range_max?: number;
          is_verified?: boolean;
          verification_status?: string;
          is_online?: boolean;
          last_active?: string;
          show_online_status?: boolean;
          profile_visibility?: string;
          updated_at?: string;
        };
      };
      user_credits: {
        Row: {
          id: string;
          user_id: string;
          complimentary_credits: number;
          purchased_credits: number;
          total_kobos: number;
          daily_bonus_last_claimed: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          complimentary_credits?: number;
          purchased_credits?: number;
          total_kobos?: number;
          daily_bonus_last_claimed?: string | null;
        };
        Update: {
          complimentary_credits?: number;
          purchased_credits?: number;
          total_kobos?: number;
          daily_bonus_last_claimed?: string | null;
          updated_at?: string;
        };
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          transaction_type: string;
          amount: number;
          description: string;
          category: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          transaction_type: string;
          amount: number;
          description: string;
          category?: string;
        };
        Update: {
          transaction_type?: string;
          amount?: number;
          description?: string;
          category?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          matched_at: string;
          is_active: boolean;
          last_activity: string;
        };
        Insert: {
          user1_id: string;
          user2_id: string;
          matched_at?: string;
          is_active?: boolean;
          last_activity?: string;
        };
        Update: {
          is_active?: boolean;
          last_activity?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          message_text: string;
          message_type: string;
          media_url: string | null;
          credits_spent: number;
          is_edited: boolean;
          edited_at: string | null;
          created_at: string;
        };
        Insert: {
          thread_id: string;
          sender_id: string;
          message_text: string;
          message_type?: string;
          media_url?: string | null;
          credits_spent?: number;
          is_edited?: boolean;
          edited_at?: string | null;
        };
        Update: {
          message_text?: string;
          is_edited?: boolean;
          edited_at?: string | null;
        };
      };
      mail_messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          subject: string | null;
          message_text: string;
          has_photos: boolean;
          photo_urls: string[];
          credits_spent: number;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          thread_id: string;
          sender_id: string;
          subject?: string | null;
          message_text: string;
          has_photos?: boolean;
          photo_urls?: string[];
          credits_spent?: number;
          is_read?: boolean;
          read_at?: string | null;
        };
        Update: {
          is_read?: boolean;
          read_at?: string | null;
        };
      };
      virtual_gifts: {
        Row: {
          id: string;
          gift_name: string;
          gift_emoji: string;
          price_credits: number;
          category: string;
          description: string | null;
          popularity_score: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          gift_name: string;
          gift_emoji: string;
          price_credits: number;
          category: string;
          description?: string | null;
          popularity_score?: number;
          is_active?: boolean;
        };
        Update: {
          gift_name?: string;
          gift_emoji?: string;
          price_credits?: number;
          category?: string;
          description?: string | null;
          popularity_score?: number;
          is_active?: boolean;
        };
      };
      user_photos: {
        Row: {
          id: string;
          user_id: string;
          photo_url: string;
          is_primary: boolean;
          upload_order: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          photo_url: string;
          is_primary?: boolean;
          upload_order?: number;
        };
        Update: {
          photo_url?: string;
          is_primary?: boolean;
          upload_order?: number;
        };
      };
    };
    Views: {
    };
  };
};
import { createClient } from '@supabase/supabase-js';

// Environment variables - with logging for debugging
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Log environment variable status (not values) for debugging
console.log('Supabase Config Status:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING',
  keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING'
});

// Validate configuration without throwing - allow app to load
let configError: string | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  configError = 'Supabase configuration is missing. Please check environment variables.';
  console.error('CRITICAL: Supabase configuration missing.');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.');
} else if (!supabaseAnonKey.startsWith('eyJ')) {
  configError = 'Invalid Supabase API key format.';
  console.error('Invalid API key format - must start with eyJ');
} else if (supabaseAnonKey.split('.').length !== 3) {
  configError = 'Invalid Supabase API key structure.';
  console.error('API key must have 3 parts separated by dots');
} else {
  console.log('Supabase configuration validated successfully');
}

// Export configuration error for checking in App
export const supabaseConfigError = configError;

// Create Supabase client - use placeholder if missing to prevent runtime errors
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwbGFjZWhvbGRlciJ9.placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
      storageKey: 'dates-auth-token',
      storage: {
        getItem: (key) => {
          try {
            return localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, value);
          } catch {
            console.warn('Failed to store auth token');
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
          } catch {
            console.warn('Failed to remove auth token');
          }
        }
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'dates-care-app'
      }
    }
  }
);

// Add global error handler for auth issues
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    console.warn('Token refresh failed, clearing session');
    supabase.auth.signOut().catch(console.warn);
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
          display_order: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          photo_url: string;
          is_primary?: boolean;
          display_order?: number;
        };
        Update: {
          photo_url?: string;
          is_primary?: boolean;
          display_order?: number;
        };
      };
    };
    Views: {
    };
  };
};
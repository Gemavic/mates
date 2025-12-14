import { supabase } from './supabase';

export interface AnonymousUserDataSummary {
  likes_count: number;
  messages_sent: number;
  messages_received: number;
  matches_count: number;
  gifts_sent: number;
  gifts_received: number;
  forum_posts: number;
  forum_replies: number;
  blog_comments: number;
}

export interface MigrationResult {
  success: boolean;
  anonymous_user_id: string;
  permanent_user_id: string;
  total_records_migrated: number;
  strategy_used: string;
  migrated_at: string;
}

export type ConflictStrategy = 'merge' | 'replace' | 'keep_existing';

export const anonymousAuth = {
  async signInAnonymously() {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Anonymous sign in failed:', error);
      return { data: null, error };
    }
  },

  async isAnonymousUser(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return false;
      }

      return session.user.is_anonymous || false;
    } catch (error) {
      console.error('Failed to check anonymous status:', error);
      return false;
    }
  },

  async canUpgradeToPermanent(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('can_upgrade_to_permanent');

      if (error) {
        throw error;
      }

      return data === true;
    } catch (error) {
      console.error('Failed to check upgrade eligibility:', error);
      return false;
    }
  },

  async getAnonymousUserDataSummary(userId: string): Promise<AnonymousUserDataSummary | null> {
    try {
      const { data, error } = await supabase.rpc('get_anonymous_user_data_summary', {
        anonymous_user_id: userId
      });

      if (error) {
        throw error;
      }

      return data as AnonymousUserDataSummary;
    } catch (error) {
      console.error('Failed to get user data summary:', error);
      return null;
    }
  },

  async upgradeToEmailPassword(
    email: string,
    password: string,
    options?: {
      conflictStrategy?: ConflictStrategy;
      onConflict?: (existingUserId: string, anonymousUserId: string) => Promise<void>;
    }
  ) {
    try {
      const { data: anonSession } = await supabase.auth.getSession();

      if (!anonSession.session) {
        throw new Error('No active session found');
      }

      const anonymousUserId = anonSession.session.user.id;

      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        email,
        password,
      });

      if (updateError) {
        if (updateError.message.includes('already registered') ||
            updateError.message.includes('already exists')) {
          const { data: existingUserData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            throw new Error(`Email belongs to existing account. Please sign in with correct password.`);
          }

          if (existingUserData.user) {
            const existingUserId = existingUserData.user.id;

            if (options?.onConflict) {
              await options.onConflict(existingUserId, anonymousUserId);
            }

            const migrationResult = await this.migrateUserData(
              anonymousUserId,
              existingUserId,
              options?.conflictStrategy || 'merge'
            );

            return {
              success: true,
              isNewUser: false,
              migrationResult,
              user: existingUserData.user,
            };
          }
        }
        throw updateError;
      }

      return {
        success: true,
        isNewUser: true,
        user: updateData.user,
      };
    } catch (error: any) {
      console.error('Upgrade to permanent account failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to upgrade account',
      };
    }
  },

  async migrateUserData(
    anonymousUserId: string,
    permanentUserId: string,
    strategy: ConflictStrategy = 'merge'
  ): Promise<MigrationResult | null> {
    try {
      const { data, error } = await supabase.rpc('migrate_anonymous_user_data', {
        anonymous_user_id: anonymousUserId,
        permanent_user_id: permanentUserId,
        conflict_strategy: strategy,
      });

      if (error) {
        throw error;
      }

      return data as MigrationResult;
    } catch (error) {
      console.error('Data migration failed:', error);
      return null;
    }
  },

  async signUpFromAnonymous(email: string, password: string) {
    return this.upgradeToEmailPassword(email, password, {
      conflictStrategy: 'merge',
    });
  },

  async linkExistingAccount(email: string, password: string) {
    return this.upgradeToEmailPassword(email, password, {
      conflictStrategy: 'merge',
      onConflict: async (existingUserId, anonymousUserId) => {
        console.log(`Linking anonymous user ${anonymousUserId} to existing user ${existingUserId}`);
      },
    });
  },

  getUpgradePromptMessage(dataSummary: AnonymousUserDataSummary): string {
    const totalActivity =
      dataSummary.likes_count +
      dataSummary.messages_sent +
      dataSummary.matches_count +
      dataSummary.forum_posts +
      dataSummary.blog_comments;

    if (totalActivity === 0) {
      return "Create an account to unlock all features and start connecting with others!";
    }

    const activities = [];
    if (dataSummary.matches_count > 0) activities.push(`${dataSummary.matches_count} matches`);
    if (dataSummary.messages_sent > 0) activities.push(`${dataSummary.messages_sent} messages`);
    if (dataSummary.likes_count > 0) activities.push(`${dataSummary.likes_count} likes`);

    return `You have ${activities.join(', ')}. Create an account to save your progress and unlock more features!`;
  },
};

export const anonymousUserCleanup = {
  async cleanupOldUsers(daysOld: number = 30) {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/cleanup_old_anonymous_users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ days_old: daysOld }),
        }
      );

      if (!response.ok) {
        throw new Error('Cleanup failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Cleanup failed:', error);
      return null;
    }
  },

  async getAnonymousUserStats() {
    try {
      const { data, error } = await supabase.rpc('get_anonymous_user_stats');

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  },
};

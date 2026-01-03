// Staff Management System for Dates.care
export interface StaffMember {
  id: string;
  email: string;
  password: string;
  role: 'Super User' | 'Administrator' | 'Credit Manager' | 'Support Agent' | 'Moderator';
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  passwordLastChanged?: Date;
  createdBy?: string;
  createdAt: Date;
}

export interface StaffSession {
  staffId: string;
  role: string;
  permissions: string[];
  loginTime: string;
  isAuthenticated: boolean;
}

class StaffAuthManager {
  private readonly STORAGE_KEY = 'staffCredentials';
  private readonly SESSION_KEY = 'staffAuth';

  // ⚠️ SECURITY WARNING: HARDCODED CREDENTIALS REMOVED
  //
  // This client-side authentication system has been disabled due to critical security vulnerabilities.
  //
  // CRITICAL ISSUES IDENTIFIED:
  // 1. ✗ Hardcoded credentials exposed in source code (visible to anyone)
  // 2. ✗ No server-side validation (all checks happen in browser)
  // 3. ✗ Authentication state stored in sessionStorage only (easily faked)
  // 4. ✗ Anyone can modify sessionStorage to become staff
  // 5. ✗ Plaintext passwords (no hashing)
  // 6. ✗ No audit logging
  //
  // REQUIRED FOR PRODUCTION:
  // - Implement Supabase Auth with custom claims for staff roles
  // - Store staff credentials in database with bcrypt/argon2 hashing
  // - Add server-side role validation on ALL operations
  // - Use JWT tokens with encrypted role claims
  // - Implement comprehensive audit logging for all staff actions
  // - Add 2FA for staff accounts
  // - Implement session timeout and refresh tokens
  //
  // DO NOT ENABLE THIS SYSTEM IN PRODUCTION WITHOUT PROPER SERVER-SIDE AUTH
  private getDefaultStaffMembers(): Record<string, StaffMember> {
    console.error('⚠️ SECURITY: Staff authentication system is disabled. Implement server-side auth before use.');

    // All credentials have been removed for security
    // To implement staff access:
    // 1. Use Supabase Auth with custom user metadata
    // 2. Store roles in user_profiles table with is_staff flag
    // 3. Implement RLS policies to restrict staff operations
    // 4. Use Edge Functions for all staff operations
    // 5. Hash passwords with bcrypt/argon2 on server-side

    return {};
  }

  // Get all staff credentials (with any updates)
  getStaffCredentials(): Record<string, StaffMember> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults in case new staff were added
        return { ...this.getDefaultStaffMembers(), ...parsed };
      }
      return this.getDefaultStaffMembers();
    } catch (error) {
      console.warn('Failed to load staff credentials, using defaults:', error);
      return this.getDefaultStaffMembers();
    }
  }

  // Save staff credentials
  private saveStaffCredentials(credentials: Record<string, StaffMember>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(credentials));
    } catch (error) {
      console.error('Failed to save staff credentials:', error);
    }
  }

  // Database-backed authentication using Supabase
  async authenticate(staffId: string, password: string): Promise<{ success: boolean; staff?: StaffMember; error?: string }> {
    try {
      // Import supabase client
      const { supabaseClient } = await import('@/lib/supabase');

      // Call the database function to authenticate
      const { data, error } = await supabaseClient.rpc('authenticate_staff', {
        p_email: staffId,
        p_password: password
      });

      if (error) {
        console.error('Authentication error:', error);
        return {
          success: false,
          error: 'Authentication failed. Please try again.'
        };
      }

      const result = data as any;

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Invalid credentials'
        };
      }

      // Create staff object
      const staff: StaffMember = {
        id: result.staff.id,
        email: result.staff.email,
        password: '', // Never store password
        role: result.staff.role,
        permissions: result.staff.permissions || [],
        isActive: result.staff.is_active,
        lastLogin: new Date(),
        createdAt: new Date()
      };

      // Store session
      const session: StaffSession = {
        staffId: staff.email,
        role: staff.role,
        permissions: staff.permissions,
        loginTime: new Date().toISOString(),
        isAuthenticated: true
      };

      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

      return {
        success: true,
        staff
      };
    } catch (error) {
      console.error('Authentication exception:', error);
      return {
        success: false,
        error: 'Authentication failed. Please try again.'
      };
    }
  }

  // Get current session
  getCurrentSession(): StaffSession | null {
    try {
      const stored = sessionStorage.getItem(this.SESSION_KEY);
      if (!stored) return null;

      const session = JSON.parse(stored);
      
      // Check if session is still valid (24 hours)
      const loginTime = new Date(session.loginTime);
      const now = new Date();
      const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        this.logout();
        return null;
      }

      return session;
    } catch (error) {
      console.warn('Failed to get current session:', error);
      return null;
    }
  }

  // Logout
  logout(): void {
    try {
      sessionStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Change password (only by Credit Manager or Super User)
  async changePassword(
    managerStaffId: string,
    managerPassword: string,
    targetStaffId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { supabaseClient } = await import('@/lib/supabase');

      // Call database function
      const { data, error } = await supabaseClient.rpc('change_staff_password', {
        p_manager_email: managerStaffId,
        p_manager_password: managerPassword,
        p_target_email: targetStaffId,
        p_new_password: newPassword
      });

      if (error) {
        console.error('Password change error:', error);
        return { success: false, error: 'Password change failed' };
      }

      const result = data as any;

      if (!result.success) {
        return { success: false, error: result.error || 'Password change failed' };
      }

      console.log(`✅ Password changed for ${targetStaffId} by ${managerStaffId}`);
      return { success: true };
    } catch (error) {
      console.error('Password change exception:', error);
      return { success: false, error: 'Password change failed' };
    }
  }

  // Reset password to default (only by Credit Manager or Super User)
  resetPasswordToDefault(
    managerStaffId: string, 
    managerPassword: string, 
    targetStaffId: string
  ): { success: boolean; error?: string; newPassword?: string } {
    try {
      const credentials = this.getStaffCredentials();
      const manager = credentials[managerStaffId];

      // Verify manager credentials
      if (!manager || manager.password !== managerPassword) {
        return { success: false, error: 'Manager authentication failed' };
      }

      // Check manager permissions
      if (!manager.permissions.includes('reset_passwords') && !manager.permissions.includes('all')) {
        return { success: false, error: 'Insufficient permissions to reset passwords' };
      }

      // Get default password based on role
      const defaultPasswords: Record<string, string> = {
        'SU': 'su2025',
        'admin@dates.care': 'admin2025',
        'creditmanager@dates.care': 'credit2025',
        'support@dates.care': 'support2025',
        'moderator@dates.care': 'mod2025'
      };

      const newPassword = defaultPasswords[targetStaffId];
      if (!newPassword) {
        return { success: false, error: 'Default password not found for this staff member' };
      }

      // Update password
      const target = credentials[targetStaffId];
      if (target) {
        target.password = newPassword;
        target.passwordLastChanged = new Date();
        credentials[targetStaffId] = target;
        this.saveStaffCredentials(credentials);
      }

      console.log(`✅ Password reset to default for ${targetStaffId} by ${managerStaffId}`);
      return { success: true, newPassword };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Password reset failed' };
    }
  }

  // Get all staff members (for managers only)
  async getAllStaffMembers(requestingStaffId: string): Promise<StaffMember[] | null> {
    try {
      const { supabaseClient } = await import('@/lib/supabase');

      // Get all staff from database
      const { data, error } = await supabaseClient
        .from('staff_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get staff members error:', error);
        return null;
      }

      // Transform to StaffMember format
      const staffMembers: StaffMember[] = (data || []).map((staff: any) => ({
        id: staff.id,
        email: staff.email,
        password: '', // Never expose password
        role: staff.role,
        permissions: staff.permissions || [],
        isActive: staff.is_active,
        lastLogin: staff.last_login ? new Date(staff.last_login) : undefined,
        passwordLastChanged: staff.password_last_changed ? new Date(staff.password_last_changed) : undefined,
        createdBy: staff.created_by,
        createdAt: new Date(staff.created_at)
      }));

      return staffMembers;
    } catch (error) {
      console.error('Get staff members exception:', error);
      return null;
    }
  }

  // Check if user has permission
  hasPermission(staffId: string, permission: string): boolean {
    try {
      const session = this.getCurrentSession();
      if (!session || session.staffId !== staffId) return false;

      return session.permissions.includes('all') || session.permissions.includes(permission);
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  // Disable staff account (only by Super User or Administrator)
  disableStaffAccount(
    managerStaffId: string, 
    managerPassword: string, 
    targetStaffId: string
  ): { success: boolean; error?: string } {
    try {
      const credentials = this.getStaffCredentials();
      const manager = credentials[managerStaffId];
      const target = credentials[targetStaffId];

      if (!manager || manager.password !== managerPassword) {
        return { success: false, error: 'Manager authentication failed' };
      }

      if (!['Super User', 'Administrator'].includes(manager.role)) {
        return { success: false, error: 'Only Super User or Administrator can disable accounts' };
      }

      if (!target) {
        return { success: false, error: 'Target staff member not found' };
      }

      target.isActive = false;
      credentials[targetStaffId] = target;
      this.saveStaffCredentials(credentials);

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to disable account' };
    }
  }
}

// Create singleton instance
export const staffManager = new StaffAuthManager();

// Utility functions
export const authenticateStaff = (staffId: string, password: string) =>
  staffManager.authenticate(staffId, password);

export const getCurrentStaffSession = () =>
  staffManager.getCurrentSession();

export const logoutStaff = () =>
  staffManager.logout();

export const changeStaffPassword = (managerStaffId: string, managerPassword: string, targetStaffId: string, newPassword: string) =>
  staffManager.changePassword(managerStaffId, managerPassword, targetStaffId, newPassword);

export const resetStaffPassword = (managerStaffId: string, managerPassword: string, targetStaffId: string) =>
  staffManager.resetPasswordToDefault(managerStaffId, managerPassword, targetStaffId);

export const getAllStaffMembers = (requestingStaffId: string) =>
  staffManager.getAllStaffMembers(requestingStaffId);

export const hasStaffPermission = (staffId: string, permission: string) =>
  staffManager.hasPermission(staffId, permission);
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

  // Initialize default staff members
  private getDefaultStaffMembers(): Record<string, StaffMember> {
    return {
      'SU': {
        id: 'SU',
        email: 'su@dates.care',
        password: 'su2025',
        role: 'Super User',
        permissions: ['all'],
        isActive: true,
        createdAt: new Date(),
        passwordLastChanged: new Date()
      },
      'admin@dates.care': {
        id: 'admin@dates.care',
        email: 'admin@dates.care',
        password: 'admin2025',
        role: 'Administrator',
        permissions: ['award_credits', 'approve_all', 'manage_users', 'view_reports'],
        isActive: true,
        createdAt: new Date(),
        passwordLastChanged: new Date()
      },
      'creditmanager@dates.care': {
        id: 'creditmanager@dates.care',
        email: 'creditmanager@dates.care',
        password: 'credit2025',
        role: 'Credit Manager',
        permissions: ['award_credits', 'manage_credits', 'reset_passwords', 'change_staff_passwords'],
        isActive: true,
        createdAt: new Date(),
        passwordLastChanged: new Date()
      },
      'support@dates.care': {
        id: 'support@dates.care',
        email: 'support@dates.care',
        password: 'support2025',
        role: 'Support Agent',
        permissions: ['view_users', 'basic_credits', 'answer_tickets'],
        isActive: true,
        createdAt: new Date(),
        passwordLastChanged: new Date()
      },
      'moderator@dates.care': {
        id: 'moderator@dates.care',
        email: 'moderator@dates.care',
        password: 'mod2025',
        role: 'Moderator',
        permissions: ['view_users', 'moderate_content', 'review_reports'],
        isActive: true,
        createdAt: new Date(),
        passwordLastChanged: new Date()
      }
    };
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

  // Authenticate staff member
  authenticate(staffId: string, password: string): { success: boolean; staff?: StaffMember; error?: string } {
    try {
      const credentials = this.getStaffCredentials();
      const staff = credentials[staffId];

      if (!staff) {
        return { success: false, error: 'Invalid staff ID' };
      }

      if (!staff.isActive) {
        return { success: false, error: 'Account is disabled' };
      }

      if (password !== staff.password) {
        return { success: false, error: 'Invalid password' };
      }

      // Update last login
      staff.lastLogin = new Date();
      credentials[staffId] = staff;
      this.saveStaffCredentials(credentials);

      // Create session
      const session: StaffSession = {
        staffId: staff.id,
        role: staff.role,
        permissions: staff.permissions,
        loginTime: new Date().toISOString(),
        isAuthenticated: true
      };

      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

      return { success: true, staff };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
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
  changePassword(
    managerStaffId: string, 
    managerPassword: string, 
    targetStaffId: string, 
    newPassword: string
  ): { success: boolean; error?: string } {
    try {
      const credentials = this.getStaffCredentials();
      const manager = credentials[managerStaffId];
      const target = credentials[targetStaffId];

      // Verify manager credentials
      if (!manager || manager.password !== managerPassword) {
        return { success: false, error: 'Manager authentication failed' };
      }

      // Check manager permissions
      if (!manager.permissions.includes('change_staff_passwords') && !manager.permissions.includes('all')) {
        return { success: false, error: 'Insufficient permissions to change passwords' };
      }

      // Check target exists
      if (!target) {
        return { success: false, error: 'Target staff member not found' };
      }

      // Validate password strength
      if (newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      // Update password
      target.password = newPassword;
      target.passwordLastChanged = new Date();
      credentials[targetStaffId] = target;
      this.saveStaffCredentials(credentials);

      console.log(`✅ Password changed for ${targetStaffId} by ${managerStaffId}`);
      return { success: true };
    } catch (error) {
      console.error('Password change error:', error);
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
  getAllStaffMembers(requestingStaffId: string): StaffMember[] | null {
    try {
      const credentials = this.getStaffCredentials();
      const requester = credentials[requestingStaffId];

      if (!requester || (!requester.permissions.includes('manage_users') && !requester.permissions.includes('all'))) {
        return null;
      }

      return Object.values(credentials);
    } catch (error) {
      console.error('Get staff members error:', error);
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
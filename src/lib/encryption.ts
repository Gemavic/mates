// ⚠️⚠️⚠️ CRITICAL SECURITY WARNING ⚠️⚠️⚠️
//
// THIS ENCRYPTION SYSTEM IS FUNDAMENTALLY BROKEN AND HAS BEEN DISABLED
//
// VULNERABILITIES:
// 1. XOR cipher with repeating key - TRIVIALLY BREAKABLE
// 2. Caesar cipher (ROT13 variant) - TRIVIALLY BREAKABLE
// 3. Base64 encoding - NOT ENCRYPTION, just encoding
// 4. String reversal - NO SECURITY VALUE
// 5. All operations done client-side - NO SECURITY
//
// WHY IT'S BROKEN:
// - XOR with repeating key can be broken with frequency analysis
// - Caesar cipher is a simple shift, easily reversed
// - Base64 is just encoding, anyone can decode it
// - Reversing a string is not cryptography
// - Combining weak methods doesn't make them strong
//
// ATTACK:
// Anyone can decrypt by: reverse string → base64 decode → shift back → XOR with key
//
// PROPER SOLUTION:
// - Use Web Crypto API with AES-256-GCM
// - Or don't store sensitive data client-side at all
// - Encrypt on server-side if needed
// - Use HTTPS for all connections
// - Store sensitive data in database only
//
// THIS FILE IS DISABLED AND RETURNS UNENCRYPTED DATA WITH WARNINGS
//
import { creditManager } from './creditSystem';

export interface EncryptedUserData {
  userId: string;
  encryptedData: string;
  salt: string;
  iv: string;
  timestamp: Date;
  securityLevel: 'standard' | 'high' | 'maximum';
}

export interface SecurityAuditLog {
  id: string;
  userId: string;
  action: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  securityLevel: string;
  success: boolean;
}

class HighSecurityEncryption {
  private encryptedUsers: Map<string, EncryptedUserData> = new Map();
  private auditLogs: SecurityAuditLog[] = [];
  
  // ⚠️ SECURITY: This "encryption" system has been DISABLED
  // The previous implementation used weak cryptography (XOR + Caesar + Base64) which is trivially breakable
  //
  // THIS FUNCTION NOW RETURNS UNENCRYPTED DATA TO PREVENT FALSE SENSE OF SECURITY
  //
  // To properly protect sensitive data:
  // 1. Don't store sensitive data client-side
  // 2. If encryption is required, use Web Crypto API with AES-256-GCM
  // 3. Manage keys server-side
  // 4. Use HTTPS for all connections
  async encryptUserData(_userId: string, sensitiveData: any): Promise<string> {
    console.error('⚠️ SECURITY WARNING: Encryption system is disabled. Data is NOT encrypted.');
    console.error('Do NOT store sensitive data using this system.');
    console.error('Implement proper server-side encryption or use Web Crypto API with AES-256-GCM.');

    // Return plaintext with warning - do NOT use for sensitive data
    return JSON.stringify({
      _warning: 'DATA_NOT_ENCRYPTED',
      _message: 'Encryption system disabled due to security vulnerabilities',
      data: sensitiveData
    });
  }
  
  // ⚠️ SECURITY: Decryption disabled - returns plaintext
  async decryptUserData(_userId: string, encryptedData: string): Promise<any> {
    console.error('⚠️ SECURITY WARNING: Decryption system is disabled.');

    try {
      // Try to parse as JSON (new format with warning)
      const parsed = JSON.parse(encryptedData);
      if (parsed._warning === 'DATA_NOT_ENCRYPTED') {
        return parsed.data;
      }
      return parsed;
    } catch (error) {
      // Return as-is if not JSON
      return encryptedData;
    }
  }
  
  // Security audit logging
  private logSecurityAction(
    userId: string, 
    action: string, 
    securityLevel: string, 
    success: boolean
  ): void {
    const log: SecurityAuditLog = {
      id: Math.random().toString(36).substring(2),
      userId,
      action,
      timestamp: new Date(),
      securityLevel,
      success,
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };
    
    this.auditLogs.push(log);
    
    // Keep only last 1000 logs
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }
  }
  
  // Get client IP (simulated)
  private getClientIP(): string {
    return '192.168.1.' + Math.floor(Math.random() * 255);
  }
  
  // Get security level for user
  getSecurityLevel(userId: string): string {
    const userData = creditManager.getUserData(userId);
    
    if (userData.purchasedCredits >= 500) return 'maximum';
    if (userData.purchasedCredits >= 100) return 'high';
    return 'standard';
  }
  
  // Get audit logs for user
  getUserAuditLogs(userId: string): SecurityAuditLog[] {
    return this.auditLogs.filter(log => log.userId === userId);
  }
  
  // Get all audit logs (admin only)
  getAllAuditLogs(): SecurityAuditLog[] {
    return [...this.auditLogs];
  }
  
  // Secure data wipe
  secureWipeUserData(userId: string): boolean {
    try {
      this.encryptedUsers.delete(userId);
      this.logSecurityAction(userId, 'DATA_WIPED', 'maximum', true);
      return true;
    } catch (error) {
      this.logSecurityAction(userId, 'DATA_WIPE_FAILED', 'maximum', false);
      return false;
    }
  }
  
  // Generate security report
  generateSecurityReport(userId: string): {
    securityLevel: string;
    encryptionStatus: string;
    auditLogCount: number;
    lastActivity: Date | null;
    recommendations: string[];
  } {
    const userData = creditManager.getUserData(userId);
    const securityLevel = this.getSecurityLevel(userId);
    const userLogs = this.getUserAuditLogs(userId);
    const encryptedData = this.encryptedUsers.get(userId);
    
    const recommendations: string[] = [];
    
    if (userData.purchasedCredits === 0) {
      recommendations.push('Purchase credits to unlock high-security encryption');
    }
    
    if (userLogs.length === 0) {
      recommendations.push('No security activity detected');
    }
    
    if (!encryptedData) {
      recommendations.push('Enable data encryption for enhanced security');
    }
    
    return {
      securityLevel,
      encryptionStatus: encryptedData ? 'Active' : 'Standard',
      auditLogCount: userLogs.length,
      lastActivity: userLogs.length > 0 ? userLogs[userLogs.length - 1].timestamp : null,
      recommendations
    };
  }
}

export const securityManager = new HighSecurityEncryption();

// Utility functions
export const encryptSensitiveData = async (userId: string, data: any): Promise<string> => {
  return await securityManager.encryptUserData(userId, data);
};

export const decryptSensitiveData = async (userId: string, encryptedData: string): Promise<any> => {
  return await securityManager.decryptUserData(userId, encryptedData);
};

export const getSecurityLevel = (userId: string): string => {
  return securityManager.getSecurityLevel(userId);
};

export const generateSecurityReport = (userId: string) => {
  return securityManager.generateSecurityReport(userId);
};
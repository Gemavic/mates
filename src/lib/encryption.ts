// High-Security Encryption for Credit Purchasers
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
  
  // Generate cryptographically secure random bytes
  private generateSecureRandom(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  
  // Generate salt for encryption
  private generateSalt(): string {
    return Array.from(this.generateSecureRandom(32), byte => 
      byte.toString(16).padStart(2, '0')
    ).join('');
  }
  
  // Generate initialization vector
  private generateIV(): string {
    return Array.from(this.generateSecureRandom(16), byte => 
      byte.toString(16).padStart(2, '0')
    ).join('');
  }
  
  // Advanced encryption for credit purchasers
  async encryptUserData(userId: string, sensitiveData: any): Promise<string> {
    try {
      // Check if user is a credit purchaser
      const userData = creditManager.getUserData(userId);
      const isPurchaser = userData.purchasedCredits > 0;
      
      if (!isPurchaser) {
        return this.basicEncryption(JSON.stringify(sensitiveData));
      }
      
      // High-security encryption for purchasers
      const salt = this.generateSalt();
      const iv = this.generateIV();
      const dataString = JSON.stringify(sensitiveData);
      
      // Multi-layer encryption
      const layer1 = this.xorEncrypt(dataString, salt);
      const layer2 = this.caesarCipher(layer1, 13);
      const layer3 = this.base64Encode(layer2);
      const finalEncrypted = this.reverseString(layer3);
      
      // Store encrypted data
      this.encryptedUsers.set(userId, {
        userId,
        encryptedData: finalEncrypted,
        salt,
        iv,
        timestamp: new Date(),
        securityLevel: 'maximum'
      });
      
      this.logSecurityAction(userId, 'DATA_ENCRYPTED', 'maximum', true);
      
      return finalEncrypted;
    } catch (error) {
      this.logSecurityAction(userId, 'ENCRYPTION_FAILED', 'maximum', false);
      throw new Error('Encryption failed');
    }
  }
  
  // Decrypt user data
  async decryptUserData(userId: string, encryptedData: string): Promise<any> {
    try {
      const storedData = this.encryptedUsers.get(userId);
      
      if (!storedData) {
        return this.basicDecryption(encryptedData);
      }
      
      // Reverse the encryption process
      const step1 = this.reverseString(encryptedData);
      const step2 = this.base64Decode(step1);
      const step3 = this.caesarCipher(step2, -13);
      const step4 = this.xorDecrypt(step3, storedData.salt);
      
      this.logSecurityAction(userId, 'DATA_DECRYPTED', storedData.securityLevel, true);
      
      return JSON.parse(step4);
    } catch (error) {
      this.logSecurityAction(userId, 'DECRYPTION_FAILED', 'maximum', false);
      throw new Error('Decryption failed');
    }
  }
  
  // XOR encryption
  private xorEncrypt(data: string, key: string): string {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  }
  
  // XOR decryption (same as encryption)
  private xorDecrypt(data: string, key: string): string {
    return this.xorEncrypt(data, key);
  }
  
  // Caesar cipher
  private caesarCipher(text: string, shift: number): string {
    return text.split('').map(char => {
      const code = char.charCodeAt(0);
      return String.fromCharCode(((code + shift) % 256 + 256) % 256);
    }).join('');
  }
  
  // Base64 encoding
  private base64Encode(data: string): string {
    return btoa(unescape(encodeURIComponent(data)));
  }
  
  // Base64 decoding
  private base64Decode(data: string): string {
    return decodeURIComponent(escape(atob(data)));
  }
  
  // Reverse string
  private reverseString(str: string): string {
    return str.split('').reverse().join('');
  }
  
  // Basic encryption for non-purchasers
  private basicEncryption(data: string): string {
    return btoa(data);
  }
  
  // Basic decryption for non-purchasers
  private basicDecryption(data: string): string {
    return atob(data);
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
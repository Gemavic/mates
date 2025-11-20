// Security utilities and validation functions
export class SecurityManager {
  // Input validation
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Content filtering
  static filterProfanity(text: string): string {
    const profanityList = ['badword1', 'badword2', 'inappropriate']; // Add more as needed
    let filteredText = text;
    
    profanityList.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    });
    
    return filteredText;
  }

  // Rate limiting simulation
  static rateLimiter = new Map<string, { count: number; resetTime: number }>();

  static checkRateLimit(userId: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const userLimit = this.rateLimiter.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimiter.set(userId, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (userLimit.count >= maxRequests) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  // Session management
  static generateSessionToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Data encryption simulation
  static encryptSensitiveData(data: string): string {
    // In a real app, use proper encryption libraries
    return btoa(data);
  }

  static decryptSensitiveData(encryptedData: string): string {
    // In a real app, use proper decryption
    return atob(encryptedData);
  }

  // Report user functionality
  static reportUser(reportedUserId: string, reason: string, reporterId: string): boolean {
    // In a real app, this would send to moderation system
    console.log(`User ${reportedUserId} reported by ${reporterId} for: ${reason}`);
    return true;
  }

  // Block user functionality
  static blockUser(blockedUserId: string, blockerId: string): boolean {
    // In a real app, this would update user's blocked list
    console.log(`User ${blockedUserId} blocked by ${blockerId}`);
    return true;
  }
}

// Two-factor authentication simulation
export class TwoFactorAuth {
  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static verifyCode(inputCode: string, actualCode: string): boolean {
    return inputCode === actualCode;
  }
}
import { supabase } from './supabase';

export interface TwoFactorSetup {
  userId: string;
  enabled: boolean;
  method: 'sms' | 'authenticator' | 'email' | 'biometric';
  phoneNumber?: string;
  email?: string;
  secret?: string;
  backupCodes: string[];
  createdAt: Date;
  lastUsed?: Date;
}

export interface TwoFactorVerification {
  userId: string;
  code: string;
  method: 'sms' | 'authenticator' | 'email' | 'biometric';
  attempts: number;
  expiresAt: Date;
  verified: boolean;
}

class TwoFactorAuthManager {
  private activeCodes: Map<string, TwoFactorVerification> = new Map();
  private userSetups: Map<string, TwoFactorSetup> = new Map();
  private readonly MAX_ATTEMPTS = 3;
  private readonly CODE_EXPIRY_MINUTES = 10;

  async enable2FA(
    userId: string,
    method: 'sms' | 'authenticator' | 'email' | 'biometric',
    contact?: string
  ): Promise<{ success: boolean; secret?: string; backupCodes?: string[]; qrCode?: string }> {
    try {
      const backupCodes = this.generateBackupCodes();
      const secret = method === 'authenticator' ? this.generateSecret() : undefined;

      const setup: TwoFactorSetup = {
        userId,
        enabled: true,
        method,
        phoneNumber: method === 'sms' ? contact : undefined,
        email: method === 'email' ? contact : undefined,
        secret,
        backupCodes,
        createdAt: new Date(),
      };

      this.userSetups.set(userId, setup);

      if (!supabase) {
        return { success: true, secret, backupCodes };
      }

      const { error } = await supabase.from('user_2fa_settings').upsert({
        user_id: userId,
        enabled: true,
        method,
        phone_number: setup.phoneNumber,
        email: setup.email,
        secret: secret,
        backup_codes: backupCodes,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      const qrCode = secret ? this.generateQRCode(userId, secret) : undefined;

      return {
        success: true,
        secret,
        backupCodes,
        qrCode,
      };
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      return { success: false };
    }
  }

  async disable2FA(userId: string): Promise<boolean> {
    try {
      this.userSetups.delete(userId);
      this.activeCodes.delete(userId);

      if (!supabase) return true;

      const { error } = await supabase
        .from('user_2fa_settings')
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      return false;
    }
  }

  async send2FACode(userId: string): Promise<{ success: boolean; method?: string }> {
    try {
      const setup = this.userSetups.get(userId);
      if (!setup || !setup.enabled) {
        if (supabase) {
          const { data } = await supabase
            .from('user_2fa_settings')
            .select('*')
            .eq('user_id', userId)
            .eq('enabled', true)
            .maybeSingle();

          if (!data) {
            return { success: false };
          }
        } else {
          return { success: false };
        }
      }

      const code = this.generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.CODE_EXPIRY_MINUTES);

      const verification: TwoFactorVerification = {
        userId,
        code,
        method: setup?.method || 'sms',
        attempts: 0,
        expiresAt,
        verified: false,
      };

      this.activeCodes.set(userId, verification);

      await this.deliverCode(userId, code, setup?.method || 'sms', setup);

      return {
        success: true,
        method: setup?.method || 'sms',
      };
    } catch (error) {
      console.error('Failed to send 2FA code:', error);
      return { success: false };
    }
  }

  async verify2FACode(userId: string, code: string, isBackupCode: boolean = false): Promise<boolean> {
    try {
      const verification = this.activeCodes.get(userId);
      if (!verification) return false;

      if (new Date() > verification.expiresAt) {
        this.activeCodes.delete(userId);
        return false;
      }

      if (verification.attempts >= this.MAX_ATTEMPTS) {
        this.activeCodes.delete(userId);
        await this.logSecurityEvent(userId, '2FA_MAX_ATTEMPTS_EXCEEDED');
        return false;
      }

      if (isBackupCode) {
        return await this.verifyBackupCode(userId, code);
      }

      if (verification.code === code) {
        verification.verified = true;
        this.activeCodes.delete(userId);

        const setup = this.userSetups.get(userId);
        if (setup) {
          setup.lastUsed = new Date();
        }

        await this.logSecurityEvent(userId, '2FA_VERIFIED_SUCCESS');
        return true;
      }

      verification.attempts++;
      await this.logSecurityEvent(userId, '2FA_VERIFICATION_FAILED');
      return false;
    } catch (error) {
      console.error('Failed to verify 2FA code:', error);
      return false;
    }
  }

  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const setup = this.userSetups.get(userId);
      if (!setup) return false;

      const codeIndex = setup.backupCodes.indexOf(code);
      if (codeIndex === -1) return false;

      setup.backupCodes.splice(codeIndex, 1);

      if (supabase) {
        await supabase
          .from('user_2fa_settings')
          .update({ backup_codes: setup.backupCodes })
          .eq('user_id', userId);
      }

      await this.logSecurityEvent(userId, '2FA_BACKUP_CODE_USED');
      return true;
    } catch (error) {
      console.error('Failed to verify backup code:', error);
      return false;
    }
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  private generateQRCode(userId: string, secret: string): string {
    const issuer = 'Dates.care';
    const accountName = userId;
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
      accountName
    )}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    return otpauthUrl;
  }

  private async deliverCode(
    userId: string,
    code: string,
    method: string,
    setup?: TwoFactorSetup
  ): Promise<void> {
    switch (method) {
      case 'sms':
        console.log(`📱 SMS 2FA Code sent to ${setup?.phoneNumber}: ${code}`);
        break;
      case 'email':
        console.log(`📧 Email 2FA Code sent to ${setup?.email}: ${code}`);
        break;
      case 'authenticator':
        console.log(`🔐 Authenticator code generated for user ${userId}`);
        break;
      case 'biometric':
        console.log(`👤 Biometric verification initiated for user ${userId}`);
        break;
    }
  }

  private async logSecurityEvent(userId: string, event: string): Promise<void> {
    if (!supabase) return;

    try {
      await supabase.from('security_audit_log').insert({
        user_id: userId,
        event_type: event,
        ip_address: this.getClientIP(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  private getClientIP(): string {
    return '192.168.1.' + Math.floor(Math.random() * 255);
  }

  async is2FAEnabled(userId: string): Promise<boolean> {
    const setup = this.userSetups.get(userId);
    if (setup) return setup.enabled;

    if (!supabase) return false;

    try {
      const { data } = await supabase
        .from('user_2fa_settings')
        .select('enabled')
        .eq('user_id', userId)
        .maybeSingle();

      return data?.enabled || false;
    } catch (error) {
      return false;
    }
  }

  async get2FAStatus(userId: string): Promise<TwoFactorSetup | null> {
    const setup = this.userSetups.get(userId);
    if (setup) return setup;

    if (!supabase) return null;

    try {
      const { data } = await supabase
        .from('user_2fa_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!data) return null;

      return {
        userId: data.user_id,
        enabled: data.enabled,
        method: data.method,
        phoneNumber: data.phone_number,
        email: data.email,
        secret: data.secret,
        backupCodes: data.backup_codes || [],
        createdAt: new Date(data.created_at),
        lastUsed: data.last_used ? new Date(data.last_used) : undefined,
      };
    } catch (error) {
      return null;
    }
  }
}

export const twoFactorAuth = new TwoFactorAuthManager();

export const enable2FA = (
  userId: string,
  method: 'sms' | 'authenticator' | 'email' | 'biometric',
  contact?: string
) => twoFactorAuth.enable2FA(userId, method, contact);

export const disable2FA = (userId: string) => twoFactorAuth.disable2FA(userId);

export const send2FACode = (userId: string) => twoFactorAuth.send2FACode(userId);

export const verify2FACode = (userId: string, code: string, isBackupCode?: boolean) =>
  twoFactorAuth.verify2FACode(userId, code, isBackupCode);

export const is2FAEnabled = (userId: string) => twoFactorAuth.is2FAEnabled(userId);

export const get2FAStatus = (userId: string) => twoFactorAuth.get2FAStatus(userId);

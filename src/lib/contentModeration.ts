import { supabase } from './supabase';

interface ContentScanResult {
  safe: boolean;
  riskScore: number;
  hasNudity: boolean;
  hasViolence: boolean;
  hasExplicitContent: boolean;
  details: any;
}

interface ModerationAction {
  action: 'approved' | 'rejected' | 'flagged' | 'manual_review';
  reason?: string;
  shouldBlock: boolean;
}

const MODERATION_THRESHOLDS = {
  NUDITY_MAX: 0.5,
  VIOLENCE_MAX: 0.7,
  EXPLICIT_MAX: 0.6,
  RISK_SCORE_MAX: 0.75,
};

export class ContentModerationService {
  private static instance: ContentModerationService;

  private constructor() {}

  static getInstance(): ContentModerationService {
    if (!ContentModerationService.instance) {
      ContentModerationService.instance = new ContentModerationService();
    }
    return ContentModerationService.instance;
  }

  async scanImage(imageFile: File, userId: string, contentType: string = 'image'): Promise<ModerationAction> {
    try {
      const scanResult = await this.performImageScan(imageFile);

      await this.logScan(userId, contentType, scanResult);

      const action = this.evaluateScanResult(scanResult);

      if (action.shouldBlock) {
        await this.addToModerationQueue(userId, contentType, scanResult, action.reason || 'Content flagged by AI');
      }

      return action;
    } catch (error) {
      console.error('Content moderation scan failed:', error);
      return {
        action: 'manual_review',
        reason: 'Scan failed, requires manual review',
        shouldBlock: true
      };
    }
  }

  async scanText(text: string, userId: string, contextType: string = 'text'): Promise<ModerationAction> {
    try {
      const scanResult = await this.performTextScan(text);

      await this.logScan(userId, contextType, scanResult);

      const action = this.evaluateScanResult(scanResult);

      if (action.shouldBlock) {
        await this.addToModerationQueue(userId, contextType, scanResult, action.reason || 'Text flagged by AI');
      }

      return action;
    } catch (error) {
      console.error('Text moderation scan failed:', error);
      return {
        action: 'approved',
        shouldBlock: false
      };
    }
  }

  private async performImageScan(imageFile: File): Promise<ContentScanResult> {
    const base64Image = await this.fileToBase64(imageFile);

    const mockScan: ContentScanResult = {
      safe: true,
      riskScore: Math.random() * 0.3,
      hasNudity: false,
      hasViolence: false,
      hasExplicitContent: false,
      details: {
        scanner: 'hive_moderation',
        timestamp: new Date().toISOString(),
        fileSize: imageFile.size,
        fileType: imageFile.type
      }
    };

    return mockScan;
  }

  private async performTextScan(text: string): Promise<ContentScanResult> {
    const lowerText = text.toLowerCase();

    const explicitKeywords = [
      'escort', 'prostitute', 'hook up for money', 'cash for',
      'selling nudes', 'onlyfans promo', 'premium snap',
      'trafficking', 'underage', 'minor'
    ];

    const terrorismKeywords = [
      'bomb', 'terrorist attack', 'jihad', 'isis', 'al qaeda',
      'suicide bomber', 'mass shooting', 'radicalize', 'extremist',
      'blow up', 'detonate', 'explosive device', 'massacre'
    ];

    const hateSpeechKeywords = [
      'nazi', 'kkk', 'white supremacy', 'ethnic cleansing',
      'racial slur', 'hate crime', 'supremacist', 'holocaust denial',
      'genocide', 'swastika', 'lynch', 'racial purity'
    ];

    const cyberBullyingKeywords = [
      'kill yourself', 'kys', 'worthless', 'nobody likes you',
      'everyone hates you', 'go die', 'end it all', 'commit suicide',
      'ugly loser', 'piece of trash', 'waste of space', 'pathetic loser',
      'no one will miss you', 'world would be better without you'
    ];

    const violenceKeywords = [
      'rape', 'assault', 'murder', 'stalk', 'hurt you',
      'find you', 'track you down', 'beat you', 'torture'
    ];

    const hasExplicitContent = explicitKeywords.some(keyword => lowerText.includes(keyword));
    const hasTerrorism = terrorismKeywords.some(keyword => lowerText.includes(keyword));
    const hasHateSpeech = hateSpeechKeywords.some(keyword => lowerText.includes(keyword));
    const hasCyberBullying = cyberBullyingKeywords.some(keyword => lowerText.includes(keyword));
    const hasViolence = violenceKeywords.some(keyword => lowerText.includes(keyword));

    let riskScore = 0;
    if (hasTerrorism) riskScore = 1.0;
    else if (hasViolence) riskScore = 0.95;
    else if (hasCyberBullying) riskScore = 0.9;
    else if (hasHateSpeech) riskScore = 0.85;
    else if (hasExplicitContent) riskScore = 0.8;

    const violationTypes = [];
    if (hasTerrorism) violationTypes.push('terrorism');
    if (hasHateSpeech) violationTypes.push('hate_speech');
    if (hasCyberBullying) violationTypes.push('cyber_bullying');
    if (hasViolence) violationTypes.push('violence');
    if (hasExplicitContent) violationTypes.push('explicit_content');

    return {
      safe: riskScore < MODERATION_THRESHOLDS.RISK_SCORE_MAX,
      riskScore: Math.min(riskScore, 1),
      hasNudity: false,
      hasViolence: hasViolence || hasTerrorism,
      hasExplicitContent,
      details: {
        scanner: 'text_analyzer',
        timestamp: new Date().toISOString(),
        textLength: text.length,
        violationTypes,
        hasTerrorism,
        hasHateSpeech,
        hasCyberBullying
      }
    };
  }

  private evaluateScanResult(scanResult: ContentScanResult): ModerationAction {
    if (scanResult.hasNudity && scanResult.riskScore > MODERATION_THRESHOLDS.NUDITY_MAX) {
      return {
        action: 'rejected',
        reason: 'Nudity detected',
        shouldBlock: true
      };
    }

    if (scanResult.hasViolence && scanResult.riskScore > MODERATION_THRESHOLDS.VIOLENCE_MAX) {
      return {
        action: 'rejected',
        reason: 'Violent content detected',
        shouldBlock: true
      };
    }

    if (scanResult.hasExplicitContent && scanResult.riskScore > MODERATION_THRESHOLDS.EXPLICIT_MAX) {
      return {
        action: 'rejected',
        reason: 'Explicit content detected',
        shouldBlock: true
      };
    }

    if (scanResult.riskScore > MODERATION_THRESHOLDS.RISK_SCORE_MAX) {
      return {
        action: 'manual_review',
        reason: 'High risk score, requires review',
        shouldBlock: true
      };
    }

    if (scanResult.riskScore > 0.5) {
      return {
        action: 'flagged',
        reason: 'Moderate risk detected',
        shouldBlock: false
      };
    }

    return {
      action: 'approved',
      shouldBlock: false
    };
  }

  private async logScan(userId: string, contentType: string, scanResult: ContentScanResult): Promise<void> {
    try {
      const action = this.evaluateScanResult(scanResult);

      const { error } = await supabase.rpc('log_content_scan', {
        p_user_id: userId,
        p_content_type: contentType,
        p_content_id: null,
        p_scan_result: {
          ...scanResult.details,
          has_nudity: scanResult.hasNudity,
          has_violence: scanResult.hasViolence,
          has_explicit_content: scanResult.hasExplicitContent
        },
        p_risk_score: scanResult.riskScore,
        p_action_taken: action.action
      });

      if (error) {
        console.error('Failed to log content scan:', error);
      }
    } catch (error) {
      console.error('Error logging scan:', error);
    }
  }

  private async addToModerationQueue(
    userId: string,
    contentType: string,
    scanResult: ContentScanResult,
    reason: string
  ): Promise<void> {
    try {
      const severity = scanResult.riskScore > 0.9 ? 'critical' :
                      scanResult.riskScore > 0.7 ? 'high' : 'medium';

      const { error } = await supabase
        .from('moderation_queue')
        .insert({
          user_id: userId,
          content_type: contentType,
          reason,
          severity,
          status: 'pending'
        });

      if (error) {
        console.error('Failed to add to moderation queue:', error);
      }
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  }

  async submitAbuseReport(
    reporterId: string,
    reportedUserId: string,
    reportType: string,
    description: string,
    contextType?: string,
    contextId?: string,
    evidenceData?: any
  ): Promise<{ success: boolean; reportId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('abuse_reports')
        .insert({
          reporter_id: reporterId,
          reported_user_id: reportedUserId,
          report_type: reportType,
          description,
          context_type: contextType,
          context_id: contextId,
          evidence_data: evidenceData || {},
          status: 'pending',
          priority: this.calculateReportPriority(reportType)
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, reportId: data.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private calculateReportPriority(reportType: string): string {
    const criticalTypes = ['underage', 'trafficking', 'violence', 'terrorism'];
    const highTypes = ['nudity', 'solicitation', 'harassment', 'hate_speech', 'cyber_bullying'];

    if (criticalTypes.includes(reportType)) return 'critical';
    if (highTypes.includes(reportType)) return 'high';
    return 'medium';
  }

  async checkUserModerationStatus(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('check_user_moderation_status', {
        check_user_id: userId
      });

      if (error) {
        console.error('Failed to check moderation status:', error);
        return { is_banned: false, strike_count: 0 };
      }

      return data;
    } catch (error) {
      console.error('Error checking moderation status:', error);
      return { is_banned: false, strike_count: 0 };
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async validateProfilePhoto(imageFile: File, userId: string): Promise<{ allowed: boolean; reason?: string }> {
    if (imageFile.size > 10 * 1024 * 1024) {
      return { allowed: false, reason: 'Image too large (max 10MB)' };
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return { allowed: false, reason: 'Invalid image format' };
    }

    const moderationResult = await this.scanImage(imageFile, userId, 'profile');

    if (moderationResult.shouldBlock) {
      return {
        allowed: false,
        reason: moderationResult.reason || 'Image violates content policy'
      };
    }

    return { allowed: true };
  }

  async validateBioText(text: string, userId: string): Promise<{ allowed: boolean; reason?: string }> {
    if (text.length > 500) {
      return { allowed: false, reason: 'Bio too long (max 500 characters)' };
    }

    const moderationResult = await this.scanText(text, userId, 'bio');

    if (moderationResult.shouldBlock) {
      return {
        allowed: false,
        reason: moderationResult.reason || 'Bio violates content policy'
      };
    }

    return { allowed: true };
  }
}

export const contentModeration = ContentModerationService.getInstance();

import { supabase } from './supabase';

export interface PersonalityProfile {
  userId: string;
  bigFiveOpenness: number;
  bigFiveConscientiousness: number;
  bigFiveExtraversion: number;
  bigFiveAgreeableness: number;
  bigFiveNeuroticism: number;
  attachmentStyle: 'secure' | 'anxious' | 'avoidant' | 'fearful';
  loveLanguagePrimary: string;
  communicationStyle: string;
  conflictResolution: string;
  lifeGoals: string[];
  values: string[];
  interests: { interest: string; weight: number }[];
}

export interface BehavioralMetrics {
  userId: string;
  responseRate: number;
  avgResponseTime: number;
  conversationQuality: number;
  videoChatAcceptance: number;
  dateAcceptance: number;
  profileCompletion: number;
  engagementScore: number;
}

export interface MatchingPreferences {
  userId: string;
  ageMin: number;
  ageMax: number;
  distanceMax: number;
  educationLevels?: string[];
  relationshipGoals?: string[];
  hasChildrenPref?: 'yes' | 'no' | 'no_preference';
  wantsChildrenPref?: 'yes' | 'no' | 'no_preference';
  dealbreakers?: string[];
  mustHaves?: string[];
}

export interface MatchScore {
  userId: string;
  matchUserId: string;
  overallScore: number;
  personalityScore: number;
  behavioralScore: number;
  preferenceScore: number;
  interestScore: number;
  valueAlignmentScore: number;
  communicationCompatibility: number;
  lifestyleCompatibility: number;
  matchReasons: string[];
  calculatedAt: Date;
}

class ProprietaryMatchingAlgorithm {
  private readonly PERSONALITY_WEIGHT = 0.30;
  private readonly BEHAVIORAL_WEIGHT = 0.25;
  private readonly PREFERENCE_WEIGHT = 0.20;
  private readonly INTEREST_WEIGHT = 0.15;
  private readonly VALUE_WEIGHT = 0.10;

  async calculateMatchScore(
    userId: string,
    potentialMatchId: string
  ): Promise<MatchScore | null> {
    try {
      if (!supabase) {
        return this.generateMockMatchScore(userId, potentialMatchId);
      }

      const [user1Data, user2Data] = await Promise.all([
        this.getUserMatchingData(userId),
        this.getUserMatchingData(potentialMatchId),
      ]);

      if (!user1Data || !user2Data) return null;

      const personalityScore = this.calculatePersonalityCompatibility(
        user1Data.personality,
        user2Data.personality
      );

      const behavioralScore = this.calculateBehavioralCompatibility(
        user1Data.behavioral,
        user2Data.behavioral
      );

      const preferenceScore = this.calculatePreferenceAlignment(
        user1Data.preferences,
        user2Data.profile,
        user2Data.preferences
      );

      const interestScore = this.calculateInterestOverlap(
        user1Data.personality.interests,
        user2Data.personality.interests
      );

      const valueScore = this.calculateValueAlignment(
        user1Data.personality.values,
        user2Data.personality.values
      );

      const communicationScore = this.calculateCommunicationCompatibility(
        user1Data.personality.communicationStyle,
        user2Data.personality.communicationStyle
      );

      const lifestyleScore = this.calculateLifestyleCompatibility(
        user1Data.personality.lifeGoals,
        user2Data.personality.lifeGoals
      );

      const overallScore = Math.round(
        personalityScore * this.PERSONALITY_WEIGHT +
          behavioralScore * this.BEHAVIORAL_WEIGHT +
          preferenceScore * this.PREFERENCE_WEIGHT +
          interestScore * this.INTEREST_WEIGHT +
          valueScore * this.VALUE_WEIGHT
      );

      const matchReasons = this.generateMatchReasons({
        personalityScore,
        interestScore,
        valueScore,
        communicationScore,
        user1Data,
        user2Data,
      });

      const matchScore: MatchScore = {
        userId,
        matchUserId: potentialMatchId,
        overallScore,
        personalityScore,
        behavioralScore,
        preferenceScore,
        interestScore,
        valueAlignmentScore: valueScore,
        communicationCompatibility: communicationScore,
        lifestyleCompatibility: lifestyleScore,
        matchReasons,
        calculatedAt: new Date(),
      };

      await this.saveMatchScore(matchScore);

      return matchScore;
    } catch (error) {
      console.error('Failed to calculate match score:', error);
      return null;
    }
  }

  private calculatePersonalityCompatibility(p1: PersonalityProfile, p2: PersonalityProfile): number {
    const opennessCompat = 100 - Math.abs(p1.bigFiveOpenness - p2.bigFiveOpenness);
    const extraversionCompat = 100 - Math.abs(p1.bigFiveExtraversion - p2.bigFiveExtraversion);
    const agreeablenessCompat = 100 - Math.abs(p1.bigFiveAgreeableness - p2.bigFiveAgreeableness);

    const conscientiousnessBonus =
      Math.min(p1.bigFiveConscientiousness, p2.bigFiveConscientiousness) * 0.5;

    const neuroticismPenalty = Math.max(p1.bigFiveNeuroticism, p2.bigFiveNeuroticism) * 0.3;

    let attachmentBonus = 0;
    if (p1.attachmentStyle === 'secure' && p2.attachmentStyle === 'secure') {
      attachmentBonus = 20;
    } else if (p1.attachmentStyle === 'secure' || p2.attachmentStyle === 'secure') {
      attachmentBonus = 10;
    }

    const score =
      (opennessCompat + extraversionCompat + agreeablenessCompat) / 3 +
      conscientiousnessBonus -
      neuroticismPenalty +
      attachmentBonus;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateBehavioralCompatibility(b1: BehavioralMetrics, b2: BehavioralMetrics): number {
    const responseRateCompat = 100 - Math.abs(b1.responseRate - b2.responseRate) * 100;
    const engagementCompat = 100 - Math.abs(b1.engagementScore - b2.engagementScore);
    const qualityCompat = 100 - Math.abs(b1.conversationQuality - b2.conversationQuality);

    const avgEngagement = (b1.engagementScore + b2.engagementScore) / 2;
    const engagementBonus = avgEngagement * 0.2;

    const score = (responseRateCompat + engagementCompat + qualityCompat) / 3 + engagementBonus;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculatePreferenceAlignment(
    prefs: MatchingPreferences,
    targetProfile: any,
    targetPrefs: MatchingPreferences
  ): number {
    let score = 100;
    let checks = 0;

    if (targetProfile.age) {
      checks++;
      if (targetProfile.age < prefs.ageMin || targetProfile.age > prefs.ageMax) {
        score -= 30;
      }
    }

    if (prefs.dealbreakers && prefs.dealbreakers.length > 0) {
      const hasDealbreaker = prefs.dealbreakers.some((db) =>
        targetProfile.attributes?.includes(db)
      );
      if (hasDealbreaker) {
        return 0;
      }
    }

    if (prefs.mustHaves && prefs.mustHaves.length > 0) {
      checks++;
      const mustHavesMet = prefs.mustHaves.filter((mh: any) =>
        targetProfile.attributes?.includes(mh)
      ).length;
      const mustHaveScore = (mustHavesMet / prefs.mustHaves.length) * 100;
      score = (score + mustHaveScore) / 2;
    }

    if (prefs.relationshipGoals && targetPrefs.relationshipGoals) {
      checks++;
      const goalsOverlap = prefs.relationshipGoals.filter((goal) =>
        targetPrefs.relationshipGoals?.includes(goal)
      ).length;
      if (goalsOverlap === 0) {
        score -= 40;
      } else {
        score += goalsOverlap * 5;
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateInterestOverlap(
    interests1: { interest: string; weight: number }[],
    interests2: { interest: string; weight: number }[]
  ): number {
    if (!interests1.length || !interests2.length) return 50;

    const set1 = new Set(interests1.map((i) => i.interest.toLowerCase()));
    const set2 = new Set(interests2.map((i) => i.interest.toLowerCase()));

    let overlapScore = 0;
    let totalWeight = 0;

    interests1.forEach((int1) => {
      if (set2.has(int1.interest.toLowerCase())) {
        const matchingInterest = interests2.find(
          (i) => i.interest.toLowerCase() === int1.interest.toLowerCase()
        );
        if (matchingInterest) {
          const avgWeight = (int1.weight + matchingInterest.weight) / 2;
          overlapScore += avgWeight * 100;
          totalWeight += avgWeight;
        }
      }
    });

    const overlap = Array.from(set1).filter((x) => set2.has(x)).length;
    const union = new Set([...set1, ...set2]).size;
    const jaccardIndex = overlap / union;

    const weightedScore = totalWeight > 0 ? overlapScore / totalWeight : 0;
    const finalScore = jaccardIndex * 50 + weightedScore * 0.5;

    return Math.round(Math.min(100, finalScore));
  }

  private calculateValueAlignment(values1: string[], values2: string[]): number {
    if (!values1.length || !values2.length) return 50;

    const set1 = new Set(values1.map((v) => v.toLowerCase()));
    const set2 = new Set(values2.map((v) => v.toLowerCase()));

    const overlap = Array.from(set1).filter((x) => set2.has(x)).length;
    const maxLength = Math.max(values1.length, values2.length);

    return Math.round((overlap / maxLength) * 100);
  }

  private calculateCommunicationCompatibility(style1: string, style2: string): number {
    const compatibilityMatrix: Record<string, Record<string, number>> = {
      direct: { direct: 90, assertive: 85, indirect: 60, passive: 50, aggressive: 40 },
      assertive: { assertive: 95, direct: 85, indirect: 65, passive: 55, aggressive: 50 },
      indirect: { indirect: 80, passive: 75, direct: 60, assertive: 65, aggressive: 30 },
      passive: { passive: 70, indirect: 75, assertive: 55, direct: 50, aggressive: 20 },
      aggressive: { aggressive: 60, direct: 40, assertive: 50, indirect: 30, passive: 20 },
    };

    return compatibilityMatrix[style1]?.[style2] || 50;
  }

  private calculateLifestyleCompatibility(goals1: string[], goals2: string[]): number {
    if (!goals1.length || !goals2.length) return 50;

    const overlap = goals1.filter((g) =>
      goals2.some((g2) => g2.toLowerCase() === g.toLowerCase())
    ).length;

    return Math.round((overlap / Math.max(goals1.length, goals2.length)) * 100);
  }

  private generateMatchReasons(data: any): string[] {
    const reasons: string[] = [];

    if (data.personalityScore >= 80) {
      reasons.push('Highly compatible personality traits');
    }
    if (data.interestScore >= 75) {
      reasons.push('Share many common interests');
    }
    if (data.valueScore >= 80) {
      reasons.push('Strong alignment in core values');
    }
    if (data.communicationScore >= 85) {
      reasons.push('Excellent communication compatibility');
    }

    const commonInterests = data.user1Data.personality.interests
      .filter((i: any) =>
        data.user2Data.personality.interests.some(
          (i2: any) => i2.interest.toLowerCase() === i.interest.toLowerCase()
        )
      )
      .slice(0, 3);

    if (commonInterests.length > 0) {
      reasons.push(`Both enjoy ${commonInterests.map((i: any) => i.interest).join(', ')}`);
    }

    return reasons;
  }

  private async getUserMatchingData(userId: string): Promise<any> {
    if (!supabase) return null;

    const [personality, behavioral, preferences, profile] = await Promise.all([
      supabase
        .from('user_personality_profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_behavioral_metrics')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('matching_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    if (!personality.data || !behavioral.data) return null;

    return {
      personality: this.mapPersonalityData(personality.data),
      behavioral: this.mapBehavioralData(behavioral.data),
      preferences: preferences.data || {},
      profile: profile.data || {},
    };
  }

  private mapPersonalityData(data: any): PersonalityProfile {
    return {
      userId: data.user_id,
      bigFiveOpenness: data.big_five_openness || 50,
      bigFiveConscientiousness: data.big_five_conscientiousness || 50,
      bigFiveExtraversion: data.big_five_extraversion || 50,
      bigFiveAgreeableness: data.big_five_agreeableness || 50,
      bigFiveNeuroticism: data.big_five_neuroticism || 50,
      attachmentStyle: data.attachment_style || 'secure',
      loveLanguagePrimary: data.love_language_primary || '',
      communicationStyle: data.communication_style || 'direct',
      conflictResolution: data.conflict_resolution || 'collaborative',
      lifeGoals: data.life_goals || [],
      values: data.values || [],
      interests: data.interests || [],
    };
  }

  private mapBehavioralData(data: any): BehavioralMetrics {
    return {
      userId: data.user_id,
      responseRate: data.response_rate || 0,
      avgResponseTime: data.average_response_time_minutes || 0,
      conversationQuality: data.conversation_quality_score || 50,
      videoChatAcceptance: data.video_chat_acceptance_rate || 0,
      dateAcceptance: data.date_acceptance_rate || 0,
      profileCompletion: data.profile_completion_score || 0,
      engagementScore: data.engagement_score || 50,
    };
  }

  private async saveMatchScore(matchScore: MatchScore): Promise<void> {
    if (!supabase) return;

    try {
      await supabase.from('match_scores').upsert({
        user_id: matchScore.userId,
        potential_match_id: matchScore.matchUserId,
        overall_score: matchScore.overallScore,
        personality_score: matchScore.personalityScore,
        behavioral_score: matchScore.behavioralScore,
        preference_score: matchScore.preferenceScore,
        interest_score: matchScore.interestScore,
        value_alignment_score: matchScore.valueAlignmentScore,
        communication_compatibility: matchScore.communicationCompatibility,
        lifestyle_compatibility: matchScore.lifestyleCompatibility,
        match_reasons: matchScore.matchReasons,
        calculated_at: matchScore.calculatedAt.toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (error) {
      console.error('Failed to save match score:', error);
    }
  }

  private generateMockMatchScore(userId: string, matchUserId: string): MatchScore {
    return {
      userId,
      matchUserId,
      overallScore: Math.floor(Math.random() * 30) + 70,
      personalityScore: Math.floor(Math.random() * 20) + 75,
      behavioralScore: Math.floor(Math.random() * 20) + 70,
      preferenceScore: Math.floor(Math.random() * 20) + 75,
      interestScore: Math.floor(Math.random() * 20) + 70,
      valueAlignmentScore: Math.floor(Math.random() * 20) + 75,
      communicationCompatibility: Math.floor(Math.random() * 20) + 75,
      lifestyleCompatibility: Math.floor(Math.random() * 20) + 70,
      matchReasons: [
        'High personality compatibility',
        'Share common interests',
        'Similar life goals',
      ],
      calculatedAt: new Date(),
    };
  }

  async getTopMatches(userId: string, limit: number = 20): Promise<MatchScore[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('match_scores')
        .select('*')
        .eq('user_id', userId)
        .gte('expires_at', new Date().toISOString())
        .order('overall_score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((d) => ({
        userId: d.user_id,
        matchUserId: d.potential_match_id,
        overallScore: d.overall_score,
        personalityScore: d.personality_score,
        behavioralScore: d.behavioral_score,
        preferenceScore: d.preference_score,
        interestScore: d.interest_score,
        valueAlignmentScore: d.value_alignment_score,
        communicationCompatibility: d.communication_compatibility,
        lifestyleCompatibility: d.lifestyle_compatibility,
        matchReasons: d.match_reasons || [],
        calculatedAt: new Date(d.calculated_at),
      }));
    } catch (error) {
      console.error('Failed to get top matches:', error);
      return [];
    }
  }

  async trackInteraction(
    userId: string,
    targetUserId: string,
    interactionType: string,
    outcome?: string
  ): Promise<void> {
    if (!supabase) return;

    try {
      const matchScore = await supabase
        .from('match_scores')
        .select('overall_score')
        .eq('user_id', userId)
        .eq('potential_match_id', targetUserId)
        .maybeSingle();

      await supabase.from('matching_interactions').insert({
        user_id: userId,
        target_user_id: targetUserId,
        interaction_type: interactionType,
        match_score_at_interaction: matchScore.data?.overall_score,
        outcome: outcome || 'neutral',
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }
}

export const matchingAlgorithm = new ProprietaryMatchingAlgorithm();

export const calculateMatch = (userId: string, matchUserId: string) =>
  matchingAlgorithm.calculateMatchScore(userId, matchUserId);

export const getTopMatches = (userId: string, limit?: number) =>
  matchingAlgorithm.getTopMatches(userId, limit);

export const trackMatchInteraction = (
  userId: string,
  targetUserId: string,
  type: string,
  outcome?: string
) => matchingAlgorithm.trackInteraction(userId, targetUserId, type, outcome);

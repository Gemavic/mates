// Feedback System for Dates.care - Future Scaling and Website Improvement
export interface FeedbackSubmission {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  category: 'feature_request' | 'bug_report' | 'ui_improvement' | 'performance' | 'general' | 'scaling' | 'business';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  rating: number; // 1-5 stars
  tags: string[];
  attachments?: string[];
  status: 'submitted' | 'under_review' | 'in_progress' | 'completed' | 'rejected';
  submittedAt: Date;
  updatedAt: Date;
  adminNotes?: string;
  implementationDate?: Date;
  votes: number;
  userAgent: string;
  deviceInfo: string;
}

export interface FeedbackCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  examples: string[];
}

export interface FeedbackStats {
  totalSubmissions: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  averageRating: number;
  implementationRate: number;
  responseTime: number; // Average in hours
}

class FeedbackManager {
  private feedbacks: Map<string, FeedbackSubmission> = new Map();
  private categories: FeedbackCategory[] = [];

  constructor() {
    this.initializeCategories();
  }

  private initializeCategories(): void {
    this.categories = [
      {
        id: 'feature_request',
        name: 'Feature Request',
        description: 'Suggest new features or improvements',
        icon: '💡',
        color: 'from-blue-500 to-cyan-500',
        examples: [
          'New matching algorithm features',
          'Enhanced video chat capabilities',
          'Advanced profile customization',
          'Mobile app improvements',
          'Integration with social media'
        ]
      },
      {
        id: 'ui_improvement',
        name: 'UI/UX Improvement',
        description: 'Suggest interface and user experience improvements',
        icon: '🎨',
        color: 'from-purple-500 to-pink-500',
        examples: [
          'Better navigation design',
          'Improved color schemes',
          'More intuitive button placement',
          'Enhanced mobile responsiveness',
          'Accessibility improvements'
        ]
      },
      {
        id: 'performance',
        name: 'Performance',
        description: 'Report performance issues or suggest optimizations',
        icon: '⚡',
        color: 'from-yellow-400 to-orange-500',
        examples: [
          'Slow page loading times',
          'Chat lag or delays',
          'Image loading issues',
          'Video call quality problems',
          'App responsiveness concerns'
        ]
      },
      {
        id: 'scaling',
        name: 'Scaling & Growth',
        description: 'Ideas for platform scaling and business growth',
        icon: '📈',
        color: 'from-green-500 to-teal-500',
        examples: [
          'Multi-language support',
          'International expansion ideas',
          'Partnership opportunities',
          'Marketing strategy suggestions',
          'Revenue model improvements'
        ]
      },
      {
        id: 'bug_report',
        name: 'Bug Report',
        description: 'Report technical issues or bugs',
        icon: '🐛',
        color: 'from-red-500 to-pink-500',
        examples: [
          'Login/logout issues',
          'Payment processing errors',
          'Chat functionality problems',
          'Profile update failures',
          'Notification system bugs'
        ]
      },
      {
        id: 'business',
        name: 'Business Ideas',
        description: 'Business development and monetization suggestions',
        icon: '💼',
        color: 'from-indigo-500 to-purple-500',
        examples: [
          'New revenue streams',
          'Premium feature ideas',
          'Partnership opportunities',
          'Market expansion strategies',
          'Competitive advantage suggestions'
        ]
      }
    ];
  }

  // Submit new feedback
  submitFeedback(
    userId: string,
    userEmail: string,
    userName: string,
    category: FeedbackSubmission['category'],
    title: string,
    description: string,
    rating: number,
    tags: string[] = []
  ): string {
    const feedbackId = 'FB-' + Math.random().toString(36).substring(2).toUpperCase();
    
    const priority = this.determinePriority(category, description, rating);
    
    const feedback: FeedbackSubmission = {
      id: feedbackId,
      userId,
      userEmail,
      userName,
      category,
      priority,
      title,
      description,
      rating,
      tags: [...tags, ...this.extractTags(description)],
      status: 'submitted',
      submittedAt: new Date(),
      updatedAt: new Date(),
      votes: 0,
      userAgent: navigator.userAgent,
      deviceInfo: this.getDeviceInfo()
    };

    this.feedbacks.set(feedbackId, feedback);
    
    // Send confirmation email
    this.sendFeedbackConfirmation(feedback);
    
    // Notify development team
    this.notifyDevelopmentTeam(feedback);
    
    return feedbackId;
  }

  // Determine feedback priority
  private determinePriority(
    category: string, 
    description: string, 
    rating: number
  ): FeedbackSubmission['priority'] {
    const criticalKeywords = ['crash', 'broken', 'not working', 'error', 'bug', 'urgent'];
    const highKeywords = ['slow', 'performance', 'security', 'payment', 'billing'];
    
    const lowerDesc = description.toLowerCase();
    
    // Critical priority
    if (rating <= 2 || criticalKeywords.some(keyword => lowerDesc.includes(keyword))) {
      return 'critical';
    }
    
    // High priority
    if (category === 'bug_report' || category === 'performance' || 
        highKeywords.some(keyword => lowerDesc.includes(keyword))) {
      return 'high';
    }
    
    // Medium priority
    if (category === 'feature_request' || category === 'ui_improvement' || rating >= 4) {
      return 'medium';
    }
    
    return 'low';
  }

  // Extract relevant tags from description
  private extractTags(description: string): string[] {
    const keywords = [
      'mobile', 'desktop', 'chat', 'video', 'audio', 'payment', 'profile', 
      'matching', 'notification', 'security', 'performance', 'ui', 'ux'
    ];
    const lowerDesc = description.toLowerCase();
    return keywords.filter(keyword => lowerDesc.includes(keyword));
  }

  // Get device information
  private getDeviceInfo(): string {
    const screen = window.screen;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    return `Screen: ${screen.width}x${screen.height}, Viewport: ${viewport.width}x${viewport.height}`;
  }

  // Send feedback confirmation
  private sendFeedbackConfirmation(feedback: FeedbackSubmission): void {
    console.log(`📧 Feedback confirmation sent to ${feedback.userEmail}:`);
    console.log(`Subject: Dates.care - Feedback Received (${feedback.id})`);
    console.log(`Thank you for your valuable feedback! We've received your ${feedback.category} submission.`);
    console.log(`Priority: ${feedback.priority.toUpperCase()}`);
    console.log(`Expected review time: ${this.getExpectedReviewTime(feedback.priority)}`);
  }

  // Get expected review time
  private getExpectedReviewTime(priority: FeedbackSubmission['priority']): string {
    switch (priority) {
      case 'critical': return '24 hours';
      case 'high': return '3-5 days';
      case 'medium': return '1-2 weeks';
      case 'low': return '2-4 weeks';
      default: return '2-4 weeks';
    }
  }

  // Notify development team
  private notifyDevelopmentTeam(feedback: FeedbackSubmission): void {
    console.log(`🔔 Development team notified of new ${feedback.priority} priority feedback:`);
    console.log(`Category: ${feedback.category}`);
    console.log(`Title: ${feedback.title}`);
    console.log(`Rating: ${feedback.rating}/5 stars`);
    console.log(`User: ${feedback.userName} (${feedback.userEmail})`);
  }

  // Get feedback categories
  getCategories(): FeedbackCategory[] {
    return this.categories;
  }

  // Get user's feedback history
  getUserFeedback(userId: string): FeedbackSubmission[] {
    return Array.from(this.feedbacks.values())
      .filter(feedback => feedback.userId === userId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  // Get feedback statistics
  getStats(): FeedbackStats {
    const feedbacks = Array.from(this.feedbacks.values());
    
    const byCategory = feedbacks.reduce((acc, feedback) => {
      acc[feedback.category] = (acc[feedback.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = feedbacks.reduce((acc, feedback) => {
      acc[feedback.priority] = (acc[feedback.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = feedbacks.reduce((acc, feedback) => {
      acc[feedback.status] = (acc[feedback.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageRating = feedbacks.length > 0 
      ? feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0) / feedbacks.length 
      : 0;

    const completedFeedbacks = feedbacks.filter(f => f.status === 'completed').length;
    const implementationRate = feedbacks.length > 0 ? (completedFeedbacks / feedbacks.length) * 100 : 0;

    return {
      totalSubmissions: feedbacks.length,
      byCategory,
      byPriority,
      byStatus,
      averageRating,
      implementationRate,
      responseTime: 48 // Average 48 hours
    };
  }

  // Vote on feedback
  voteFeedback(feedbackId: string, userId: string): boolean {
    const feedback = this.feedbacks.get(feedbackId);
    if (feedback && feedback.userId !== userId) {
      feedback.votes++;
      feedback.updatedAt = new Date();
      return true;
    }
    return false;
  }

  // Get trending feedback
  getTrendingFeedback(): FeedbackSubmission[] {
    return Array.from(this.feedbacks.values())
      .filter(feedback => feedback.status === 'submitted' || feedback.status === 'under_review')
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 10);
  }

  // Search feedback
  searchFeedback(query: string): FeedbackSubmission[] {
    const queryLower = query.toLowerCase();
    return Array.from(this.feedbacks.values())
      .filter(feedback => 
        feedback.title.toLowerCase().includes(queryLower) ||
        feedback.description.toLowerCase().includes(queryLower) ||
        feedback.tags.some(tag => tag.toLowerCase().includes(queryLower))
      );
  }
}

export const feedbackManager = new FeedbackManager();

// Utility functions
export const submitFeedback = (
  userId: string,
  userEmail: string,
  userName: string,
  category: FeedbackSubmission['category'],
  title: string,
  description: string,
  rating: number,
  tags?: string[]
): string => {
  return feedbackManager.submitFeedback(userId, userEmail, userName, category, title, description, rating, tags);
};

export const getFeedbackCategories = () => {
  return feedbackManager.getCategories();
};

export const getUserFeedbackHistory = (userId: string) => {
  return feedbackManager.getUserFeedback(userId);
};

export const getFeedbackStats = () => {
  return feedbackManager.getStats();
};

export const voteFeedback = (feedbackId: string, userId: string) => {
  return feedbackManager.voteFeedback(feedbackId, userId);
};

export const getTrendingFeedback = () => {
  return feedbackManager.getTrendingFeedback();
};

export const searchFeedback = (query: string) => {
  return feedbackManager.searchFeedback(query);
};
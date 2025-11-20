// Email Notification System for Dating Platform
export interface NotificationUser {
  id: string;
  name: string;
  image: string;
}

export interface EmailNotification {
  id: string;
  recipientId: string;
  senderId: string;
  type: 'like' | 'message' | 'profile_view' | 'wink' | 'match' | 'gift';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

class EmailNotificationManager {
  private notifications: Map<string, EmailNotification[]> = new Map();
  private emailTemplates = {
    like: {
      subject: '💖 Someone liked your profile!',
      template: (senderName: string) => `${senderName} liked your profile! Check out their profile and see if it's a match.`
    },
    message: {
      subject: '💬 New message received!',
      template: (senderName: string) => `You have a new message from ${senderName}. Don't keep them waiting!`
    },
    profile_view: {
      subject: '👀 Someone viewed your profile!',
      template: (senderName: string) => `${senderName} checked out your profile. Take a look at theirs!`
    },
    wink: {
      subject: '😉 Someone sent you a wink!',
      template: (senderName: string) => `${senderName} sent you a playful wink! Wink back or send a message.`
    },
    match: {
      subject: '🎉 It\'s a match!',
      template: (senderName: string) => `Congratulations! You and ${senderName} liked each other. Start chatting now!`
    },
    gift: {
      subject: '🎁 You received a gift!',
      template: (senderName: string) => `${senderName} sent you a special gift! Check it out in your messages.`
    }
  };

  // Send email notification (simulated)
  private async sendEmail(
    recipientId: string,
    subject: string,
    message: string,
    actionUrl?: string
  ): Promise<boolean> {
    try {
      // In a real implementation, this would integrate with an email service
      console.log(`📧 Email sent to ${recipientId}:`);
      console.log(`Subject: ${subject}`);
      console.log(`Message: ${message}`);
      if (actionUrl) {
        console.log(`Action URL: ${actionUrl}`);
      }
      
      // Simulate email delivery delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Create and send notification
  private async createNotification(
    recipientId: string,
    sender: NotificationUser,
    type: 'like' | 'message' | 'profile_view' | 'wink' | 'match' | 'gift',
    customMessage?: string
  ): Promise<boolean> {
    const template = this.emailTemplates[type];
    const message = customMessage || template.template(sender.name);
    
    const notification: EmailNotification = {
      id: Math.random().toString(36).substring(2),
      recipientId,
      senderId: sender.id,
      type,
      title: template.subject,
      message,
      timestamp: new Date(),
      read: false,
      actionUrl: `https://dates.care/profile/${sender.id}`
    };

    // Store notification
    if (!this.notifications.has(recipientId)) {
      this.notifications.set(recipientId, []);
    }
    this.notifications.get(recipientId)!.push(notification);

    // Send email
    return await this.sendEmail(
      recipientId,
      template.subject,
      message,
      notification.actionUrl
    );
  }

  // Public methods for different notification types
  async sendLikeNotification(recipientId: string, sender: NotificationUser): Promise<boolean> {
    return this.createNotification(recipientId, sender, 'like');
  }

  async sendMessageNotification(recipientId: string, sender: NotificationUser): Promise<boolean> {
    return this.createNotification(recipientId, sender, 'message');
  }

  async sendProfileViewNotification(recipientId: string, sender: NotificationUser): Promise<boolean> {
    return this.createNotification(recipientId, sender, 'profile_view');
  }

  async sendWinkNotification(recipientId: string, sender: NotificationUser): Promise<boolean> {
    return this.createNotification(recipientId, sender, 'wink');
  }

  async sendMatchNotification(recipientId: string, sender: NotificationUser): Promise<boolean> {
    return this.createNotification(recipientId, sender, 'match');
  }

  async sendGiftNotification(recipientId: string, sender: NotificationUser, giftName: string): Promise<boolean> {
    const customMessage = `${sender.name} sent you a ${giftName}! Check it out in your messages.`;
    return this.createNotification(recipientId, sender, 'gift', customMessage);
  }

  // Get notifications for user
  getNotifications(userId: string): EmailNotification[] {
    return this.notifications.get(userId) || [];
  }

  // Mark notification as read
  markAsRead(userId: string, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      const notification = userNotifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        return true;
      }
    }
    return false;
  }

  // Get unread count
  getUnreadCount(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read).length;
  }

  // Clear all notifications for user
  clearNotifications(userId: string): void {
    this.notifications.delete(userId);
  }
}

// Create singleton instance
const emailNotificationManager = new EmailNotificationManager();

// Export convenience functions
export const sendLikeNotification = (recipientId: string, sender: NotificationUser) => 
  emailNotificationManager.sendLikeNotification(recipientId, sender);

export const sendMessageNotification = (recipientId: string, sender: NotificationUser) => 
  emailNotificationManager.sendMessageNotification(recipientId, sender);

export const sendProfileViewNotification = (recipientId: string, sender: NotificationUser) => 
  emailNotificationManager.sendProfileViewNotification(recipientId, sender);

export const sendWinkNotification = (recipientId: string, sender: NotificationUser) => 
  emailNotificationManager.sendWinkNotification(recipientId, sender);

export const sendMatchNotification = (recipientId: string, sender: NotificationUser) => 
  emailNotificationManager.sendMatchNotification(recipientId, sender);

export const sendGiftNotification = (recipientId: string, sender: NotificationUser, giftName: string) => 
  emailNotificationManager.sendGiftNotification(recipientId, sender, giftName);

// Export manager instance for advanced usage
export { emailNotificationManager };
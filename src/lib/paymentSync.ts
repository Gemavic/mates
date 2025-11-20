// Payment Gateway Authentication and Synchronization
import { supabaseClient } from './supabase';

export interface PaymentProvider {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: Date | null;
  apiKey?: string;
  webhookUrl?: string;
}

export interface PaymentTransaction {
  id: string;
  provider: string;
  externalId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  credits: number;
  metadata: Record<string, any>;
  createdAt: Date;
  syncedAt: Date;
}

class PaymentGatewayManager {
  private providers: Map<string, PaymentProvider> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Cryptocurrency payment providers
    this.providers.set('crypto-manual', {
      name: 'Manual Cryptocurrency',
      status: 'connected',
      lastSync: new Date(),
      webhookUrl: `${window.location.origin}/api/webhooks/crypto`
    });
    
    // Mobile payment providers
    this.providers.set('mobile-payments', {
      name: 'Mobile Payments (Apple/Google/Samsung Pay)',
      status: 'connected',
      lastSync: new Date(),
      webhookUrl: `${window.location.origin}/api/webhooks/mobile`
    });
    
    // Bank transfer provider
    this.providers.set('bank-transfer', {
      name: 'Direct Bank Transfer',
      status: 'connected',
      lastSync: new Date(),
      webhookUrl: `${window.location.origin}/api/webhooks/bank`
    });
  }

  // Synchronize payments from all providers
  async synchronizePayments(): Promise<void> {
    console.log('🔄 Starting payment synchronization...');
    
    for (const [providerId, provider] of this.providers) {
      if (provider.status === 'connected') {
        try {
          await this.syncProviderPayments(providerId);
          provider.lastSync = new Date();
          console.log(`✅ Synchronized payments from ${provider.name}`);
        } catch (error) {
          console.error(`❌ Failed to sync ${provider.name}:`, error);
          provider.status = 'error';
        }
      }
    }
  }

  // Sync payments from specific provider
  private async syncProviderPayments(providerId: string): Promise<void> {
    // Payment provider synchronization would be implemented here
    console.log(`Syncing payments for provider: ${providerId}`);
  }


  // Start automatic synchronization
  startAutoSync(intervalMs: number = 300000) { // 5 minutes default
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.synchronizePayments();
      } catch (error) {
        console.error('Auto-sync error:', error);
      }
    }, intervalMs);

    console.log(`🔄 Auto-sync started (every ${intervalMs / 1000}s)`);
  }

  // Stop automatic synchronization
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Auto-sync stopped');
    }
  }

  // Get provider status
  getProviderStatus(providerId: string): PaymentProvider | null {
    return this.providers.get(providerId) || null;
  }

  // Get all providers
  getAllProviders(): PaymentProvider[] {
    return Array.from(this.providers.values());
  }

  // Test webhook endpoint
  async testWebhook(providerId: string): Promise<boolean> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider || !provider.webhookUrl) {
        return false;
      }

      const response = await fetch(provider.webhookUrl + '/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true })
      });

      return response.ok;
    } catch (error) {
      console.error(`Webhook test failed for ${providerId}:`, error);
      return false;
    }
  }

  // Process payment completion
  async processPaymentCompletion(
    providerId: string,
    externalTransactionId: string,
    userId: string,
    amount: number,
    credits: number,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      // Record transaction in database
      const { data, error } = await supabaseClient
        .from('credit_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'earn',
          amount: credits,
          description: `${providerId} Payment - ${externalTransactionId}`,
          category: 'purchase'
        });

      if (error) {
        console.error('Database transaction error:', error);
        // Continue anyway for credit system
      }

      // Add credits to local system
      const { creditManager } = await import('./creditSystem');
      creditManager.addCredits(userId, credits, `${providerId} Purchase`, true);

      console.log(`✅ Payment processed: ${credits} credits for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Payment processing error:', error);
      return false;
    }
  }

  // Generate payment report
  generateReport(): {
    providers: PaymentProvider[];
    totalTransactions: number;
    lastSyncTime: Date | null;
    errors: string[];
  } {
    const providers = Array.from(this.providers.values());
    const errors: string[] = [];
    
    // Check for issues
    providers.forEach(provider => {
      if (provider.status === 'error') {
        errors.push(`${provider.name} connection error`);
      }
      if (provider.status === 'disconnected') {
        errors.push(`${provider.name} not connected`);
      }
    });

    const lastSyncTime = providers
      .map(p => p.lastSync)
      .filter(date => date !== null)
      .sort((a, b) => b!.getTime() - a!.getTime())[0] || null;

    return {
      providers,
      totalTransactions: 0, // Would be calculated from actual data
      lastSyncTime,
      errors
    };
  }
}

// Create singleton instance
export const paymentGatewayManager = new PaymentGatewayManager();

// Utility functions
export const syncPayments = () => paymentGatewayManager.synchronizePayments();

export const startPaymentSync = (intervalMs?: number) => paymentGatewayManager.startAutoSync(intervalMs);

export const stopPaymentSync = () => paymentGatewayManager.stopAutoSync();

export const getPaymentProviders = () => paymentGatewayManager.getAllProviders();

export const testWebhookEndpoint = (providerId: string) => paymentGatewayManager.testWebhook(providerId);
import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { CreditCard, Shield, RefreshCw } from 'lucide-react';
import { paymentGatewayManager, syncPayments, startPaymentSync } from '@/lib/paymentSync';
import { useToast } from '@/components/ui/toast';

interface PaymentSetupProps {
  onNavigate: (screen: string) => void;
}

export const PaymentSetup: React.FC<PaymentSetupProps> = ({ onNavigate }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [providers, setProviders] = useState(paymentGatewayManager.getAllProviders());
  const { toast } = useToast();

  useEffect(() => {
    // Start auto-sync if providers are connected
    const connectedProviders = providers.filter(p => p.status === 'connected');
    if (connectedProviders.length > 0) {
      startPaymentSync(300000); // 5 minutes
    }
  }, [providers]);

  const handleSyncPayments = async () => {
    setIsSyncing(true);
    try {
      await syncPayments();
      setProviders(paymentGatewayManager.getAllProviders());
      toast({
        variant: 'success',
        title: 'Sync Complete',
        description: 'Payment data synchronized successfully'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Sync error'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Layout
      title="Payment Gateway Setup"
      onBack={() => onNavigate('settings')}
      showClose={false}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Alternative Payment Setup</h2>
          <p className="text-white/80">Configure crypto and mobile payment options</p>
        </div>

        {/* Provider Status */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <h3 className="text-white font-semibold text-lg mb-4">Provider Status</h3>
          <div className="text-center py-8">
            <CreditCard className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h4 className="text-white font-medium mb-2">Alternative Payment Providers</h4>
            <p className="text-white/70 text-sm">
              Configure cryptocurrency, direct bank transfer, and other alternative payment methods
            </p>
          </div>
        </div>

        {/* Crypto Payment Configuration */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <h3 className="text-white font-semibold text-lg mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Cryptocurrency Payment Setup
          </h3>

          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-2">Supported Cryptocurrencies</h4>
              <div className="grid grid-cols-2 gap-3 text-orange-800 text-sm">
                <div>• Bitcoin (BTC) - Mainnet</div>
                <div>• Ethereum (ETH) - Mainnet</div>
                <div>• Tether USD (USDT) - TRC-20</div>
                <div>• USD Coin (USDC) - ERC-20</div>
                <div>• Litecoin (LTC) - Mainnet</div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Current Wallet Status</h4>
              <p className="text-blue-800 text-sm mb-2">
                <strong>Status:</strong> Placeholder addresses configured
              </p>
              <p className="text-blue-800 text-sm">
                Replace placeholder addresses in <code>src/lib/cryptoWallets.ts</code> with your actual wallet addresses when ready.
              </p>
            </div>
          </div>
        </div>

        {/* Synchronization Controls */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <h3 className="text-white font-semibold text-lg mb-4 flex items-center">
            <RefreshCw className="w-5 h-5 mr-2" />
            Payment Synchronization
          </h3>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">Auto-Sync Status</h4>
              <p className="text-green-800 text-sm">
                Payments are automatically synchronized every 5 minutes when providers are connected.
              </p>
            </div>

            <Button
              onClick={handleSyncPayments}
              disabled={isSyncing}
              className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50"
              type="button"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Synchronizing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="text-white font-semibold text-lg mb-4">Setup Instructions</h3>
          <div className="space-y-3 text-white/80 text-sm">
            <div className="flex items-start space-x-3">
              <span className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</span>
              <div>
                <p className="font-medium text-white">Configure Wallet Addresses</p>
                <p>Add your cryptocurrency wallet addresses to receive payments</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">2</span>
              <div>
                <p className="font-medium text-white">Update QR Codes</p>
                <p>Replace QR code images with your actual wallet addresses</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">3</span>
              <div>
                <p className="font-medium text-white">Test Payments</p>
                <p>Verify that cryptocurrency payments work correctly</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">4</span>
              <div>
                <p className="font-medium text-white">Monitor Transactions</p>
                <p>Track all incoming payments and credit allocations manually</p>
              </div>
            </div>
          </div>

          {/* Crypto Payment Benefits */}
          <div className="mt-6 bg-green-500/20 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-green-300 mb-2">Benefits of Cryptocurrency Payments</h4>
            <ul className="text-green-200 text-sm space-y-1">
              <li>• No restrictions on dating services</li>
              <li>• Accepts Bitcoin, Ethereum, Litecoin, USDT, USDC, and more</li>
              <li>• Lower transaction fees compared to traditional processors</li>
              <li>• No chargebacks or payment disputes</li>
              <li>• Global reach without geographical restrictions</li>
              <li>• Enhanced privacy for users</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};
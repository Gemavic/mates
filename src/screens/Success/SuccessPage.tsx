import React, { useEffect } from 'react';
import { CheckCircle, ArrowRight, Home, CreditCard, Gift } from 'lucide-react';
import { creditManager } from '@/lib/creditSystem';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';

interface SuccessPageProps {
  onNavigate?: (screen: string) => void;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({ onNavigate = () => {} }) => {
  const { user } = useAuth();

  // Process successful purchase on page load
  useEffect(() => {
    const processPayment = async () => {
      if (!user) {
        console.warn('No user logged in, cannot process payment');
        return;
      }

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const credits = parseInt(urlParams.get('credits') || '0');
        const bonus = parseInt(urlParams.get('bonus') || '0');
        const productName = urlParams.get('product') || 'Credit Package';

        // Check for pending purchase in session storage
        const pendingPurchase = sessionStorage.getItem('pendingPurchase');
        if (pendingPurchase) {
          try {
            const purchaseData = JSON.parse(pendingPurchase);

            // Add to local credit system
            creditManager.addCredits(user.id, purchaseData.credits + (purchaseData.bonus || 0),
              purchaseData.demo ? 'Demo Purchase' : 'Credit Purchase', true);

            sessionStorage.removeItem('pendingPurchase');

            console.log('✅ Payment processed successfully:', {
              productName: purchaseData.productName || productName,
              credits: purchaseData.credits,
              bonus,
              demo: purchaseData.demo
            });
          } catch (error) {
            console.error('Error processing pending purchase:', error);
          }
        } else if (credits > 0) {
          // Process from URL parameters

          // Add to local credit system
          creditManager.addCredits(user.id, credits + bonus, 'Payment Success', true);
          
          console.log('✅ Payment processed from URL parameters:', {
            credits,
            bonus,
            productName
          });
        }
      } catch (error) {
        console.error('Error processing payment:', error);
      }
    };

    processPayment();
  }, [user]);

  const urlParams = new URLSearchParams(window.location.search);
  const credits = parseInt(urlParams.get('credits') || '0');
  const productName = urlParams.get('product') || 'Credit Package';
  const bonus = parseInt(urlParams.get('bonus') || '0');
  const totalCredits = credits + bonus;

  return (
    <Layout
      title="Payment Success"
      onBack={() => onNavigate?.('discovery') || (window.location.href = '/app')}
      showClose={false}
    >
      <div className="px-4 py-6">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Payment Successful!</h2>
          <p className="text-white/80 text-lg">Your credits are ready to use</p>
        </div>

        {/* Purchase Summary */}
        {totalCredits > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <div className="text-center mb-4">
              <h3 className="text-white font-bold text-xl mb-2">{productName}</h3>
              <p className="text-white/70">Successfully purchased</p>
            </div>
            <div className="flex items-center justify-center mb-4">
              <Gift className="w-8 h-8 text-white mr-3" />
              <span className="text-white font-bold text-xl">Credits Added</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-white/90">
                <span>Base Credits:</span>
                <span className="font-bold text-xl">{credits.toLocaleString()}</span>
              </div>
              {bonus > 0 && (
                <div className="flex justify-between text-white/90">
                  <span>Bonus Credits:</span>
                  <span className="font-bold text-xl text-green-400">+{bonus.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-white/20 pt-3">
                <div className="flex justify-between text-white font-bold text-2xl">
                  <span>Total Credits:</span>
                  <span>{totalCredits.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-center mb-3">
            <CreditCard className="w-6 h-6 text-white mr-2" />
            <span className="text-white font-semibold">Payment Completed Successfully</span>
          </div>
          <p className="text-white/80 text-sm text-center">
            Your payment was processed securely through our encrypted payment system. 
            All credits have been added to your account and are ready to use.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onNavigate?.('discovery') || (window.location.href = '/app')}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:scale-105 transition-all duration-300 flex items-center justify-center group cursor-pointer touch-manipulation active:scale-95"
          >
            Start Using Credits
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            onClick={() => onNavigate?.('credits') || (window.location.href = '/credits')}
            className="w-full bg-white/20 text-white py-3 px-6 rounded-xl font-semibold hover:bg-white/30 transition-colors duration-300 flex items-center justify-center cursor-pointer touch-manipulation active:scale-95"
          >
            View Credit Balance
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full text-white/70 py-2 px-6 rounded-xl hover:text-white transition-colors duration-300 flex items-center justify-center cursor-pointer touch-manipulation"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/20">
          <p className="text-xs text-white/60 text-center">
            Secure payments • Receipt sent to your email
          </p>
        </div>
      </div>
    </Layout>
  );
};
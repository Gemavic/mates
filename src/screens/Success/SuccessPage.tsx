import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Home, History } from 'lucide-react';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';

interface SuccessPageProps {
  onNavigate?: (screen: string) => void;
}

// This screen only ever CONFIRMS what already happened server-side — it
// never grants credits itself. Real crediting happens exclusively in the
// crypto-webhook after NOWPayments confirms a payment; this page just
// shows the current real balance and explains that crypto payments can
// take a little while to fully confirm.
export const SuccessPage: React.FC<SuccessPageProps> = ({ onNavigate = () => {} }) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!user) return;
    creditManager.initializeUser(user.id);
    setBalance(creditManager.getTotalCredits(user.id));

    // Don't just passively wait on the webhook — actively ask NOWPayments
    // for the real status right now, since a person landing on this exact
    // screen almost certainly has a payment worth checking. Safe to call
    // freely: this only ever reads the caller's own payments and credits
    // through the same idempotent path the webhook itself uses.
    (async () => {
      setChecking(true);
      try {
        const { supabaseClient } = await import('@/lib/supabase');
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (accessToken) {
          await fetch('/api/check-payment-status', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }
      } catch (err) {
        console.error('Active payment status check failed:', err);
      } finally {
        setChecking(false);
        creditManager.initializeUser(user.id);
        setBalance(creditManager.getTotalCredits(user.id));
      }
    })();

    // Balance may still not have updated yet even after the active check
    // (payment might genuinely still be confirming on-chain). Check again
    // after a short delay so a fast confirmation shows up without the
    // person needing to navigate away and back.
    const timeout = setTimeout(() => {
      setBalance(creditManager.getTotalCredits(user.id));
    }, 4000);
    return () => clearTimeout(timeout);
  }, [user]);

  return (
    <Layout
      title="Payment Received"
      onBack={() => onNavigate('discovery')}
      showClose={false}
    >
      <div className="px-4 py-6">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Payment Received!</h2>
          <p className="text-white/80 text-lg">
            Your crypto payment has been confirmed on our end.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 text-center">
          <p className="text-white/70 mb-1">Your current balance</p>
          <p className="text-white font-bold text-4xl">
            {balance === null ? '—' : formatCredits(balance)}
          </p>
          {checking && (
            <p className="text-white/50 text-xs mt-2">Checking with payment provider…</p>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <p className="text-white/80 text-sm text-center leading-relaxed">
            Crypto payments are credited automatically once confirmed on the
            blockchain — this is usually quick, but can occasionally take a
            little longer depending on network conditions. If your balance
            above doesn't yet reflect this purchase, check back shortly or
            view your full transaction history for the latest status.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onNavigate('discovery')}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:scale-105 transition-all duration-300 flex items-center justify-center group cursor-pointer touch-manipulation active:scale-95"
          >
            Start Using Credits
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate('credit-history')}
            className="w-full bg-white/20 text-white py-3 px-6 rounded-xl font-semibold hover:bg-white/30 transition-colors duration-300 flex items-center justify-center cursor-pointer touch-manipulation active:scale-95"
          >
            <History className="w-4 h-4 mr-2" />
            View Transaction History
          </button>

          <button
            onClick={() => onNavigate('welcome')}
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

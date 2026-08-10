import React, { useEffect, useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Gift, Loader2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';
import { formatCredits } from '@/lib/creditSystem';

interface LedgerEntry {
  id: number;
  amount: number;
  balance_after: number;
  reason: string;
  thread_id: string | null;
  created_at: string;
}

interface CreditHistoryProps {
  onNavigate?: (screen: string) => void;
}

const REASON_LABELS: Record<string, string> = {
  spend: 'Spent',
  message: 'Message',
  gift: 'Gift Sent',
  purchase: 'Credit Purchase',
  reward: 'Reward Bonus',
};

const describeReason = (reason: string): string => {
  if (REASON_LABELS[reason]) return REASON_LABELS[reason];
  // Reasons are often free-text descriptions already (e.g. "Sent Rose gift",
  // "Exclusive mail") — title-case anything we don't have a specific label
  // for rather than showing the raw internal string.
  return reason.charAt(0).toUpperCase() + reason.slice(1);
};

export const CreditHistory: React.FC<CreditHistoryProps> = ({ onNavigate = () => {} }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error: fetchError } = await supabaseClient
        .from('app_credit_ledger')
        .select('id, amount, balance_after, reason, thread_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        console.error('Failed to load credit history:', fetchError);
        setError(true);
      } else {
        setEntries(data || []);
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <Layout title="Transaction History" onBack={() => onNavigate('credits')}>
      <div className="px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-white/70">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p>Loading your transactions…</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-white/70">
            <p>Couldn't load your transaction history. Please try again.</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-white/70">
            <p>No transactions yet.</p>
            <p className="text-sm mt-1">Purchases, spends, and rewards will show up here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const isCredit = entry.amount > 0;
              const isZero = entry.amount === 0;
              const Icon = isZero ? Gift : isCredit ? ArrowUpCircle : ArrowDownCircle;
              const amountColor = isZero
                ? 'text-blue-300'
                : isCredit
                  ? 'text-green-400'
                  : 'text-white/70';

              return (
                <div
                  key={entry.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-6 h-6 flex-shrink-0 ${amountColor}`} />
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {isZero ? `${describeReason(entry.reason)} (Free)` : describeReason(entry.reason)}
                      </p>
                      <p className="text-white/50 text-xs">
                        {new Date(entry.created_at).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className={`font-bold ${amountColor}`}>
                      {isZero ? '—' : `${isCredit ? '+' : ''}${formatCredits(entry.amount)}`}
                    </p>
                    <p className="text-white/40 text-xs">
                      Balance: {formatCredits(entry.balance_after)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

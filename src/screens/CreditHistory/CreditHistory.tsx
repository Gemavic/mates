import React, { useEffect, useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Gift, Loader2, Clock, XCircle, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';
import { formatCredits } from '@/lib/creditSystem';

interface LedgerEntry {
  kind: 'ledger';
  id: string;
  amount: number;
  balance_after: number;
  reason: string;
  created_at: string;
}

interface IntentEntry {
  kind: 'intent';
  id: string;
  product_id: string;
  amount_usd: number;
  status: string;
  created_at: string;
}

type HistoryRow = LedgerEntry | IntentEntry;

interface CreditHistoryProps {
  onNavigate?: (screen: string) => void;
}

const REASON_LABELS: Record<string, string> = {
  spend: 'Spent',
  message: 'Message',
  gift: 'Gift Sent',
  purchase: 'Credit Purchase',
  reward: 'Reward Bonus',
  live_chat_minute: 'Live Chat (1 min)',
};

const describeReason = (reason: string): string => {
  if (REASON_LABELS[reason]) return REASON_LABELS[reason];
  return reason.charAt(0).toUpperCase() + reason.slice(1);
};

// Intent statuses that mean "this attempt is done, one way or the other"
// and already has (or never will have) a matching ledger entry — showing
// both would be confusing, so these are filtered out once resolved.
const TERMINAL_INTENT_STATUSES = new Set(['finished']);

const INTENT_STATUS_DISPLAY: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'text-amber-300', icon: Clock },
  waiting: { label: 'Waiting for payment', color: 'text-amber-300', icon: Clock },
  confirming: { label: 'Confirming on blockchain', color: 'text-amber-300', icon: Clock },
  sending: { label: 'Confirming on blockchain', color: 'text-amber-300', icon: Clock },
  partially_paid: { label: 'Partially paid', color: 'text-orange-400', icon: Clock },
  failed: { label: 'Failed', color: 'text-red-400', icon: XCircle },
  expired: { label: 'Expired — not paid', color: 'text-white/50', icon: XCircle },
  refunded: { label: 'Refunded', color: 'text-white/50', icon: XCircle },
};

export const CreditHistory: React.FC<CreditHistoryProps> = ({ onNavigate = () => {} }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const loadHistory = React.useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const [ledgerRes, intentsRes] = await Promise.all([
      supabaseClient
        .from('app_credit_ledger')
        .select('id, amount, balance_after, reason, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabaseClient
        .from('app_payment_intents')
        .select('id, product_id, amount_usd, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (ledgerRes.error) console.error('Failed to load ledger:', ledgerRes.error);
    if (intentsRes.error) console.error('Failed to load payment intents:', intentsRes.error);
    if (ledgerRes.error && intentsRes.error) {
      setError(true);
      setLoading(false);
      return;
    }

    const ledgerRows: HistoryRow[] = (ledgerRes.data || []).map((e: any) => ({
      kind: 'ledger', id: `l${e.id}`, amount: e.amount,
      balance_after: e.balance_after, reason: e.reason, created_at: e.created_at,
    }));

    const intentRows: HistoryRow[] = (intentsRes.data || [])
      .filter((i: any) => !TERMINAL_INTENT_STATUSES.has(i.status))
      .map((i: any) => ({
        kind: 'intent', id: `i${i.id}`, product_id: i.product_id,
        amount_usd: i.amount_usd, status: i.status, created_at: i.created_at,
      }));

    const merged = [...ledgerRows, ...intentRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setRows(merged);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const hasOpenIntent = rows.some((r) => r.kind === 'intent');

  const checkStatusNow = async () => {
    if (!user) return;
    setCheckingStatus(true);
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) return;

      await fetch('/api/check-payment-status', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await loadHistory();
    } catch (err) {
      console.error('Failed to check payment status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <Layout
      onNavigate={onNavigate} title="Transaction History" onBack={() => onNavigate('credits')}>
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
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-white/70">
            <p>No transactions yet.</p>
            <p className="text-sm mt-1">Purchases, spends, and rewards will show up here.</p>
          </div>
        ) : (
          <>
            {hasOpenIntent && (
              <button
                onClick={checkStatusNow}
                disabled={checkingStatus}
                className="w-full mb-4 flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-60"
                type="button"
              >
                <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
                {checkingStatus ? 'Checking with payment provider…' : 'Check Status Now'}
              </button>
            )}
            <div className="space-y-3">
            {rows.map((row) => {
              if (row.kind === 'intent') {
                const display = INTENT_STATUS_DISPLAY[row.status] || {
                  label: row.status, color: 'text-white/60', icon: Clock,
                };
                const Icon = display.icon;
                return (
                  <div
                    key={row.id}
                    className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-6 h-6 flex-shrink-0 ${display.color}`} />
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate capitalize">
                          {row.product_id} package — ${row.amount_usd}
                        </p>
                        <p className="text-white/50 text-xs">
                          {new Date(row.created_at).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: 'numeric', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={`font-semibold text-sm ${display.color}`}>{display.label}</p>
                    </div>
                  </div>
                );
              }

              const isCredit = row.amount > 0;
              const isZero = row.amount === 0;
              const Icon = isZero ? Gift : isCredit ? ArrowUpCircle : ArrowDownCircle;
              const amountColor = isZero
                ? 'text-blue-300'
                : isCredit
                  ? 'text-green-400'
                  : 'text-white/70';

              return (
                <div
                  key={row.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-6 h-6 flex-shrink-0 ${amountColor}`} />
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {isZero ? `${describeReason(row.reason)} (Free)` : describeReason(row.reason)}
                      </p>
                      <p className="text-white/50 text-xs">
                        {new Date(row.created_at).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className={`font-bold ${amountColor}`}>
                      {isZero ? '—' : `${isCredit ? '+' : ''}${formatCredits(row.amount)}`}
                    </p>
                    <p className="text-white/40 text-xs">
                      Balance: {formatCredits(row.balance_after)}
                    </p>
                  </div>
                </div>
              );
            })}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

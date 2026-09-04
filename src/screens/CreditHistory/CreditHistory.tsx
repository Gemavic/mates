import React, { useEffect, useState } from 'react';
import {
  ArrowUpCircle, ArrowDownCircle, Gift, Loader2, Clock, XCircle,
  RefreshCw, Receipt, CheckCircle2, ShieldCheck, Download,
} from 'lucide-react';
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
  order_id: string;
  product_id: string;
  product_kind: string;
  amount_usd: number;
  status: string;
  provider_payment_id: string | null;
  created_at: string;
}

type HistoryRow = LedgerEntry | IntentEntry;
type Tab = 'all' | 'purchases' | 'spending';

interface CreditHistoryProps {
  onNavigate?: (screen: string) => void;
}

const REASON_LABELS: Record<string, string> = {
  spend: 'Spent',
  message: 'Message',
  mail: 'Mail',
  gift: 'Gift Sent',
  purchase: 'Credit Purchase',
  reward: 'Reward Bonus',
  welcome_bonus: 'Welcome Bonus',
  profile_bonus: 'Profile Completion Bonus',
  verification_bonus: 'Verification Bonus',
  login_streak: '30-Day Login Bonus',
  live_chat_minute: 'Live Chat (1 min)',
  audio_call_minute: 'Audio Call (1 min)',
  video_call_minute: 'Video Call (1 min)',
};

const describeReason = (reason: string): string => {
  if (REASON_LABELS[reason]) return REASON_LABELS[reason];
  if (reason.startsWith('subscription:')) return 'Subscription Activated';
  if (reason.startsWith('purchase:')) return 'Credit Purchase';
  return reason.charAt(0).toUpperCase() + reason.slice(1).replace(/_/g, ' ');
};

// Human names for the things you can buy, so a receipt does not just say
// "premium" at someone.
const PRODUCT_LABELS: Record<string, string> = {
  starter: 'Starter pack — 65 credits + 10 bonus',
  popular: 'Popular pack — 130 credits + 30 bonus',
  premium: 'Premium pack — 580 credits + 70 bonus',
  silver: 'Silver monthly plan',
  gold: 'Gold monthly plan',
  platinum: 'Platinum monthly plan',
  elite: 'Elite monthly plan',
};

const INTENT_STATUS_DISPLAY: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  finished: { label: 'Paid', color: 'text-green-400', icon: CheckCircle2 },
  pending: { label: 'Pending', color: 'text-amber-300', icon: Clock },
  waiting: { label: 'Waiting for payment', color: 'text-amber-300', icon: Clock },
  confirming: { label: 'Confirming on blockchain', color: 'text-amber-300', icon: Clock },
  sending: { label: 'Confirming on blockchain', color: 'text-amber-300', icon: Clock },
  partially_paid: { label: 'Partially paid', color: 'text-orange-400', icon: Clock },
  failed: { label: 'Failed', color: 'text-red-400', icon: XCircle },
  expired: { label: 'Expired — not paid', color: 'text-white/50', icon: XCircle },
  refunded: { label: 'Refunded', color: 'text-white/50', icon: XCircle },
};

const OPEN_STATUSES = new Set([
  'pending', 'waiting', 'confirming', 'sending', 'partially_paid',
]);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

const fmtUsd = (n: number) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const CreditHistory: React.FC<CreditHistoryProps> = ({ onNavigate = () => {} }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [receipt, setReceipt] = useState<IntentEntry | null>(null);

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
        .limit(200),
      supabaseClient
        .from('app_payment_intents')
        .select('id, order_id, kind, product_id, amount_usd, status, provider_payment_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
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

    // Completed purchases used to be hidden here, on the reasoning that the
    // matching ledger line already said "+75 Credit Purchase". But that line
    // never says what was PAID — so there was nowhere in the app a person
    // could see how much money they had spent, and nothing they could show
    // their bank. A billing history has to show the money. Both are kept and
    // the purchase row is the one that carries a receipt.
    const intentRows: HistoryRow[] = (intentsRes.data || []).map((i: any) => ({
      kind: 'intent', id: `i${i.id}`, order_id: i.order_id,
      product_id: i.product_id, product_kind: i.kind, amount_usd: i.amount_usd,
      status: i.status, provider_payment_id: i.provider_payment_id,
      created_at: i.created_at,
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

  const hasOpenIntent = rows.some(
    (r) => r.kind === 'intent' && OPEN_STATUSES.has(r.status)
  );

  const paidIntents = rows.filter(
    (r): r is IntentEntry => r.kind === 'intent' && r.status === 'finished'
  );
  const totalPaid = paidIntents.reduce((sum, i) => sum + Number(i.amount_usd || 0), 0);

  const visible = rows.filter((r) => {
    if (tab === 'all') return true;
    if (tab === 'purchases') return r.kind === 'intent';
    return r.kind === 'ledger' && r.amount < 0;
  });

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

  // A receipt someone can print or save as PDF from their own browser.
  // Deliberately a print dialog and not a generated file: it works on every
  // phone, needs no library, and what they get is exactly what they saw.
  // The @media print block in src/tailwind.css, keyed on #dc-receipt, is
  // what keeps the surrounding app chrome off the paper.
  const printReceipt = () => {
    if (typeof window !== 'undefined') window.print();
  };

  if (receipt) {
    const label = PRODUCT_LABELS[receipt.product_id] || receipt.product_id;
    return (
      <Layout onNavigate={onNavigate} title="Receipt" onBack={() => setReceipt(null)}>
        <div className="px-4 py-6">
          <div
            id="dc-receipt"
            className="bg-white text-gray-900 rounded-2xl p-6 max-w-md mx-auto shadow-xl"
          >
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-5 h-5 text-pink-600" />
              <h2 className="text-lg font-bold">Dates.care receipt</h2>
            </div>
            <p className="text-xs text-gray-500 mb-5">
              Ontario, Canada · support@dates.care
            </p>

            <dl className="text-sm divide-y divide-gray-200">
              {[
                ['Item', label],
                ['Amount paid', fmtUsd(receipt.amount_usd)],
                ['Currency', 'USD'],
                ['Paid with', 'Cryptocurrency (NOWPayments)'],
                ['Status', INTENT_STATUS_DISPLAY[receipt.status]?.label || receipt.status],
                ['Date', fmtDate(receipt.created_at)],
                ['Order reference', receipt.order_id],
                ...(receipt.provider_payment_id
                  ? ([['Payment reference', `nowpayments:${receipt.provider_payment_id}`]] as string[][])
                  : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-gray-500 flex-shrink-0">{k}</dt>
                  <dd className="font-medium text-right break-all">{v}</dd>
                </div>
              ))}
            </dl>

            <p className="text-xs text-gray-500 mt-5 leading-relaxed">
              This charge appears on your statement from <strong>Dates (dates.care)</strong>.
              Credits are a prepaid balance for features inside Dates.care; they have
              no cash value and do not expire.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('payment-refund')}
              className="text-xs text-pink-600 underline mt-2"
            >
              Refund &amp; cancellation policy
            </button>
          </div>

          <button
            id="dc-receipt-actions"
            onClick={printReceipt}
            type="button"
            className="mt-4 w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white py-3 rounded-xl font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Print or save as PDF
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout onNavigate={onNavigate} title="Billing &amp; History" onBack={() => onNavigate('credits')}>
      <div className="px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-white/70">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p>Loading your transactions…</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-white/70">
            <p>Couldn't load your billing history. Please try again.</p>
          </div>
        ) : (
          <>
            {/* What you have actually paid — the number a billing page exists to show */}
            <div className="bg-white/10 border border-white/10 rounded-2xl p-4 mb-4">
              <p className="text-white/60 text-xs uppercase tracking-wide">Total paid on this account</p>
              <p className="text-white text-2xl font-bold mt-1">{fmtUsd(totalPaid)}</p>
              <p className="text-white/50 text-xs mt-1">
                {paidIntents.length} completed {paidIntents.length === 1 ? 'purchase' : 'purchases'}
                {' · '}charged as “Dates (dates.care)”
              </p>
            </div>

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

            <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-4">
              {([
                ['all', 'All'],
                ['purchases', 'Purchases'],
                ['spending', 'Spending'],
              ] as [Tab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === key ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <div className="text-center py-16 text-white/70">
                <p>Nothing here yet.</p>
                <p className="text-sm mt-1">
                  {tab === 'purchases'
                    ? 'Purchases will appear here with a receipt you can print.'
                    : tab === 'spending'
                      ? 'Credits you spend will be itemised here.'
                      : 'Purchases, spends, and rewards will show up here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visible.map((row) => {
                  if (row.kind === 'intent') {
                    const display = INTENT_STATUS_DISPLAY[row.status] || {
                      label: row.status, color: 'text-white/60', icon: Clock,
                    };
                    const Icon = display.icon;
                    const paid = row.status === 'finished';
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => paid && setReceipt(row)}
                        disabled={!paid}
                        className={`w-full text-left bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between ${
                          paid ? 'hover:bg-white/10 transition-colors cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-6 h-6 flex-shrink-0 ${display.color}`} />
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">
                              {PRODUCT_LABELS[row.product_id] || `${row.product_id} package`}
                            </p>
                            <p className="text-white/50 text-xs">{fmtDate(row.created_at)}</p>
                            {paid && (
                              <p className="text-pink-300 text-xs mt-0.5 flex items-center gap-1">
                                <Receipt className="w-3 h-3" /> View receipt
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-white font-bold">{fmtUsd(row.amount_usd)}</p>
                          <p className={`text-xs ${display.color}`}>{display.label}</p>
                        </div>
                      </button>
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
                          <p className="text-white/50 text-xs">{fmtDate(row.created_at)}</p>
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
            )}

            <div className="mt-6 flex items-start gap-2 text-white/50 text-xs leading-relaxed">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Every purchase is also emailed to you as a receipt. Charges appear on your
                statement as “Dates (dates.care)”. If something here looks wrong, contact
                support before disputing with your bank — we can usually sort it out the
                same day.
              </p>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

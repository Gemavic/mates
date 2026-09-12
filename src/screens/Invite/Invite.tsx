import React, { useEffect, useState } from 'react';
import { Copy, Check, Share2, Loader2, Users, Clock, ShieldCheck, Gift, XCircle, MessageCircle, MessageSquare } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchMyReferralCode,
  fetchMyReferrals,
  referralLink,
  inviteMessage,
  whatsappShareUrl,
  smsShareUrl,
  type ReferralSummary,
  type ReferralInvite,
} from '@/lib/referrals';

interface InviteProps {
  onNavigate: (screen: string) => void;
}

/**
 * Invite friends & family.
 *
 * The copy says plainly what is and is not on offer: complimentary credits
 * to both sides when the friend completes their profile, a second
 * thank-you to the inviter after thirty days, and never money. The
 * message is pre-written so sending takes one tap, but it goes out in the
 * member's own name from their own WhatsApp or Messages; the site sends
 * nothing and reads no contacts.
 */
export const Invite: React.FC<InviteProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [c, s] = await Promise.all([fetchMyReferralCode(), fetchMyReferrals()]);
        if (cancelled) return;
        if (!c) {
          setError('Your invitation link could not be prepared. Please try again in a moment.');
        }
        setCode(c);
        setSummary(s);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const link = code ? referralLink(code) : '';
  const terms = summary?.terms;
  const message = link ? inviteMessage(link, terms?.completion_credits ?? 20) : '';
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers: select-and-copy is still available from the field.
    }
  };

  const shareLink = async () => {
    if (!link) return;
    // The message is the member's own, in their own name. The site adds
    // nothing to it and sends it nowhere; the share sheet hands it to
    // whatever app they choose.
    try {
      await navigator.share({
        title: 'Dates.care',
        text: message,
      });
    } catch {
      // Cancelled by the person - nothing to do.
    }
  };

  return (
    <Layout onNavigate={onNavigate} title="Invite friends &amp; family" onBack={() => onNavigate('settings')}>
      <div className="px-4 py-6 max-w-md mx-auto space-y-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-white/70">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p>One moment…</p>
          </div>
        ) : (
          <>
            <section className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5" />
                <h2 className="font-semibold text-lg">Know someone who would like it here?</h2>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                Share your personal link with friends or family. It carries your name, so they know it
                came from you, not from us.{terms ? ` When they finish setting up their profile, you both receive ${terms.completion_credits} complimentary credits.` : ''}
              </p>
            </section>

            {error && (
              <div className="bg-red-500/20 border border-red-300/40 rounded-xl p-3 text-sm text-white">{error}</div>
            )}

            {code && (
              <section className="bg-white rounded-2xl p-5 shadow-lg">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Your link</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 min-w-0 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    aria-label="Copy link"
                    className="flex-shrink-0 p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    href={whatsappShareUrl(message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white rounded-xl py-2.5 text-sm font-semibold"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                  <a
                    href={smsShareUrl(message)}
                    className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold"
                  >
                    <MessageSquare className="w-4 h-4" /> Text message
                  </a>
                </div>
                {canShare && (
                  <button
                    type="button"
                    onClick={shareLink}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl py-2.5 text-sm font-semibold"
                  >
                    <Share2 className="w-4 h-4" />
                    Share another way
                  </button>
                )}
                <p className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 leading-relaxed">
                  {message}
                </p>
                <p className="mt-3 text-xs text-gray-500">
                  Your code is <span className="font-mono font-semibold text-gray-700">{code}</span>.
                  Please only send it to people you know.
                </p>
              </section>
            )}

            {terms && (
              <section className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-white text-sm space-y-3">
                <h3 className="font-semibold">How it works</h3>
                <p className="text-white/80 leading-relaxed">
                  Your friend joins through your link and receives the same welcome as every new
                  member. The moment they complete their profile (a photo, who they are, where they
                  are), <strong>you each receive {terms.completion_credits} complimentary credits</strong>.
                  When they have been a member for {terms.days_required} days, have verified their
                  profile and are still using the site, you receive a further{' '}
                  <strong>{terms.reward_credits} credits</strong>.
                </p>
                <p className="text-white/80 leading-relaxed">
                  Credits can be used on the site for calls, mail and gifts. They are never paid out
                  as money, cannot be transferred, and are not given for accounts that leave or are
                  suspended before the {terms.days_required} days are up. Up to {terms.monthly_cap}{' '}
                  thank-yous a month.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('terms')}
                  className="text-white/70 underline underline-offset-2 text-xs"
                >
                  Full terms
                </button>
              </section>
            )}

            <section className="bg-white rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">People you have invited</h3>
                {summary && summary.total_credits_earned > 0 && (
                  <span className="text-xs text-gray-500">
                    {summary.total_credits_earned} credits received so far
                  </span>
                )}
              </div>
              {!summary || summary.invites.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nobody yet. If someone joins through your link, they will appear here.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {summary.invites.map((inv) => (
                    <InviteRow key={inv.id} invite={inv} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
};

const InviteRow: React.FC<{ invite: ReferralInvite }> = ({ invite }) => {
  const joined = new Date(invite.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const due = new Date(invite.qualifies_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  let icon = <Clock className="w-4 h-4 text-amber-500" />;
  let note = invite.completed_at
    ? `Profile complete · ${invite.completion_credits ?? 0} credits received · a further thank-you from ${due}${invite.is_verified ? '' : ' once verified'}`
    : `Joined ${joined} · credits arrive when their profile is complete`;
  if (invite.status === 'rewarded') {
    icon = <Gift className="w-4 h-4 text-green-600" />;
    note = `Thank-yous of ${(invite.credits ?? 0) + (invite.completion_credits ?? 0)} credits received`;
  } else if (invite.status === 'void') {
    icon = <XCircle className="w-4 h-4 text-gray-400" />;
    note = invite.void_reason === 'not_verified'
      ? 'Did not verify within the time allowed'
      : invite.void_reason === 'not_active'
        ? 'Stopped using the site before the period ended'
        : 'No longer eligible';
  } else if (invite.is_verified) {
    icon = <ShieldCheck className="w-4 h-4 text-blue-500" />;
  }

  return (
    <li className="py-3 flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{invite.first_name}</p>
        <p className="text-xs text-gray-500">{note}</p>
      </div>
    </li>
  );
};

export default Invite;

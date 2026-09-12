import React, { useEffect, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchMyReferrals } from '@/lib/referrals';

/**
 * One card, on the home screen, for members who have not invited anyone:
 * "Invite a friend, you both get credits." Dismissed, it stays away for
 * two weeks; once the member has invited someone it never returns.
 */
const DISMISS_KEY = 'inviteNudgeDismissedAt';
const SNOOZE_DAYS = 14;

interface Props {
  onNavigate: (screen: string) => void;
}

export const InviteNudge: React.FC<Props> = ({ onNavigate }) => {
  const { user, isAnonymous } = useAuth();
  const [show, setShow] = useState(false);
  const [credits, setCredits] = useState(20);

  useEffect(() => {
    let alive = true;
    if (!user?.id || isAnonymous) { setShow(false); return; }
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (at && Date.now() - at < SNOOZE_DAYS * 86400000) { setShow(false); return; }
    } catch { /* storage unavailable: show it */ }
    fetchMyReferrals().then((s) => {
      if (!alive) return;
      if (!s) { setShow(false); return; }
      setCredits(s.terms?.completion_credits ?? 20);
      setShow(s.invites.length === 0);
    });
    return () => { alive = false; };
  }, [user?.id, isAnonymous]);

  if (!show) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setShow(false);
  };

  return (
    <div className="mx-4 mt-4 bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl p-4 text-white flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        <UserPlus className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">Invite a friend, you both get {credits} credits</p>
        <p className="text-white/80 text-sm mt-0.5">They join with your link; when their profile is complete, the credits land for both of you.</p>
        <button
          type="button"
          onClick={() => onNavigate('invite')}
          className="mt-2 inline-flex items-center gap-2 bg-white text-pink-600 font-semibold text-sm rounded-lg px-3 py-1.5"
        >
          Send an invite
        </button>
      </div>
      <button type="button" onClick={dismiss} aria-label="Not now" className="text-white/70 hover:text-white p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

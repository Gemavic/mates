import React, { useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import { pendingReferralCode, fetchInviterName } from '@/lib/referrals';
import { useAuth } from '@/hooks/useAuth';

/**
 * "Bankole invited you." Shown to someone who arrived through a member's
 * link, on the welcome and sign-up screens. The name is the member's own;
 * the invitation is theirs, not the site's. Renders nothing otherwise.
 */
export const InvitedByNote: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user } = useAuth();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const code = pendingReferralCode();
    if (!code) return;
    let cancelled = false;
    void fetchInviterName(code).then((n) => {
      if (!cancelled) setName(n);
    });
    return () => { cancelled = true; };
  }, []);

  // Someone already signed in is a member, not an invitee.
  if (!name || user) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/30 text-white text-sm px-4 py-1.5 ${className}`}
      role="status"
    >
      <UserCheck className="w-4 h-4" />
      <span>
        <strong className="font-semibold">{name}</strong> invited you to Dates.care
      </span>
    </div>
  );
};

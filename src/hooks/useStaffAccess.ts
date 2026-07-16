import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Staff access is gated by the SAME is_staff flag that every server-side
 * function already trusts (spend_credits, staff_traffic_summary,
 * staff_list_disputes, feed moderation policies, etc). There is no
 * separate staff password: a staff member is simply their normal,
 * signed-in Dates account with is_staff = true on their credit account row.
 *
 * This replaces the old parallel staffId/password system, which called a
 * database function (authenticate_staff) that was never created and could
 * never succeed.
 */
export function useStaffAccess() {
  const { user } = useAuth();
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setIsStaff(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabaseClient
      .rpc('get_my_credits')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data || data.length === 0) {
          setIsStaff(false);
        } else {
          const row = Array.isArray(data) ? data[0] : data;
          setIsStaff(!!row.is_staff);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Shape compatible with the legacy staffAuth object StaffPanel expects,
  // so StaffPanel.tsx itself needs no changes. All staff currently share
  // one flat permission level (is_staff true/false) — there is no granular
  // role system enforced server-side yet.
  const staffAuth = isStaff
    ? {
        staffId: user?.id,
        role: 'Staff',
        permissions: ['manage_users', 'award_credits', 'view_analytics', 'moderate_content'],
      }
    : null;

  return { isStaff, loading, staffAuth };
}

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { MapPin, Users, UserPlus, BadgeCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fetchNearMe, type NearMe } from '@/lib/profileCompletion';
import { regionName } from '@/lib/regions';
import { countryName } from '@/lib/countries';
import { timeAgo } from '@/lib/when';

/**
 * The first thing a member sees when their profile is complete: real people
 * in their province, then their country.
 *
 * It shows the faces and never a headcount. The site is still recruiting, so
 * any number here would be small today, wrong tomorrow, and a reason for
 * somebody to leave before they have looked at a single profile. The grid
 * below is the honest signal: it is exactly who is there. When it is empty
 * the screen says so plainly, without dressing it up as a statistic.
 */
interface NearYouProps {
  onNavigate: (screen: string, params?: { userId?: string; userName?: string }) => void;
}

export const NearYou: React.FC<NearYouProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [near, setNear] = useState<NearMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!user?.id) { setLoading(false); return; }
    fetchNearMe(12).then((n) => { if (alive) { setNear(n); setLoading(false); } });
    return () => { alive = false; };
  }, [user?.id]);

  const placeName = near
    ? (near.scope === 'region' && near.region_code
        ? regionName(near.country_code, near.region_code)
        : countryName(near.country_code)) || 'your area'
    : 'your area';
  const count = near ? (near.scope === 'region' ? near.region_count : near.country_count) : 0;
  const regionLabel = near?.region_code ? regionName(near.country_code, near.region_code) : null;

  return (
    <Layout title="People near you" onBack={() => onNavigate('discovery')} showClose={false}>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          {loading ? (
            <p className="text-white/80">Looking around…</p>
          ) : count > 0 ? (
            <>
              <h2 className="text-2xl font-bold text-white">People in {placeName}</h2>
              <p className="text-white/80 text-sm mt-1">
                {near?.scope === 'region'
                  ? 'Matching who you\'re looking for. Browse everyone to see the rest of the country.'
                  : regionLabel
                    ? `Nobody in ${regionLabel} yet who matches who you're looking for, so here is ${countryName(near?.country_code) ?? 'your country'}.`
                    : 'Matching who you\'re looking for.'}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white">Nobody in {placeName} yet</h2>
              <p className="text-white/80 text-sm mt-1">
                Nobody here yet matches who you're looking for. Members join every week, and bringing someone you know is the quickest way to change that.
              </p>
            </>
          )}
        </div>

        {!loading && near && near.members.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {near.members.map((m) => (
              <button
                key={m.user_id}
                type="button"
                onClick={() => onNavigate('view-profile', { userId: m.user_id, userName: m.first_name ?? undefined })}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-white/10 text-left focus:outline-none focus:ring-2 focus:ring-white"
              >
                {m.photo_url ? (
                  <img src={m.photo_url} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/40"><Users className="w-10 h-10" /></div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3">
                  <p className="text-white font-semibold leading-tight flex items-center gap-1">
                    {m.first_name || 'Member'}{m.age ? `, ${m.age}` : ''}
                    {m.is_verified && <BadgeCheck className="w-4 h-4 text-sky-300" aria-label="Verified" />}
                  </p>
                  <p className="text-white/80 text-xs truncate">
                    {m.location}{m.is_online ? ' · online' : m.last_active ? ` · ${timeAgo(m.last_active)}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-3">
          <Button onClick={() => onNavigate('discovery')} className="w-full h-12 bg-white text-pink-600 hover:bg-white/90 font-semibold rounded-xl">
            {count > 0 ? 'Browse everyone' : 'Browse anyway'}
          </Button>
          <Button onClick={() => onNavigate('invite')} variant="outline" className="w-full h-12 border-white/60 text-white hover:bg-white/10 font-semibold rounded-xl bg-transparent">
            <UserPlus className="w-4 h-4 mr-2" /> Invite a friend
          </Button>
          <p className="text-white/70 text-xs text-center">When a friend you invite completes their profile, you both receive 20 complimentary credits.</p>
        </div>
      </div>
    </Layout>
  );
};

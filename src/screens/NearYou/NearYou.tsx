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
 * in their province, then their country. The count is the true count, even
 * when it is small - a new member told "12 members in Ontario" can decide
 * to stay and invite a friend; one shown an empty grid with no explanation
 * just leaves.
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
              <h2 className="text-2xl font-bold text-white">
                {count.toLocaleString()} {count === 1 ? 'member' : 'members'} in {placeName}
              </h2>
              <p className="text-white/80 text-sm mt-1">
                {near?.scope === 'region'
                  ? `Matching who you're looking for. ${near.country_count.toLocaleString()} across ${countryName(near.country_code) ?? 'the country'} altogether.`
                  : regionLabel
                    ? `Nobody in ${regionLabel} yet who matches who you're looking for, so here is ${countryName(near?.country_code) ?? 'your country'}.`
                    : 'Matching who you\'re looking for.'}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white">You're among the first in {placeName}</h2>
              <p className="text-white/80 text-sm mt-1">
                Nobody here yet matches who you're looking for. Members join every week; the quickest way to change this number is to bring someone.
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
        </div>
      </div>
    </Layout>
  );
};

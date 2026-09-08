import React from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Crown, Star, Zap, Target } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase';
import { creditManager } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';
import { initialsAvatar } from '@/lib/avatar';

interface MatchSuitorProps {
  onNavigate: (screen: string, params?: { userId?: string }) => void;
}

export const MatchSuitor: React.FC<MatchSuitorProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  /**
   * This list sold "AI-powered compatibility analysis", "Priority Placement -
   * your profile appears first in discovery", "Unlimited Likes" and "5 super
   * likes per day". None of them is implemented: Discovery is an unranked
   * query, likes are already unlimited and free, and super likes cost 25
   * credits each for everyone. The one benefit a plan actually confers is
   * enforced in spend_credits: Platinum and Elite members are not charged
   * for calls. That is what is listed.
   */
  const premiumFeatures = [
    {
      icon: Zap,
      title: 'Voice calls included',
      description: 'No per-minute charge on Platinum and Elite',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Star,
      title: 'Video calls included',
      description: 'No per-minute charge on Platinum and Elite',
      color: 'from-green-500 to-teal-500'
    },
    {
      icon: Crown,
      title: 'One payment, one period',
      description: '31 days. Nothing renews automatically',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      icon: Target,
      title: 'Everything else as usual',
      description: 'Credits still buy mail attachments, gifts and super likes',
      color: 'from-blue-500 to-cyan-500'
    }
  ];

  const [matchSuggestions, setMatchSuggestions] = React.useState<any[]>([]);
  const [, setLoadingSuggestions] = React.useState(true);

  React.useEffect(() => {
    const loadSuggestions = async () => {
      if (!user?.id) {
        setLoadingSuggestions(false);
        return;
      }

      try {
        const { data: profiles } = await import('@/lib/supabase').then(m =>
          m.supabaseClient
            .from('user_profiles')
            .select('user_id, first_name, full_name, age, interests, bio')
            .neq('user_id', user.id)
            .eq('profile_visibility', 'public')
            .limit(5)
        );

        if (profiles && profiles.length > 0) {
          const { supabaseClient } = await import('@/lib/supabase');
          const suggestions = await Promise.all(
            profiles.map(async (profile: any) => {
              const { data: photo } = await supabaseClient
                .from('user_photos')
                .select('photo_url')
                .eq('user_id', profile.user_id)
                .eq('is_primary', true)
                .maybeSingle();

              const interests = Array.isArray(profile.interests) ? profile.interests : [];
              // Only their real interests. The fallback used to be
              // "Compatible personality" / "Similar values" - invented.
              const reasons = interests.slice(0, 3).map((i: string) => `Interested in ${i}`);

              return {
                id: profile.user_id,
                name: profile.first_name || profile.full_name || 'User',
                age: profile.age || 25,

                image: photo?.photo_url || initialsAvatar(profile.first_name || profile.full_name, profile.user_id),
                reasons
              };
            })
          );
          setMatchSuggestions(suggestions);
        }
      } catch (error) {
        console.error('Error loading suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    loadSuggestions();
  }, [user?.id]);

  return (
    <Layout
      onNavigate={onNavigate}
      title="Match Suitor"
      onBack={() => onNavigate('discovery')}
      showClose={false}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=400" 
            alt="Match Suitor" 
            className="w-20 h-20 mx-auto mb-4 rounded-full object-cover shadow-lg"
          />
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Match Suitor Premium</h2>
          <p className="text-white/80">Find your perfect match with AI-powered matching</p>
        </div>

        {/* Premium Features */}
        <div className="mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">Premium Features</h3>
          <div className="grid grid-cols-2 gap-4">
            {premiumFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center"
                >
                  <div className={`w-12 h-12 mx-auto mb-3 bg-gradient-to-r ${feature.color} rounded-full flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-white font-medium text-sm mb-2">{feature.title}</h4>
                  <p className="text-white/70 text-xs">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Match Suggestions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {/* Was "AI Match Suggestions" with a colour-coded "87% Compatibility
                Match" under each name. The number was Math.random() between 80
                and 94, regenerated on every render. */}
            <h3 className="text-white font-semibold text-lg">People you might like</h3>
          </div>
          
          <div className="space-y-4">
            {matchSuggestions.map((match) => (
              <div
                key={match.id}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
              >
                <div className="flex items-center space-x-4 mb-3">
                  <img
                    src={match.image}
                    alt={match.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="text-white font-medium mb-1">{match.name}, {match.age}</h4>
                    <p className="text-white/70 text-sm">Recently active</p>
                  </div>
                </div>
                
                {match.reasons.length > 0 && (
                <div className="mb-4">
                  <p className="text-white/80 text-sm mb-2">From their profile:</p>
                  <div className="space-y-1">
                    {match.reasons.map((reason: string, index: number) => (
                      <div key={index} className="flex items-center text-white/70 text-xs">
                        <div className="w-1.5 h-1.5 bg-pink-400 rounded-full mr-2"></div>
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
                )}
                
                <div className="flex space-x-2">
                  <Button
                    className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm hover:scale-105 transition-all duration-300"
                    onClick={async () => {
                      // Charged and recorded together by record_like(), at the
                      // one price that lives on the server. This screen used to
                      // charge 1 credit while Discovery charged 5 and the homepage
                      // said 25.
                      if (!user) {
                        alert('Please sign in to send Super Likes');
                        return;
                      }
                      const { data, error } = await supabaseClient.rpc('record_like', {
                        p_target_user_id: match.id,
                        p_like_type: 'super_like',
                      });
                      const r = (data ?? {}) as Record<string, unknown>;
                      if (error || !r.success) {
                        if (r.error === 'insufficient_credits') {
                          alert('You need 25 credits to send a Super Like.');
                        } else {
                          alert('That could not be sent. You have not been charged.');
                        }
                        return;
                      }
                      void creditManager.refresh(user.id);
                      alert(r.is_match ? `💞 It's a match with ${match.name}!` : `⭐ Super liked ${match.name}!`);
                    }}
                    disabled={!user}
                    type="button"
                  >
                    Super Like (25 Credits)
                  </Button>
                  <Button
                    className="flex-1 bg-white/20 text-white text-sm hover:bg-white/30"
                    onClick={() => onNavigate('view-profile', { userId: match.id })}
                    type="button"
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-center">
          <Crown className="w-12 h-12 text-white mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">Membership plans</h3>
          <p className="text-white/90 text-sm mb-4">
            Platinum and Elite include voice and video calls for the period.
          </p>
          {/* Said "Upgrade Now - $9.99/month". No $9.99 plan has ever existed. */}
          <Button
            onClick={() => onNavigate('credits')}
            className="bg-white text-purple-600 font-semibold px-8 py-3 hover:scale-105 transition-all duration-300"
          >
            See plans and prices
          </Button>
        </div>
      </div>
    </Layout>
  );
};
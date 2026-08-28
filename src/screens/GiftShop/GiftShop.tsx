import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Gift, Heart, Star, Crown, Coffee, Flower2, CreditCard, Sparkles, Mail, Music, Palette, Gem, Loader2 } from 'lucide-react';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';
import { MessagingManager } from '@/lib/database';

/**
 * A gift as stored in public.virtual_gifts.
 *
 * The catalogue is no longer hardcoded here — it is 109 rows in the database,
 * across 11 categories, each with real artwork. Changing a price or adding a
 * gift is now a database change, not a deploy.
 */
interface GiftItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;              // emoji, used as the fallback if artwork fails to load
  credit_cost: number;
  category: string;
  category_label: string;
  vip_tier: 'member' | 'bronze' | 'silver' | 'gold' | 'diamond';
  image_url: string | null;  // public SVG in Supabase Storage
  is_wide: boolean;          // postcards are landscape and need a double-width tile
  sort_order: number;
}

interface GiftShopProps {
  onNavigate: (screen: string) => void;
  initialRecipientId?: string | null;
  initialRecipientName?: string | null;
}

/** Icon and gradient per category slug, so the tab bar keeps its current look. */
const CATEGORY_STYLE: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  all:         { icon: Gift,     color: 'from-purple-500 to-pink-500' },
  icebreakers: { icon: Coffee,   color: 'from-amber-400 to-orange-500' },
  flowers:     { icon: Flower2,  color: 'from-green-500 to-emerald-600' },
  romance:     { icon: Heart,    color: 'from-pink-500 to-rose-500' },
  western:     { icon: Star,     color: 'from-orange-600 to-amber-700' },
  jewellery:   { icon: Gem,      color: 'from-yellow-400 to-amber-500' },
  lifestyle:   { icon: Sparkles, color: 'from-slate-500 to-slate-700' },
  hobby:       { icon: Palette,  color: 'from-teal-500 to-cyan-600' },
  statement:   { icon: Crown,    color: 'from-violet-500 to-purple-600' },
  interactive: { icon: Sparkles, color: 'from-fuchsia-500 to-pink-600' },
  animated:    { icon: Music,    color: 'from-orange-400 to-red-500' },
  postcards:   { icon: Mail,     color: 'from-blue-500 to-indigo-600' },
};

const TIER_LABEL: Record<string, string> = {
  bronze: 'Bronze VIP', silver: 'Silver VIP', gold: 'Gold VIP', diamond: 'Diamond VIP',
};

export const GiftShop: React.FC<GiftShopProps> = ({ onNavigate, initialRecipientId = null, initialRecipientName = null }) => {
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState(creditManager.getTotalCredits(user?.id || 'demo-user'));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [brokenArt, setBrokenArt] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadCatalogue = async () => {
      // art_svg is deliberately not selected: it holds the inline SVG for every
      // gift (~639 kB across the table) and would ship on every shop open.
      // image_url points at the same artwork as a separately cacheable file.
      const { data, error } = await supabaseClient
        .from('virtual_gifts')
        .select('id,slug,name,description,icon,credit_cost,category,category_label,vip_tier,image_url,is_wide,sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error('Failed to load gift catalogue:', error);
        setLoadError('We could not load the gift shop just now.');
      } else {
        setGifts((data as GiftItem[]) ?? []);
        setLoadError(null);
      }
      setLoading(false);
    };

    loadCatalogue();
    return () => { cancelled = true; };
  }, []);

  /** Category tabs, derived from what is actually in the catalogue. */
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const g of gifts) if (!seen.has(g.category)) seen.set(g.category, g.category_label);
    return [
      { id: 'all', name: 'All Gifts', ...CATEGORY_STYLE.all },
      ...Array.from(seen.entries()).map(([id, name]) => ({
        id,
        name,
        ...(CATEGORY_STYLE[id] ?? { icon: Gift, color: 'from-purple-500 to-pink-500' }),
      })),
    ];
  }, [gifts]);

  // Already ordered by sort_order (category order, then price) from the query.
  const visibleGifts = useMemo(
    () => (selectedCategory === 'all' ? gifts : gifts.filter(g => g.category === selectedCategory)),
    [gifts, selectedCategory],
  );

  const markArtBroken = (slug: string) =>
    setBrokenArt(prev => (prev.has(slug) ? prev : new Set(prev).add(slug)));

  const sendGift = async (_giftId: string, giftName: string, price: number, emoji: string) => {
    if (!user) {
      alert('Please sign in to send gifts');
      return;
    }

    const isStaffFree = creditManager.isStaffMember(user.id);
    if (!creditManager.canAfford(user.id, price) && !isStaffFree) {
      alert(`You need ${formatCredits(price)} to send this gift!`);
      return;
    }

    if (!isStaffFree) {
      const success = await creditManager.spendCredits(user.id, price, `Sent ${giftName} gift`);
      if (!success) {
        alert('Failed to send gift. Please try again.');
        return;
      }
      setUserBalance(creditManager.getTotalCredits(user.id));
    } else {
      setUserBalance(creditManager.getTotalCredits(user.id));
    }

    // If this gift is going to a specific person (opened from their chat),
    // actually deliver it into their real conversation — previously this
    // function only showed a success alert with no record of who, if
    // anyone, received anything.
    if (initialRecipientId) {
      try {
        const threadId = await MessagingManager.getOrCreateThread(user.id, initialRecipientId);
        await supabaseClient.from('mail_messages').insert({
          thread_id: threadId,
          sender_id: user.id,
          subject: 'Gift',
          message_text: `${emoji} Sent you a ${giftName}!`,
          credits_spent: 0, // already charged above via spendCredits
          has_photos: false,
          is_delivered: true,
          delivered_at: new Date().toISOString(),
          is_read: false,
        });
        alert(`🎁 Sent ${giftName} to ${initialRecipientName || 'them'}!`);
      } catch (err) {
        console.error('Gift charged but failed to deliver message:', err);
        alert(`🎁 ${giftName} purchased, but delivering it to their chat failed — please try messaging them directly.`);
      }
    } else {
      alert(`🎁 Successfully sent ${giftName} for ${formatCredits(price)}!`);
    }
  };

  const activeCategoryName =
    selectedCategory === 'all' ? 'All Gifts' : categories.find(c => c.id === selectedCategory)?.name;

  return (
    <Layout
      title="Gift Shop"
      onNavigate={onNavigate}
      activeTab="gift-shop"
      onBack={() => onNavigate('discovery')}
      showClose={false}
    >
      <div className="px-4 py-6">
        {initialRecipientId && (
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 mb-6 flex items-center gap-2">
            <Gift className="w-5 h-5 text-white flex-shrink-0" />
            <p className="text-white text-sm">
              Sending a gift to <span className="font-bold">{initialRecipientName || 'this person'}</span>
              {' '}— it'll appear right in your chat with them.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Gift Shop</h2>
          <p className="text-white/80">Send virtual gifts to show you care</p>
        </div>

        {/* Credits Balance */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Your Credits</p>
              <p className="text-2xl font-bold text-white">{formatCredits(userBalance)}</p>
            </div>
            <Button
              onClick={() => onNavigate('credits')}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 cursor-pointer touch-manipulation active:scale-95"
              type="button"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Buy More
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        {!loading && !loadError && (
          <div className="mb-6">
            <div className="flex overflow-x-auto pb-2 space-x-2">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 cursor-pointer touch-manipulation active:scale-95 ${
                      selectedCategory === category.id
                        ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                    type="button"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Gift Grid */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/80">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Loading the gift shop…</p>
            </div>
          ) : loadError ? (
            <div className="py-12 text-center">
              <p className="text-white/90 mb-4">{loadError}</p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-white/20 text-white px-4 py-2"
                type="button"
              >
                Try again
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">
                  {activeCategoryName} ({visibleGifts.length} items)
                </h3>
                <span className="text-white/70 text-sm">Low to high</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {visibleGifts.map((gift) => {
                  const affordable =
                    creditManager.canAfford(user?.id || 'demo-user', gift.credit_cost) ||
                    creditManager.isStaffMember(user?.id || 'demo-user');
                  const artFailed = brokenArt.has(gift.slug) || !gift.image_url;

                  return (
                    <div
                      key={gift.slug}
                      className={`bg-white/10 rounded-xl p-3 text-center hover:bg-white/20 transition-all duration-300 hover:scale-105 flex flex-col justify-between min-h-[190px] ${
                        gift.is_wide ? 'col-span-2' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center mb-2 h-[76px]">
                        {artFailed ? (
                          <span className="text-3xl" role="img" aria-label={gift.name}>{gift.icon}</span>
                        ) : (
                          <img
                            src={gift.image_url as string}
                            alt={gift.name}
                            loading="lazy"
                            onError={() => markArtBroken(gift.slug)}
                            className={gift.is_wide ? 'h-[76px] w-auto' : 'h-[72px] w-[72px]'}
                          />
                        )}
                      </div>

                      <h4 className="text-white font-medium text-sm mb-1">{gift.name}</h4>
                      {gift.description && (
                        <p className="text-white/60 text-xs mb-2">{gift.description}</p>
                      )}

                      <div className="flex flex-col items-center gap-1 mb-3">
                        <span className="text-white font-semibold text-sm">
                          {formatCredits(gift.credit_cost)}
                        </span>
                        {gift.vip_tier !== 'member' && (
                          <span className="text-[10px] font-semibold tracking-wide text-yellow-300/90">
                            {TIER_LABEL[gift.vip_tier]}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto">
                        <Button
                          onClick={() => sendGift(gift.id, gift.name, gift.credit_cost, gift.icon)}
                          disabled={!affordable}
                          className={`w-full text-xs py-2 transition-all duration-300 cursor-pointer touch-manipulation active:scale-95 ${
                            affordable
                              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:scale-105'
                              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          }`}
                          type="button"
                        >
                          {affordable ? 'Send Gift' : 'Need Credits'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {visibleGifts.length === 0 && (
                <p className="text-white/70 text-center py-10 text-sm">
                  Nothing in this category yet.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

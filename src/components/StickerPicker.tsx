import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';

export interface Sticker {
  id: string;
  name: string;
  category: string;
  emoji: string | null;
  image_url: string | null;
  credit_cost: number;
}

interface StickerPickerProps {
  threadId: string;
  onClose: () => void;
  /** Fired once the sticker is charged and delivered. */
  onSent: (sticker: Sticker) => void;
}

const RECENT_KEY = 'dc.recentStickers';

/**
 * The sticker tray.
 *
 * Stickers were priced at 5 credits in the footer, the menu, the checkout page
 * and the Terms, and did not exist. This is the feature those prices were
 * describing.
 *
 * Artwork is deliberately the catalogue's own: each row carries an emoji today
 * and an optional image_url, so uploading real artwork later is a database
 * change rather than a deploy.
 */
export const StickerPicker: React.FC<StickerPickerProps> = ({ threadId, onClose, onSent }) => {
  const { user } = useAuth();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  // An image_url pointing at a file that is not there rendered a broken-image
  // icon in every tile. The emoji each row carries is the fallback.
  const [brokenArt, setBrokenArt] = useState<Set<string>>(new Set());
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let cancelled = false;
    supabaseClient
      .from('stickers')
      .select('id, name, category, emoji, image_url, credit_cost')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('Could not load stickers:', error);
        setStickers(data || []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byCategory = useMemo(() => {
    const groups = new Map<string, Sticker[]>();
    for (const s of stickers) {
      if (!groups.has(s.category)) groups.set(s.category, []);
      groups.get(s.category)!.push(s);
    }
    return groups;
  }, [stickers]);

  const recentStickers = useMemo(
    () => recent.map((id) => stickers.find((s) => s.id === id)).filter(Boolean) as Sticker[],
    [recent, stickers]
  );

  const price = stickers[0]?.credit_cost ?? 5;

  const send = async (sticker: Sticker) => {
    if (!user || sending) return;
    setSending(sticker.id);
    try {
      const free = creditManager.isStaffMember(user.id);

      if (!free) {
        if (!creditManager.canAfford(user.id, sticker.credit_cost)) {
          alert(`You need ${formatCredits(sticker.credit_cost)} to send a sticker.`);
          return;
        }
        const charged = await creditManager.spendCredits(
          user.id,
          sticker.credit_cost,
          `Sent ${sticker.name} sticker`
        );
        if (!charged) {
          alert('Could not take the credits for that sticker. Nothing was sent.');
          return;
        }
      }

      const { error } = await supabaseClient.from('mail_messages').insert({
        thread_id: threadId,
        sender_id: user.id,
        subject: 'Sticker',
        message_text: sticker.emoji || sticker.name,
        sticker_id: sticker.id,
        credits_spent: 0, // charged above
        has_photos: false,
        is_delivered: true,
        delivered_at: new Date().toISOString(),
        is_read: false,
      });

      if (error) {
        console.error('Sticker charged but not delivered:', error);
        alert('That sticker was paid for but did not send. Please contact support.');
        return;
      }

      const next = [sticker.id, ...recent.filter((id) => id !== sticker.id)].slice(0, 8);
      setRecent(next);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // A blocked storage write should never stop a sticker being sent.
      }

      onSent(sticker);
      onClose();
    } finally {
      setSending(null);
    }
  };

  const Tile: React.FC<{ sticker: Sticker }> = ({ sticker }) => (
    <button
      onClick={() => send(sticker)}
      disabled={!!sending}
      aria-label={`Send ${sticker.name} sticker for ${sticker.credit_cost} credits`}
      className="flex items-center justify-center aspect-square rounded-xl hover:bg-pink-50 dark:hover:bg-night-700 disabled:opacity-50 touch-manipulation active:scale-95 transition-transform"
    >
      {sending === sticker.id ? (
        <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
      ) : sticker.image_url && !brokenArt.has(sticker.id) ? (
        <img
          src={sticker.image_url}
          alt={sticker.name}
          className="w-12 h-12 object-contain"
          onError={() => setBrokenArt(prev => new Set(prev).add(sticker.id))}
        />
      ) : (
        <span className="text-4xl">{sticker.emoji}</span>
      )}
    </button>
  );

  return (
    <div className="border-t border-pink-200 dark:border-night-700 bg-white dark:bg-night-900 max-h-[45vh] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-pink-100 dark:border-night-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">Stickers</h3>
          <span className="text-xs font-medium bg-orange-100 dark:bg-night-700 text-orange-700 dark:text-orange-300 rounded-full px-2 py-0.5">
            {price} credits each
          </span>
        </div>
        <button onClick={onClose} aria-label="Close stickers" className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading stickers…
          </div>
        ) : stickers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400 py-6 text-center">
            No stickers available yet.
          </p>
        ) : (
          <>
            {recentStickers.length > 0 && (
              <section className="mb-3">
                <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">
                  Recently used
                </h4>
                <div className="grid grid-cols-5 gap-1">
                  {recentStickers.map((s) => (
                    <Tile key={`recent-${s.id}`} sticker={s} />
                  ))}
                </div>
              </section>
            )}

            {[...byCategory.entries()].map(([category, items]) => (
              <section key={category} className="mb-3">
                <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">
                  {category}
                </h4>
                <div className="grid grid-cols-5 gap-1">
                  {items.map((s) => (
                    <Tile key={s.id} sticker={s} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

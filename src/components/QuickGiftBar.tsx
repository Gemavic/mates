import React, { useEffect, useState } from 'react';
import { Loader2, MoreHorizontal } from 'lucide-react';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';

interface QuickGift {
  id: string;
  name: string;
  icon: string | null;
  image_url: string | null;
  credit_cost: number;
}

interface QuickGiftBarProps {
  threadId: string;
  recipientName: string;
  /** Called after a gift is charged and delivered, so the thread can show it. */
  onSent: (text: string) => void;
  onOpenShop: () => void;
}

/**
 * A row of gifts sitting directly above the message box.
 *
 * Sending a gift previously meant leaving the conversation for the shop, which
 * is enough friction that most people never did it. These are the cheapest few
 * from the same catalogue the shop reads, so prices here and there can never
 * drift apart.
 *
 * Deliberately NOT one tap. The reference design sends immediately, but every
 * one of these spends real credits, and a mis-tap on a phone beside the text
 * field would be a silent charge. Tapping a gift asks first.
 */
export const QuickGiftBar: React.FC<QuickGiftBarProps> = ({
  threadId,
  recipientName,
  onSent,
  onOpenShop,
}) => {
  const { user } = useAuth();
  const [gifts, setGifts] = useState<QuickGift[]>([]);
  const [pending, setPending] = useState<QuickGift | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabaseClient
      .from('virtual_gifts')
      .select('id, name, icon, image_url, credit_cost')
      .eq('is_active', true)
      .order('credit_cost', { ascending: true })
      .limit(8)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Could not load quick gifts:', error);
          return;
        }
        setGifts(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const send = async (gift: QuickGift) => {
    if (!user) return;
    setSending(true);
    try {
      const free = creditManager.isStaffMember(user.id);

      if (!free) {
        if (!creditManager.canAfford(user.id, gift.credit_cost)) {
          alert(`You need ${formatCredits(gift.credit_cost)} to send ${gift.name}.`);
          return;
        }
        const charged = await creditManager.spendCredits(
          user.id,
          gift.credit_cost,
          `Sent ${gift.name} gift`
        );
        if (!charged) {
          alert('Could not take the credits for that gift. Nothing was sent.');
          return;
        }
      }

      // Charge first, then deliver. If this insert fails the credits are gone,
      // so say so plainly rather than pretending it arrived.
      const text = `${gift.icon || '🎁'} Sent you a ${gift.name}!`;
      const { error } = await supabaseClient.from('mail_messages').insert({
        thread_id: threadId,
        sender_id: user.id,
        subject: 'Gift',
        message_text: text,
        gift_id: gift.id,
        credits_spent: 0, // already charged above
        has_photos: false,
        is_delivered: true,
        delivered_at: new Date().toISOString(),
        is_read: false,
      });

      if (error) {
        console.error('Gift charged but not delivered:', error);
        alert(
          `${gift.name} was paid for but did not reach ${recipientName}. ` +
            'Please tell support before sending another.'
        );
        return;
      }

      onSent(text);
      setPending(null);
    } finally {
      setSending(false);
    }
  };

  if (gifts.length === 0) return null;

  if (pending) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-night-800 border-t border-pink-100 dark:border-night-700">
        <span className="text-2xl flex-shrink-0">{pending.icon || '🎁'}</span>
        <p className="text-sm text-gray-800 dark:text-slate-100 flex-1 min-w-0">
          Send <strong>{pending.name}</strong> to {recipientName} for{' '}
          {formatCredits(pending.credit_cost)}?
        </p>
        <button
          onClick={() => send(pending)}
          disabled={sending}
          className="rounded-lg bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-600 disabled:opacity-60 flex-shrink-0"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send'}
        </button>
        <button
          onClick={() => setPending(null)}
          disabled={sending}
          className="text-xs text-gray-500 dark:text-slate-400 hover:underline flex-shrink-0"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 overflow-x-auto bg-white/90 dark:bg-night-800 border-t border-pink-100 dark:border-night-700">
      {gifts.map((gift) => (
        <button
          key={gift.id}
          onClick={() => setPending(gift)}
          className="flex flex-col items-center min-w-[52px] flex-shrink-0 touch-manipulation active:scale-95 transition-transform"
          aria-label={`Send ${gift.name} for ${gift.credit_cost} credits`}
        >
          {gift.image_url ? (
            <img
              src={gift.image_url}
              alt=""
              className="w-9 h-9 object-contain"
              onError={(e) => {
                // Fall back to the emoji the catalogue carries for each gift.
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                const sib = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (sib) sib.style.display = 'block';
              }}
            />
          ) : null}
          <span className="text-2xl" style={{ display: gift.image_url ? 'none' : 'block' }}>
            {gift.icon || '🎁'}
          </span>
          <span className="text-[11px] text-gray-600 dark:text-slate-300 tabular-nums">
            {gift.credit_cost}
          </span>
        </button>
      ))}

      <button
        onClick={onOpenShop}
        aria-label="Browse all gifts"
        className="flex items-center justify-center w-9 h-9 rounded-full bg-pink-100 dark:bg-night-700 text-pink-600 dark:text-pink-300 flex-shrink-0 ml-1"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </div>
  );
};

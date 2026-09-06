import React from 'react';
import { X } from 'lucide-react';
import { creditManager } from '@/lib/creditSystem';
import { BLANK_AVATAR } from '@/lib/avatar';

/**
 * Shown when someone tries to unlock something they cannot afford.
 *
 * The previous behaviour was an alert() saying "You do not have enough
 * credits" and nothing else - a dead end in the middle of a conversation,
 * with no way to buy and no way back except OK. Someone who wanted to spend
 * money was told no and left there.
 *
 * This says the same thing and then offers the way forward: the cheapest
 * package that actually covers what they are short, priced honestly, with
 * the conversation named so it is obvious what the credits are for. Closing
 * it returns them to the chat exactly where they were.
 */

interface LowOnCreditsProps {
  open: boolean;
  /** Who they are talking to - this is what makes the ask concrete. */
  partnerName: string;
  partnerImage?: string;
  myImage?: string;
  /** How many credits the thing they tapped actually costs. */
  needed: number;
  /** What they hold right now, so we can show the shortfall honestly. */
  balance?: number;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

export const LowOnCredits: React.FC<LowOnCreditsProps> = ({
  open,
  partnerName,
  partnerImage,
  myImage,
  needed,
  balance,
  onClose,
  onNavigate,
}) => {
  if (!open) return null;

  // The packages come from creditManager so this panel can never quote a
  // price the Credits screen does not honour.
  const packages = creditManager.getCreditPackages();
  const withTotals = packages
    .map((p) => ({ ...p, total: p.credits + p.bonus_credits }))
    .sort((a, b) => a.price_usd - b.price_usd);

  // Offer the cheapest pack that actually clears the shortfall. Offering a
  // pack too small to unlock the thing they just tapped would take their
  // money and leave them exactly where they started.
  const shortfall = typeof balance === 'number' ? Math.max(needed - balance, 0) : needed;
  const best = withTotals.find((p) => p.total >= shortfall) ?? withTotals[withTotals.length - 1];

  const goToCredits = () => {
    onClose();
    onNavigate('credits');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="low-credits-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-night-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-night-700"
        >
          <X className="h-5 w-5" />
        </button>

        {/* The two of them, facing each other. */}
        <div className="relative bg-gradient-to-b from-pink-50 to-white px-6 pb-2 pt-9 dark:from-night-700 dark:to-night-800">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl" aria-hidden="true">💌</span>
            <div className="flex -space-x-4">
              <img
                src={partnerImage || BLANK_AVATAR}
                alt=""
                className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-md dark:border-night-800"
              />
              <img
                src={myImage || BLANK_AVATAR}
                alt=""
                className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-md dark:border-night-800"
              />
            </div>
            <span className="text-2xl" aria-hidden="true">🎁</span>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 text-center">
          <h2
            id="low-credits-title"
            className="text-2xl font-bold text-gray-900 dark:text-slate-100"
          >
            Low on Credits...
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
            Get more credits to keep your conversation with{' '}
            <span className="font-semibold text-gray-900 dark:text-slate-100">{partnerName}</span> going
          </p>

          {/* Say plainly what this costs and what they hold. Someone deciding
              whether to spend money is owed both numbers. */}
          <p className="mt-3 text-xs text-gray-500 dark:text-slate-500">
            This costs {needed} credits
            {typeof balance === 'number' && <> · you have {balance}</>}
          </p>

          <div className="mt-5 rounded-2xl border-2 border-pink-200 px-4 py-3 dark:border-pink-500/40">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900 dark:text-slate-100">
                {best.total} credits
              </span>
              <span className="text-base font-semibold text-gray-900 dark:text-slate-100">
                ${best.price_usd.toFixed(2)}
              </span>
            </div>
            {best.bonus_credits > 0 && (
              <p className="mt-0.5 text-left text-xs text-gray-500 dark:text-slate-400">
                {best.credits} credits + {best.bonus_credits} bonus
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={goToCredits}
            className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            Get {best.total} Credits for ${best.price_usd.toFixed(2)}
          </button>

          <button
            type="button"
            onClick={goToCredits}
            className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-night-600 dark:text-slate-300 dark:hover:bg-night-700"
          >
            See Other Options
          </button>
        </div>
      </div>
    </div>
  );
};

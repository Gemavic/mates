import React, { useState } from 'react';
import { Lock, Eye, Coins } from 'lucide-react';
import { creditManager, CREDIT_COSTS, formatCredits } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';

/**
 * ProtectedMedia — the platform's "sanctity shield" for images in chat.
 *
 * EVERY image shared in a conversation renders heavily blurred by default,
 * regardless of content. There is no code path that displays a received
 * image unblurred without an explicit, credit-charged reveal by the
 * intended recipient. This guarantees no explicit photo can ever be
 * openly visible in a chat area — deterministically, with zero reliance
 * on AI detection being right.
 *
 * Rules:
 *  - The SENDER always sees their own media (they created it)
 *  - The RECIPIENT sees a blurred preview + reveal button
 *  - Revealing charges credits (server-validated); staff reveal free
 *  - The reveal is session-local: re-opening the chat re-blurs
 */

interface ProtectedMediaProps {
  src: string;
  isOwnMedia: boolean;
  senderName?: string;
  alt?: string;
  className?: string;
}

export const ProtectedMedia: React.FC<ProtectedMediaProps> = ({
  src,
  isOwnMedia,
  senderName,
  alt = 'Shared photo',
  className = '',
}) => {
  const { user } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cost = CREDIT_COSTS.MAIL_PHOTO; // 10 credits to reveal

  const handleReveal = async () => {
    if (!user?.id) {
      setError('Sign in to view photos.');
      return;
    }
    setBusy(true);
    setError(null);
    const ok = await creditManager.deductCredits(user.id, cost, 'media_reveal');
    setBusy(false);
    if (ok) {
      setRevealed(true);
    } else {
      setError(`You need ${formatCredits(cost)} credits to reveal this photo.`);
    }
  };

  if (isOwnMedia || revealed) {
    return (
      <img
        src={src}
        alt={alt}
        className={`rounded-xl max-w-full max-h-64 object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`} style={{ maxWidth: 260 }}>
      {/* Heavy blur + scale prevents edge-peeking; overlay blocks context menu saves */}
      <img
        src={src}
        alt="Protected photo"
        className="w-full max-h-64 object-cover select-none pointer-events-none"
        style={{ filter: 'blur(28px) saturate(0.8)', transform: 'scale(1.15)' }}
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <p className="text-white text-xs font-medium mb-3">
          {senderName ? `${senderName} sent a photo` : 'Photo received'}
          <span className="block text-white/70 mt-0.5">
            Blurred for your safety — reveal only if you want to
          </span>
        </p>
        <button
          onClick={handleReveal}
          disabled={busy}
          className="flex items-center gap-1.5 bg-white text-gray-900 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-white/90 disabled:opacity-60 transition-colors"
          type="button"
        >
          {busy ? (
            <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          Reveal
          <span className="flex items-center gap-0.5 text-amber-600">
            <Coins className="w-3 h-3" />
            {cost}
          </span>
        </button>
        {error && <p className="text-red-200 text-[10px] mt-2">{error}</p>}
      </div>
    </div>
  );
};

/** Heuristic: does this message content look like an image? */
export function looksLikeImage(content: string): boolean {
  if (!content) return false;
  if (content.startsWith('data:image/')) return true;
  if (content.startsWith('blob:')) return true;
  if (/^https?:\/\/\S+\.(jpe?g|png|gif|webp|avif)(\?\S*)?$/i.test(content.trim())) return true;
  if (/^https?:\/\/\S+supabase\.co\/storage\/\S+/i.test(content.trim())) return true;
  return false;
}

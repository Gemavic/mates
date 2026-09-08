import React, { useState } from 'react';
import { Lock, Eye, Coins } from 'lucide-react';
import { CREDIT_COSTS, formatCredits } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';

/**
 * ProtectedMedia — a photo in chat that the recipient chooses to see.
 *
 * Until batch 3 this component received the ORIGINAL image and drew a CSS
 * blur over it; the full-size file was already in the page before the
 * 10-credit reveal. Now the recipient is given only a tiny preview (made by
 * the sender's browser and stored beside the original) and the original
 * lives in a private bucket the storage policy will not serve until
 * reveal_media() has recorded a paid reveal. `reveal` is that round trip:
 * it charges on the server and comes back with a signed URL, or null.
 *
 * Rules:
 *  - The SENDER always sees their own media (they created it).
 *  - The RECIPIENT sees the preview + a reveal button.
 *  - Revealing charges credits on the server; staff reveal free there.
 *  - The reveal is session-local: re-opening the chat re-blurs the preview,
 *    but a second reveal is not charged (the entitlement row already exists).
 *
 * Legacy photos (public URLs from before the private bucket) are passed as
 * `src` with `legacy`: they are shown blurred out of courtesy and revealed
 * without charge, because nothing is being protected.
 */

interface ProtectedMediaProps {
  /** The original, when the viewer is already entitled to it. */
  src?: string | null;
  /** A tiny preview for a viewer who is not. */
  previewSrc?: string | null;
  isOwnMedia: boolean;
  /** Server-side reveal: charge, then return the signed original URL. */
  reveal?: () => Promise<string | null>;
  /** A pre-private-bucket photo: blur for courtesy, reveal for free. */
  legacy?: boolean;
  senderName?: string;
  alt?: string;
  className?: string;
}

export const ProtectedMedia: React.FC<ProtectedMediaProps> = ({
  src,
  previewSrc,
  isOwnMedia,
  reveal,
  legacy = false,
  senderName,
  alt = 'Shared photo',
  className = '',
}) => {
  const { user } = useAuth();
  const [revealedSrc, setRevealedSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cost = CREDIT_COSTS.MAIL_PHOTO; // 10 credits to reveal
  const shown = isOwnMedia ? src : revealedSrc;

  const handleReveal = async () => {
    if (!user?.id) {
      setError('Sign in to view photos.');
      return;
    }
    if (legacy && src) {
      setRevealedSrc(src);
      return;
    }
    if (!reveal) return;
    setBusy(true);
    setError(null);
    try {
      const url = await reveal();
      if (url) {
        setRevealedSrc(url);
      } else {
        setError(`You need ${formatCredits(cost)} credits to reveal this photo.`);
      }
    } catch (err) {
      console.error('Reveal failed', err);
      setError('Could not reveal this photo. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (shown) {
    return (
      <img
        src={shown}
        alt={alt}
        className={`rounded-xl max-w-full max-h-64 object-cover ${className}`}
      />
    );
  }

  const blurredSrc = legacy ? src : previewSrc;

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`} style={{ maxWidth: 260 }}>
      {blurredSrc ? (
        <img
          src={blurredSrc}
          alt="Photo preview"
          className="w-full h-48 object-cover select-none pointer-events-none"
          style={{ filter: 'blur(14px) saturate(0.8)', transform: 'scale(1.15)' }}
          draggable={false}
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-fuchsia-200 via-pink-200 to-amber-200 dark:from-fuchsia-900 dark:via-pink-900 dark:to-amber-900" />
      )}
      <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <p className="text-white text-xs font-medium mb-3">
          {senderName ? `${senderName} sent a photo` : 'Photo received'}
          <span className="block text-white/70 mt-0.5">
            {legacy ? 'Blurred until you choose to see it' : 'Blurred for your safety — reveal only if you want to'}
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
          {!legacy && (
            <span className="flex items-center gap-0.5 text-amber-600">
              <Coins className="w-3 h-3" />
              {cost}
            </span>
          )}
        </button>
        {error && <p className="text-red-200 text-[10px] mt-2">{error}</p>}
      </div>
    </div>
  );
};

/** Heuristic: does this message content look like an image URL? */
export function looksLikeImage(content: string): boolean {
  if (!content) return false;
  if (content.startsWith('data:image/')) return true;
  if (content.startsWith('blob:')) return true;
  if (/^https?:\/\/\S+\.(jpe?g|png|gif|webp|avif)(\?\S*)?$/i.test(content.trim())) return true;
  if (/^https?:\/\/\S+supabase\.co\/storage\/\S+/i.test(content.trim())) return true;
  return false;
}

/** A private chat-photo path: `<sender uuid>/<file>.jpg` in the chat-photos bucket. */
export function isPrivatePhotoPath(content: string): boolean {
  return /^[0-9a-f-]{36}\/[^/]+\.(jpe?g|png|webp)$/i.test((content || '').trim());
}

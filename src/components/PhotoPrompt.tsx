import React, { useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';

/**
 * Tells a user with no photos that they are not visible in Discovery.
 *
 * WHY: Discovery drops any profile with no photo - deliberately, since a
 * faceless card is worthless to everyone who sees it. But the person
 * being filtered out gets no signal at all. They browse a near-empty
 * grid, conclude the platform is dead, and leave, never learning that
 * nobody could see them either.
 *
 * This makes the invisible failure visible and gives one action to fix
 * it. It does not block browsing.
 *
 * WHEN IT SHOWS:
 *   - the profile has loaded
 *   - the user has no photo_url and no rows in user_photos
 *   - and it has not been dismissed in the last 24 hours
 *
 * The snooze is deliberately short. Being invisible is not a
 * preference, it is a broken state, so a weekly reminder would be too
 * quiet - but a prompt on every single load would be hostile.
 */

const DISMISS_KEY = 'photoPromptDismissedAt';
const SNOOZE_HOURS = 24;

interface PhotoPromptProps {
  onNavigate: (screen: string) => void;
}

export const PhotoPrompt: React.FC<PhotoPromptProps> = ({ onNavigate }) => {
  const { user, profile, isLoadingProfile } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!user || isLoadingProfile || !profile) return;

      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      const snoozeMs = SNOOZE_HOURS * 60 * 60 * 1000;
      if (dismissedAt && Date.now() - dismissedAt < snoozeMs) return;

      try {
        const { count, error } = await supabaseClient
          .from('user_photos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (error) throw error;
        if (cancelled) return;

        if ((count ?? 0) === 0) {
          // Small delay so it does not land over a still-painting screen.
          setTimeout(() => {
            if (!cancelled) setOpen(true);
          }, 1500);
        }
      } catch (err) {
        // If the check fails, say nothing rather than nagging someone
        // who may well have photos.
        console.warn('Could not check photo count:', err);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [user, profile, isLoadingProfile]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-prompt-title"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="relative px-6 pt-6 pb-2 text-center">
          <button
            onClick={dismiss}
            className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            type="button"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mb-4">
            <Camera className="w-7 h-7 text-white" />
          </div>

          <h2 id="photo-prompt-title" className="text-xl font-bold text-gray-900">
            Nobody can see you yet
          </h2>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            Profiles without a photo don't appear in Discovery. Add one and
            you'll start showing up for other members straight away.
          </p>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-2">
          <button
            onClick={() => {
              setOpen(false);
              onNavigate('profile');
            }}
            type="button"
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 rounded-2xl transition-all touch-manipulation active:scale-[0.98]"
          >
            Add a photo
          </button>
          <button
            onClick={dismiss}
            type="button"
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};

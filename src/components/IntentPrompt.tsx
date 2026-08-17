import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';

/**
 * Asks the user what they are here for and stores it as
 * user_profiles.looking_for.
 *
 * WHY: the intent badge on Discovery cards only renders when looking_for
 * is set, and the field is buried in profile settings, so almost nobody
 * fills it in and the badge is invisible in practice. A one-tap picker
 * shown at the right moment is what actually populates it.
 *
 * WHEN IT SHOWS:
 *   - the profile has loaded and looking_for is null
 *   - and it has not been dismissed within the last 7 days
 *
 * It never blocks: dismissing is always available, and the choice can be
 * changed later from the profile screen.
 */

const DISMISS_KEY = 'intentPromptDismissedAt';
const SNOOZE_DAYS = 7;

// Values must match the user_profiles_looking_for_check constraint:
// 'friendship', 'serious', 'casual', 'flirting', 'not_sure'
const OPTIONS: Array<{
  value: string;
  label: string;
  icon: string;
  ring: string;
  bg: string;
}> = [
  { value: 'serious',    label: 'Real love',  icon: '🕊️', ring: 'ring-sky-400',     bg: 'bg-sky-50' },
  { value: 'casual',     label: 'Romance',    icon: '💕', ring: 'ring-rose-400',    bg: 'bg-rose-50' },
  { value: 'flirting',   label: 'Flirt',      icon: '😍', ring: 'ring-amber-400',   bg: 'bg-amber-50' },
  { value: 'friendship', label: 'Friendship', icon: '🤝', ring: 'ring-emerald-400', bg: 'bg-emerald-50' },
  { value: 'not_sure',   label: 'Not sure',   icon: '❓', ring: 'ring-gray-400',    bg: 'bg-gray-100' },
];

interface IntentPromptProps {
  /** Called after a successful save so the parent can refresh its data. */
  onSaved?: (value: string) => void;
}

export const IntentPrompt: React.FC<IntentPromptProps> = ({ onSaved }) => {
  const { user, profile, isLoadingProfile, loadUserProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for the profile to actually load. Showing this while profile is
    // still undefined would prompt users who have already chosen.
    if (!user || isLoadingProfile || !profile) return;
    if (profile.looking_for) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const snoozeMs = SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    if (dismissedAt && Date.now() - dismissedAt < snoozeMs) return;

    // Small delay so it does not slam up over a still-painting screen.
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [user, profile, isLoadingProfile]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  };

  const save = async () => {
    if (!user || !selected) return;
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabaseClient
        .from('user_profiles')
        .update({ looking_for: selected })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      localStorage.removeItem(DISMISS_KEY);
      await loadUserProfile();
      onSaved?.(selected);
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intent-prompt-title"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="relative px-5 pt-5 pb-2">
          <button
            onClick={dismiss}
            className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            type="button"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <h2
            id="intent-prompt-title"
            className="text-xl font-bold text-gray-900 text-center pr-8"
          >
            Today I'm up for
          </h2>
          <p className="text-sm text-gray-500 text-center mt-1">
            This shows on your profile so people know what you're after.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 px-5 py-4">
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                type="button"
                aria-pressed={isSelected}
                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border transition-all touch-manipulation active:scale-95 ${
                  isSelected
                    ? `${opt.bg} border-transparent ring-2 ${opt.ring}`
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl" aria-hidden="true">{opt.icon}</span>
                <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="px-5 pb-2 text-sm text-red-600 text-center">{error}</p>
        )}

        <div className="px-5 pb-5 space-y-2">
          <button
            onClick={save}
            disabled={!selected || saving}
            type="button"
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-2xl transition-all touch-manipulation active:scale-[0.98]"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={dismiss}
            type="button"
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

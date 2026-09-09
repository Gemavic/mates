import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ProfileBasicsFields } from '@/components/ProfileBasicsFields';
import { basicsComplete, fetchMyBasics, saveMyBasics, type ProfileBasics } from '@/lib/profileBasics';

/**
 * Asked once of members who joined before the profile had gender, who they
 * are looking for, and country. Discovery cannot filter for them until it
 * is answered. "Later" hides it for this session only; it comes back next
 * time, without nagging inside a session.
 */
const LATER_KEY = 'dc_basics_later';

export const CompleteBasicsPrompt: React.FC<{ onSaved?: () => void }> = ({ onSaved }) => {
  const { user, loadUserProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<ProfileBasics>({ gender: null, seeking: null, country_code: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) { setOpen(false); return; }
    let later = false;
    try { later = sessionStorage.getItem(LATER_KEY) === '1'; } catch { /* ignore */ }
    if (later) return;
    fetchMyBasics(user.id).then((b) => {
      if (cancelled || !b) return;
      if (!basicsComplete(b)) { setValue(b); setOpen(true); }
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!open || !user?.id) return null;

  const save = async () => {
    if (!basicsComplete(value)) return;
    setSaving(true);
    setError(null);
    try {
      await saveMyBasics(user.id, value);
      try { await loadUserProfile(); } catch { /* fine */ }
      setOpen(false);
      onSaved?.();
    } catch {
      setError('Could not save just now. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const later = () => {
    try { sessionStorage.setItem(LATER_KEY, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[9000] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
        <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center mb-3">
          <Sparkles className="w-5 h-5 text-rose-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Help us show you the right people</h2>
        <p className="text-sm text-gray-600 mb-5">
          Three quick answers. They let Discovery show you the people you are looking for, and show you to them.
        </p>
        <ProfileBasicsFields value={value} onChange={setValue} />
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="outline" onClick={later} className="flex-1 rounded-xl">Later</Button>
          <Button type="button" onClick={save} disabled={saving || !basicsComplete(value)} className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};

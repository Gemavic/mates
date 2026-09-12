import React, { useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/Layout';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Check, ImagePlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';
import { ProfileManager } from '@/lib/database';
import { uploadProfilePhoto } from '@/lib/photoUpload';
import { ProfileBasicsFields } from '@/components/ProfileBasicsFields';
import { type ProfileBasics } from '@/lib/profileBasics';
import { regionsFor } from '@/lib/regions';
import { announceProfileUpdated } from '@/lib/profileCompletion';

/**
 * Three screens, none skippable: a photo, who you are and who you are
 * looking for, and where you are. That is the whole of what the site needs
 * to show a person to anyone - and to show them anyone. Everything else
 * (bio, interests, occupation) lives in Edit Profile and can wait.
 *
 * Each screen saves as it goes, so a member who closes the tab on screen
 * three comes back to screen three, not to the beginning.
 */
interface OnboardingProps {
  onComplete: () => void;
  onBack: () => void;
}

type Step = 1 | 2 | 3;

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onBack }) => {
  const { user, profile, loadUserProfile } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [ready, setReady] = useState(false);

  // Screen 1
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Screen 2
  const [name, setName] = useState('');
  const [basics, setBasics] = useState<ProfileBasics>({ gender: null, seeking: null, country_code: null, region_code: null });

  // Screen 3
  const [city, setCity] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Start from what is already known, and on the first screen that is
  // still missing something.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.id) { setReady(true); return; }
      const [{ data: p }, { data: ph }] = await Promise.all([
        supabaseClient.from('user_profiles').select('full_name, first_name, gender, seeking, country_code, region_code, location').eq('user_id', user.id).maybeSingle(),
        supabaseClient.from('user_photos').select('photo_url, is_primary').eq('user_id', user.id).order('is_primary', { ascending: false }).limit(1),
      ]);
      if (!alive) return;
      const first = (ph && ph[0]?.photo_url) || null;
      setPhotoUrl(first);
      const prof = (p ?? {}) as any;
      setName(prof.first_name || (prof.full_name ? String(prof.full_name).split(/\s+/)[0] : '') || (user.user_metadata?.full_name ? String(user.user_metadata.full_name).split(/\s+/)[0] : ''));
      setBasics({
        gender: prof.gender ?? null,
        seeking: prof.seeking ?? null,
        country_code: prof.country_code ?? null,
        region_code: prof.region_code ?? null,
      });
      setCity(prof.location ?? '');
      if (!first) setStep(1);
      else if (!prof.gender || !prof.seeking) setStep(2);
      else setStep(3);
      setReady(true);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const pickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user?.id) return;
    setPhotoError(null);
    setUploading(true);
    try {
      const url = await uploadProfilePhoto(user.id, file);
      // First photo is the main photo. The database keeps exactly one
      // primary, so a later upload from Edit Profile does not fight this.
      const { count } = await supabaseClient.from('user_photos').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      const { error } = await supabaseClient.from('user_photos').insert({
        user_id: user.id, photo_url: url, is_primary: (count ?? 0) === 0, display_order: count ?? 0,
      });
      if (error) throw error;
      setPhotoUrl(url);
      announceProfileUpdated();
    } catch (err: any) {
      setPhotoError(err?.message || 'That photo could not be added. Try another one.');
    } finally {
      setUploading(false);
    }
  };

  const whoComplete = name.trim().length >= 1 && !!basics.gender && !!basics.seeking;
  const needsRegion = regionsFor(basics.country_code).length > 0;
  const whereComplete = !!basics.country_code && (!needsRegion || !!basics.region_code) && city.trim().length >= 2;

  const saveWho = async () => {
    if (!user?.id) return true;
    const first = name.trim().split(/\s+/)[0];
    await ProfileManager.updateProfile(user.id, {
      first_name: first,
      full_name: (profile as any)?.full_name && String((profile as any).full_name).trim() ? (profile as any).full_name : name.trim(),
      gender: basics.gender,
      seeking: basics.seeking,
    } as any);
    return true;
  };

  const saveWhere = async () => {
    if (!user?.id) return true;
    await ProfileManager.updateProfile(user.id, {
      country_code: basics.country_code,
      region_code: needsRegion ? basics.region_code : null,
      location: city.trim(),
    } as any);
    return true;
  };

  const next = async () => {
    setSaveError(null);
    if (step === 1) { if (photoUrl) setStep(2); return; }
    setSaving(true);
    try {
      if (step === 2) { await saveWho(); announceProfileUpdated(); setStep(3); return; }
      await saveWhere();
      announceProfileUpdated();
      try { await loadUserProfile?.(); } catch { /* the next screen loads it anyway */ }
      onComplete();
    } catch (err) {
      console.error('Could not save your profile:', err);
      setSaveError('That could not be saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const back = () => {
    if (step > 1) setStep((step - 1) as Step); else onBack();
  };

  const titles: Record<Step, string> = { 1: 'Your photo', 2: 'About you', 3: 'Where you are' };

  return (
    <Layout showFooter={false} title="Set up your profile" onBack={back} onClose={onBack}>
      <div className="pt-4">
        <ProgressIndicator currentStep={step} totalSteps={3} className="mb-6" />
        {!ready ? (
          <p className="text-white/80 text-center py-10">One moment…</p>
        ) : (
          <div className="px-6 py-4">
            <h2 className="text-2xl font-bold text-white text-center mb-2">{titles[step]}</h2>

            {step === 1 && (
              <div className="space-y-5">
                <p className="text-white/80 text-center text-sm">A clear photo of your face. Members without a photo are not shown to anyone.</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                <button
                  type="button"
                  onClick={pickFile}
                  disabled={uploading}
                  className="mx-auto w-48 h-48 rounded-3xl overflow-hidden bg-white/20 border-2 border-dashed border-white/50 flex flex-col items-center justify-center text-white hover:bg-white/30 transition disabled:opacity-60"
                  aria-label={photoUrl ? 'Change photo' : 'Add a photo'}
                >
                  {uploading ? (
                    <>
                      <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin mb-2"></div>
                      <span className="text-sm">Checking your photo…</span>
                    </>
                  ) : photoUrl ? (
                    <img src={photoUrl} alt="Your profile photo" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-10 h-10 mb-2 opacity-90" />
                      <span className="text-sm font-medium">Add a photo</span>
                    </>
                  )}
                </button>
                {photoUrl && !uploading && (
                  <button type="button" onClick={pickFile} className="mx-auto flex items-center gap-2 text-white/90 text-sm underline underline-offset-4">
                    <ImagePlus className="w-4 h-4" /> Use a different photo
                  </button>
                )}
                {photoError && <p className="text-sm text-white bg-red-500/70 rounded-lg px-3 py-2">{photoError}</p>}
                <p className="text-white/60 text-xs text-center">Every photo is screened before it is shown. Faces only, no contact details, nothing explicit.</p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-white font-medium mb-2" htmlFor="ob-first-name">First name</label>
                  <Input id="ob-first-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="What should people call you?" className="bg-white/90" autoComplete="given-name" />
                </div>
                <ProfileBasicsFields value={basics} onChange={setBasics} tone="light" part="who" />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <ProfileBasicsFields value={basics} onChange={setBasics} tone="light" part="where" />
                <div>
                  <label className="block text-white font-medium mb-2" htmlFor="ob-city">City or town</label>
                  <Input id="ob-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Scarborough" className="bg-white/90" autoComplete="address-level2" />
                </div>
                <p className="text-white/60 text-xs">Your city is shown on your profile. Your exact address is never asked for.</p>
              </div>
            )}
          </div>
        )}

        <div className="px-6 pb-8">
          {saveError && <p className="text-sm text-white bg-red-500/70 rounded-lg px-3 py-2 mb-3">{saveError}</p>}
          <Button
            onClick={next}
            className="w-full h-12 bg-white text-pink-600 hover:bg-white/90 font-semibold rounded-xl"
            disabled={!ready || saving || uploading || (step === 1 && !photoUrl) || (step === 2 && !whoComplete) || (step === 3 && !whereComplete)}
          >
            {saving ? 'Saving…' : step === 3 ? (<span className="inline-flex items-center gap-2"><Check className="w-4 h-4" /> See who's near you</span>) : 'Continue'}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

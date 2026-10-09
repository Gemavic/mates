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
import { claimReferralCompletion } from '@/lib/referrals';
import { birthDateRefusal, describeExisting, setSignInPrefill, type ExistingAccount } from '@/lib/accountGuard';

/**
 * Three screens, none skippable: a photo, who you are (with your date of
 * birth, if it is not on file yet) and who you are looking for, and where
 * you are. That is the whole of what the site needs
 * to show a person to anyone - and to show them anyone. Everything else
 * (bio, interests, occupation) lives in Edit Profile and can wait.
 *
 * Each screen saves as it goes, so a member who closes the tab on screen
 * three comes back to screen three, not to the beginning.
 */
interface OnboardingProps {
  onComplete: () => void;
  onBack: () => void;
  onNavigate?: (screen: string) => void;
}

// Built from local date parts: toISOString() would shift to UTC and make the
// bound a day early for anyone east of UTC whose date has rolled over.
const latestAdultBirthDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

type Step = 1 | 2 | 3;

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onBack, onNavigate }) => {
  const { user, profile, loadUserProfile, signOut } = useAuth();
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
  // Date of birth. Google sign-ups were never asked for one, and the app
  // showed them as 25. It is asked here once, and the server works out the
  // age from it, refuses anyone under 18, and refuses a birth date that
  // belongs to an account this person already has.
  const [hasBirthDate, setHasBirthDate] = useState(true);
  const [birthDate, setBirthDate] = useState('');
  const [existingAccount, setExistingAccount] = useState<ExistingAccount | null>(null);

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
      const [{ data: p }, { data: ph }, priv] = await Promise.all([
        supabaseClient.from('user_profiles').select('full_name, first_name, gender, seeking, country_code, region_code, location').eq('user_id', user.id).maybeSingle(),
        supabaseClient.from('user_photos').select('photo_url, is_primary').eq('user_id', user.id).order('is_primary', { ascending: false }).limit(1),
        supabaseClient.rpc('my_private_profile'),
      ]);
      if (!alive) return;
      // If the server cannot say, do not block the member on a question it
      // may already have the answer to.
      const dobKnown = priv.error ? true : !!(priv.data as any)?.date_of_birth;
      setHasBirthDate(dobKnown);
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
      else if (!prof.gender || !prof.seeking || !dobKnown) setStep(2);
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

  const whoComplete = name.trim().length >= 1 && !!basics.gender && !!basics.seeking && (hasBirthDate || !!birthDate);
  const needsRegion = regionsFor(basics.country_code).length > 0;
  const whereComplete = !!basics.country_code && (!needsRegion || !!basics.region_code) && city.trim().length >= 2;

  const saveWho = async (): Promise<boolean> => {
    if (!user?.id) return true;
    if (!hasBirthDate) {
      const { data, error } = await supabaseClient.rpc('set_my_birth_date', { p_date: birthDate });
      if (error) throw error;
      if (!(data as any)?.success) {
        const refusal = birthDateRefusal(data);
        if (refusal.existing) setExistingAccount(refusal.existing);
        else setSaveError(refusal.text);
        return false;
      }
      setHasBirthDate(true);
    }
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
      if (step === 2) {
        if (!(await saveWho())) return;
        announceProfileUpdated();
        setStep(3);
        return;
      }
      await saveWhere();
      // If a friend's link brought this member here, both are thanked now.
      await claimReferralCompletion();
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
        {existingAccount ? (
          <div className="px-6 py-4">
            <div className="bg-white rounded-2xl p-5 shadow-lg" role="alert">
              <h2 className="text-xl font-bold text-gray-900 mb-2">You already have an account</h2>
              <p className="text-gray-700 text-sm mb-4">{describeExisting(existingAccount)}</p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={async () => {
                    setSignInPrefill({ forgot: false });
                    try { await signOut(); } catch { /* signing in again is what matters */ }
                    if (onNavigate) onNavigate('signin'); else onBack();
                  }}
                  className="w-full h-11 bg-pink-500 text-white hover:bg-pink-600 font-semibold rounded-xl"
                >
                  Sign out and use that account
                </Button>
                {existingAccount.method !== 'google' && (
                  <Button
                    onClick={async () => {
                      setSignInPrefill({ forgot: true });
                      try { await signOut(); } catch { /* as above */ }
                      if (onNavigate) onNavigate('signin'); else onBack();
                    }}
                    className="w-full h-11 bg-gray-100 text-gray-900 hover:bg-gray-200 font-semibold rounded-xl"
                  >
                    I lost the password - reset it
                  </Button>
                )}
              </div>
              <p className="text-gray-500 text-xs mt-3">Each person may have one account. If this is a mistake, write to admin@dates.care.</p>
            </div>
          </div>
        ) : !ready ? (
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
                {!hasBirthDate && (
                  <div>
                    <label className="block text-white font-medium mb-2" htmlFor="ob-dob">Date of birth</label>
                    <Input id="ob-dob" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={latestAdultBirthDate()} className="bg-white/90" autoComplete="bday" />
                    <p className="text-white/60 text-xs mt-1">You must be 18 or older. Your age is worked out from this date and cannot be changed later. Members see your age, never your birth date.</p>
                  </div>
                )}
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

        {!existingAccount && <div className="px-6 pb-8">
          {saveError && <p className="text-sm text-white bg-red-500/70 rounded-lg px-3 py-2 mb-3">{saveError}</p>}
          <Button
            onClick={next}
            className="w-full h-12 bg-white text-pink-600 hover:bg-white/90 font-semibold rounded-xl"
            disabled={!ready || saving || uploading || (step === 1 && !photoUrl) || (step === 2 && !whoComplete) || (step === 3 && !whereComplete)}
          >
            {saving ? 'Saving…' : step === 3 ? (<span className="inline-flex items-center gap-2"><Check className="w-4 h-4" /> See who's near you</span>) : 'Continue'}
          </Button>
        </div>}
      </div>
    </Layout>
  );
};

import React from 'react';
import { COUNTRIES } from '@/lib/countries';
import { GENDER_OPTIONS, SEEKING_OPTIONS, type ProfileBasics } from '@/lib/profileBasics';

/**
 * The three questions, as one reusable block: gender, who they are looking
 * for, and country. Used by sign-up, Edit Profile and the one-time prompt.
 * `tone` picks white-on-gradient (onboarding) or dark-on-white (forms).
 */
interface Props {
  value: ProfileBasics;
  onChange: (next: ProfileBasics) => void;
  tone?: 'light' | 'dark';
}

export const ProfileBasicsFields: React.FC<Props> = ({ value, onChange, tone = 'dark' }) => {
  const label = tone === 'light' ? 'block text-white font-medium mb-2' : 'block text-sm font-medium text-gray-700 mb-2';
  const chip = (active: boolean) =>
    tone === 'light'
      ? `px-4 py-2.5 rounded-xl text-sm font-medium border transition ${active ? 'bg-white text-rose-600 border-white' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}`
      : `px-4 py-2.5 rounded-xl text-sm font-medium border transition ${active ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-gray-700 border-gray-300 hover:border-rose-400'}`;
  const select = tone === 'light'
    ? 'w-full rounded-xl bg-white/95 text-gray-900 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-white'
    : 'w-full rounded-xl bg-white text-gray-900 border border-gray-300 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-rose-400';

  return (
    <div className="space-y-5">
      <div>
        <span className={label}>You are</span>
        <div className="flex flex-wrap gap-2">
          {GENDER_OPTIONS.map((o) => (
            <button key={o.value} type="button" onClick={() => onChange({ ...value, gender: o.value })} className={chip(value.gender === o.value)}>
              {o.label.replace('I am ', '').replace(/^a /, 'A ')}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className={label}>Looking for</span>
        <div className="flex flex-wrap gap-2">
          {SEEKING_OPTIONS.map((o) => (
            <button key={o.value} type="button" onClick={() => onChange({ ...value, seeking: o.value })} className={chip(value.seeking === o.value)}>
              {o.value === 'women' ? 'Women' : o.value === 'men' ? 'Men' : 'Everyone'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={label}>
          Country
          <select
            value={value.country_code ?? ''}
            onChange={(e) => onChange({ ...value, country_code: e.target.value || null })}
            className={`${select} mt-2`}
          >
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
};

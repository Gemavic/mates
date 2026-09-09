import React, { useEffect, useState } from 'react';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COUNTRIES } from '@/lib/countries';
import { AGE_CEILING, AGE_FLOOR, DEFAULT_FILTERS, clampAges, type DiscoveryFilters } from '@/lib/discoveryFilters';
import { type Gender, type Seeking } from '@/lib/profileBasics';

/**
 * The filter sheet: From (country), Age (from / to), and "I'm looking for"
 * as a sentence built from the member's own gender. Saved on "Show people";
 * Reset returns to anywhere, 20-45, and whoever the profile says.
 */
interface Props {
  open: boolean;
  value: DiscoveryFilters;
  myGender: Gender | null;
  profileSeeking: Seeking | null;
  onApply: (next: DiscoveryFilters) => void;
  onClose: () => void;
}

const AGES = Array.from({ length: AGE_CEILING - AGE_FLOOR + 1 }, (_, i) => AGE_FLOOR + i);

export const DiscoveryFilterSheet: React.FC<Props> = ({ open, value, myGender, profileSeeking, onApply, onClose }) => {
  const [draft, setDraft] = useState<DiscoveryFilters>(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);
  if (!open) return null;

  const who = myGender === 'man' ? 'I am a man' : myGender === 'woman' ? 'I am a woman' : 'I am';
  const seekingValue: Seeking = draft.seeking ?? profileSeeking ?? 'everyone';
  const seekingOptions: { value: Seeking; label: string }[] = [
    { value: 'women', label: `${who} looking for a woman` },
    { value: 'men', label: `${who} looking for a man` },
    { value: 'everyone', label: `${who} open to everyone` },
  ];

  const apply = () => {
    const [age_min, age_max] = clampAges(draft.age_min, draft.age_max);
    onApply({ ...draft, age_min, age_max });
  };

  const field = 'w-full rounded-xl bg-white text-gray-900 border border-gray-300 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-rose-400';

  return (
    <div className="fixed inset-0 z-[8000] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button type="button" onClick={onClose} className="text-rose-600 font-semibold inline-flex items-center gap-1">
            <X className="w-4 h-4" /> Cancel
          </button>
          <span className="text-gray-900 font-semibold inline-flex items-center gap-1.5"><SlidersHorizontal className="w-4 h-4" /> Filters</span>
          <button type="button" onClick={() => setDraft({ ...DEFAULT_FILTERS })} className="text-rose-600 font-semibold inline-flex items-center gap-1">
            Reset <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5 text-gray-900">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <select value={draft.country_code ?? ''} onChange={(e) => setDraft({ ...draft, country_code: e.target.value || null })} className={field}>
              <option value="">Anywhere</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
            <div className="flex items-center gap-3">
              <select value={draft.age_min} onChange={(e) => setDraft({ ...draft, age_min: Number(e.target.value) })} className={field}>
                {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <span className="text-gray-500 text-sm">To</span>
              <select value={draft.age_max} onChange={(e) => setDraft({ ...draft, age_max: Number(e.target.value) })} className={field}>
                {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I&apos;m looking for</label>
            <select value={seekingValue} onChange={(e) => setDraft({ ...draft, seeking: e.target.value as Seeking })} className={field}>
              {seekingOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <Button type="button" onClick={apply} className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-base">
            Show people
          </Button>
        </div>
      </div>
    </div>
  );
};

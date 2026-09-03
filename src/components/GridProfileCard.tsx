import React from 'react';
import { Heart, Camera, ShieldCheck } from 'lucide-react';
import { initialsAvatar } from '@/lib/avatar';

// Each intent gets its own label, colour and glyph so the badge reads at a
// glance in a grid rather than being five identically-coloured pills.
const LOOKING_FOR_BADGES: Record<string, { label: string; icon: string; className: string }> = {
  serious:    { label: 'Real love',  icon: '\u{1F54A}\uFE0F', className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  casual:     { label: 'Romance',    icon: '\u{1F495}',       className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' },
  flirting:   { label: 'Flirt',      icon: '\u{1F60D}',       className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  friendship: { label: 'Friendship', icon: '\u{1F91D}',       className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  not_sure:   { label: 'Not sure',   icon: '\u2753',          className: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
};


interface GridProfileCardProps {
  id: string;
  name: string;
  age: number;
  images: string[];
  online: boolean;
  verified?: boolean;
  lookingFor?: string | null;
  matched?: boolean;
  onViewProfile: (id: string) => void;
  onLike?: (id: string) => void;
}

export const GridProfileCard: React.FC<GridProfileCardProps> = ({
  id,
  name,
  age,
  images,
  online,
  verified,
  lookingFor,
  matched = false,
  onViewProfile,
  onLike
}) => {
  const photoCount = images.length;
  const mainPhoto = images[0] || initialsAvatar(name, id);

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
      {/* Oval-topped photo: a tall, soft dome shape rather than a hard
          rectangle — the photo itself isn't clipped into a literal
          ellipse (that would slice off faces awkwardly), the CARD's
          corners are what create the oval silhouette. */}
      <div className="relative mx-2 mt-2">
        <div
          className="relative overflow-hidden"
          style={{ borderRadius: '50% 50% 24px 24px / 22% 22% 24px 24px' }}
        >
          <img
            src={mainPhoto}
            alt={name}
            loading="lazy"
            decoding="async"
            className="w-full h-80 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onLike) onLike(id);
          }}
          className="absolute top-4 right-4 w-11 h-11 bg-white/25 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/40 transition-colors cursor-pointer touch-manipulation active:scale-95 shadow-sm"
          type="button"
          aria-label="Like profile"
        >
          <Heart className="w-5 h-5 text-white" />
        </button>

        {online && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/25 backdrop-blur-md rounded-full pl-1.5 pr-2.5 py-1 shadow-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-white text-xs font-medium">Online</span>
          </div>
        )}

        {photoCount > 1 && (
          <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
            <Camera className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-medium">{photoCount}</span>
          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <h3 className="text-lg font-bold text-gray-900">{name}, {age}</h3>
          {verified && (
            <ShieldCheck className="w-4 h-4 text-purple-500 flex-shrink-0" fill="currentColor" fillOpacity={0.15} />
          )}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {matched && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 ring-1 ring-purple-200 rounded-full text-xs font-semibold">
              <Heart className="w-3 h-3" fill="currentColor" />
              Matched
            </span>
          )}
          {lookingFor && LOOKING_FOR_BADGES[lookingFor] && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${LOOKING_FOR_BADGES[lookingFor].className}`}>
              <span aria-hidden="true">{LOOKING_FOR_BADGES[lookingFor].icon}</span>
              {LOOKING_FOR_BADGES[lookingFor].label}
            </span>
          )}
        </div>

        <button
          onClick={() => onViewProfile(id)}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 rounded-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer touch-manipulation active:scale-95 shadow-sm"
          type="button"
        >
          View Profile
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { Heart, Camera, ShieldCheck } from 'lucide-react';

const LOOKING_FOR_LABELS: Record<string, string> = {
  friendship: 'Friendship',
  serious: 'True Love',
  casual: 'Casual Dating',
  flirting: 'Flirting',
  not_sure: 'Not Sure Yet',
};

interface GridProfileCardProps {
  id: string;
  name: string;
  age: number;
  images: string[];
  online: boolean;
  verified?: boolean;
  lookingFor?: string | null;
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
  onViewProfile,
  onLike
}) => {
  const photoCount = images.length;
  const mainPhoto = images[0] || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=800';

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

        {lookingFor && LOOKING_FOR_LABELS[lookingFor] && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-medium">
              <Heart className="w-3 h-3" fill="currentColor" />
              {LOOKING_FOR_LABELS[lookingFor]}
            </span>
          </div>
        )}

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

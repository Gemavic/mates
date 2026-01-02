import React from 'react';
import { Heart, Camera } from 'lucide-react';

interface GridProfileCardProps {
  id: string;
  name: string;
  age: number;
  images: string[];
  online: boolean;
  onViewProfile: (id: string) => void;
  onLike?: (id: string) => void;
}

export const GridProfileCard: React.FC<GridProfileCardProps> = ({
  id,
  name,
  age,
  images,
  online,
  onViewProfile,
  onLike
}) => {
  const photoCount = images.length;
  const mainPhoto = images[0] || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=800';

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div className="relative">
        <img
          src={mainPhoto}
          alt={name}
          className="w-full h-80 object-cover"
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onLike) onLike(id);
          }}
          className="absolute top-3 right-3 w-12 h-12 bg-gray-200/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-gray-300/80 transition-colors cursor-pointer touch-manipulation active:scale-95"
          type="button"
        >
          <Heart className="w-6 h-6 text-gray-600" />
        </button>

        {photoCount > 1 && (
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1">
            <Camera className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">{photoCount}</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center space-x-2 mb-3">
          <h3 className="text-xl font-bold text-gray-900">{name}, {age}</h3>
          {online && (
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          )}
        </div>

        <button
          onClick={() => onViewProfile(id)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer touch-manipulation active:scale-95"
          type="button"
        >
          View Profile
        </button>
      </div>
    </div>
  );
};

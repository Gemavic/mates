import { Heart, Camera, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const parseArrayField = (value: unknown, defaultValue: string[]): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
};

interface Profile {
  id: string;
  name: string;
  age: number;
  photoCount: number;
  imageUrl: string;
  isOnline: boolean;
  location?: string;
  bio?: string;
  interests?: string[];
}

const placeholderImages = [
  'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg?auto=compress&cs=tinysrgb&w=800'
];

function ProfileCard({ profile, onLike, onNavigate }: { profile: Profile; onLike: (profileId: string) => void; onNavigate: (screen: string, params?: any) => void }) {
  const [isLiked, setIsLiked] = useState(false);

  const handleLikeClick = () => {
    setIsLiked(!isLiked);
    if (!isLiked) {
      onLike(profile.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md border border-gray-100">
      <div className="relative aspect-[4/5] overflow-hidden group">
        <img
          src={profile.imageUrl}
          alt={profile.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <button
          onClick={handleLikeClick}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-md"
        >
          <Heart
            className={`w-4 h-4 transition-colors duration-300 ${
              isLiked ? 'fill-red-500 stroke-red-500' : 'stroke-gray-700'
            }`}
          />
        </button>

        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-full">
          <Camera className="w-3 h-3 text-white" />
          <span className="text-white text-xs font-medium">{profile.photoCount}</span>
        </div>

        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-white font-bold text-sm tracking-tight">{profile.name}, {profile.age}</h3>
            {profile.isOnline && (
              <div className="w-2 h-2 bg-green-400 rounded-full ring-2 ring-white/40" />
            )}
          </div>
          {profile.location && (
            <p className="text-white/85 text-xs">{profile.location}</p>
          )}
        </div>
      </div>

      <div className="p-2.5">
        <button
          onClick={() => onNavigate('view-profile', { userId: profile.id })}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-2 px-3 rounded-lg text-xs transition-all duration-300 hover:shadow-md hover:from-orange-600 hover:to-orange-700 active:scale-98"
        >
          View Profile
        </button>
      </div>
    </div>
  );
}

interface BrowseProfilesProps {
  onNavigate: (screen: string, params?: any) => void;
}

function BrowseProfiles({ onNavigate }: BrowseProfilesProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'following'>('all');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      supabaseClient
        .from('user_profiles')
        .update({ is_online: true, last_active: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.warn('Failed to mark user online:', error);
          else console.log('User marked online');
        });

      const interval = setInterval(() => {
        supabaseClient
          .from('user_profiles')
          .update({ last_active: new Date().toISOString() })
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.warn('Failed to update last_active:', error);
          });
      }, 60000);

      return () => {
        clearInterval(interval);
        supabaseClient
          .from('user_profiles')
          .update({ is_online: false })
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.warn('Failed to mark user offline:', error);
          });
      };
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfiles();
  }, [user, activeTab]);

  const loadProfiles = async () => {
    if (!user?.id) {
      console.warn('⚠️ Cannot load profiles - user not authenticated');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Loading profiles from database for user:', user.id);

      // Show all profiles that are either public OR don't have visibility set (default to public)
      const { data: dbProfiles, error } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .neq('user_id', user.id)
        .or('profile_visibility.eq.public,profile_visibility.is.null')
        .order('is_online', { ascending: false })
        .order('last_active', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Database error:', error);
        setProfiles([]);
        setLoading(false);
        return;
      }

      console.log('✅ Found profiles:', dbProfiles?.length || 0);
      console.log('📋 Profile details:', dbProfiles?.map(p => ({
        name: p.first_name || p.full_name,
        online: p.is_online,
        userId: p.user_id
      })));

      if (!dbProfiles || dbProfiles.length === 0) {
        console.warn('⚠️ No profiles found in database');
        setProfiles([]);
        setLoading(false);
        return;
      }

      const photoCounts = await Promise.all(
        dbProfiles.map(async (profile) => {
          try {
            const { count } = await supabaseClient
              .from('user_photos')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.user_id);
            return count || 0;
          } catch {
            return 0;
          }
        })
      );

      const primaryPhotos = await Promise.all(
        dbProfiles.map(async (profile, index) => {
          try {
            const { data } = await supabaseClient
              .from('user_photos')
              .select('photo_url')
              .eq('user_id', profile.user_id)
              .eq('is_primary', true)
              .maybeSingle();

            if (data?.photo_url) {
              return data.photo_url;
            }

            return placeholderImages[index % placeholderImages.length];
          } catch {
            return placeholderImages[index % placeholderImages.length];
          }
        })
      );

      const formattedProfiles: Profile[] = dbProfiles.map((profile, index) => {
        const displayName = profile.first_name || profile.full_name || 'New User';

        return {
          id: profile.user_id,
          name: displayName,
          age: profile.age || 25,
          photoCount: photoCounts[index],
          imageUrl: primaryPhotos[index],
          isOnline: profile.is_online || false,
          location: profile.location || 'Location not set',
          bio: profile.bio || 'No bio yet',
          interests: parseArrayField(profile.interests, [])
        };
      });

      const uniqueProfiles = Array.from(
        new Map(formattedProfiles.map(p => [p.id, p])).values()
      );

      let filteredProfiles = uniqueProfiles;
      if (activeTab === 'online') {
        const onlineProfiles = uniqueProfiles.filter(p => p.isOnline);
        filteredProfiles = onlineProfiles.length > 0 ? onlineProfiles : uniqueProfiles;
      }

      console.log('Setting profiles:', filteredProfiles.length);
      setProfiles(filteredProfiles);
    } catch (error) {
      console.error('Error loading profiles:', error);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (profileId: string) => {
    console.log('Liked profile:', profileId);
    if (user) {
      try {
        await supabaseClient
          .from('user_likes')
          .upsert({
            user_id: user.id,
            target_user_id: profileId,
            like_type: 'like'
          }, {
            onConflict: 'user_id,target_user_id'
          });
      } catch (error) {
        console.error('Error saving like:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 pb-20">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-3 sm:px-4 md:px-6 py-4 sm:py-5">
        <header className="flex items-center justify-between mb-4 sm:mb-5 max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Dates-Care</h1>
          <button
            onClick={() => onNavigate('profile')}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all duration-300 shadow-sm"
          >
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
          </button>
        </header>

        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-5">Discover Profiles</h2>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-100 rounded-full p-0.5 sm:p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 ${
                  activeTab === 'all'
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('online')}
                className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 ${
                  activeTab === 'online'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Online
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 ${
                  activeTab === 'following'
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Following
              </button>
            </div>

            <button className="ml-auto px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:from-orange-600 hover:to-orange-700 text-xs sm:text-sm">
              Filters
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        {profiles.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">No profiles found yet</p>
            <p className="text-gray-500 text-sm mt-2">Be the first to complete your profile!</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {profiles.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} onLike={handleLike} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BrowseProfiles;

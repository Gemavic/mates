import { Heart, Camera, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

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

const mockProfiles: Profile[] = [
  {
    id: '1',
    name: 'Angela Maria',
    age: 33,
    photoCount: 22,
    imageUrl: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'New York, NY',
    bio: 'Love exploring new places and meeting interesting people',
    interests: ['Travel', 'Photography', 'Music']
  },
  {
    id: '2',
    name: 'Christable',
    age: 26,
    photoCount: 21,
    imageUrl: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Los Angeles, CA',
    bio: 'Creative soul with a passion for art and design',
    interests: ['Art', 'Coffee', 'Hiking']
  },
  {
    id: '3',
    name: 'Steve',
    age: 37,
    photoCount: 22,
    imageUrl: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Chicago, IL',
    bio: 'Tech enthusiast and fitness lover',
    interests: ['Technology', 'Fitness', 'Food']
  },
  {
    id: '4',
    name: 'Betzabeth',
    age: 32,
    photoCount: 26,
    imageUrl: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Miami, FL',
    bio: 'Beach lover and yoga enthusiast',
    interests: ['Yoga', 'Beach', 'Travel']
  },
  {
    id: '5',
    name: 'Sarah',
    age: 34,
    photoCount: 23,
    imageUrl: 'https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Seattle, WA',
    bio: 'Coffee addict and book lover',
    interests: ['Reading', 'Coffee', 'Movies']
  },
  {
    id: '6',
    name: 'Joy',
    age: 30,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Boston, MA',
    bio: 'Foodie and adventure seeker',
    interests: ['Food', 'Travel', 'Photography']
  },
  {
    id: '7',
    name: 'Olivia',
    age: 29,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Portland, OR',
    bio: 'Capturing moments and creating memories',
    interests: ['Photography', 'Nature', 'Coffee']
  },
  {
    id: '8',
    name: 'James',
    age: 31,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Denver, CO',
    bio: 'Building startups and chasing dreams',
    interests: ['Business', 'Skiing', 'Travel']
  },
  {
    id: '9',
    name: 'Sophia',
    age: 27,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Nashville, TN',
    bio: 'Music is my soul',
    interests: ['Music', 'Singing', 'Writing']
  },
  {
    id: '10',
    name: 'Daniel',
    age: 36,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'San Diego, CA',
    bio: 'Living the beach life',
    interests: ['Surfing', 'Beach', 'Travel']
  },
  {
    id: '11',
    name: 'Isabella',
    age: 25,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Phoenix, AZ',
    bio: 'Creating wearable art',
    interests: ['Fashion', 'Design', 'Art']
  },
  {
    id: '12',
    name: 'Ryan',
    age: 33,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1172207/pexels-photo-1172207.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Philadelphia, PA',
    bio: 'Cooking is love made visible',
    interests: ['Cooking', 'Food', 'Wine']
  },
  {
    id: '13',
    name: 'Mia',
    age: 28,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1154638/pexels-photo-1154638.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Las Vegas, NV',
    bio: 'Dance is my freedom',
    interests: ['Dance', 'Music', 'Fitness']
  },
  {
    id: '14',
    name: 'Ethan',
    age: 32,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Minneapolis, MN',
    bio: 'Designing spaces that inspire',
    interests: ['Architecture', 'Design', 'Art']
  },
  {
    id: '15',
    name: 'Ava',
    age: 26,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1308885/pexels-photo-1308885.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Charlotte, NC',
    bio: 'Caring for others is my calling',
    interests: ['Healthcare', 'Fitness', 'Reading']
  },
  {
    id: '16',
    name: 'Noah',
    age: 34,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Detroit, MI',
    bio: 'Guitar is my voice',
    interests: ['Music', 'Guitar', 'Concerts']
  },
  {
    id: '17',
    name: 'Emily',
    age: 29,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1372134/pexels-photo-1372134.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Atlanta, GA',
    bio: 'Telling stories that matter',
    interests: ['Writing', 'Journalism', 'Travel']
  },
  {
    id: '18',
    name: 'Mason',
    age: 30,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1484810/pexels-photo-1484810.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Salt Lake City, UT',
    bio: 'Mountains are my home',
    interests: ['Skiing', 'Mountains', 'Travel']
  },
  {
    id: '19',
    name: 'Charlotte',
    age: 27,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'New Orleans, LA',
    bio: 'Creating art that speaks to the soul',
    interests: ['Art', 'Painting', 'Music']
  },
  {
    id: '20',
    name: 'Liam',
    age: 35,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Tampa, FL',
    bio: 'Fitness is a lifestyle',
    interests: ['Fitness', 'Health', 'Sports']
  },
  {
    id: '21',
    name: 'Amelia',
    age: 31,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1520760/pexels-photo-1520760.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'Raleigh, NC',
    bio: 'Animals are my world',
    interests: ['Animals', 'Pets', 'Nature']
  },
  {
    id: '22',
    name: 'Emma',
    age: 28,
    photoCount: 25,
    imageUrl: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=800',
    isOnline: true,
    location: 'San Francisco, CA',
    bio: 'Tech innovator and problem solver',
    interests: ['Technology', 'Innovation', 'Startups']
  },
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
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'following'>('online');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      console.log('Loading profiles from database...');

      let query = supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('profile_visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(50);

      if (user?.id) {
        query = query.neq('user_id', user.id);
      }

      const { data: dbProfiles, error } = await query;

      if (error) {
        console.error('Database error:', error);
        setProfiles(mockProfiles);
        setLoading(false);
        return;
      }

      console.log('Found profiles:', dbProfiles?.length || 0);

      if (!dbProfiles || dbProfiles.length === 0) {
        console.warn('No profiles found in database, using mock data');
        setProfiles(mockProfiles);
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
            return count || 25;
          } catch {
            return 25;
          }
        })
      );

      const primaryPhotos = await Promise.all(
        dbProfiles.map(async (profile, index) => {
          try {
            // CRITICAL FIX: Check profile.photo_url first (from user_profiles table)
            if (profile.photo_url) {
              return profile.photo_url;
            }

            // Then check user_photos table for primary photo
            const { data } = await supabaseClient
              .from('user_photos')
              .select('photo_url')
              .eq('user_id', profile.user_id)
              .eq('is_primary', true)
              .maybeSingle();

            // If user has uploaded a photo, use it
            if (data?.photo_url) {
              return data.photo_url;
            }

            // Otherwise, use a unique fallback from mock profiles (cycle through them)
            const mockIndex = index % mockProfiles.length;
            return mockProfiles[mockIndex].imageUrl;
          } catch {
            // Use a unique fallback from mock profiles
            const mockIndex = index % mockProfiles.length;
            return mockProfiles[mockIndex].imageUrl;
          }
        })
      );

      const formattedProfiles: Profile[] = dbProfiles.map((profile, index) => {
        // Get name from profile or fallback to mock data
        let displayName = profile.first_name || profile.full_name;
        if (!displayName || displayName === 'User') {
          const mockIndex = index % mockProfiles.length;
          displayName = mockProfiles[mockIndex].name;
        }

        return {
          id: profile.user_id,
          name: displayName,
          age: profile.age || 25,
          photoCount: photoCounts[index],
          imageUrl: primaryPhotos[index],
          isOnline: profile.is_online || false,
          location: profile.location || mockProfiles[index % mockProfiles.length].location,
          bio: profile.bio || mockProfiles[index % mockProfiles.length].bio,
          interests: profile.interests || mockProfiles[index % mockProfiles.length].interests
        };
      });

      const uniqueProfiles = Array.from(
        new Map(formattedProfiles.map(p => [p.id, p])).values()
      );

      let filteredProfiles = uniqueProfiles;
      if (activeTab === 'online') {
        filteredProfiles = uniqueProfiles.filter(p => p.isOnline);
      }

      console.log('Setting profiles:', filteredProfiles.length);
      setProfiles(filteredProfiles);
    } catch (error) {
      console.error('Error loading profiles:', error);
      setProfiles(mockProfiles);
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
            <p className="text-gray-600 text-lg">No profiles found. Check back later!</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {profiles.slice(0, 22).map((profile) => (
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

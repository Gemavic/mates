import React, { useState, useEffect } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { HeartAnimation } from '@/components/HeartAnimation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Heart, Filter, X, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';

interface DiscoveryProps {
  onNavigate: (screen: any) => void;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  first_name?: string;
  age?: number;
  location?: string;
  occupation?: string;
  education?: string;
  bio?: string;
  interests?: string[];
  is_verified: boolean;
  is_online: boolean;
  photos?: { photo_url: string }[];
}

interface FilterState {
  ageMin: number;
  ageMax: number;
  distance: number;
  onlineOnly: boolean;
  verifiedOnly: boolean;
}

export const Discovery: React.FC<DiscoveryProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'verified'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    ageMin: 18,
    ageMax: 99,
    distance: 50,
    onlineOnly: false,
    verifiedOnly: false
  });

  useEffect(() => {
    loadProfiles();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [profiles, activeTab, filters]);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      // Fetch all user profiles except current user
      const { data, error } = await supabaseClient
        .from('user_profiles')
        .select(`
          id,
          user_id,
          full_name,
          first_name,
          age,
          location,
          occupation,
          education,
          bio,
          interests,
          is_verified,
          is_online
        `)
        .neq('user_id', user?.id || '')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading profiles:', error);
        return;
      }

      // Fetch photos for each profile
      const profilesWithPhotos = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: photos } = await supabaseClient
            .from('user_photos')
            .select('photo_url')
            .eq('user_id', profile.user_id)
            .eq('is_public', true)
            .order('upload_order', { ascending: true })
            .limit(5);

          return {
            ...profile,
            photos: photos || []
          };
        })
      );

      setProfiles(profilesWithPhotos);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...profiles];

    // Apply tab filter
    if (activeTab === 'online') {
      filtered = filtered.filter(p => p.is_online);
    } else if (activeTab === 'verified') {
      filtered = filtered.filter(p => p.is_verified);
    }

    // Apply age filter
    filtered = filtered.filter(p => {
      if (!p.age) return true;
      return p.age >= filters.ageMin && p.age <= filters.ageMax;
    });

    // Apply online filter
    if (filters.onlineOnly) {
      filtered = filtered.filter(p => p.is_online);
    }

    // Apply verified filter
    if (filters.verifiedOnly) {
      filtered = filtered.filter(p => p.is_verified);
    }

    setFilteredProfiles(filtered);
  };

  const handleLike = async (profileId: string) => {
    if (!user) return;

    try {
      await supabaseClient
        .from('user_likes')
        .insert({
          user_id: user.id,
          target_user_id: profileId,
          like_type: 'like'
        });

      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);
    } catch (error) {
      console.error('Error liking profile:', error);
    }
  };

  const resetFilters = () => {
    setFilters({
      ageMin: 18,
      ageMax: 99,
      distance: 50,
      onlineOnly: false,
      verifiedOnly: false
    });
  };

  if (isLoading) {
    return (
      <PageTransition direction="fade">
        <div className="min-h-screen bg-white relative overflow-hidden">
          <div className="max-w-md mx-auto">
            <div className="bg-white shadow-sm border-b border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mb-4"></div>
              <LoadingSkeleton type="match-grid" count={4} />
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition direction="fade">
      <HeartAnimation
        trigger={showHeartAnimation}
        onComplete={() => setShowHeartAnimation(false)}
      />
      <div className="min-h-screen bg-white relative overflow-hidden">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900">Dates</h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onNavigate('likes')}
                  className="relative w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center"
                >
                  <Heart className="w-5 h-5 text-pink-500" />
                </button>
                <button
                  onClick={() => onNavigate('profile')}
                  className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center"
                >
                  <span className="text-white text-lg">👤</span>
                </button>
              </div>
            </div>
          </div>

          {/* Profiles Header */}
          <div className="px-4 py-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Discover ({filteredProfiles.length})
            </h2>

            {/* Tabs */}
            <div className="flex space-x-6 mb-4">
              <button
                onClick={() => setActiveTab('all')}
                className={`pb-2 border-b-2 transition-colors ${
                  activeTab === 'all'
                    ? 'border-orange-500 text-gray-900'
                    : 'border-transparent text-gray-500'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('online')}
                className={`pb-2 border-b-2 transition-colors ${
                  activeTab === 'online'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-500'
                }`}
              >
                Online
              </button>
              <button
                onClick={() => setActiveTab('verified')}
                className={`pb-2 border-b-2 transition-colors ${
                  activeTab === 'verified'
                    ? 'border-orange-500 text-gray-900'
                    : 'border-transparent text-gray-500'
                }`}
              >
                Verified
              </button>
              <div className="flex-1"></div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-1 text-orange-500"
              >
                <span>Filters</span>
                <Sliders className="w-4 h-4" />
              </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Filters</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Age Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age Range: {filters.ageMin} - {filters.ageMax}
                    </label>
                    <div className="flex items-center space-x-4">
                      <Input
                        type="number"
                        min="18"
                        max="99"
                        value={filters.ageMin}
                        onChange={(e) => setFilters(prev => ({ ...prev, ageMin: parseInt(e.target.value) }))}
                        className="w-20"
                      />
                      <span>to</span>
                      <Input
                        type="number"
                        min="18"
                        max="99"
                        value={filters.ageMax}
                        onChange={(e) => setFilters(prev => ({ ...prev, ageMax: parseInt(e.target.value) }))}
                        className="w-20"
                      />
                    </div>
                  </div>

                  {/* Distance */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Distance: {filters.distance} km
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="500"
                      value={filters.distance}
                      onChange={(e) => setFilters(prev => ({ ...prev, distance: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.onlineOnly}
                        onChange={(e) => setFilters(prev => ({ ...prev, onlineOnly: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Show only online users</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.verifiedOnly}
                        onChange={(e) => setFilters(prev => ({ ...prev, verifiedOnly: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Show only verified users</span>
                    </label>
                  </div>

                  {/* Reset Button */}
                  <Button
                    onClick={resetFilters}
                    className="w-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            )}

            {/* Profile Grid */}
            <div className="grid grid-cols-2 gap-4 pb-24">
              {filteredProfiles.length === 0 ? (
                <div className="col-span-2">
                  <EmptyState
                    icon={Heart}
                    title="No profiles match your filters"
                    description="Try adjusting your filters or check back later for new members."
                    actionText="Reset Filters"
                    onAction={resetFilters}
                  />
                </div>
              ) : (
                <>
                  {filteredProfiles.map((profile) => (
                    <div key={profile.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                      <div className="relative">
                        {profile.photos && profile.photos.length > 0 ? (
                          <img
                            src={profile.photos[0].photo_url}
                            alt={profile.full_name}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center">
                            <span className="text-6xl">
                              {profile.full_name?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => handleLike(profile.user_id)}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white"
                        >
                          <Heart className="w-4 h-4 text-pink-500" />
                        </button>
                        {profile.is_verified && (
                          <div className="absolute top-3 left-3 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                            ✓ Verified
                          </div>
                        )}
                        {profile.photos && profile.photos.length > 0 && (
                          <div className="absolute bottom-3 left-3 flex items-center space-x-1 bg-black/50 rounded-full px-2 py-1">
                            <span className="text-white text-xs">📷</span>
                            <span className="text-white text-xs font-medium">{profile.photos.length}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {profile.first_name || profile.full_name}
                            {profile.age && `, ${profile.age}`}
                          </h3>
                          {profile.is_online && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                        {profile.location && (
                          <p className="text-xs text-gray-500 mb-2">📍 {profile.location}</p>
                        )}
                        <Button
                          onClick={() => onNavigate('profile')}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-xl cursor-pointer touch-manipulation active:scale-95"
                          type="button"
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Footer Navigation */}
          <Footer
            activeTab="discovery"
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </PageTransition>
  );
};

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import {
  Heart,
  MessageCircle,
  Video,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Shield,
  Circle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';

interface ViewUserProfileProps {
  onNavigate: (screen: string, params?: any) => void;
  userId: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  age: number;
  bio: string;
  location: string;
  occupation: string;
  education: string;
  interests: string[];
  photo_url: string;
  is_verified: boolean;
  is_online: boolean;
}

interface UserPhoto {
  id: string;
  photo_url: string;
  display_order: number;
}

export const ViewUserProfile: React.FC<ViewUserProfileProps> = ({ onNavigate, userId }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
    checkIfLiked();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: profileData, error: profileError } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        setError('User profile not found');
        return;
      }

      setProfile(profileData);

      const { data: photosData, error: photosError } = await supabaseClient
        .from('user_photos')
        .select('id, photo_url, display_order')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });

      if (photosError) throw photosError;

      setPhotos(photosData || []);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const checkIfLiked = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabaseClient
        .from('user_likes')
        .select('id')
        .eq('liker_id', user.id)
        .eq('liked_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking like status:', error);
      }

      setIsLiked(!!data);
    } catch (err) {
      console.error('Error checking like:', err);
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert('Please sign in to like profiles');
      onNavigate('signin');
      return;
    }

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('user_likes')
          .delete()
          .eq('liker_id', user.id)
          .eq('liked_id', userId);

        if (error) throw error;

        setIsLiked(false);
        alert('Removed from your likes');
      } else {
        const { error } = await supabase
          .from('user_likes')
          .insert({
            liker_id: user.id,
            liked_id: userId
          });

        if (error) throw error;

        setIsLiked(true);
        alert(`You liked ${profile?.full_name}!`);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      alert('Failed to update like status');
    }
  };

  const handleMessage = () => {
    if (!user) {
      alert('Please sign in to send messages');
      onNavigate('signin');
      return;
    }
    onNavigate('mail');
  };

  const handleVideoCall = () => {
    if (!user) {
      alert('Please sign in for video calls');
      onNavigate('signin');
      return;
    }
    onNavigate('video-chat');
  };

  const handleAudioCall = () => {
    if (!user) {
      alert('Please sign in for audio calls');
      onNavigate('signin');
      return;
    }
    onNavigate('audio-chat');
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) =>
      prev === photos.length - 1 ? 0 : prev + 1
    );
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) =>
      prev === 0 ? photos.length - 1 : prev - 1
    );
  };

  if (loading) {
    return (
      <Layout title="Loading..." onBack={() => onNavigate('discovery')}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout title="Error" onBack={() => onNavigate('discovery')}>
        <div className="p-6 text-center">
          <p className="text-white text-lg mb-4">{error || 'Profile not found'}</p>
          <Button onClick={() => onNavigate('discovery')}>
            Back to Discovery
          </Button>
        </div>
      </Layout>
    );
  }

  const currentPhoto = photos[currentPhotoIndex]?.photo_url || profile.photo_url ||
    'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400';

  return (
    <Layout
      title={profile.full_name}
      onBack={() => onNavigate('discovery')}
      showClose={false}
    >
      <div className="pb-24">
        <div className="relative">
          <div className="relative h-96 overflow-hidden">
            <img
              src={currentPhoto}
              alt={profile.full_name}
              className="w-full h-full object-cover"
            />

            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  type="button"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  type="button"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                  {photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentPhotoIndex
                          ? 'bg-white w-6'
                          : 'bg-white/50'
                      }`}
                      type="button"
                      aria-label={`View photo ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          <div className="px-6 py-4 bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h1 className="text-2xl font-bold text-white">
                    {profile.full_name}, {profile.age}
                  </h1>
                  {profile.is_verified && (
                    <Shield className="w-5 h-5 text-blue-400 fill-blue-400" />
                  )}
                </div>

                {profile.is_online && (
                  <div className="flex items-center space-x-1 text-white/90 text-sm">
                    <Circle className="w-2 h-2 fill-green-400 text-green-400 animate-pulse" />
                    <span>Online</span>
                  </div>
                )}
              </div>
            </div>

            {profile.location && (
              <div className="flex items-center text-white/90 mb-2">
                <MapPin className="w-4 h-4 mr-2" />
                <span className="text-sm">{profile.location}</span>
              </div>
            )}

            {profile.occupation && (
              <div className="flex items-center text-white/90 mb-2">
                <Briefcase className="w-4 h-4 mr-2" />
                <span className="text-sm">{profile.occupation}</span>
              </div>
            )}

            {profile.education && (
              <div className="flex items-center text-white/90 mb-4">
                <GraduationCap className="w-4 h-4 mr-2" />
                <span className="text-sm">{profile.education}</span>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              <Button
                onClick={handleLike}
                className={`${
                  isLiked
                    ? 'bg-pink-500 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              <Button
                onClick={handleMessage}
                className="bg-white/20 text-white hover:bg-white/30"
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
              <Button
                onClick={handleVideoCall}
                className="bg-white/20 text-white hover:bg-white/30"
              >
                <Video className="w-5 h-5" />
              </Button>
              <Button
                onClick={handleAudioCall}
                className="bg-white/20 text-white hover:bg-white/30"
              >
                <Phone className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {profile.bio && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-2">About</h2>
              <p className="text-white/80 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-3">Interests</h2>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white/20 text-white rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

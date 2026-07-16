import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { EmptyState } from '@/components/EmptyState';
import { Heart, Star, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';
import { MatchManager } from '@/lib/database';

interface LikedProfile {
  id: string;
  name: string;
  age: number;
  image: string;
  type: string;
}

interface WhoLikesYou {
  id: string;
  name: string;
  image: string;
  blurred: boolean;
}

interface LikesProps {
  onNavigate: (screen: string, params?: { userId?: string }) => void;
}

export const Likes: React.FC<LikesProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [likedProfiles, setLikedProfiles] = useState<LikedProfile[]>([]);
  const [whoLikesYou, setWhoLikesYou] = useState<WhoLikesYou[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    const loadLikes = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data: sentLikes } = await supabaseClient
          .from('user_likes')
          .select('target_user_id, like_type, created_at')
          .eq('user_id', user.id)
          .in('like_type', ['like', 'super_like'])
          .order('created_at', { ascending: false })
          .limit(20);

        if (sentLikes && sentLikes.length > 0) {
          const profiles = await Promise.all(
            sentLikes.map(async (like: any) => {
              const { data: profile } = await supabaseClient
                .from('user_profiles')
                .select('full_name, first_name, age')
                .eq('user_id', like.target_user_id)
                .maybeSingle();

              const { data: photo } = await supabaseClient
                .from('user_photos')
                .select('photo_url')
                .eq('user_id', like.target_user_id)
                .eq('is_primary', true)
                .maybeSingle();

              return {
                id: like.target_user_id,
                name: profile?.first_name || profile?.full_name || 'User',
                age: profile?.age || 25,
                image: photo?.photo_url || 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400',
                type: like.like_type === 'super_like' ? 'super-like' : 'like'
              };
            })
          );
          setLikedProfiles(profiles);
        }

        const receivedLikes = await MatchManager.getLikesReceived(user.id);
        if (receivedLikes && receivedLikes.length > 0) {
          const likersWithBlur = receivedLikes.slice(0, 5).map((like: any) => ({
            id: like.user_id,
            name: 'Someone likes you!',
            image: like.user_profile?.photo_url || 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400',
            blurred: true
          }));
          setWhoLikesYou(likersWithBlur);
        }
      } catch (error) {
        console.error('Error loading likes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLikes();
  }, [user?.id]);

  return (
    <Layout
      title="Likes"
      onBack={() => onNavigate('discovery')}
      showClose={false}
      showFooter={true}
      activeTab="likes"
      onNavigate={onNavigate}
    >
      <div className="px-4 py-6">
        {/* Header Image */}
        <div className="mb-6">
          <img 
            src="https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=800" 
            alt="Likes Header" 
            className="w-full h-24 object-cover rounded-2xl shadow-lg"
          />
        </div>

        {/* Who Likes You */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Who Likes You</h2>
            <span className="bg-pink-500 text-white text-xs px-2 py-1 rounded-full">
              {whoLikesYou.length}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {whoLikesYou.map((profile) => (
              <div
                key={profile.id}
                onClick={() => !profile.blurred && onNavigate('view-profile', { userId: profile.id })}
                className={`relative bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden aspect-square ${!profile.blurred ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
              >
                <img
                  src={profile.image}
                  alt={profile.name}
                  className={`w-full h-full object-cover ${profile.blurred ? 'blur-sm' : ''}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium text-sm">
                      {profile.blurred ? '❤️ Someone likes you!' : profile.name}
                    </span>
                    <Heart className="w-4 h-4 text-pink-400" fill="currentColor" />
                  </div>
                </div>
                {profile.blurred && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-pink-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Upgrade to see
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Your Likes */}
        <div>
          <h2 className="text-white font-semibold text-lg mb-4">Your Likes</h2>
          <div className="space-y-3">
            {likedProfiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => onNavigate('view-profile', { userId: profile.id })}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 cursor-pointer hover:bg-white/20 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={profile.image}
                      alt={profile.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                      profile.type === 'super-like' ? 'bg-blue-500' : 'bg-pink-500'
                    }`}>
                      {profile.type === 'super-like' ? (
                        <Star className="w-3 h-3 text-white" fill="currentColor" />
                      ) : (
                        <Heart className="w-3 h-3 text-white" fill="currentColor" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-white font-medium">
                      {profile.name}, {profile.age}
                    </h3>
                    <p className="text-white/70 text-sm">
                      {profile.type === 'super-like' ? 'Super liked' : 'Liked'} • Waiting for response
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  >
                    <X className="w-4 h-4 text-white/80" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {likedProfiles.length === 0 && whoLikesYou.length === 0 && (
          <EmptyState
            icon={Heart}
            title="Love is just a swipe away!"
            description="Your perfect matches are out there waiting. Start exploring profiles and let the sparks fly when you find someone special."
            actionText="Start Discovering"
            onAction={() => onNavigate('discovery')}
          />
        )}
      </div>
    </Layout>
  );
};
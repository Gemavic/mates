import React from 'react';
import { Layout } from '@/components/Layout';
import { EmptyState } from '@/components/EmptyState';
import { PageTransition } from '@/components/PageTransition';
import { Heart, Star, X } from 'lucide-react';

interface LikesProps {
  onNavigate: (screen: string) => void;
}

export const Likes: React.FC<LikesProps> = ({ onNavigate }) => {
  const likedProfiles = [
    {
      id: '1',
      name: 'Emma',
      age: 25,
      image: 'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=400',
      type: 'like'
    },
    {
      id: '2',
      name: 'Sarah',
      age: 26,
      image: 'https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg?auto=compress&cs=tinysrgb&w=400',
      type: 'super-like'
    },
    {
      id: '3',
      name: 'Jessica',
      age: 24,
      image: 'https://images.pexels.com/photos/1172207/pexels-photo-1172207.jpeg?auto=compress&cs=tinysrgb&w=400',
      type: 'like'
    }
  ];

  const whoLikesYou = [
    {
      id: '4',
      name: 'Mystery Person',
      image: 'https://images.pexels.com/photos/1547971/pexels-photo-1547971.jpeg?auto=compress&cs=tinysrgb&w=400',
      blurred: true
    },
    {
      id: '5',
      name: 'Mystery Person',
      image: 'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=400',
      blurred: true
    }
  ];

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
                className="relative bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden aspect-square"
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
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
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
                  
                  <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
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
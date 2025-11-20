import React, { useState } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { HeartAnimation } from '@/components/HeartAnimation';
import { ProfileCard } from '@/components/ProfileCard';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ChevronRight, Search, Filter, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiscoveryProps {
  onNavigate: (screen: any) => void;
}

export const Discovery: React.FC<DiscoveryProps> = ({ onNavigate }) => {
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'following'>('online');
  const [isLoading, setIsLoading] = useState(true);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  const profiles = [
    {
      id: '1',
      name: 'Tetiana',
      age: 29,
      location: 'New York, NY',
      occupation: 'Graphic Designer',
      education: 'NYU',
      images: ['https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400'],
      bio: 'Love exploring new coffee shops and weekend hiking adventures. Looking for someone who shares my passion for creativity and outdoor activities.',
      interests: ['Coffee', 'Hiking', 'Design', 'Photography', 'Travel'],
      photoCount: 37,
      online: true
    },
    {
      id: '2',
      name: 'Claudia',
      age: 27,
      location: 'San Francisco, CA',
      occupation: 'Software Engineer',
      education: 'Stanford',
      images: ['https://images.pexels.com/photos/3094215/pexels-photo-3094215.jpeg?auto=compress&cs=tinysrgb&w=400'],
      bio: 'Tech enthusiast by day, chef by night. Always up for trying new restaurants or cooking something delicious at home.',
      interests: ['Cooking', 'Technology', 'Music', 'Travel', 'Fitness'],
      photoCount: 12,
      online: true
    },
    {
      id: '3',
      name: 'Mi Khan',
      age: 29,
      location: 'Los Angeles, CA',
      occupation: 'Marketing Manager',
      education: 'UCLA',
      images: ['https://images.pexels.com/photos/2100063/pexels-photo-2100063.jpeg?auto=compress&cs=tinysrgb&w=400'],
      bio: 'Beach lover and yoga enthusiast. Seeking genuine connections and meaningful conversations over sunset walks.',
      interests: ['Yoga', 'Beach', 'Reading', 'Movies', 'Wellness'],
      photoCount: 13,
      online: true
    },
    {
      id: '4',
      name: 'Anastasiia',
      age: 31,
      location: 'Miami, FL',
      occupation: 'Fashion Designer',
      education: 'FIT',
      images: ['https://images.pexels.com/photos/3761020/pexels-photo-3761020.jpeg?auto=compress&cs=tinysrgb&w=400'],
      bio: 'Fashion designer with a passion for art and culture. Love traveling and discovering new places.',
      interests: ['Fashion', 'Art', 'Travel', 'Culture', 'Photography'],
      photoCount: 30,
      online: true
    }
  ];

  const handleLike = (profileId: string) => {
    setShowHeartAnimation(true);
    setTimeout(() => {
    nextProfile();
    }, 500);
  };

  const handlePass = (profileId: string) => {
    nextProfile();
  };

  const handleSuperLike = (profileId: string) => {
    nextProfile();
  };

  const nextProfile = () => {
    setCurrentProfileIndex((prev) => (prev + 1) % profiles.length);
  };

  const currentProfile = profiles[currentProfileIndex];

  if (isLoading) {
    return (
      <PageTransition direction="fade">
        <div className="min-h-screen bg-white relative overflow-hidden">
          <div className="max-w-md mx-auto">
            {/* Header Skeleton */}
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
        {/* Header with BestDates branding */}
        <div className="bg-white shadow-sm border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">Dates</h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                </div>
              </div>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Profiles</h2>
          
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
              onClick={() => setActiveTab('following')}
              className={`pb-2 border-b-2 transition-colors ${
                activeTab === 'following' 
                  ? 'border-orange-500 text-gray-900' 
                  : 'border-transparent text-gray-500'
              }`}
            >
              Following
            </button>
            <div className="flex-1"></div>
            <button className="flex items-center space-x-1 text-orange-500">
              <span>Filters</span>
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Grid */}
          <div className="grid grid-cols-2 gap-4">
            {profiles.length === 0 && !isLoading ? (
              <div className="col-span-2">
                <EmptyState
                  icon={Heart}
                  title="New profiles are on their way!"
                  description="We're finding amazing people for you to connect with. Check back soon for fresh faces and new possibilities."
                  actionText="Refresh Profiles"
                  onAction={() => window.location.reload()}
                />
              </div>
            ) : (
            <>
              {profiles.map((profile) => (
                <div key={profile.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="relative">
                    <img
                      src={profile.images[0]}
                      alt={profile.name}
                      className="w-full h-48 object-cover"
                    />
                    <button className="absolute top-3 right-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center">
                      <span className="text-gray-600">♡</span>
                    </button>
                    <div className="absolute bottom-3 left-3 flex items-center space-x-1 bg-black/50 rounded-full px-2 py-1">
                      <span className="text-white text-xs">📷</span>
                      <span className="text-white text-xs font-medium">{profile.photoCount}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{profile.name}, {profile.age}</h3>
                      {profile.online && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                    </div>
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
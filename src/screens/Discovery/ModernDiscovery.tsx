import React, { useState } from 'react';
import { Heart, X, Star, MapPin, Briefcase, GraduationCap, Search, Filter, Users, CreditCard } from 'lucide-react';
import { SwipeCard } from '@/components/SwipeCard';
import { ModernHeader } from '@/components/ModernHeader';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { ProfileManager } from '@/lib/database';
import { sendLikeNotification, sendMessageNotification, sendWinkNotification } from '@/lib/emailNotifications';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  id: string;
  name: string;
  age: number;
  location: string;
  occupation: string;
  education: string;
  images: string[];
  bio: string;
  interests: string[];
  online: boolean;
  verified: boolean;
  premium?: boolean;
}

interface ModernDiscoveryProps {
  onNavigate?: (screen: string) => void;
}

export const ModernDiscovery: React.FC<ModernDiscoveryProps> = ({ onNavigate = () => {} }) => {
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState(creditManager.getBalance(user?.id || 'demo-user'));
  const [viewMode, setViewMode] = useState<'swipe' | 'grid'>('swipe');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Load profiles from database
  React.useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);

    try {
      // Try to load profiles from database, works for both authenticated and anonymous users
      try {
        const dbProfiles = await ProfileManager.getDiscoveryProfiles(user?.id);
        if (dbProfiles && dbProfiles.length > 0) {
          const formattedProfiles = dbProfiles.map(profile => ({
            id: profile.user_id,
            name: profile.first_name || profile.full_name || 'User',
            age: profile.age || 25,
            location: profile.location || 'Unknown',
            occupation: profile.occupation || 'Professional',
            education: profile.education || 'University',
            images: ['https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=800'],
            bio: profile.bio || 'Hello there!',
            interests: profile.interests || ['Travel', 'Music'],
            online: profile.is_online || false,
            verified: profile.is_verified || false,
            premium: false
          }));
          setProfiles(formattedProfiles);
        } else {
          // No profiles in database, use mock profiles for demo
          setProfiles(mockProfiles);
        }
      } catch (dbError) {
        console.warn('Database error, using mock profiles:', dbError);
        setProfiles(mockProfiles);
      }
    } catch (error) {
      console.warn('General error loading profiles, using mock profiles for demo:', error);
      setProfiles(mockProfiles);
    } finally {
      setLoading(false);
    }
  };

  const mockProfiles: Profile[] = [
    {
      id: '1',
      name: 'Sofia',
      age: 28,
      location: 'New York, NY',
      occupation: 'Marketing Manager',
      education: 'Columbia University',
      images: [
        'https://images.pexels.com/photos/1382734/pexels-photo-1382734.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/2787341/pexels-photo-2787341.jpeg?auto=compress&cs=tinysrgb&w=800'
      ],
      bio: 'Love exploring new places, trying different cuisines, and meeting interesting people. Looking for someone to share adventures with!',
      interests: ['Travel', 'Photography', 'Cooking', 'Yoga'],
      online: true,
      verified: true,
      premium: true,
      matchReason: 'Shared love for travel',
      statusUpdate: 'Just got back from an amazing weekend in the mountains! 🏔️',
      quoteOfTheDay: 'Adventure awaits those who dare to dream',
      lastActive: '2 minutes ago'
    },
    {
      id: '2',
      name: 'Emma',
      age: 25,
      location: 'Los Angeles, CA',
      occupation: 'Graphic Designer',
      education: 'Art Center College',
      images: [
        'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/3196887/pexels-photo-3196887.jpeg?auto=compress&cs=tinysrgb&w=800'
      ],
      bio: 'Creative soul with a passion for art and design. Love hiking, coffee shops, and deep conversations under the stars.',
      interests: ['Art', 'Hiking', 'Coffee', 'Music'],
      online: false,
      verified: true,
      matchReason: 'Both creative types',
      statusUpdate: 'Working on a new art project that\'s got me so inspired! 🎨',
      quoteOfTheDay: 'Creativity is intelligence having fun',
      lastActive: '1 hour ago'
    },
    {
      id: '3',
      name: 'Jessica',
      age: 27,
      location: 'Chicago, IL',
      occupation: 'Software Engineer',
      education: 'Northwestern University',
      images: [
        'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=800'
      ],
      bio: 'Tech enthusiast who loves solving problems and building cool things. When not coding, you can find me at the gym or trying new restaurants.',
      interests: ['Technology', 'Fitness', 'Food', 'Travel'],
      online: true,
      verified: false,
      matchReason: 'Similar career ambitions',
      statusUpdate: 'Just finished a challenging coding bootcamp. Feeling accomplished! 💻',
      quoteOfTheDay: 'Code is poetry written in logic',
      lastActive: '5 minutes ago'
    }
  ];

  const currentProfile = profiles[currentProfileIndex];

  const handleLike = async (profileId: string) => {
    console.log('💖 Like action triggered for profile:', profileId);

    // Send notification
    const profile = profiles.find(p => p.id === profileId);
    if (profile && user) {
      sendLikeNotification(profileId, {
        name: 'You',
        image: 'https://images.pexels.com/photos/1848565/pexels-photo-1848565.jpeg?auto=compress&cs=tinysrgb&w=400',
        id: user.id
      });
    }

    nextProfile();
  };

  const handlePass = async (profileId: string) => {
    console.log('👎 Pass action triggered for profile:', profileId);
    nextProfile();
  };

  const handleSuperLike = async (profileId: string) => {
    if (!user) {
      alert('Please sign in to send Super Likes');
      return;
    }

    const canAfford = creditManager.canAfford(user.id, 5);
    if (!canAfford && !creditManager.isStaffMember(user.id)) {
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMessage.textContent = 'Need 5 credits for Super Like! Likes and Blinks are FREE.';
      document.body.appendChild(errorMessage);
      setTimeout(() => document.body.removeChild(errorMessage), 3000);
      return;
    }

    if (!creditManager.isStaffMember(user.id)) {
     creditManager.deductCredits(user.id, 5);
      setUserBalance(creditManager.getBalance(user.id));
      
      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = `⭐ Super Like sent for 5 credits!`;
      document.body.appendChild(successMessage);
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);
    }
    
    console.log('⭐ Super like action triggered for profile:', profileId);
    nextProfile();
  };

  const handleSendMessage = (profileId: string, message: string) => {
    // Messages are now free
    
    console.log('💬 Message action triggered for profile:', profileId, 'Message:', message);
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    successMessage.textContent = `💬 FREE Message sent to ${profiles.find(p => p.id === profileId)?.name}!`;
    document.body.appendChild(successMessage);
    setTimeout(() => document.body.removeChild(successMessage), 3000);
  };

  const handleBlink = (profileId: string) => {
    // Blinks are now free
    
    console.log('👁️ Blink action triggered for profile:', profileId);
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    successMessage.textContent = `👁️ FREE Blink sent to ${profiles.find(p => p.id === profileId)?.name}!`;
    document.body.appendChild(successMessage);
    setTimeout(() => document.body.removeChild(successMessage), 3000);
  };

  const nextProfile = () => {
    setCurrentProfileIndex((prev) => (prev + 1) % profiles.length);
  };

  const handleReport = (profileId: string) => {
    console.log('Reported profile:', profileId);
    alert(`Profile reported: ${currentProfile.name}`);
    nextProfile();
  };

  const handleBlock = (profileId: string) => {
    console.log('Blocked profile:', profileId);
    alert(`Profile blocked: ${currentProfile.name}`);
    nextProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading profiles...</p>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">No more profiles</h2>
          <p>Check back later for new matches!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 overflow-x-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <ModernHeader
          title="Dates"
          showMenu={false}
          showSearch={true}
          showNotifications={true}
          onSearch={() => console.log('Search clicked')}
          onNotifications={() => console.log('Notifications clicked')}
        />
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <ModernHeader
          title="Discovery"
          showBack={false}
          showMenu={false}
          showSearch={true}
          showNotifications={true}
          onSearch={() => console.log('Search clicked')}
          onNotifications={() => console.log('Notifications clicked')}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden min-h-screen">
        {/* Mobile View */}
        <div className="lg:hidden">
          <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 pt-16 pb-20">
            {/* Balance Display */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-white text-center">
              <p className="text-xs sm:text-sm opacity-90">Your Balance</p>
              <p className="text-lg sm:text-xl font-bold">{formatCredits(userBalance)}</p>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('credits');
                }}
                className="mt-2 bg-white/20 text-white hover:bg-white/30 text-xs sm:text-sm px-3 sm:px-4 py-1 cursor-pointer touch-manipulation active:scale-95 transition-all duration-200"
                type="button"
              >
                <CreditCard className="w-3 h-3 mr-1 flex-shrink-0" />
                Buy More
              </Button>
            </div>

            {/* Swipe Card */}
            <div className="flex justify-center px-1 sm:px-2">
              <SwipeCard
                profile={currentProfile}
                onLike={handleLike}
                onPass={handlePass}
                onSuperLike={handleSuperLike}
                onSendMessage={handleSendMessage}
                onBlink={handleBlink}
                onReport={handleReport}
                onBlock={handleBlock}
                onNavigate={onNavigate}
                className="w-full max-w-sm"
              />
            </div>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block">
          <div className="p-4 lg:p-6 pt-20">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-white">Discover</h2>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-white">
                  <p className="text-sm opacity-90">Balance: {formatCredits(userBalance)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('swipe')}
                  className={`px-4 py-2 rounded-lg transition-colors cursor-pointer touch-manipulation ${
                    viewMode === 'swipe' ? 'bg-white text-gray-900' : 'bg-white/20 text-white'
                  }`}
                  type="button"
                >
                  Swipe Mode
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg transition-colors cursor-pointer touch-manipulation ${
                    viewMode === 'grid' ? 'bg-white text-gray-900' : 'bg-white/20 text-white'
                  }`}
                  type="button"
                >
                  Grid View
                </button>
              </div>
            </div>

            {viewMode === 'swipe' ? (
              /* Swipe Mode for Desktop */
              <div className="flex justify-center">
                <SwipeCard
                  profile={currentProfile}
                  onLike={handleLike}
                  onPass={handlePass}
                  onSuperLike={handleSuperLike}
                  onSendMessage={handleSendMessage}
                  onBlink={handleBlink}
                  onReport={handleReport}
                  onBlock={handleBlock}
                  onNavigate={onNavigate}
                  className="w-full max-w-md"
                />
              </div>
            ) : (
              /* Grid Mode for Desktop */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    onClick={() => onNavigate('view-profile', { userId: profile.id })}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden hover:scale-105 transition-transform duration-200 cursor-pointer"
                  >
                    <div className="relative">
                      <img
                        src={profile.images[0]}
                        alt={profile.name}
                        className="w-full h-48 sm:h-56 md:h-64 object-cover"
                      />
                      <div className="absolute top-3 left-3 flex flex-col space-y-2">
                        {profile.online && (
                          <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                            <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                            Online
                          </div>
                        )}
                        {profile.verified && (
                          <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                            ✓ Verified
                          </div>
                        )}
                        {profile.premium && (
                          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                            Premium
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <h3 className="text-lg sm:text-xl font-bold mb-1 truncate">{profile.name}, {profile.age}</h3>
                        <div className="flex items-center mb-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span className="text-sm truncate">{profile.location}</span>
                        </div>
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 mr-1" />
                          <span className="text-sm truncate">{profile.occupation}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 sm:p-4">
                      <p className="text-white/90 text-xs sm:text-sm mb-3 line-clamp-2">{profile.bio}</p>
                      
                      <div className="flex flex-wrap gap-1 mb-4">
                        {(Array.isArray(profile.interests) ? profile.interests : []).slice(0, 3).map((interest, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full truncate"
                          >
                            {interest}
                          </span>
                        ))}
                        {Array.isArray(profile.interests) && profile.interests.length > 3 && (
                          <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">
                            +{profile.interests.length - 3}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-center space-x-1 sm:space-x-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handlePass(profile.id);
                          }}
                          className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gray-500 hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer touch-manipulation active:scale-95"
                          type="button"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white flex-shrink-0" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleLike(profile.id);
                          }}
                          className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-pink-500 hover:bg-pink-600 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer touch-manipulation active:scale-95"
                          type="button"
                        >
                          <Heart className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white flex-shrink-0" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleSuperLike(profile.id);
                          }}
                          className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer touch-manipulation active:scale-95"
                          type="button"
                        >
                          <Star className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white flex-shrink-0" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile Footer */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30">
          <Footer
            activeTab="discovery"
            onNavigate={onNavigate}
          />
        </div>
        
        {/* Desktop Footer */}
        <div className="hidden lg:block fixed bottom-0 left-0 right-0 z-30">
          <Footer
            activeTab="discovery"
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </div>
  );
};
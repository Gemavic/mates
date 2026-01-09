import React, { useState } from 'react';
import { Heart, X, Star, MapPin, Briefcase, GraduationCap, Search, Filter, Users, CreditCard } from 'lucide-react';
import { SwipeCard } from '@/components/SwipeCard';
import { GridProfileCard } from '@/components/GridProfileCard';
import { ModernHeader } from '@/components/ModernHeader';
import { Footer } from '@/components/Footer';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { CategoryNavigation } from '@/components/CategoryNavigation';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { FeatureLimitBanner, GracePeriodBanner } from '@/components/FeatureLimitBanner';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { ProfileManager } from '@/lib/database';
import { supabaseClient } from '@/lib/supabase';
import { sendLikeNotification, sendMessageNotification, sendWinkNotification } from '@/lib/emailNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

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
  const [userBalance, setUserBalance] = useState(0);
  const [viewMode, setViewMode] = useState<'swipe' | 'grid'>('swipe');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptData, setUpgradePromptData] = useState<any>(null);
  const {
    subscription,
    tier,
    usage,
    isFreeTier,
    daysRemaining,
    checkAccess,
    trackUsage,
    recordUpgradePrompt
  } = useSubscription();

  // Load user balance on mount and periodically (reduced frequency)
  React.useEffect(() => {
    if (user) {
      setUserBalance(creditManager.getBalance(user.id));

      const interval = setInterval(() => {
        setUserBalance(creditManager.getBalance(user.id));
      }, 30000); // Check every 30 seconds instead of constant polling

      return () => clearInterval(interval);
    }
  }, [user]);

  React.useEffect(() => {
    if (user?.id) {
      supabaseClient
        .from('user_profiles')
        .update({ is_online: true, last_active: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.warn('Failed to update online status:', error);
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
            if (error) console.warn('Failed to mark offline:', error);
          });
      };
    }
  }, [user?.id]);

  React.useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

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

  const loadProfiles = async () => {
    if (!user) {
      console.warn('⚠️ Cannot load profiles - user not authenticated');
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('🔍 Loading profiles for user:', user.id);

    try {
      const dbProfiles = await ProfileManager.getDiscoveryProfiles(user.id);
      console.log('✅ Loaded real profiles from database:', dbProfiles?.length || 0);
      console.log('📋 Profile details:', dbProfiles?.map(p => ({
        name: p.first_name || p.full_name,
        online: p.is_online,
        userId: p.user_id
      })));

      if (!dbProfiles || dbProfiles.length === 0) {
        console.warn('⚠️ No profiles found in database for user:', user.id);
        setProfiles([]);
        setLoading(false);
        return;
      }

      if (dbProfiles && dbProfiles.length > 0) {
        // Fetch all photos in a single query instead of N+1 queries
        const userIds = dbProfiles.map(p => p.user_id);
        const { data: allPhotos } = await supabaseClient
          .from('user_photos')
          .select('user_id, photo_url, is_primary')
          .in('user_id', userIds)
          .order('is_primary', { ascending: false });

        // Group photos by user_id
        const photosByUser = (allPhotos || []).reduce((acc, photo) => {
          if (!acc[photo.user_id]) {
            acc[photo.user_id] = [];
          }
          if (acc[photo.user_id].length < 3) {
            acc[photo.user_id].push(photo.photo_url);
          }
          return acc;
        }, {} as Record<string, string[]>);

        const formattedProfiles = dbProfiles
          .map((profile) => {
            let userPhotos: string[] = [];

            if (profile.photo_url) {
              userPhotos = [profile.photo_url];
            } else {
              const photos = photosByUser[profile.user_id];
              if (photos && photos.length > 0) {
                userPhotos = photos;
              }
            }

            if (userPhotos.length === 0) {
              return null;
            }

            let displayName = profile.first_name || profile.full_name || 'User';

            return {
              id: profile.user_id,
              name: displayName,
              age: profile.age || 25,
              location: profile.location || 'Location not set',
              occupation: profile.occupation || 'Occupation not set',
              education: profile.education || '',
              images: userPhotos,
              bio: profile.bio || 'No bio yet',
              interests: parseArrayField(profile.interests, []),
              online: profile.is_online || false,
              verified: profile.is_verified || false,
              premium: false
            };
          })
          .filter((profile): profile is Profile => profile !== null);

        console.log('✅ Formatted profiles with online status:', formattedProfiles.map(p => ({ name: p.name, online: p.online, id: p.id })));
        setProfiles(formattedProfiles);
      }
    } catch (error) {
      console.error('❌ Error loading profiles:', error);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const currentProfile = profiles[currentProfileIndex];

  const handleLike = async (profileId: string) => {
    console.log('💖 Like action triggered for profile:', profileId);

    if (!user) return;

    const accessResult = await checkAccess('like');

    if (!accessResult.allowed) {
      setUpgradePromptData(accessResult);
      setShowUpgradePrompt(true);
      await recordUpgradePrompt();
      return;
    }

    const profile = profiles.find(p => p.id === profileId);
    if (profile && user) {
      const { data: currentUserProfile } = await supabaseClient
        .from('user_profiles')
        .select('photo_url, first_name, full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      const userImage = currentUserProfile?.photo_url || '';
      const userName = currentUserProfile?.first_name || currentUserProfile?.full_name || 'Someone';

      if (userImage) {
        sendLikeNotification(profileId, {
          name: userName,
          image: userImage,
          id: user.id
        });
      }

      await trackUsage('like');
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
          <div className="p-2 sm:p-3 space-y-2 pt-16 pb-20">
            {/* Category Navigation - Top Position */}
            <CategoryNavigation onNavigate={onNavigate} />

            {/* Compact Balance Display */}
            <div className="flex items-center justify-between bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
              <div className="flex items-center gap-2">
                <p className="text-xs opacity-90">Balance:</p>
                <p className="text-sm font-bold">{formatCredits(userBalance)}</p>
              </div>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('credits');
                }}
                className="bg-white/20 text-white hover:bg-white/30 text-xs px-3 py-1 h-auto cursor-pointer touch-manipulation active:scale-95 transition-all duration-200"
                type="button"
              >
                <CreditCard className="w-3 h-3 mr-1 flex-shrink-0" />
                Buy
              </Button>
            </div>

            {/* Subscription Banners */}
            {isFreeTier && daysRemaining > 0 && (
              <GracePeriodBanner
                daysRemaining={daysRemaining}
                onUpgrade={() => onNavigate('credits')}
              />
            )}

            {usage && tier?.limits && (
              <>
                {tier.limits.likes_per_day && tier.limits.likes_per_day > 0 && (
                  <FeatureLimitBanner
                    currentUsage={usage.daily_likes}
                    limit={tier.limits.likes_per_day}
                    featureName="Like"
                    onUpgrade={() => onNavigate('credits')}
                  />
                )}
              </>
            )}

            {/* Swipe Card */}
            <div className="flex justify-center px-1 sm:px-2 pt-2">
              {profiles.length === 0 && !loading ? (
                <EmptyState
                  message="No profiles available at the moment"
                  icon={<Users className="w-16 h-16 text-white/50" />}
                />
              ) : currentProfile ? (
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
              ) : (
                <EmptyState
                  message="You've viewed all available profiles!"
                  icon={<Heart className="w-16 h-16 text-white/50" />}
                />
              )}
            </div>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block">
          <div className="p-4 lg:p-6 pt-20">
            {/* Category Navigation - Top Position */}
            <div className="mb-6 max-w-full">
              <CategoryNavigation onNavigate={onNavigate} />
            </div>

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

            {profiles.length === 0 && !loading ? (
              <EmptyState
                message="No profiles available at the moment"
                icon={<Users className="w-16 h-16 text-white/50" />}
              />
            ) : viewMode === 'swipe' ? (
              /* Swipe Mode for Desktop */
              currentProfile ? (
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
                <EmptyState
                  message="You've viewed all available profiles!"
                  icon={<Heart className="w-16 h-16 text-white/50" />}
                />
              )
            ) : (
              /* Grid Mode for Desktop */
              <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
                {profiles.map((profile) => (
                  <GridProfileCard
                    key={profile.id}
                    id={profile.id}
                    name={profile.name}
                    age={profile.age}
                    images={profile.images}
                    online={profile.online}
                    onViewProfile={(id) => onNavigate('view-profile', { userId: id })}
                    onLike={handleLike}
                  />
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

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && upgradePromptData && (
        <UpgradePrompt
          reason={upgradePromptData.reason || 'Upgrade to continue'}
          feature={upgradePromptData.feature}
          currentTier={upgradePromptData.current_tier}
          currentUsage={upgradePromptData.current_usage}
          limit={upgradePromptData.limit}
          gracePeriodExpired={upgradePromptData.grace_period_expired}
          daysRemaining={daysRemaining}
          onUpgrade={() => {
            setShowUpgradePrompt(false);
            onNavigate('credits');
          }}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
};
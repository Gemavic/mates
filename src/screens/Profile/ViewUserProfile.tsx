import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import {
  Heart,
  MessageCircle,
  Video,
  MapPin,
  Briefcase,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Shield,
  Circle,
  Users,
  Flag,
  Ban, UserCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { setPendingCall } from '@/lib/callSignals';
import { ReportAbuseModal } from '@/components/ReportAbuseModal';
import { sendWinkNotification } from '@/lib/emailNotifications';
import { supabaseClient } from '@/lib/supabase';

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
  relationship_status: string | null;
  looking_for: string | null;
}

interface UserPhoto {
  id: string;
  photo_url: string;
  display_order: number;
}

const RELATIONSHIP_STATUS_LABELS: Record<string, string> = {
  single: 'Single / Unmarried',
  married: 'Married',
  divorced: 'Divorced',
  widowed: 'Widowed',
  separated: 'Separated',
};

const LOOKING_FOR_LABELS: Record<string, string> = {
  friendship: 'Friendship',
  serious: 'True Love',
  casual: 'Casual Dating',
  flirting: 'Flirting',
  not_sure: 'Not Sure Yet',
};

export const ViewUserProfile: React.FC<ViewUserProfileProps> = ({ onNavigate, userId }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [hasWinked, setHasWinked] = useState(false);
  const [winking, setWinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [blocking, setBlocking] = useState(false);
  // Blocking used to be one-way from here: the only way back was a "Block &
  // Report" screen buried in Settings, which nobody finds. The profile is
  // where you blocked someone, so it is where you look to undo it.
  const [blockId, setBlockId] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
    checkIfLiked();
    checkIfBlocked();
  }, [userId]);

  const checkIfBlocked = async () => {
    if (!user) return;
    const { data } = await supabaseClient
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)
      .maybeSingle();
    setBlockId(data?.id ?? null);
  };

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

      setProfile({
        ...profileData,
        interests: parseArrayField(profileData.interests, [])
      });

      const { data: photosData, error: photosError } = await supabaseClient
        .from('user_photos')
        .select('id, photo_url, display_order')
        .eq('user_id', userId)
        .eq('is_public', true)
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
      // Select like_type too. A wink and a like both live in user_likes,
      // so checking only for a row's existence made a wink light up the
      // like button.
      const { data, error } = await supabaseClient
        .from('user_likes')
        .select('id, like_type')
        .eq('user_id', user.id)
        .eq('target_user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking like status:', error);
      }

      setIsLiked(data?.like_type === 'like' || data?.like_type === 'super_like');
      setHasWinked(data?.like_type === 'blink');
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
        const { error } = await supabaseClient
          .from('user_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('target_user_id', userId);

        if (error) throw error;

        setIsLiked(false);
        alert('Removed from your likes');
      } else {
        const { error } = await supabaseClient
          .from('user_likes')
          .insert({
            user_id: user.id,
            target_user_id: userId,
            like_type: 'like'
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

  const handleWink = async () => {
    if (!user) {
      alert('Please sign in to send winks');
      onNavigate('signin');
      return;
    }
    if (hasWinked || winking) return;

    setWinking(true);
    try {
      // 'blink' is the value the user_likes_like_type_check constraint
      // permits - 'wink' would be rejected outright.
      const { error } = await supabaseClient
        .from('user_likes')
        .insert({
          user_id: user.id,
          target_user_id: userId,
          like_type: 'blink'
        });

      if (error) throw error;

      setHasWinked(true);

      try {
        const { data: me } = await supabaseClient
          .from('user_profiles')
          .select('first_name, full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: myPhoto } = await supabaseClient
          .from('user_photos')
          .select('photo_url')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })
          .limit(1)
          .maybeSingle();

        sendWinkNotification(userId, {
          name: me?.first_name || me?.full_name || 'Someone',
          image: myPhoto?.photo_url || '',
          id: user.id
        });
      } catch (notifyErr) {
        // A failed notification must not make the wink itself look failed.
        console.warn('Wink notification failed:', notifyErr);
      }

      alert(`You winked at ${profile?.full_name || 'them'}!`);
    } catch (err: any) {
      console.error('Error sending wink:', err);
      alert(
        err?.code === '23505'
          ? 'You have already reacted to this profile.'
          : `Could not send wink: ${err?.message || 'Unknown error'}`
      );
    } finally {
      setWinking(false);
    }
  };

  const handleMessage = () => {
    if (!user) {
      alert('Please sign in to send messages');
      onNavigate('signin');
      return;
    }
    onNavigate('mail', { userId });
  };

  const handleBlock = async () => {
    if (!user) {
      onNavigate('signin');
      return;
    }
    if (!window.confirm(`Block ${profile?.full_name || 'this member'}? They will no longer appear for you.`)) {
      return;
    }

    setBlocking(true);
    const { data, error } = await supabaseClient
      .from('user_blocks')
      .insert({ blocker_id: user.id, blocked_id: userId })
      .select('id')
      .maybeSingle();
    setBlocking(false);

    if (error) {
      // A repeat block is not a failure worth alarming anyone about.
      if (!/duplicate|unique/i.test(error.message)) {
        alert(`Could not block: ${error.message}`);
        return;
      }
    }
    if (data?.id) setBlockId(data.id);
    alert('Blocked. You can undo this from their profile, or in Settings.');
    onNavigate('discovery');
  };

  const handleUnblock = async () => {
    if (!user || !blockId) return;
    if (!window.confirm(`Unblock ${profile?.full_name || 'this member'}?`)) return;

    setBlocking(true);
    const { error } = await supabaseClient.from('user_blocks').delete().eq('id', blockId);
    setBlocking(false);

    if (error) {
      alert(`Could not unblock: ${error.message}`);
      return;
    }
    setBlockId(null);
    alert('Unblocked. You will see each other again.');
  };

  const handleVideoCall = () => {
    if (!user) {
      alert('Please sign in for video calls');
      onNavigate('signin');
      return;
    }
    setPendingCall({ peerId: userId, peerName: profile?.full_name || 'Member' });
    onNavigate('video-chat');
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
      <Layout
      onNavigate={onNavigate} title="Loading..." onBack={() => onNavigate('discovery')}>
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
              decoding="async"
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

            <div className="grid grid-cols-5 gap-2">
              <Button
                onClick={handleLike}
                className={`${
                  isLiked
                    ? 'bg-pink-500 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                title="Like"
                aria-label="Like"
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              <Button
                onClick={handleWink}
                disabled={winking}
                className={`${
                  hasWinked
                    ? 'bg-amber-400 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                } disabled:opacity-60`}
                title="Send a wink"
                aria-label="Send a wink"
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {winking ? '\u22EF' : '\u{1F609}'}
                </span>
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
              {/* Audio calling is hidden until incoming calls can be answered -
                  see FEATURES.audioChat in config.ts */}
              {/* Report and block belong here, next to the actions, not buried
                  in a menu - this is the screen someone is on when they decide
                  a person is a problem. */}
              <Button
                onClick={() => setShowReport(true)}
                title="Report this member"
                aria-label="Report this member"
                className="bg-white/20 text-white hover:bg-white/30"
              >
                <Flag className="w-5 h-5" />
              </Button>
              <Button
                onClick={blockId ? handleUnblock : handleBlock}
                disabled={blocking}
                title={blockId ? 'Unblock this member' : 'Block this member'}
                aria-label={blockId ? 'Unblock this member' : 'Block this member'}
                className={
                  blockId
                    ? 'bg-green-500/90 text-white hover:bg-green-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }
              >
                {blockId ? <UserCheck className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
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

          {(profile.relationship_status || profile.looking_for) && (
            <div className="flex flex-wrap gap-2">
              {profile.relationship_status && (
                <span className="px-3 py-1.5 bg-white/15 border border-white/20 text-white rounded-full text-sm flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {RELATIONSHIP_STATUS_LABELS[profile.relationship_status] || profile.relationship_status}
                </span>
              )}
              {profile.looking_for && (
                <span className="px-3 py-1.5 bg-rose-500/20 border border-rose-400/30 text-white rounded-full text-sm flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" />
                  Looking for {LOOKING_FOR_LABELS[profile.looking_for] || profile.looking_for}
                </span>
              )}
            </div>
          )}

          {Array.isArray(profile.interests) && profile.interests.length > 0 && (
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

      {/* Persistent Message CTA — always reachable regardless of scroll
          position, so starting a conversation is never more than one tap
          away no matter how far a person has scrolled through the profile. */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-2">
        <Button
          onClick={handleMessage}
          className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold py-3.5 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <MessageCircle className="w-5 h-5" />
          Message {profile.full_name.split(' ')[0]}
        </Button>
      </div>

      {user && (
        <ReportAbuseModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          reportedUserId={userId}
          reportedUserName={profile.full_name}
          contextType="profile"
          reporterId={user.id}
        />
      )}
    </Layout>
  );
};

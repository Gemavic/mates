import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, MapPin, Briefcase, GraduationCap, Settings, CreditCard as Edit, Shield, Upload, X, Heart, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';
import { uploadProfilePhoto } from '@/lib/photoUpload';
import { ProfileManager } from '@/lib/database';

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

interface ProfileProps {
  onNavigate: (screen: string) => void;
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
  serious: 'True Love / Serious Relationship',
  casual: 'Casual Dating',
  flirting: 'Flirting',
  not_sure: 'Not Sure Yet',
};

export const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { user, getFirstName, getFullName, profile, loadUserProfile } = useAuth();
  const [profileData, setProfileData] = useState({
    name: getFullName(),
    age: '25',
    location: 'New York, NY',
    occupation: 'Professional',
    education: 'University',
    bio: 'Hello! I\'m excited to meet new people and see where things go.',
    interests: ['Travel', 'Music', 'Food', 'Movies'],
    relationshipStatus: '',
    lookingFor: ''
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [userPhotos, setUserPhotos] = useState<Array<{id: string, url: string, isPrimary: boolean}>>([]);

  const userStats = {
    profileViews: 124,
    likes: 23,
    matches: 8,
    verified: profile?.is_verified || false
  };

  // Load profile data from database
  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.full_name || getFullName(),
        age: profile.age?.toString() || '25',
        location: profile.location || 'New York, NY',
        occupation: profile.occupation || 'Professional',
        education: profile.education || 'University',
        bio: profile.bio || '',
        interests: parseArrayField(profile.interests, ['Travel', 'Music', 'Food', 'Movies']),
        relationshipStatus: profile.relationship_status || '',
        lookingFor: profile.looking_for || ''
      });
    }
  }, [profile]);

  // Load user photos
  useEffect(() => {
    if (user) {
      loadUserPhotos();
    }
  }, [user]);

  const loadUserPhotos = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabaseClient
        .from('user_photos')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setUserPhotos(data?.map(p => ({ id: p.id, url: p.photo_url, isPrimary: p.is_primary })) || []);
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMessage.textContent = '⚠️ Please sign in to update your profile';
      document.body.appendChild(errorMessage);
      setTimeout(() => {
        if (document.body.contains(errorMessage)) {
          document.body.removeChild(errorMessage);
        }
      }, 3000);
      return;
    }

    // Validation
    if (!profileData.name || profileData.name.trim() === '') {
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMessage.textContent = '⚠️ Please enter your name';
      document.body.appendChild(errorMessage);
      setTimeout(() => {
        if (document.body.contains(errorMessage)) {
          document.body.removeChild(errorMessage);
        }
      }, 3000);
      return;
    }

    try {
      console.log('Updating profile for user:', user.id);

      const updateData = {
        full_name: profileData.name.trim(),
        first_name: profileData.name.trim().split(' ')[0],
        age: parseInt(profileData.age) || null,
        location: profileData.location || null,
        occupation: profileData.occupation || null,
        education: profileData.education || null,
        bio: profileData.bio || null,
        interests: profileData.interests || null,
        relationship_status: profileData.relationshipStatus || null,
        looking_for: profileData.lookingFor || null
      };

      console.log('Update data:', updateData);

      const result = await ProfileManager.updateProfile(user.id, updateData);
      console.log('Update result:', result);

      await loadUserProfile();
      setIsEditing(false);

      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = '✅ Profile updated successfully!';
      document.body.appendChild(successMessage);
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);
    } catch (error: any) {
      console.error('Profile update error:', error);
      const errorMsg = document.createElement('div');
      errorMsg.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMsg.textContent = '❌ Failed to update profile. Please try again.';
      document.body.appendChild(errorMsg);
      setTimeout(() => {
        if (document.body.contains(errorMsg)) {
          document.body.removeChild(errorMsg);
        }
      }, 3000);
    }
  };

  const handlePhotoUpload = async () => {
    if (!user) {
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMessage.textContent = '⚠️ Please sign in to upload photos';
      document.body.appendChild(errorMessage);
      setTimeout(() => {
        if (document.body.contains(errorMessage)) {
          document.body.removeChild(errorMessage);
        }
      }, 3000);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      setUploadingPhoto(true);

      try {
        // Track the count locally. `userPhotos` is captured by this closure
        // and does NOT update between loop iterations (setState is async and
        // the closure holds the value from when the handler was created), so
        // reading it inside the loop marked EVERY photo in a batch as primary
        // and gave them all display_order 1.
        let photoCount = userPhotos.length;

        for (const file of Array.from(files)) {
          const publicUrl = await uploadProfilePhoto(user.id, file);

          const { error } = await supabaseClient
            .from('user_photos')
            .insert({
              user_id: user.id,
              photo_url: publicUrl,
              is_primary: photoCount === 0,
              display_order: photoCount + 1
            })
            .select()
            .single();

          if (error) throw error;

          photoCount += 1;
        }

        await loadUserPhotos();

        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMessage.textContent = '✅ Photos uploaded successfully!';
        document.body.appendChild(successMessage);
        setTimeout(() => {
          if (document.body.contains(successMessage)) {
            document.body.removeChild(successMessage);
          }
        }, 3000);
      } catch (error: any) {
        console.error('Upload error:', error);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        // Surface the real reason. A bare "Failed to upload photos" hides
        // the common causes (missing storage bucket, RLS rejection, file too
        // large) and leaves both the user and us with nothing to act on.
        const reason = error?.message || error?.error_description || 'Unknown error';
        const friendly = /bucket not found/i.test(reason)
          ? 'Photo storage is not set up yet. Please contact support.'
          : /row-level security|not authorized|jwt/i.test(reason)
          ? 'Your session expired. Please sign in again and retry.'
          : /exceeded|too large|payload/i.test(reason)
          ? 'That image is too large. Please try a smaller photo.'
          : reason;
        errorMsg.textContent = `❌ Upload failed: ${friendly}`;
        document.body.appendChild(errorMsg);
        setTimeout(() => {
          if (document.body.contains(errorMsg)) {
            document.body.removeChild(errorMsg);
          }
        }, 3000);
      } finally {
        setUploadingPhoto(false);
      }
    };
    input.click();
  };

  const handleSetPrimaryPhoto = async (photoId: string) => {
    if (!user) return;

    setSettingPrimary(photoId);
    try {
      // Clear the flag on every other photo first, so exactly one primary
      // ever exists. The avatar handler looks the primary up with
      // .maybeSingle(), which errors outright if more than one comes back.
      const { error: clearError } = await supabaseClient
        .from('user_photos')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .neq('id', photoId);

      if (clearError) throw clearError;

      const { error: setError } = await supabaseClient
        .from('user_photos')
        .update({ is_primary: true })
        .eq('id', photoId)
        .eq('user_id', user.id);

      if (setError) throw setError;

      const chosen = userPhotos.find(p => p.id === photoId);
      if (chosen) {
        // Keep the profile's own photo_url in step so the avatar and any
        // other screen reading user_profiles show the same picture.
        await supabaseClient
          .from('user_profiles')
          .update({ photo_url: chosen.url })
          .eq('user_id', user.id);
      }

      await loadUserPhotos();
      await loadUserProfile();

      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = '\u2705 Main photo updated!';
      document.body.appendChild(successMessage);
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 2000);
    } catch (error: any) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMsg.textContent = `\u274C Could not set main photo: ${error?.message || 'Unknown error'}`;
      document.body.appendChild(errorMsg);
      setTimeout(() => {
        if (document.body.contains(errorMsg)) {
          document.body.removeChild(errorMsg);
        }
      }, 4000);
    } finally {
      setSettingPrimary(null);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!user) return;

    try {
      const { error } = await supabaseClient
        .from('user_photos')
        .delete()
        .eq('id', photoId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadUserPhotos();

      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = '✅ Photo deleted!';
      document.body.appendChild(successMessage);
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 2000);
    } catch (error: any) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMsg.textContent = '❌ Failed to delete photo';
      document.body.appendChild(errorMsg);
      setTimeout(() => {
        if (document.body.contains(errorMsg)) {
          document.body.removeChild(errorMsg);
        }
      }, 3000);
    }
  };

  if (isEditing) {
    return (
      <Layout
        title="Edit Profile"
        onBack={() => setIsEditing(false)}
        showClose={false}
      >
        <div className="px-4 py-6">
          <div className="space-y-6">
            <div>
              <label className="block text-white font-medium mb-2">Name</label>
              <Input
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-white/20 text-white placeholder-white/50 border-white/30"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Age</label>
              <Input
                type="number"
                value={profileData.age}
                onChange={(e) => setProfileData(prev => ({ ...prev, age: e.target.value }))}
                className="bg-white/20 text-white placeholder-white/50 border-white/30"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Location</label>
              <Input
                value={profileData.location}
                onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                className="bg-white/20 text-white placeholder-white/50 border-white/30"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Occupation</label>
              <Input
                value={profileData.occupation}
                onChange={(e) => setProfileData(prev => ({ ...prev, occupation: e.target.value }))}
                className="bg-white/20 text-white placeholder-white/50 border-white/30"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Bio</label>
              <Textarea
                value={profileData.bio}
                onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                className="bg-white/20 text-white placeholder-white/50 border-white/30 min-h-[100px]"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Relationship Status</label>
              <select
                value={profileData.relationshipStatus}
                onChange={(e) => setProfileData(prev => ({ ...prev, relationshipStatus: e.target.value }))}
                className="w-full bg-white/20 text-white border-white/30 rounded-lg px-3 py-2 [&>option]:text-gray-900"
              >
                <option value="">Prefer not to say</option>
                <option value="single">Single / Unmarried</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="separated">Separated</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Looking For</label>
              <select
                value={profileData.lookingFor}
                onChange={(e) => setProfileData(prev => ({ ...prev, lookingFor: e.target.value }))}
                className="w-full bg-white/20 text-white border-white/30 rounded-lg px-3 py-2 [&>option]:text-gray-900"
              >
                <option value="">Prefer not to say</option>
                <option value="friendship">Friendship</option>
                <option value="serious">True Love / Serious Relationship</option>
                <option value="casual">Casual Dating</option>
                <option value="flirting">Flirting</option>
                <option value="not_sure">Not Sure Yet</option>
              </select>
            </div>

            <Button
              onClick={handleSaveProfile}
              className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold hover:scale-105 transition-all duration-300"
              type="button"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={`${getFirstName()}'s Profile`}
      showBack={true}
      onBack={() => onNavigate('discovery')}
      showClose={false}
      showFooter={true}
      activeTab="profile"
      onNavigate={onNavigate}
    >
      <div className="px-4 py-6">
        {/* Back to Discovery Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Back button clicked - navigating to discovery');
            onNavigate('discovery');
          }}
          className="mb-4 flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-3 rounded-xl cursor-pointer touch-manipulation active:scale-95 transition-all"
          type="button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Discovery</span>
        </button>

        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <img
              src={
                profile?.photo_url ||
                userPhotos.find(p => p.isPrimary)?.url ||
                'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400'
              }
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-white/30"
            />
            <button
              onClick={async () => {
                if (!user) {
                  const errorMessage = document.createElement('div');
                  errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                  errorMessage.textContent = '⚠️ Please sign in to upload photos';
                  document.body.appendChild(errorMessage);
                  setTimeout(() => {
                    if (document.body.contains(errorMessage)) {
                      document.body.removeChild(errorMessage);
                    }
                  }, 3000);
                  return;
                }

                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;

                  setUploadingPhoto(true);

                  try {
                    const publicUrl = await uploadProfilePhoto(user.id, file);

                    // CRITICAL: Update user_profiles.photo_url first for immediate visibility
                    const { error: profileError } = await supabaseClient
                      .from('user_profiles')
                      .update({ photo_url: publicUrl })
                      .eq('user_id', user.id);

                    if (profileError) {
                      console.error('Failed to update profile photo:', profileError);
                      throw profileError;
                    }

                    // Then update or insert into user_photos
                    const { data: existingPrimary, error: checkError } = await supabaseClient
                      .from('user_photos')
                      .select('id')
                      .eq('user_id', user.id)
                      .eq('is_primary', true)
                      .maybeSingle();

                    if (checkError) throw checkError;

                    if (existingPrimary) {
                      // Update existing primary photo
                      const { error: updateError } = await supabaseClient
                        .from('user_photos')
                        .update({ photo_url: publicUrl })
                        .eq('id', existingPrimary.id);

                      if (updateError) throw updateError;
                    } else {
                      // Insert new primary photo
                      const { error: insertError } = await supabaseClient
                        .from('user_photos')
                        .insert({
                          user_id: user.id,
                          photo_url: publicUrl,
                          is_primary: true,
                          display_order: 1
                        });

                      if (insertError) throw insertError;
                    }

                    await loadUserPhotos();
                    await loadUserProfile();

                    const successMessage = document.createElement('div');
                    successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                    successMessage.textContent = '✅ Profile photo updated!';
                    document.body.appendChild(successMessage);
                    setTimeout(() => {
                      if (document.body.contains(successMessage)) {
                        document.body.removeChild(successMessage);
                      }
                    }, 3000);

                    setUploadingPhoto(false);
                  } catch (error: any) {
                    console.error('Upload error:', error);
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                    errorMessage.textContent = '❌ Failed to upload photo';
                    document.body.appendChild(errorMessage);
                    setTimeout(() => {
                      if (document.body.contains(errorMessage)) {
                        document.body.removeChild(errorMessage);
                      }
                    }, 3000);
                    setUploadingPhoto(false);
                  }
                };
                input.click();
              }}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
              type="button"
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
          <h2 className="text-2xl font-bold text-white mt-4">{profileData.name}</h2>
          <p className="text-white/80">{profileData.age} years old</p>
        </div>

        {/* Profile Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{userStats.profileViews}</p>
            <p className="text-white/70 text-xs">Views</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{userStats.likes}</p>
            <p className="text-white/70 text-xs">Likes</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{userStats.matches}</p>
            <p className="text-white/70 text-xs">Matches</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl">{userStats.verified ? '✅' : '❌'}</div>
            <p className="text-white/70 text-xs">Verified</p>
          </div>
        </div>

        {/* Photo Gallery */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg">My Photos</h3>
            <Button
              onClick={handlePhotoUpload}
              disabled={uploadingPhoto}
              className="bg-green-500 text-white px-4 py-2"
              type="button"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadingPhoto ? 'Uploading...' : 'Add Photos'}
            </Button>
          </div>

          {userPhotos.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="w-12 h-12 text-white/50 mx-auto mb-3" />
              <p className="text-white/70 mb-4">No photos yet. Add some to complete your profile!</p>
              <Button
                onClick={handlePhotoUpload}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 px-6 text-base"
                type="button"
              >
                📷 Upload Photos from Gallery
              </Button>
              <p className="text-white/60 text-xs mt-3">✨ Select multiple photos at once!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {pendingDelete && (() => {
                const target = userPhotos.find(p => p.id === pendingDelete);
                return (
                  <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-photo-title"
                  >
                    <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden">
                      {target && (
                        <img
                          src={target.url}
                          alt=""
                          className="w-full h-40 object-cover"
                        />
                      )}
                      <div className="p-5">
                        <h3 id="delete-photo-title" className="text-base font-bold text-gray-900">
                          Delete this photo?
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {target?.isPrimary
                            ? 'This is your main photo. Deleting it means your profile will have no main photo until you choose another.'
                            : 'This cannot be undone.'}
                        </p>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => setPendingDelete(null)}
                            type="button"
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors touch-manipulation"
                          >
                            Keep
                          </button>
                          <button
                            onClick={() => {
                              const id = pendingDelete;
                              setPendingDelete(null);
                              handleDeletePhoto(id);
                            }}
                            type="button"
                            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors touch-manipulation active:scale-95"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {userPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.url}
                    alt="Profile"
                    className={`w-full h-24 object-cover rounded-lg ${
                      photo.isPrimary ? 'ring-2 ring-green-400' : ''
                    }`}
                  />
                  {photo.isPrimary && (
                    <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                      Main
                    </div>
                  )}

                  {/* Delete: was opacity-0 until hover, which meant it was
                      unreachable on touch devices - most of the audience.
                      Always visible now, just dimmed until hover on desktop. */}
                  {/* Staged, not immediate. The button is always visible so
                      it works on touch, which also makes it easy to hit by
                      accident - deleting a photo outright on one tap is not
                      a fair trade for that. */}
                  <button
                    onClick={() => setPendingDelete(photo.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                    type="button"
                    aria-label="Delete photo"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Set as main. Hidden on the photo that already is. */}
                  {!photo.isPrimary && (
                    <button
                      onClick={() => handleSetPrimaryPhoto(photo.id)}
                      disabled={settingPrimary !== null}
                      className="absolute inset-x-1 bottom-1 bg-black/70 hover:bg-black/85 text-white text-[11px] font-medium py-1 rounded transition-colors disabled:opacity-50"
                      type="button"
                      aria-label="Set as main profile photo"
                    >
                      {settingPrimary === photo.id ? 'Setting...' : 'Set as main'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <Button
            onClick={handlePhotoUpload}
            className="w-full mt-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold"
            type="button"
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? '⏳ Uploading...' : '📷 Add More Photos from Gallery'}
          </Button>
          <p className="text-white/60 text-xs mt-2 text-center">💡 Select multiple photos at once! Add up to 6 photos.</p>
        </div>

        {/* Profile Info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg">Profile Info</h3>
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-blue-500 text-white px-4 py-2"
              type="button"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center text-white">
              <MapPin className="w-5 h-5 mr-3 text-white/70" />
              <span>{profileData.location}</span>
            </div>
            <div className="flex items-center text-white">
              <Briefcase className="w-5 h-5 mr-3 text-white/70" />
              <span>{profileData.occupation}</span>
            </div>
            <div className="flex items-center text-white">
              <GraduationCap className="w-5 h-5 mr-3 text-white/70" />
              <span>{profileData.education}</span>
            </div>
            {profileData.relationshipStatus && (
              <div className="flex items-center text-white">
                <Users className="w-5 h-5 mr-3 text-white/70" />
                <span>{RELATIONSHIP_STATUS_LABELS[profileData.relationshipStatus] || profileData.relationshipStatus}</span>
              </div>
            )}
            {profileData.lookingFor && (
              <div className="flex items-center text-white">
                <Heart className="w-5 h-5 mr-3 text-white/70" />
                <span>Looking for: {LOOKING_FOR_LABELS[profileData.lookingFor] || profileData.lookingFor}</span>
              </div>
            )}
          </div>

          <div className="mt-4">
            <h4 className="text-white font-medium mb-2">About Me</h4>
            <p className="text-white/80 text-sm">{profileData.bio}</p>
          </div>

          <div className="mt-4">
            <h4 className="text-white font-medium mb-2">Interests</h4>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(profileData.interests) ? profileData.interests : []).map((interest, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-white/20 text-white text-sm rounded-full"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Button
            onClick={() => onNavigate('verification')}
            className="bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold hover:scale-105 transition-all duration-300"
            type="button"
          >
            <Shield className="w-4 h-4 mr-2" />
            Get Verified
          </Button>
          <Button
            onClick={() => onNavigate('settings')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:scale-105 transition-all duration-300"
            type="button"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Footer Section - Outside main content padding */}
      <div className="px-4 pb-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          {/* About & Support */}
          <div className="mb-6">
            <h3 className="text-white font-semibold text-base mb-4 text-center">Information & Support</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('help')}
                className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white py-3 px-4 rounded-xl transition-all duration-200 text-sm font-medium border border-white/20"
                type="button"
              >
                About Us
              </button>
              <button
                onClick={() => onNavigate('blog')}
                className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white py-3 px-4 rounded-xl transition-all duration-200 text-sm font-medium border border-white/20"
                type="button"
              >
                Blog
              </button>
              <button
                onClick={() => onNavigate('help')}
                className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white py-3 px-4 rounded-xl transition-all duration-200 text-sm font-medium border border-white/20"
                type="button"
              >
                Contact
              </button>
              <button
                onClick={() => onNavigate('feedback')}
                className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white py-3 px-4 rounded-xl transition-all duration-200 text-sm font-medium border border-white/20"
                type="button"
              >
                Feedback
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-6"></div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white/80 font-medium text-sm mb-4 text-center">Legal & Policies</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('privacy')}
                className="text-white/70 hover:text-white hover:bg-white/10 py-2.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 border border-white/10"
                type="button"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => onNavigate('terms')}
                className="text-white/70 hover:text-white hover:bg-white/10 py-2.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 border border-white/10"
                type="button"
              >
                Terms of Service
              </button>
              <button
                onClick={() => onNavigate('disclaimer')}
                className="text-white/70 hover:text-white hover:bg-white/10 py-2.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 border border-white/10"
                type="button"
              >
                Disclaimer
              </button>
              <button
                onClick={() => onNavigate('consent')}
                className="text-white/70 hover:text-white hover:bg-white/10 py-2.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 border border-white/10"
                type="button"
              >
                Consent Policy
              </button>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center mt-6 pt-4 border-t border-white/10">
            <p className="text-white/50 text-xs font-medium">
              © 2025 Dates. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};
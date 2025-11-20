import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { User, Camera, MapPin, Briefcase, GraduationCap, Heart, Settings, Edit, Shield, Star } from 'lucide-react';
import { creditManager } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';

interface ProfileProps {
  onNavigate: (screen: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { user, getFirstName, getFullName } = useAuth();
  const [profileData, setProfileData] = useState({
    name: getFullName(),
    age: '25',
    location: 'New York, NY',
    occupation: 'Professional',
    education: 'University',
    bio: 'Hello! I\'m excited to meet new people and see where things go.',
    interests: ['Travel', 'Music', 'Food', 'Movies']
  });

  const userStats = {
    profileViews: 124,
    likes: 23,
    matches: 8,
    verified: false
  };

  const handleSaveProfile = () => {
    setIsEditing(false);
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    successMessage.textContent = '✅ Profile updated successfully!';
    document.body.appendChild(successMessage);
    setTimeout(() => document.body.removeChild(successMessage), 3000);
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
      title="My Profile"
      onBack={() => onNavigate('discovery')}
      showClose={false}
      showFooter={true}
      activeTab="profile"
      onNavigate={onNavigate}
    >
      <div className="px-4 py-6">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <img
              src="https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400"
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-white/30"
            />
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = () => {
                  alert('📷 Profile photo updated!');
                };
                input.click();
              }}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center"
              type="button"
            >
              <Camera className="w-4 h-4 text-white" />
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
          </div>

          <div className="mt-4">
            <h4 className="text-white font-medium mb-2">About Me</h4>
            <p className="text-white/80 text-sm">{profileData.bio}</p>
          </div>

          <div className="mt-4">
            <h4 className="text-white font-medium mb-2">Interests</h4>
            <div className="flex flex-wrap gap-2">
              {profileData.interests.map((interest, index) => (
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
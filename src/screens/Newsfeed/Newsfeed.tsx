import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Heart, MessageCircle, Share, MoreVertical, Camera, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NewsfeedProps {
  onNavigate: (screen: string) => void;
}

export const Newsfeed: React.FC<NewsfeedProps> = ({ onNavigate }) => {
  const [posts, setPosts] = useState([
    {
      id: '1',
      user: {
        name: 'Emma',
        image: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400',
        verified: true
      },
      content: 'Just had the most amazing coffee date! ☕ Sometimes the best connections happen over simple conversations.',
      image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=600',
      timestamp: '2 hours ago',
      likes: 24,
      comments: 8,
      shares: 3,
      liked: false
    },
    {
      id: '2',
      user: {
        name: 'Alex',
        image: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400',
        verified: false
      },
      content: 'Sunset hiking with someone special 🌅 Nature dates are the best way to connect!',
      image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=600',
      timestamp: '5 hours ago',
      likes: 42,
      comments: 12,
      shares: 7,
      liked: true
    },
    {
      id: '3',
      user: {
        name: 'Sarah',
        image: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=400',
        verified: true
      },
      content: 'Cooking together is such a fun date idea! 👨‍🍳👩‍🍳 What\'s your favorite date activity?',
      image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600',
      timestamp: '1 day ago',
      likes: 67,
      comments: 23,
      shares: 15,
      liked: false
    }
  ]);

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
  };

  const trendingTopics = [
    { tag: '#CoffeeDate', posts: 234 },
    { tag: '#SunsetVibes', posts: 189 },
    { tag: '#CookingTogether', posts: 156 },
    { tag: '#WeekendPlans', posts: 98 }
  ];

  return (
    <Layout
      title="Newsfeed"
      onBack={() => onNavigate('discovery')}
      showClose={false}
      showFooter={true}
      activeTab="newsfeed"
      onNavigate={onNavigate}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <img 
            src="https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=800" 
            alt="Community Newsfeed" 
            className="w-full h-32 object-cover rounded-2xl shadow-lg mb-4"
          />
          <h2 className="text-2xl font-bold text-white mb-2">Community Stories</h2>
          <p className="text-white/80">See what couples in your area are up to</p>
        </div>

        {/* Create Post */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-3">
            <img
              src="https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400"
              alt="You"
              className="w-10 h-10 rounded-full object-cover"
            />
            <input
              type="text"
              placeholder="Share your dating story..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm"
            />
          </div>
          <div className="flex justify-between items-center">
            <Button
              className="bg-pink-500 text-white text-sm px-4 py-2 cursor-pointer touch-manipulation active:scale-95"
              onClick={() => {
                const successMessage = document.createElement('div');
                successMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                successMessage.textContent = 'Story shared successfully!';
                document.body.appendChild(successMessage);
                setTimeout(() => document.body.removeChild(successMessage), 3000);
              }}
              type="button"
            >
              <Camera className="w-4 h-4 mr-2" />
              Add Photo (10 Credits)
            </Button>
            <Button 
              className="bg-blue-500 text-white text-sm px-4 py-2 cursor-pointer touch-manipulation active:scale-95"
              onClick={() => {
                const successMessage = document.createElement('div');
                successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                successMessage.textContent = 'Story shared successfully!';
                document.body.appendChild(successMessage);
                setTimeout(() => document.body.removeChild(successMessage), 3000);
              }}
              type="button"
            >
              Share Story
            </Button>
          </div>
        </div>

        {/* Trending Topics */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <h3 className="text-white font-semibold text-lg mb-3 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Trending Topics
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {trendingTopics.map((topic, index) => (
              <div key={index} className="bg-white/10 rounded-lg p-2">
                <p className="text-white font-medium text-sm">{topic.tag}</p>
                <p className="text-white/70 text-xs">{topic.posts} posts</p>
              </div>
            ))}
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Post Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={post.user.image}
                    alt={post.user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="flex items-center space-x-1">
                      <h4 className="font-medium text-gray-800">{post.user.name}</h4>
                      {post.user.verified && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm">{post.timestamp}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-3">
                <p className="text-gray-800 leading-relaxed">{post.content}</p>
              </div>

              {/* Post Image */}
              {post.image && (
                <img
                  src={post.image}
                  alt="Post content"
                  className="w-full h-64 object-cover"
                />
              )}

              {/* Post Actions */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{post.likes} likes</span>
                    <span>{post.comments} comments</span>
                    <span>{post.shares} shares</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-around">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      post.liked ? 'text-pink-500 bg-pink-50' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
                    <span className="text-sm font-medium">Like</span>
                  </button>
                  
                  <button className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Comment</span>
                  </button>
                  
                  <button className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                    <Share className="w-5 h-5" />
                    <span className="text-sm font-medium">Share</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-8">
          <Button
            onClick={() => {
              const successMessage = document.createElement('div');
              successMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
              successMessage.textContent = 'Loading more stories...';
              document.body.appendChild(successMessage);
              setTimeout(() => document.body.removeChild(successMessage), 2000);
            }}
            type="button"
            className="bg-pink-500 text-white px-8 py-3 rounded-xl cursor-pointer touch-manipulation active:scale-95"
          >
            Load More Stories
          </Button>
        </div>
      </div>
    </Layout>
  );
};
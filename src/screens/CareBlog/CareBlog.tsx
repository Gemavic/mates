import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  BookOpen, 
  Heart, 
  PlusCircle, 
  Calendar, 
  User, 
  Clock, 
  MessageCircle, 
  ThumbsUp, 
  Share,
  Search,
  Filter,
  TrendingUp,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  PiggyBank,
  Calculator,
  TrendingDown
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  authorImage: string;
  category: 'dating-tips' | 'success-stories' | 'relationship-advice' | 'self-improvement' | 'community' | 'education';
  publishedAt: Date;
  readTime: number;
  likes: number;
  comments: number;
  views: number;
  featured?: boolean;
  image: string;
}

interface CareBlogProps {
  onNavigate: (screen: string) => void;
}

export const CareBlog: React.FC<CareBlogProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'read' | 'write'>('read');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newPost, setNewPost] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'dating-tips' as BlogPost['category']
  });

  const blogPosts: BlogPost[] = [
    {
      id: '5',
      title: 'Financial Planning for Couples: Building Your Future Together',
      excerpt: 'Learn how to manage finances as a couple and build a secure financial foundation for your relationship.',
      content: 'Money conversations can be challenging for couples, but they\'re essential for a healthy relationship...',
      author: 'Sarah Johnson, CFP',
      authorImage: 'https://images.pexels.com/photos/1130623/pexels-photo-1130623.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: 'education',
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      readTime: 8,
      likes: 189,
      comments: 34,
      views: 1256,
      featured: true,
      image: 'https://images.pexels.com/photos/3831645/pexels-photo-3831645.jpeg?auto=compress&cs=tinysrgb&w=600'
    },
    {
      id: '6',
      title: 'Smart Budgeting: Dating Without Breaking the Bank',
      excerpt: 'Discover creative and affordable date ideas that don\'t compromise on fun or romance.',
      content: 'Dating doesn\'t have to be expensive to be meaningful. Here are budget-friendly ways to connect...',
      author: 'Michael Chen, Financial Advisor',
      authorImage: 'https://images.pexels.com/photos/4173239/pexels-photo-4173239.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: 'education',
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      readTime: 6,
      likes: 245,
      comments: 52,
      views: 1893,
      image: 'https://images.pexels.com/photos/3831849/pexels-photo-3831849.jpeg?auto=compress&cs=tinysrgb&w=600'
    },
    {
      id: '7',
      title: 'Investing in Your Future: Financial Goals for Singles',
      excerpt: 'Build financial independence and security while dating. Learn investment basics for young adults.',
      content: 'Being financially independent makes you more attractive and confident in relationships...',
      author: 'Dr. Lisa Wong, Economist',
      authorImage: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: 'education',
      publishedAt: new Date(Date.now() - 16 * 60 * 60 * 1000),
      readTime: 10,
      likes: 156,
      comments: 28,
      views: 967,
      image: 'https://images.pexels.com/photos/6802042/pexels-photo-6802042.jpeg?auto=compress&cs=tinysrgb&w=600'
    },
    {
      id: '8',
      title: 'Emergency Fund Basics: Financial Security for Peace of Mind',
      excerpt: 'Why every adult should have an emergency fund and how to build one step by step.',
      content: 'Financial stress can strain relationships. Here\'s how to build financial security...',
      author: 'Jennifer Davis, CPA',
      authorImage: 'https://images.pexels.com/photos/3763789/pexels-photo-3763789.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: 'education',
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      readTime: 7,
      likes: 198,
      comments: 41,
      views: 1334,
      image: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=600'
    },
    {
      id: '9',
      title: 'Credit Score and Dating: Why Financial Health Matters',
      excerpt: 'Understanding how your credit score affects your dating life and future relationship goals.',
      content: 'A good credit score opens doors to better loan rates, housing options, and financial opportunities...',
      author: 'Robert Kim, Credit Specialist',
      authorImage: 'https://images.pexels.com/photos/4173239/pexels-photo-4173239.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: 'education',
      publishedAt: new Date(Date.now() - 32 * 60 * 60 * 1000),
      readTime: 5,
      likes: 134,
      comments: 19,
      views: 789,
      image: 'https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg?auto=compress&cs=tinysrgb&w=600'
    },
    {
      id: '1',
      title: '7 Tips for Creating an Irresistible Dating Profile',
      excerpt: 'Make your profile stand out with these proven strategies that attract quality matches.',
      content: 'Your dating profile is your digital first impression. Here are the secrets to making it unforgettable...',
      author: 'Dr. Emily Chen',
      authorImage: 'https://images.pexels.com/photos/1130623/pexels-photo-1130623.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: 'dating-tips',
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      readTime: 5,
      likes: 234,
      comments: 45,
      views: 1847,
      featured: true,
      image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600'
    },
    {
      id: '2',
      title: 'How Sarah and Mike Found Love on Dates',
      excerpt: 'A heartwarming success story of two people who found their perfect match through our platform.',
      content: 'Sarah was almost ready to give up on online dating when she matched with Mike...',
      author: 'Dates Editorial',
      authorImage: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: 'success-stories',
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      readTime: 3,
      likes: 156,
      comments: 78,
      views: 892,
      image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=600'
    },
    {
      id: '3',
      title: 'Building Confidence for Your First Date',
      excerpt: 'Overcome first date nerves with these practical tips from relationship experts.',
      content: 'First date jitters are completely normal. Here\'s how to turn those nerves into excitement...',
      author: 'Dr. Marcus Rodriguez',
      authorImage: 'https://images.pexels.com/photos/4173239/pexels-photo-4173239.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: 'relationship-advice',
      publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      readTime: 4,
      likes: 89,
      comments: 23,
      views: 567,
      image: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=600'
    },
    {
      id: '4',
      title: 'Self-Love: The Foundation of Healthy Relationships',
      excerpt: 'Discover why loving yourself is the key to finding lasting love with someone else.',
      content: 'Before you can truly love someone else, you must first learn to love yourself...',
      author: 'Jessica Williams',
      authorImage: 'https://images.pexels.com/photos/3763789/pexels-photo-3763789.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: 'self-improvement',
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      readTime: 6,
      likes: 312,
      comments: 67,
      views: 1203,
      image: 'https://images.pexels.com/photos/5699456/pexels-photo-5699456.jpeg?auto=compress&cs=tinysrgb&w=600'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Posts', icon: BookOpen, color: 'from-purple-500 to-pink-500' },
    { id: 'education', name: 'Education', icon: DollarSign, color: 'from-green-500 to-emerald-500' },
    { id: 'dating-tips', name: 'Dating Tips', icon: Heart, color: 'from-pink-500 to-rose-500' },
    { id: 'success-stories', name: 'Success Stories', icon: User, color: 'from-green-500 to-teal-500' },
    { id: 'relationship-advice', name: 'Advice', icon: MessageCircle, color: 'from-blue-500 to-cyan-500' },
    { id: 'self-improvement', name: 'Self-Improvement', icon: TrendingUp, color: 'from-yellow-400 to-orange-500' },
    { id: 'community', name: 'Community', icon: User, color: 'from-indigo-500 to-purple-500' }
  ];

  const filteredPosts = selectedCategory === 'all' 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);

  const searchedPosts = filteredPosts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePublishPost = () => {
    if (!newPost.title || !newPost.content || !newPost.excerpt) {
      alert('Please fill in all fields');
      return;
    }

    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    successMessage.textContent = '✅ Blog post published successfully!';
    document.body.appendChild(successMessage);
    setTimeout(() => {
      if (document.body.contains(successMessage)) {
        document.body.removeChild(successMessage);
      }
    }, 5000);

    // Reset form
    setNewPost({ title: '', excerpt: '', content: '', category: 'dating-tips' });
  };

  const renderReadView = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/90"
          />
        </div>
        <Button className="bg-white/20 text-white hover:bg-white/30">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto pb-2 space-x-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 cursor-pointer touch-manipulation active:scale-95 ${
                selectedCategory === category.id
                  ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              type="button"
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          );
        })}
      </div>

      {/* Featured Post */}
      {searchedPosts.find(post => post.featured) && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="relative">
            <img
              src={searchedPosts.find(post => post.featured)?.image}
              alt="Featured post"
              className="w-full h-48 object-cover"
            />
            <div className="absolute top-4 left-4">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                ⭐ FEATURED
              </span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h3 className="text-xl font-bold mb-2">{searchedPosts.find(post => post.featured)?.title}</h3>
              <p className="text-white/90 text-sm">{searchedPosts.find(post => post.featured)?.excerpt}</p>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={searchedPosts.find(post => post.featured)?.authorImage}
                  alt="Author"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <p className="text-white font-medium text-sm">{searchedPosts.find(post => post.featured)?.author}</p>
              <span>Start with a compelling headline that addresses real concerns (dating, relationships, or finances)</span>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-white/70 text-sm">
                <div className="flex items-center space-x-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{searchedPosts.find(post => post.featured)?.likes}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="w-4 h-4" />
            <div className="flex items-start space-x-2">
              <span className="text-pink-400 mt-0.5">•</span>
              <span>For financial topics, include practical steps and real examples</span>
            </div>
                  <span>{searchedPosts.find(post => post.featured)?.comments}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular Posts */}
      <div className="space-y-4">
        {searchedPosts.filter(post => !post.featured).map((post) => (
          <div
            key={post.id}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/20 transition-all duration-300 hover:scale-105"
          >
            <div className="flex space-x-4">
              <img
                src={post.image}
                alt={post.title}
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-white font-semibold text-sm line-clamp-2">{post.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${
                    categories.find(c => c.id === post.category)?.color || 'from-gray-500 to-gray-600'
                  } text-white flex-shrink-0 ml-2`}>
                    {categories.find(c => c.id === post.category)?.name}
                  </span>
                </div>
                <p className="text-white/80 text-xs mb-3 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <img
                      src={post.authorImage}
                      alt={post.author}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-white/70 text-xs">{post.author}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-white/70 text-xs">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{post.readTime}m</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>{post.views}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{post.likes}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="text-center">
        <Button
          onClick={() => {
            const successMessage = document.createElement('div');
            successMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            successMessage.textContent = 'Loading more articles...';
            document.body.appendChild(successMessage);
            setTimeout(() => {
              if (document.body.contains(successMessage)) {
                document.body.removeChild(successMessage);
              }
            }, 2000);
          }}
          type="button"
          className="bg-white/20 text-white hover:bg-white/30 px-8 py-3 rounded-xl cursor-pointer touch-manipulation active:scale-95"
        >
          Load More Articles
        </Button>
      </div>
    </div>
  );

  const renderWriteView = () => (
    <div className="space-y-6">
      <h3 className="text-white font-semibold text-lg">Create New Article</h3>
      
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-white font-medium mb-2">Article Title</label>
          <Input
            value={newPost.title}
            onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter an engaging title..."
            className="bg-white/20 text-white placeholder-white/50 border-white/30"
          />
        </div>

        <div>
          <label className="block text-white font-medium mb-2">Category</label>
          <select 
            value={newPost.category}
            onChange={(e) => setNewPost(prev => ({ ...prev, category: e.target.value as BlogPost['category'] }))}
            className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2"
          >
            <option value="dating-tips" className="text-gray-900">Dating Tips</option>
            <option value="education" className="text-gray-900">Education</option>
            <option value="success-stories" className="text-gray-900">Success Stories</option>
            <option value="relationship-advice" className="text-gray-900">Relationship Advice</option>
            <option value="self-improvement" className="text-gray-900">Self-Improvement</option>
            <option value="community" className="text-gray-900">Community</option>
          </select>
        </div>

        <div>
          <label className="block text-white font-medium mb-2">Excerpt</label>
          <Textarea
            value={newPost.excerpt}
            onChange={(e) => setNewPost(prev => ({ ...prev, excerpt: e.target.value }))}
            placeholder="Brief summary that will appear in the article list..."
            className="bg-white/20 text-white placeholder-white/50 border-white/30 min-h-[80px]"
          />
        </div>

        <div>
          <label className="block text-white font-medium mb-2">Article Content</label>
          <Textarea
            value={newPost.content}
            onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Write your article content here..."
            className="bg-white/20 text-white placeholder-white/50 border-white/30 min-h-[200px]"
          />
        </div>

        <Button
          onClick={handlePublishPost}
          disabled={!newPost.title || !newPost.content || !newPost.excerpt}
          className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50"
          type="button"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Publish Article
        </Button>
      </div>

      {/* Writing Tips */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
        <h4 className="text-white font-semibold text-lg mb-3">Writing Tips</h4>
        <div className="space-y-2 text-white/80 text-sm">
          <div className="flex items-start space-x-2">
            <span className="text-pink-400 mt-0.5">•</span>
            <span>Start with a compelling headline that addresses a real dating concern</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-pink-400 mt-0.5">•</span>
            <span>Include personal stories or examples to make it relatable</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-pink-400 mt-0.5">•</span>
            <span>Provide actionable advice that readers can implement immediately</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-pink-400 mt-0.5">•</span>
            <span>End with encouragement and a positive call-to-action</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout
      title="Care Blog"
      onBack={() => onNavigate('discovery')}
      showClose={false}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Care Blog</h2>
          <p className="text-white/80">Daily inspiration and dating wisdom</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{blogPosts.length}</p>
            <p className="text-white/70 text-xs">Articles</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">
              {blogPosts.reduce((sum, post) => sum + post.likes, 0)}
            </p>
            <p className="text-white/70 text-xs">Total Likes</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">
              {Math.round(blogPosts.reduce((sum, post) => sum + post.readTime, 0) / blogPosts.length)}
            </p>
            <p className="text-white/70 text-xs">Avg Read Time</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-1 mb-6">
          <button
            onClick={() => setActiveTab('read')}
            className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all duration-300 ${
              activeTab === 'read' 
                ? 'bg-white text-gray-900 shadow-lg' 
                : 'text-white hover:bg-white/10'
            }`}
            type="button"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            <span className="font-medium">Read</span>
          </button>
          <button
            onClick={() => setActiveTab('write')}
            className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all duration-300 ${
              activeTab === 'write' 
                ? 'bg-white text-gray-900 shadow-lg' 
                : 'text-white hover:bg-white/10'
            }`}
            type="button"
          >
            <Edit className="w-4 h-4 mr-2" />
            <span className="font-medium">Write</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'read' && renderReadView()}
        {activeTab === 'write' && renderWriteView()}

        {/* Daily Quote */}
        <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-center text-white">
          <h3 className="font-bold text-lg mb-3">💭 Daily Inspiration</h3>
          <p className="text-white/90 text-lg italic mb-2">
            "Financial independence is the ability to live the life you want without being dependent on anyone else for money."
          </p>
          <p className="text-white/70 text-sm">- Tony Robbins</p>
        </div>
        
        {/* Education Resources */}
        <div className="mt-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
          <h3 className="font-bold text-lg mb-3 flex items-center">
            <BookOpen className="w-6 h-6 mr-2" />
            Education Corner
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <Heart className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Communication</p>
              <p className="text-xs opacity-80">Build stronger bonds</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Conflict Resolution</p>
              <p className="text-xs opacity-80">Navigate disagreements</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Personal Growth</p>
              <p className="text-xs opacity-80">Grow together</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Relationship Tips</p>
              <p className="text-xs opacity-80">Keep love alive</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  Star, 
  Send, 
  TrendingUp, 
  Lightbulb,
  Bug,
  Palette,
  Zap,
  BarChart3,
  Briefcase,
  CheckCircle,
  Clock,
  ThumbsUp,
  Search
} from 'lucide-react';
import { 
  feedbackManager, 
  submitFeedback, 
  getFeedbackCategories, 
  getUserFeedbackHistory,
  getFeedbackStats,
  getTrendingFeedback
} from '@/lib/feedbackSystem';
import { useAuth } from '@/hooks/useAuth';

interface FeedbackProps {
  onNavigate: (screen: string) => void;
}

export const Feedback: React.FC<FeedbackProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'submit' | 'history' | 'trending'>('submit');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, getFirstName, getFullName } = useAuth();
  const categories = getFeedbackCategories();
  const userFeedback = getUserFeedbackHistory(user?.id || 'demo-user');
  const stats = getFeedbackStats();
  const trending = getTrendingFeedback();

  const handleSubmit = async () => {
    if (!selectedCategory || !formData.title || !formData.description || rating === 0) {
      alert('Please fill in all required fields and provide a rating');
      return;
    }

    if (!user) {
      alert('Please sign in to submit feedback');
      return;
    }

    setIsSubmitting(true);

    try {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      const feedbackId = submitFeedback(
        user.id,
        user.email || 'user@example.com',
        getFullName(),
        selectedCategory as any,
        formData.title,
        formData.description,
        rating,
        tags
      );

      // Reset form
      setFormData({ title: '', description: '', tags: '' });
      setSelectedCategory('');
      setRating(0);

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = `✅ Feedback submitted successfully! ID: ${feedbackId}`;
      document.body.appendChild(successMessage);
      setTimeout(() => document.body.removeChild(successMessage), 5000);

    } catch (error) {
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'feature_request': return Lightbulb;
      case 'ui_improvement': return Palette;
      case 'performance': return Zap;
      case 'scaling': return BarChart3;
      case 'bug_report': return Bug;
      case 'business': return Briefcase;
      default: return MessageSquare;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Clock;
      case 'under_review': return Search;
      default: return Clock;
    }
  };

  const renderSubmitForm = () => (
    <div className="space-y-6">
      {/* Category Selection */}
      <div>
        <h3 className="text-white font-semibold text-lg mb-4">Select Category</h3>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.id);
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'border-white bg-white/20 text-white'
                    : 'border-white/30 bg-white/10 text-white/80 hover:bg-white/15'
                } cursor-pointer touch-manipulation active:scale-95`}
                type="button"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{category.icon}</div>
                  <h4 className="font-medium text-sm mb-1">{category.name}</h4>
                  <p className="text-xs opacity-80">{category.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rating */}
      <div>
        <h3 className="text-white font-semibold text-lg mb-4">Rate Your Experience</h3>
        <div className="flex justify-center space-x-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`text-3xl transition-all duration-300 hover:scale-110 ${
                star <= rating ? 'text-yellow-400' : 'text-white/30'
              }`}
            >
              ⭐
            </button>
          ))}
        </div>
        <p className="text-center text-white/80 text-sm mt-2">
          {rating === 0 ? 'Click to rate' : 
           rating <= 2 ? 'Needs improvement' :
           rating === 3 ? 'Good' :
           rating === 4 ? 'Very good' : 'Excellent!'}
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-white font-medium mb-2">Title *</label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Brief summary of your feedback"
            className="bg-white/20 text-white placeholder-white/50 border-white/30"
          />
        </div>

        <div>
          <label className="block text-white font-medium mb-2">Description *</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Detailed description of your feedback, suggestion, or issue"
            className="bg-white/20 text-white placeholder-white/50 border-white/30 min-h-[120px]"
          />
        </div>

        <div>
          <label className="block text-white font-medium mb-2">Tags (optional)</label>
          <Input
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            placeholder="mobile, chat, video, payment (comma separated)"
            className="bg-white/20 text-white placeholder-white/50 border-white/30"
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !selectedCategory || !formData.title || !formData.description || rating === 0}
        className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold hover:scale-105 transition-all duration-300 cursor-pointer touch-manipulation active:scale-95"
        type="button"
      >
        {isSubmitting ? (
          'Submitting...'
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Submit Feedback
          </>
        )}
      </Button>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-lg">Your Feedback History</h3>
      
      {userFeedback.length > 0 ? (
        <div className="space-y-3">
          {userFeedback.map((feedback) => {
            const StatusIcon = getStatusIcon(feedback.status);
            return (
              <div key={feedback.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-white font-medium">{feedback.title}</h4>
                    <p className="text-white/70 text-sm">{feedback.category.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <StatusIcon className="w-4 h-4 text-white/70" />
                    <span className="text-white/70 text-xs capitalize">{feedback.status.replace('_', ' ')}</span>
                  </div>
                </div>
                <p className="text-white/80 text-sm mb-2">{feedback.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-sm ${i < feedback.rating ? 'text-yellow-400' : 'text-white/30'}`}>
                          ⭐
                        </span>
                      ))}
                    </div>
                    <span className="text-white/60 text-xs">ID: {feedback.id}</span>
                  </div>
                  <span className="text-white/60 text-xs">
                    {feedback.submittedAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageSquare className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <p className="text-white/70">No feedback submitted yet</p>
        </div>
      )}
    </div>
  );

  const renderTrending = () => (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-lg">Trending Feedback</h3>
      
      {trending.length > 0 ? (
        <div className="space-y-3">
          {trending.map((feedback) => (
            <div key={feedback.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-white font-medium">{feedback.title}</h4>
                  <p className="text-white/70 text-sm">{feedback.category.replace('_', ' ')}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <ThumbsUp className="w-4 h-4 text-white/70" />
                  <span className="text-white/70 text-sm">{feedback.votes}</span>
                </div>
              </div>
              <p className="text-white/80 text-sm mb-2">{feedback.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-sm ${i < feedback.rating ? 'text-yellow-400' : 'text-white/30'}`}>
                      ⭐
                    </span>
                  ))}
                </div>
                <span className="text-white/60 text-xs">by {feedback.userName}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <TrendingUp className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <p className="text-white/70">No trending feedback yet</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600">
      <div className="max-w-md mx-auto min-h-screen relative">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-white/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => onNavigate('discovery')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">Feedback</h1>
            <div className="w-8"></div>
          </div>
        </div>

      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Help Us Improve</h2>
          <p className="text-white/80">Your feedback shapes the future of Dates.care</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{stats.totalSubmissions}</p>
            <p className="text-white/70 text-xs">Total Feedback</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{stats.averageRating.toFixed(1)}</p>
            <p className="text-white/70 text-xs">Avg Rating</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{Math.round(stats.implementationRate)}%</p>
            <p className="text-white/70 text-xs">Implemented</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-1 mb-6">
          {[
            { id: 'submit', label: 'Submit', icon: Send },
            { id: 'history', label: 'History', icon: Clock },
            { id: 'trending', label: 'Trending', icon: TrendingUp }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-white text-gray-900 shadow-lg' 
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          {activeTab === 'submit' && renderSubmitForm()}
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'trending' && renderTrending()}
        </div>

        {/* Contact Info */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="text-white font-semibold text-lg mb-3">Development Team Contact</h3>
          <div className="space-y-2 text-white/80 text-sm">
            <p><strong>Product Team:</strong> product@dates.care</p>
            <p><strong>Development:</strong> dev@dates.care</p>
            <p><strong>Design:</strong> design@dates.care</p>
            <p><strong>Business:</strong> business@dates.care</p>
            <p><strong>Phone:</strong> +1 (424) 488-7950</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
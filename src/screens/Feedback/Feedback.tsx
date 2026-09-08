import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, CheckCircle, Clock, Search } from 'lucide-react';
import { getFeedbackCategories } from '@/lib/feedbackSystem';
import { supabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';

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

  const { user, getFullName } = useAuth();
  const { theme } = useTheme();
  const categories = getFeedbackCategories();

  /**
   * Feedback used to live in a JavaScript Map inside feedbackSystem.ts. It
   * showed a success toast with an ID, then vanished on refresh, and the
   * "history" tab was always empty. It is a table now, and always was - the
   * screen just never wrote to it.
   */
  interface FeedbackRow {
    id: string; category: string; title: string; description: string;
    rating: number; status: string; created_at: string;
  }
  const [userFeedback, setUserFeedback] = useState<FeedbackRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    const { data } = await supabaseClient
      .from('feedback_submissions')
      .select('id, category, title, description, rating, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setUserFeedback((data ?? []) as FeedbackRow[]);
    setLoadingHistory(false);
  };
  useEffect(() => { void loadHistory(); }, [user?.id]);

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

      const { data: row, error } = await supabaseClient
        .from('feedback_submissions')
        .insert({
          user_id: user.id,
          user_email: user.email ?? null,
          user_name: getFullName(),
          category: selectedCategory,
          title: formData.title.trim().slice(0, 150),
          description: formData.description.trim().slice(0, 4000),
          rating,
          tags,
          status: 'submitted',
          source: 'app',
        })
        .select('id')
        .single();
      if (error || !row) throw error ?? new Error('insert_failed');
      const feedbackId = row.id.slice(0, 8).toUpperCase();
      void loadHistory();

      // Reset form
      setFormData({ title: '', description: '', tags: '' });
      setSelectedCategory('');
      setRating(0);

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = `Thank you. Your feedback is saved (ref ${feedbackId}).`;
      document.body.appendChild(successMessage);
      setTimeout(() => document.body.removeChild(successMessage), 5000);

    } catch (error) {
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
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
      
      {loadingHistory ? (
        <p className="text-white/70 text-center py-8">Loading…</p>
      ) : userFeedback.length > 0 ? (
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
                    <span className="text-white/60 text-xs">ref {feedback.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <span className="text-white/60 text-xs">
                    {new Date(feedback.created_at).toLocaleDateString()}
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

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme === 'dark' ? 'from-slate-900 via-purple-950 to-slate-900' : 'from-pink-500 via-rose-500 to-purple-600'}`}>
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

        {/* A row of stat tiles used to sit here: Total Feedback, Avg Rating,
            Implemented %. All three were computed from an in-memory Map and
            therefore always read 0 / 0.0 / 0%. */}
        {/* Tab Navigation */}
        <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-1 mb-6">
          {[
            { id: 'submit', label: 'Submit', icon: Send },
            { id: 'history', label: 'History', icon: Clock }
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

        </div>

        {/* Contact Info */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="text-white font-semibold text-lg mb-3">Contact us</h3>
          <div className="space-y-2 text-white/80 text-sm">
            {/* One address, one line. This listed four departments - product,
                development, design, business - each with its own address,
                none of which existed. */}
            <p><strong>Email:</strong> admin@dates.care</p>
            <p><strong>Phone:</strong> +1 (424) 488-7950</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
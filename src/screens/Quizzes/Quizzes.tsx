import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { InteractiveQuiz } from '@/components/InteractiveQuiz';
import { Sparkles, Heart, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url?: string;
  is_active: boolean;
}

interface QuizzesProps {
  onNavigate?: (screen: string) => void;
}

export const Quizzes: React.FC<QuizzesProps> = ({ onNavigate = () => {} }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('id, title, description, category, thumbnail_url, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQuizzes(data || []);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'love_language':
        return Heart;
      case 'personality':
        return Sparkles;
      case 'compatibility':
        return Users;
      default:
        return TrendingUp;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'love_language':
        return 'from-pink-500 to-rose-500';
      case 'personality':
        return 'from-purple-500 to-indigo-500';
      case 'compatibility':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-green-500 to-teal-500';
    }
  };

  if (selectedQuiz) {
    return (
      <Layout
        title="Take Quiz"
        onBack={() => setSelectedQuiz(null)}
        showClose={true}
        onClose={() => onNavigate('welcome')}
      >
        <div className="px-4 py-6 pb-24">
          <InteractiveQuiz
            quizId={selectedQuiz}
            onComplete={() => {
              // Quiz completed
            }}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Interactive Quizzes"
      onBack={() => onNavigate('welcome')}
      showClose={true}
      onClose={() => onNavigate('welcome')}
    >
      <div className="px-4 py-6 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Discover Yourself</h2>
          <p className="text-white/80">
            Take fun, interactive quizzes to learn more about your dating style and preferences
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/80">Loading quizzes...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => {
              const Icon = getCategoryIcon(quiz.category);
              const gradientColor = getCategoryColor(quiz.category);

              return (
                <button
                  key={quiz.id}
                  onClick={() => setSelectedQuiz(quiz.id)}
                  className="w-full bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left"
                >
                  <div className="flex items-start gap-4">
                    {quiz.thumbnail_url ? (
                      <img
                        src={quiz.thumbnail_url}
                        alt={quiz.title}
                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className={`w-20 h-20 bg-gradient-to-br ${gradientColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 truncate">
                          {quiz.title}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${gradientColor} text-white flex-shrink-0`}>
                          <Sparkles className="w-3 h-3" />
                          New
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {quiz.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Icon className="w-4 h-4" />
                          {quiz.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <span>• 3-5 minutes</span>
                        <span>• Instant results</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Features */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h3 className="text-white font-bold text-lg mb-4">Why Take Our Quizzes?</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Instant Results</h4>
                <p className="text-white/70 text-xs">Get your personalized results immediately after completing</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Shareable Graphics</h4>
                <p className="text-white/70 text-xs">Download beautiful result images to share on social media</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Science-Based</h4>
                <p className="text-white/70 text-xs">All quizzes designed by relationship experts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

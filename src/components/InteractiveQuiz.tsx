import React, { useState, useEffect } from 'react';
import { CircleCheck as CheckCircle, Share2, Download, ArrowRight, ArrowLeft, Sparkles, Heart, Trophy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  questions: QuizQuestion[];
  results: QuizResult[];
  thumbnail_url?: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

interface QuizOption {
  id: string;
  text: string;
  value: string;
}

interface QuizResult {
  type: string;
  title: string;
  description: string;
  tips: string[];
}

interface InteractiveQuizProps {
  quizId?: string;
  onComplete?: (result: any) => void;
}

export const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({
  quizId,
  onComplete
}) => {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareToken, setShareToken] = useState<string>('');
  const [showShareOptions, setShowShareOptions] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      const query = quizId
        ? supabase.from('quizzes').select('*').eq('id', quizId).eq('is_active', true)
        : supabase.from('quizzes').select('*').eq('is_active', true).limit(1);

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('No quiz found');

      setQuiz(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (quiz && currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      calculateResult();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const calculateResult = async () => {
    if (!quiz) return;

    const valueCounts: Record<string, number> = {};
    Object.values(answers).forEach(value => {
      valueCounts[value] = (valueCounts[value] || 0) + 1;
    });

    const dominantType = Object.entries(valueCounts).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )[0];

    const quizResult = quiz.results.find(r => r.type === dominantType) || quiz.results[0];
    setResult(quizResult);

    if (user) {
      try {
        const { data: resultData, error } = await supabase
          .from('quiz_results')
          .insert([{
            quiz_id: quiz.id,
            user_id: user.id,
            answers,
            result_data: quizResult,
            score: Object.keys(answers).length
          }])
          .select('share_token')
          .single();

        if (!error && resultData) {
          setShareToken(resultData.share_token);
        }
      } catch (error) {
        console.error('Error saving quiz result:', error);
      }
    }

    if (onComplete) {
      onComplete(quizResult);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setResult(null);
    setShowShareOptions(false);
  };

  const generateShareableImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');

    if (!ctx || !result) return;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#ec4899');
    gradient.addColorStop(0.5, '#f43f5e');
    gradient.addColorStop(1, '#9333ea');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(result.title, canvas.width / 2, 200);

    ctx.font = '36px Arial';
    const words = result.description.split(' ');
    let line = '';
    let y = 280;
    words.forEach((word) => {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > canvas.width - 200 && line.length > 0) {
        ctx.fillText(line, canvas.width / 2, y);
        line = word + ' ';
        y += 50;
      } else {
        line = testLine;
      }
    });
    ctx.fillText(line, canvas.width / 2, y);

    ctx.font = 'bold 32px Arial';
    ctx.fillText('Dates.care', canvas.width / 2, canvas.height - 100);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${quiz?.title.replace(/\s+/g, '-')}-result.png`;
        link.href = url;
        link.click();
      }
    });
  };

  const shareToSocial = (platform: string) => {
    if (!result || !quiz) return;

    const text = `I just took "${quiz.title}" and got: ${result.title}! 💕`;
    const url = shareToken
      ? `${window.location.origin}/quiz-result/${shareToken}`
      : window.location.href;

    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center p-12">
        <p className="text-gray-600">Quiz not found</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-10 h-10 text-yellow-300" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Your Result</h2>
          <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 py-1 text-sm">
            {quiz.title}
          </div>
        </div>

        <div className="bg-white/15 backdrop-blur-md rounded-xl p-6 mb-6">
          <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-300" fill="currentColor" />
            {result.title}
          </h3>
          <p className="text-white/90 text-base leading-relaxed mb-4">
            {result.description}
          </p>

          {result.tips && result.tips.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-white/80 mb-2">Tips for you:</h4>
              {result.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-300 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-white/80">{tip}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => setShowShareOptions(!showShareOptions)}
            className="w-full bg-white text-pink-600 hover:bg-white/90 font-semibold"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Your Result
          </Button>

          {showShareOptions && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => shareToSocial('twitter')}
                  className="bg-white/20 hover:bg-white/30 rounded-lg py-2 px-3 text-sm font-medium transition-colors"
                >
                  Twitter
                </button>
                <button
                  onClick={() => shareToSocial('facebook')}
                  className="bg-white/20 hover:bg-white/30 rounded-lg py-2 px-3 text-sm font-medium transition-colors"
                >
                  Facebook
                </button>
                <button
                  onClick={() => shareToSocial('linkedin')}
                  className="bg-white/20 hover:bg-white/30 rounded-lg py-2 px-3 text-sm font-medium transition-colors"
                >
                  LinkedIn
                </button>
              </div>
              <button
                onClick={generateShareableImage}
                className="w-full bg-white/20 hover:bg-white/30 rounded-lg py-2 px-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Result Image
              </button>
            </div>
          )}

          <Button
            onClick={handleRestart}
            variant="outline"
            className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Take Quiz Again
          </Button>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;
  const hasAnsweredCurrent = answers[question.id] !== undefined;

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-xl">{quiz.title}</h2>
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-medium">
            {currentQuestion + 1} / {quiz.questions.length}
          </div>
        </div>

        <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-pink-500" />
            <span className="text-sm font-medium text-gray-500">Question {currentQuestion + 1}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
            {question.question}
          </h3>
        </div>

        <div className="space-y-3 mb-8">
          {question.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleAnswer(question.id, option.value)}
              className={cn(
                "w-full p-4 rounded-xl border-2 transition-all duration-300 text-left",
                answers[question.id] === option.value
                  ? "border-pink-500 bg-pink-50 shadow-md"
                  : "border-gray-200 hover:border-pink-300 hover:bg-pink-50/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                  answers[question.id] === option.value
                    ? "border-pink-500 bg-pink-500"
                    : "border-gray-300"
                )}>
                  {answers[question.id] === option.value && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className={cn(
                  "font-medium",
                  answers[question.id] === option.value
                    ? "text-pink-700"
                    : "text-gray-700"
                )}>
                  {option.text}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          {currentQuestion > 0 && (
            <Button
              onClick={handlePrevious}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!hasAnsweredCurrent}
            className="flex-1"
          >
            {isLastQuestion ? (
              <>
                <Trophy className="w-4 h-4 mr-2" />
                See Results
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

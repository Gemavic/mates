import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Users, MessageCircle, Sparkles, Shield, Star, TrendingUp, CircleCheck as CheckCircle } from 'lucide-react';
import { NewsletterSignup } from '@/components/NewsletterSignup';

interface WelcomeProps {
  onNavigate?: (screen: string) => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onNavigate = () => {} }) => {

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-8 sm:top-10 left-4 sm:left-5 md:left-10 w-16 h-16 sm:w-20 sm:h-20 md:w-32 md:h-32 opacity-20 animate-bounce">
          <img
            src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=200"
            alt="Romantic couple"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
        <div className="absolute top-24 sm:top-32 right-6 sm:right-8 md:right-16 w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 opacity-30 animate-pulse">
          <img
            src="https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=200"
            alt="Happy couple"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
        <div className="absolute bottom-24 sm:bottom-32 left-6 sm:left-8 md:left-16 w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 opacity-25 animate-bounce delay-1000">
          <img
            src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=200"
            alt="Couple in love"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
        <div className="absolute bottom-12 sm:bottom-16 right-4 sm:right-5 md:right-10 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 opacity-20 animate-pulse delay-500">
          <img
            src="https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=200"
            alt="Romance"
            className="w-full h-full object-cover rounded-full"
          />
        </div>

        {/* Floating Hearts */}
        <div className="absolute top-16 sm:top-20 left-1/2 text-white/20 animate-bounce">
          <Heart className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8" fill="currentColor" />
        </div>
        <div className="absolute top-32 sm:top-40 left-1/4 text-white/15 animate-pulse delay-700">
          <Heart className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6" fill="currentColor" />
        </div>
        <div className="absolute bottom-32 sm:bottom-40 right-1/4 text-white/20 animate-bounce delay-300">
          <Heart className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" fill="currentColor" />
        </div>
      </div>

      <div className="w-full max-w-xs sm:max-w-md mx-auto flex-1 flex flex-col px-3 sm:px-4 md:px-0">
        {/* Hero Section */}
        <div className="text-center pt-8 sm:pt-12 md:pt-16 pb-4 sm:pb-6 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white/20 rounded-full mb-4 sm:mb-6 shadow-2xl">
            <Heart className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" fill="currentColor" />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-2 sm:mb-3 drop-shadow-2xl">
            Find Your
            <span className="block text-yellow-300">Perfect Match</span>
          </h1>
          <p className="text-white/90 text-base sm:text-lg md:text-xl drop-shadow-lg max-w-md mx-auto">
            Where genuine connections happen through AI-powered matching
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4">
              <p className="text-2xl sm:text-3xl font-bold text-white">2.3M+</p>
              <p className="text-white/80 text-xs sm:text-sm">Users</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4">
              <p className="text-2xl sm:text-3xl font-bold text-white">150K+</p>
              <p className="text-white/80 text-xs sm:text-sm">Matches</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4">
              <p className="text-2xl sm:text-3xl font-bold text-white">98%</p>
              <p className="text-white/80 text-xs sm:text-sm">Success</p>
            </div>
          </div>
        </div>

        {/* Featured Success Story - Lead with Engaging Content */}
        <div className="px-2 sm:px-4 md:px-6 py-4 relative z-10">
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 sm:p-6 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg sm:text-xl flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                Featured Success Story
              </h3>
              <span className="text-xs text-white/70 bg-white/20 px-3 py-1 rounded-full">New</span>
            </div>

            <div className="flex items-start space-x-4 mb-4">
              <img
                src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=120"
                alt="Sarah & Mike"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white/30"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-white font-bold text-base sm:text-lg">Sarah & Mike</p>
                  <CheckCircle className="w-5 h-5 text-blue-300 fill-blue-300" />
                </div>
                <p className="text-white/80 text-sm mb-2">Married 8 months ago</p>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  ))}
                </div>
              </div>
            </div>

            <p className="text-white text-sm sm:text-base italic leading-relaxed mb-4">
              "We matched on day one and knew instantly we were meant to be. The personality compatibility was spot-on! Now we're married and couldn't be happier. Thank you Dates! 💕"
            </p>

            <button
              onClick={() => onNavigate('care-blog')}
              className="w-full text-center text-white/90 hover:text-white text-sm font-medium underline underline-offset-4 transition-colors"
            >
              Read more success stories →
            </button>
          </div>
        </div>

        {/* Key Features - Clear Value Propositions */}
        <div className="px-2 sm:px-4 md:px-6 py-4 relative z-10">
          <h3 className="text-white font-bold text-xl sm:text-2xl mb-4 text-center">
            Why Dates Works
          </h3>

          <div className="space-y-3">
            <div className="flex items-start space-x-4 bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-lg hover:bg-white/20 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-base mb-1">AI-Powered Matching</h4>
                <p className="text-white/80 text-sm">Advanced algorithm analyzes 50+ compatibility factors for perfect matches</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-lg hover:bg-white/20 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-base mb-1">Verified Profiles Only</h4>
                <p className="text-white/80 text-sm">ID & biometric verification ensures you meet real, genuine people</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 bg-white/15 backdrop-blur-sm rounded-xl p-4 shadow-lg hover:bg-white/20 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-base mb-1">Safe Communication</h4>
                <p className="text-white/80 text-sm">End-to-end encrypted messaging, video & voice calls</p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="px-2 sm:px-4 md:px-6 py-4 relative z-10">
          <div className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Users className="w-6 h-6 text-white" />
              <h4 className="text-white font-bold text-lg">Join 2.3M+ Singles</h4>
            </div>
            <p className="text-white/90 text-center text-sm mb-4">
              New members find matches within their first week on average
            </p>
            <div className="flex -space-x-3 justify-center mb-4">
              {[
                'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=80',
                'https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg?auto=compress&cs=tinysrgb&w=80',
                'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=80',
                'https://images.pexels.com/photos/1172207/pexels-photo-1172207.jpeg?auto=compress&cs=tinysrgb&w=80'
              ].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`User ${i + 1}`}
                  className="w-12 h-12 rounded-full border-3 border-white object-cover"
                />
              ))}
              <div className="w-12 h-12 rounded-full border-3 border-white bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">+2.3M</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="px-3 sm:px-4 md:px-6 pb-8 sm:pb-12 relative z-10 space-y-3">
          <Button
            onClick={() => onNavigate('signup')}
            className="w-full bg-white text-pink-600 hover:bg-white/90 font-bold text-lg py-6 rounded-2xl shadow-2xl transition-all duration-200 hover:scale-105"
            size="lg"
          >
            <Heart className="w-5 h-5 mr-2" fill="currentColor" />
            Start Your Love Story
          </Button>

          <button
            onClick={() => onNavigate('signin')}
            className="w-full text-white hover:text-white/90 font-medium text-base py-3 transition-colors underline underline-offset-4"
          >
            Already have an account? Sign In
          </button>
        </div>

        {/* Newsletter Signup - Prominent Placement */}
        <div className="px-3 sm:px-4 md:px-6 pb-6 relative z-10">
          <NewsletterSignup variant="full" />
        </div>

        {/* About Section - Moved to Bottom */}
        <div className="px-2 sm:px-4 md:px-6 pb-8 sm:pb-12 relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
            <h3 className="text-white font-bold text-lg mb-3">About Dates</h3>
            <p className="text-white/90 text-sm leading-relaxed mb-4">
              We're revolutionizing online dating with advanced AI matching, verified profiles, and a focus on meaningful connections. Our mission is to help you find genuine love in a safe, authentic environment.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onNavigate('care-blog')}
                className="text-white/90 hover:text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-lg transition-colors"
              >
                Blog
              </button>
              <button
                onClick={() => onNavigate('help')}
                className="text-white/90 hover:text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-lg transition-colors"
              >
                Help
              </button>
              <button
                onClick={() => onNavigate('terms')}
                className="text-white/90 hover:text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-lg transition-colors"
              >
                Terms
              </button>
              <button
                onClick={() => onNavigate('privacy')}
                className="text-white/90 hover:text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-lg transition-colors"
              >
                Privacy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

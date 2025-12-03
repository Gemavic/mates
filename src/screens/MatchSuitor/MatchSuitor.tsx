import React from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Crown, Star, Zap, Target, Users, Heart } from 'lucide-react';
import { creditManager } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';

interface MatchSuitorProps {
  onNavigate: (screen: string) => void;
}

export const MatchSuitor: React.FC<MatchSuitorProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const premiumFeatures = [
    {
      icon: Target,
      title: 'Advanced Matching',
      description: 'AI-powered compatibility analysis for better matches',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Crown,
      title: 'Priority Placement',
      description: 'Your profile appears first in discovery',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      icon: Zap,
      title: 'Unlimited Likes',
      description: 'Like as many profiles as you want',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Star,
      title: 'Super Likes',
      description: '5 super likes per day to stand out',
      color: 'from-green-500 to-teal-500'
    }
  ];

  const matchSuggestions = [
    {
      id: '1',
      name: 'Emma',
      age: 25,
      compatibility: 95,
      image: 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=400',
      reasons: ['Shared interests in hiking', 'Similar career goals', 'Compatible personality']
    },
    {
      id: '2',
      name: 'Sarah',
      age: 26,
      compatibility: 92,
      image: 'https://images.pexels.com/photos/1520760/pexels-photo-1520760.jpeg?auto=compress&cs=tinysrgb&w=400',
      reasons: ['Love for travel', 'Creative mindset', 'Active lifestyle']
    },
    {
      id: '3',
      name: 'Jessica',
      age: 24,
      compatibility: 88,
      image: 'https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=400',
      reasons: ['Foodie culture', 'Similar values', 'Great conversation skills']
    }
  ];

  return (
    <Layout
      title="Match Suitor"
      onBack={() => onNavigate('discovery')}
      showClose={false}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=400" 
            alt="Match Suitor" 
            className="w-20 h-20 mx-auto mb-4 rounded-full object-cover shadow-lg"
          />
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Match Suitor Premium</h2>
          <p className="text-white/80">Find your perfect match with AI-powered matching</p>
        </div>

        {/* Premium Features */}
        <div className="mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">Premium Features</h3>
          <div className="grid grid-cols-2 gap-4">
            {premiumFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center"
                >
                  <div className={`w-12 h-12 mx-auto mb-3 bg-gradient-to-r ${feature.color} rounded-full flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-white font-medium text-sm mb-2">{feature.title}</h4>
                  <p className="text-white/70 text-xs">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Match Suggestions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg">AI Match Suggestions</h3>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
              <span className="text-white/80 text-sm">Premium</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {matchSuggestions.map((match) => (
              <div
                key={match.id}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
              >
                <div className="flex items-center space-x-4 mb-3">
                  <img
                    src={match.image}
                    alt={match.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-white font-medium">{match.name}, {match.age}</h4>
                      <div className="flex items-center space-x-1">
                        <div className={`w-3 h-3 rounded-full ${
                          match.compatibility >= 90 ? 'bg-green-500' : 
                          match.compatibility >= 80 ? 'bg-yellow-500' : 'bg-orange-500'
                        }`}></div>
                        <span className="text-white font-bold text-sm">{match.compatibility}%</span>
                      </div>
                    </div>
                    <p className="text-white/70 text-sm">Compatibility Match</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-white/80 text-sm mb-2">Why you're compatible:</p>
                  <div className="space-y-1">
                    {match.reasons.map((reason, index) => (
                      <div key={index} className="flex items-center text-white/70 text-xs">
                        <div className="w-1.5 h-1.5 bg-pink-400 rounded-full mr-2"></div>
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm hover:scale-105 transition-all duration-300"
                    onClick={() => {
                      if (!user) {
                        alert('Please sign in to send Super Likes');
                        return;
                      }
                      if (creditManager.canAfford(user.id, 1)) {
                        creditManager.spendCredits(user.id, 1, `Super liked ${match.name}`);
                        alert(`⭐ Super liked ${match.name}!`);
                      } else {
                        alert('Need 1 credit to send a Super Like!');
                      }
                    }}
                    disabled={!user || !creditManager.canAfford(user.id, 1)}
                    type="button"
                  >
                    {user && creditManager.canAfford(user.id, 1) ? 'Super Like (1 Credit)' : 'Need Credits'}
                  </Button>
                  <Button 
                    className="flex-1 bg-white/20 text-white text-sm hover:bg-white/30"
                    onClick={() => onNavigate('profile')}
                    type="button"
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-center">
          <Crown className="w-12 h-12 text-white mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">Upgrade to Premium</h3>
          <p className="text-white/90 text-sm mb-4">
            Get access to advanced matching and premium features
          </p>
          <Button
            onClick={() => onNavigate('credits')}
            className="bg-white text-purple-600 font-semibold px-8 py-3 hover:scale-105 transition-all duration-300"
          >
            Upgrade Now - $9.99/month
          </Button>
        </div>
      </div>
    </Layout>
  );
};
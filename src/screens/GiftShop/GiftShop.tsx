import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Gift, Heart, Star, Crown, Coffee, Flower2, TrendingUp, Clock, CreditCard } from 'lucide-react';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface GiftItem {
  id: string;
  name: string;
  icon: string;
  image_url?: string;
  credit_cost: number;
  kobos_cost: number;
  category: string;
  description: string;
  popularity: number;
  is_active: boolean;
}

interface GiftShopProps {
  onNavigate: (screen: string) => void;
}

export const GiftShop: React.FC<GiftShopProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState(creditManager.getTotalCredits(user?.id || 'demo-user'));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [giftCatalog, setGiftCatalog] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGifts();
  }, []);

  const loadGifts = async () => {
    try {
      const { data, error } = await supabase
        .from('virtual_gifts')
        .select('*')
        .eq('is_active', true)
        .order('popularity', { ascending: false });

      if (error) {
        console.error('Failed to load gifts:', error);
      } else {
        setGiftCatalog(data || []);
      }
    } catch (error) {
      console.error('Error loading gifts:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const categories = [
    { id: 'all', name: 'All Gifts', icon: Gift, color: 'from-purple-500 to-pink-500' },
    { id: 'romantic', name: 'Romantic', icon: Heart, color: 'from-pink-500 to-rose-500' },
    { id: 'luxury', name: 'Luxury', icon: Crown, color: 'from-yellow-400 to-orange-500' },
    { id: 'fun', name: 'Fun & Cute', icon: Star, color: 'from-purple-500 to-indigo-500' },
    { id: 'casual', name: 'Casual', icon: Coffee, color: 'from-green-500 to-teal-500' },
    { id: 'seasonal', name: 'Seasonal', icon: Flower2, color: 'from-orange-500 to-red-500' }
  ];

  const filteredGifts = selectedCategory === 'all' 
    ? giftCatalog 
    : giftCatalog.filter(gift => gift.category === selectedCategory);

  const sortedGifts = filteredGifts.sort((a, b) => b.popularity - a.popularity);

  const sendGift = async (gift: GiftItem) => {
    if (!user) {
      alert('Please sign in to send gifts');
      return;
    }

    const price = gift.credit_cost;

    if (!creditManager.canAfford(user.id, price) && !creditManager.isStaffMember(user.id)) {
      alert(`You need ${formatCredits(price)} to send this gift!`);
      return;
    }

    if (creditManager.isStaffMember(user.id)) {
      setUserBalance(creditManager.getTotalCredits(user.id));
      alert(`🎁 Successfully sent ${gift.name} (Staff - Free)!`);
    } else {
      const success = creditManager.spendCredits(user.id, price, `Sent ${gift.name} gift`);
      if (success) {
        setUserBalance(creditManager.getTotalCredits(user.id));
        alert(`🎁 Successfully sent ${gift.name} for ${formatCredits(price)}!`);
      } else {
        alert('Failed to send gift. Please try again.');
      }
    }
  };

  return (
    <Layout
      title="Gift Shop"
      onBack={() => {
        console.log('Gift Shop back button clicked');
        onNavigate('discovery');
      }}
      showClose={false}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Gift Shop</h2>
          <p className="text-white/80">Send virtual gifts to show you care</p>
        </div>

        {/* Credits Balance */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Your Credits</p>
              <p className="text-2xl font-bold text-white">{formatCredits(userBalance)}</p>
            </div>
            <Button
              onClick={() => onNavigate('credits')}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 cursor-pointer touch-manipulation active:scale-95"
              type="button"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Buy More
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6">
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
        </div>

        {/* Gift Grid */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg">
              {selectedCategory === 'all' ? 'All Gifts' : categories.find(c => c.id === selectedCategory)?.name} 
              ({sortedGifts.length} items)
            </h3>
            <span className="text-white/70 text-sm">💖 Popular</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full text-center text-white py-8">Loading gifts...</div>
            ) : sortedGifts.length === 0 ? (
              <div className="col-span-full text-center text-white/70 py-8">No gifts available in this category</div>
            ) : (
              sortedGifts.map((gift) => (
                <div
                  key={gift.id}
                  className="bg-white rounded-2xl p-4 text-center hover:shadow-xl transition-all duration-300 hover:scale-105 flex flex-col justify-between"
                >
                  {gift.image_url ? (
                    <div className="mb-3 bg-gray-100 rounded-xl p-4 h-32 flex items-center justify-center">
                      <img
                        src={gift.image_url}
                        alt={gift.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-5xl mb-3">{gift.icon}</div>
                  )}

                  <h4 className="text-gray-900 font-semibold text-base mb-2">{gift.name}</h4>

                  <div className="flex items-center justify-between mb-3 px-2">
                    <div className="text-left">
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">C</span>
                        </div>
                        <span className="text-gray-900 font-bold text-lg">{gift.credit_cost}</span>
                      </div>
                      <span className="text-gray-500 text-xs">Credits</span>
                    </div>

                    <div className="text-right">
                      <div className="text-gray-900 font-bold text-lg">{gift.kobos_cost}</div>
                      <span className="text-gray-500 text-xs">Kobos</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => sendGift(gift)}
                    disabled={!creditManager.canAfford(user?.id || 'demo-user', gift.credit_cost) && !creditManager.isStaffMember(user?.id || 'demo-user')}
                    className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 cursor-pointer touch-manipulation active:scale-95 ${
                      creditManager.canAfford(user?.id || 'demo-user', gift.credit_cost) || creditManager.isStaffMember(user?.id || 'demo-user')
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:scale-105'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    type="button"
                  >
                    Send Gift
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Gifts */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="text-white font-semibold text-lg mb-4">Recent Gifts Sent</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🌹</span>
                <div>
                  <p className="text-white font-medium">Red Rose to Emma</p>
                  <p className="text-white/70 text-sm">2 hours ago</p>
                </div>
              </div>
              <span className="text-white/70 text-sm">5 Credits</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">💖</span>
                <div>
                  <p className="text-white font-medium">Love Heart to Sarah</p>
                  <p className="text-white/70 text-sm">1 day ago</p>
                </div>
              </div>
              <span className="text-white/70 text-sm">3 Credits</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🧸</span>
                <div>
                  <p className="text-white font-medium">Teddy Bear to Jessica</p>
                  <p className="text-white/70 text-sm">3 days ago</p>
                </div>
              </div>
              <span className="text-white/70 text-sm">8 Credits</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
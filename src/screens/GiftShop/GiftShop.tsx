import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Gift, Heart, Star, Crown, Coffee, Flower2, CreditCard } from 'lucide-react';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  category: 'romantic' | 'luxury' | 'fun' | 'seasonal' | 'casual';
  description: string;
  popularity: number;
}

interface GiftShopProps {
  onNavigate: (screen: string) => void;
}

export const GiftShop: React.FC<GiftShopProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState(creditManager.getTotalCredits(user?.id || 'demo-user'));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const giftCatalog: GiftItem[] = [
    // Romantic Gifts
    { id: 'red_rose', name: 'Red Rose', emoji: '🌹', price: 5, category: 'romantic', description: 'Classic symbol of love', popularity: 95 },
    { id: 'bouquet', name: 'Rose Bouquet', emoji: '💐', price: 15, category: 'romantic', description: 'Beautiful flower arrangement', popularity: 88 },
    { id: 'love_heart', name: 'Love Heart', emoji: '💖', price: 3, category: 'romantic', description: 'Express your feelings', popularity: 92 },
    { id: 'chocolate_box', name: 'Chocolate Box', emoji: '🍫', price: 12, category: 'romantic', description: 'Sweet treats', popularity: 87 },
    
    // Luxury Gifts
    { id: 'diamond', name: 'Diamond', emoji: '💎', price: 100, category: 'luxury', description: 'Ultimate luxury gift', popularity: 95 },
    { id: 'emerald', name: 'Emerald', emoji: '💚', price: 80, category: 'luxury', description: 'Precious green gem', popularity: 75 },
    { id: 'sapphire', name: 'Sapphire', emoji: '💙', price: 85, category: 'luxury', description: 'Royal blue gem', popularity: 78 },
    { id: 'crown', name: 'Crown', emoji: '👑', price: 50, category: 'luxury', description: 'Treat them like royalty', popularity: 88 },
    { id: 'champagne', name: 'Champagne', emoji: '🍾', price: 35, category: 'luxury', description: 'Celebrate in style', popularity: 85 },
    { id: 'luxury_watch', name: 'Luxury Watch', emoji: '⌚', price: 75, category: 'luxury', description: 'Timeless elegance', popularity: 72 },
    { id: 'sports_car', name: 'Sports Car', emoji: '🏎️', price: 200, category: 'luxury', description: 'Ultimate dream gift', popularity: 90 },
    { id: 'yacht', name: 'Luxury Yacht', emoji: '🛥️', price: 300, category: 'luxury', description: 'Sail away together', popularity: 85 },
    { id: 'private_jet', name: 'Private Jet', emoji: '✈️', price: 500, category: 'luxury', description: 'Fly in style', popularity: 92 },
    { id: 'mansion', name: 'Dream Mansion', emoji: '🏰', price: 1000, category: 'luxury', description: 'Live like royalty', popularity: 88 },
    
    // Fun & Cute Gifts
    { id: 'teddy_bear', name: 'Teddy Bear', emoji: '🧸', price: 8, category: 'fun', description: 'Cuddly companion', popularity: 92 },
    { id: 'cute_puppy', name: 'Cute Puppy', emoji: '🐶', price: 12, category: 'fun', description: 'Adorable furry friend', popularity: 95 },
    { id: 'birthday_cake', name: 'Birthday Cake', emoji: '🎂', price: 10, category: 'fun', description: 'Celebrate special moments', popularity: 88 },
    
    // Casual Gifts
    { id: 'coffee', name: 'Coffee', emoji: '☕', price: 3, category: 'casual', description: 'Morning energy boost', popularity: 90 },
    { id: 'pizza_slice', name: 'Pizza Slice', emoji: '🍕', price: 5, category: 'casual', description: 'Delicious comfort food', popularity: 92 },
    { id: 'ice_cream', name: 'Ice Cream', emoji: '🍦', price: 4, category: 'casual', description: 'Cool sweet treat', popularity: 89 },
    
    // Seasonal Gifts
    { id: 'christmas_tree', name: 'Christmas Tree', emoji: '🎄', price: 15, category: 'seasonal', description: 'Holiday spirit', popularity: 85 },
    { id: 'valentine_card', name: 'Valentine Card', emoji: '💝', price: 6, category: 'seasonal', description: 'Love day special', popularity: 90 },
    { id: 'fireworks', name: 'Fireworks', emoji: '🎆', price: 12, category: 'seasonal', description: 'Celebration spectacular', popularity: 88 }
  ];
  
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

  const sendGift = (_giftId: string, giftName: string, price: number) => {
    if (!user) {
      alert('Please sign in to send gifts');
      return;
    }

    if (!creditManager.canAfford(user.id, price) && !creditManager.isStaffMember(user.id)) {
      alert(`You need ${formatCredits(price)} to send this gift!`);
      return;
    }

    if (creditManager.isStaffMember(user.id)) {
      // Staff members can send gifts for free
      setUserBalance(creditManager.getTotalCredits(user.id));
      alert(`🎁 Successfully sent ${giftName} (Staff - Free)!`);
    } else {
      const success = creditManager.spendCredits(user.id, price, `Sent ${giftName} gift`);
      if (success) {
        setUserBalance(creditManager.getTotalCredits(user.id));
        alert(`🎁 Successfully sent ${giftName} for ${formatCredits(price)}!`);
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
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sortedGifts.map((gift) => (
              <div
                key={gift.id}
                className="bg-white/10 rounded-xl p-3 text-center hover:bg-white/20 transition-all duration-300 hover:scale-105 flex flex-col justify-between min-h-[180px]"
              >
                <div className="text-3xl mb-2">{gift.emoji}</div>
                <h4 className="text-white font-medium text-sm mb-1">{gift.name}</h4>
                <p className="text-white/60 text-xs mb-2">{gift.description}</p>
                <div className="flex items-center justify-center space-x-1 mb-3">
                  <span className="text-white/70 text-xs">{formatCredits(gift.price)}</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-xs ${
                          i < Math.floor(gift.popularity / 20) ? 'text-yellow-400' : 'text-gray-400'
                        }`}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-auto">
                  <Button
                    onClick={() => sendGift(gift.id, gift.name, gift.price)}
                    disabled={!creditManager.canAfford(user?.id || 'demo-user', gift.price) && !creditManager.isStaffMember(user?.id || 'demo-user')}
                    className={`w-full text-xs py-2 transition-all duration-300 cursor-pointer touch-manipulation active:scale-95 ${
                      creditManager.canAfford(user?.id || 'demo-user', gift.price) || creditManager.isStaffMember(user?.id || 'demo-user')
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:scale-105'
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                    type="button"
                  >
                    {creditManager.canAfford(user?.id || 'demo-user', gift.price) || creditManager.isStaffMember(user?.id || 'demo-user') ? 'Send Gift' : 'Need Credits'}
                  </Button>
                </div>
              </div>
            ))}
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
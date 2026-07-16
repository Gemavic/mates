import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { CreditCard, Shield, Lock, Crown, Coins, Heart, Gift, Star, Zap } from 'lucide-react';
import { creditManager } from '@/lib/creditSystem';

interface CheckoutPageProps {
  onNavigate?: (screen: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate = () => {} }) => {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const products = creditManager.getCreditPackages();

  const handlePurchase = async (product: any) => {
    console.log('Purchase clicked for:', product.package_name);
    setSelectedProduct(product.id);

    // Show payment gateway with crypto and other payment options
    alert(`Selected ${product.package_name} for $${product.price_usd}. Payment gateway will open.`);
    setSelectedProduct('');
  };

  const getProductIcon = (productId: string) => {
    if (productId.includes('starter')) return Coins;
    if (productId.includes('popular')) return Star;
    if (productId.includes('premium')) return Crown;
    if (productId.includes('kobos')) return Heart;
    if (productId.includes('ultimate')) return Gift;
    return CreditCard;
  };

  const getProductGradient = (productId: string) => {
    if (productId === 'starter') return 'from-blue-500 to-cyan-500';
    if (productId === 'popular') return 'from-purple-500 to-pink-500';
    if (productId === 'premium') return 'from-yellow-400 to-orange-500';
    if (productId === 'kobos-small') return 'from-pink-500 to-rose-500';
    if (productId === 'ultimate') return 'from-indigo-500 to-purple-500';
    return 'from-gray-500 to-gray-600';
  };

  return (
    <Layout
      title="Purchase Credits"
      onBack={() => (onNavigate ? onNavigate('discovery') : (window.location.href = '/app'))}
      showClose={false}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Choose Your Package</h2>
          <p className="text-white/80">Secure payment with multiple options</p>
        </div>

        {/* Payment Methods Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 text-blue-600 mb-2">
            <Shield className="w-5 h-5" />
            <span className="font-medium">Multiple Secure Payment Options</span>
          </div>
          <p className="text-blue-600 text-sm">
            Choose from cryptocurrency, mobile payments (Apple/Google/Samsung Pay), or credit card options. 
            All payments are secured with 256-bit encryption.
          </p>
        </div>

        {/* Credit Packages */}
        <div className="space-y-4">
          {products.map((product) => {
            const Icon = getProductIcon(product.id);
            const gradient = getProductGradient(product.id);
            
            return (
              <div
                key={product.id}
                className={`bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 transition-all duration-300 ${
                  product.is_popular ? 'border-yellow-400 shadow-lg' : 'border-white/20'
                }`}
              >
                {product.is_popular && (
                  <div className="flex justify-center mb-4">
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      ⭐ MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 bg-gradient-to-r ${gradient} rounded-full flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{product.package_name}</h3>
                      <p className="text-white/80 text-sm">{product.features.join(" · ")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">${product.price_usd.toFixed(2)}</p>
                    {product.savings && (
                      <p className="text-green-400 text-sm font-medium">{product.savings}</p>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {product.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-white/80 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2 flex-shrink-0"></div>
                      <span className="truncate">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handlePurchase(product)}
                  disabled={selectedProduct === product.id}
                  className={`w-full bg-gradient-to-r ${gradient} text-white font-semibold hover:scale-105 transition-all duration-300 h-12 cursor-pointer touch-manipulation active:scale-95 disabled:opacity-50`}
                  type="button"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Purchase ${product.price_usd.toFixed(2)}
                </Button>
              </div>
            );
          })}
        </div>

        {/* What You Get */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <h3 className="text-white font-semibold text-lg mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            What Your Credits Can Do
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/80 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-white mb-2">Chat Features</h4>
              <div className="flex justify-between">
                <span>💬 Live chat (per minute)</span>
                <span className="font-medium">2 Credits</span>
              </div>
              <div className="flex justify-between">
                <span>🎨 Stickers in chat</span>
                <span className="font-medium">5 Credits</span>
              </div>
              <div className="flex justify-between">
                <span>📷 Sending photos in chat</span>
                <span className="font-medium">10 Credits</span>
              </div>
              <div className="flex justify-between">
                <span>🎵 Opening audios in chat</span>
                <span className="font-medium">30 Credits</span>
              </div>
              <div className="flex justify-between">
                <span>📹 Opening videos in chat</span>
                <span className="font-medium">50 Credits</span>
              </div>
              <div className="flex justify-between">
                <span>⭐ Opening exclusive post</span>
                <span className="font-medium">50 Credits</span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-white mb-2">Mail & Other Features</h4>
              <div className="flex justify-between">
                <span>📧 Sending letters (first)</span>
                <span className="font-medium">10 Credits</span>
              </div>
              <div className="flex justify-between">
                <span>📧 Sending letters (following)</span>
                <span className="font-medium">30 Credits</span>
              </div>
              <div className="flex justify-between">
                <span>📖 Opening letters (first)</span>
                <span className="font-medium text-green-400">FREE</span>
              </div>
              <div className="flex justify-between">
                <span>📖 Opening letters (following)</span>
                <span className="font-medium">10 Credits</span>
              </div>
              <div className="flex justify-between">
                <span>📷 Opening photos (following)</span>
                <span className="font-medium">10 Credits</span>
              </div>
              <div className="flex justify-between">
                <span>🎬 Opening videos in profiles</span>
                <span className="font-medium">50 Credits</span>
              </div>
            </div>
            
            {/* Legacy Features */}
            <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t border-white/20">
              <h4 className="font-semibold text-white mb-2">Video & Audio Calls (Legacy Pricing)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span>📹 Video Call (per minute)</span>
                  <span className="font-medium">60 Credits</span>
                </div>
                <div className="flex justify-between">
                  <span>📞 Audio Call (per minute)</span>
                  <span className="font-medium">50 Credits</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Free Features */}
          <div className="mt-6 bg-green-500/20 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-green-300 mb-2">🆓 Free Features</h4>
            <div className="grid grid-cols-2 gap-2 text-green-200 text-sm">
              <div className="flex justify-between">
                <span>💖 Regular likes</span>
                <span className="font-medium">FREE</span>
              </div>
              <div className="flex justify-between">
                <span>👁️ Send blinks</span>
                <span className="font-medium">FREE</span>
              </div>
              <div className="flex justify-between">
                <span>📷 Sending photos in mail (first)</span>
                <span className="font-medium text-green-400">FREE</span>
              </div>
              <div className="flex justify-between">
                <span>📷 Sending photos in mail (following)</span>
                <span className="font-medium">10 Credits</span>
              </div>
              <div className="flex justify-between">
                <span>📖 Opening first letters</span>
                <span className="font-medium text-green-400">FREE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Options */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="text-white font-semibold text-lg mb-3 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Available Payment Methods
          </h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="text-white/80">
              <span className="text-2xl mb-1 block">₿</span>
              <span className="text-xs">Cryptocurrency</span>
            </div>
            <div className="text-white/80">
              <span className="text-2xl mb-1 block">💳</span>
              <span className="text-xs">Credit Card</span>
            </div>
            <div className="text-white/80">
              <span className="text-2xl mb-1 block">📱</span>
              <span className="text-xs">Mobile Pay</span>
            </div>
            <div className="text-white/80">
              <span className="text-2xl mb-1 block">🔒</span>
              <span className="text-xs">Secure</span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-white/70">
              All payments secured with 256-bit encryption • Multiple payment options available
            </p>
            <p className="text-xs text-white/60 mt-1">
              Choose the payment method that works best for you
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};
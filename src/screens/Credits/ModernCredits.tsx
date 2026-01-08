import React, { useState } from 'react';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { ModernHeader } from '@/components/ModernHeader';
import { ModernCard } from '@/components/ModernCard';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  Coins,
  Heart as KoboIcon,
  Star,
  Crown,
  Zap,
  Gift,
  TrendingUp,
  Clock,
  MessageCircle,
  Mail,
  Video,
  Heart,
  Shield,
  ShoppingCart,
  Check,
  Sparkles
} from 'lucide-react';
import { creditManager, formatCredits, formatPrice } from '@/lib/creditSystem';
import { getUserCredits, getCreditTransactions } from '@/lib/database';
import { generateSecurityReport } from '@/lib/encryption';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { PaymentGateway } from '@/components/PaymentGateway';
import { subscriptionManager } from '@/lib/subscriptionManager';

interface ModernCreditsProps {
  onNavigate: (screen: string) => void;
}

export const ModernCredits: React.FC<ModernCreditsProps> = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentModel, setPaymentModel] = useState<'subscription' | 'credits'>('subscription');
  const [activeTab, setActiveTab] = useState<'credits' | 'kobos' | 'combo'>('credits');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [subscriptionTiers, setSubscriptionTiers] = useState<any[]>([]);
  const [securityReport, setSecurityReport] = useState<any>(null);
  const [dbCredits, setDbCredits] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const { user } = useAuth();
  const { subscription: userSubscription } = useSubscription();
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const userData = creditManager.getUserData(user?.id || 'demo-user');
  const creditPackages = creditManager.getCreditPackages();

  React.useEffect(() => {
    if (user) {
      (async () => {
        try {
          loadCreditData();
          loadSubscriptionTiers();
        } catch (error) {
          console.warn('Error during initialization:', error);
        }
      })();
    }
  }, [user]);

  const loadCreditData = async () => {
    if (!user) return;

    try {
      try {
        const credits = await getUserCredits(user.id);
        const userTransactions = await getCreditTransactions(user.id);
        setDbCredits(credits);
        setTransactions(userTransactions);
      } catch (dbError: any) {
        if (dbError.status === 404 && dbError.body?.includes('42P01')) {
          console.warn('Database tables not found - using local credit system only');
          setDbCredits(null);
          setTransactions([]);
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.warn('Failed to load credit data - using local credit system:', error);
      setDbCredits(null);
      setTransactions([]);
    }
  };

  const loadSubscriptionTiers = async () => {
    try {
      const tiers = await subscriptionManager.getAllTiers();
      setSubscriptionTiers(tiers.filter(t => t.tier_name !== 'free'));
    } catch (error) {
      console.error('Failed to load subscription tiers:', error);
    }
  };

  React.useEffect(() => {
    const report = generateSecurityReport(user?.id || 'demo-user');
    setSecurityReport(report);
  }, [user]);

  const handlePurchase = async (product: any) => {
    console.log('Purchase clicked:', product.name || product.display_name);
    setSelectedPackage(product);
    setShowPaymentGateway(true);
  };

  const handlePaymentSuccess = () => {
    console.log('Purchase successful');
    setShowPaymentGateway(false);
    setSelectedPackage(null);
    onNavigate('success');
  };

  const handlePaymentCancel = () => {
    console.log('Purchase cancelled');
    setShowPaymentGateway(false);
    setSelectedPackage(null);
  };

  const filteredPackages = creditPackages.filter(pkg => {
    if (activeTab === 'combo') return pkg.id.includes('ultimate') || pkg.id.includes('combo');
    if (activeTab === 'kobos') return pkg.id.includes('kobos');
    return !pkg.id.includes('kobos') && !pkg.id.includes('ultimate');
  });

  const getPackageIcon = (productId: string) => {
    if (productId.includes('starter')) return Coins;
    if (productId.includes('popular')) return Star;
    if (productId.includes('premium')) return Crown;
    if (productId.includes('kobos')) return KoboIcon;
    if (productId.includes('ultimate')) return Gift;
    return CreditCard;
  };

  const getPackageGradient = (productId: string) => {
    if (productId.includes('starter')) return 'from-blue-500 to-cyan-500';
    if (productId.includes('popular')) return 'from-purple-500 to-pink-500';
    if (productId.includes('premium')) return 'from-yellow-400 to-orange-500';
    if (productId.includes('kobos')) return 'from-pink-500 to-rose-500';
    if (productId.includes('ultimate')) return 'from-indigo-500 to-purple-500';
    return 'from-gray-500 to-gray-600';
  };

  const getTierIcon = (tierName: string) => {
    if (tierName === 'silver') return Sparkles;
    if (tierName === 'gold') return Star;
    if (tierName === 'platinum') return Crown;
    if (tierName === 'elite') return Crown;
    return Crown;
  };

  const getTierGradient = (tierName: string) => {
    if (tierName === 'silver') return 'from-gray-400 to-gray-500';
    if (tierName === 'gold') return 'from-yellow-400 to-orange-500';
    if (tierName === 'platinum') return 'from-purple-500 to-pink-500';
    if (tierName === 'elite') return 'from-indigo-500 to-purple-700';
    return 'from-gray-500 to-gray-600';
  };

  return (
    <ResponsiveLayout currentScreen="credits" onNavigate={onNavigate}>
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600">
        <ModernHeader
          title="Upgrade"
          showBack={true}
          onBack={() => onNavigate('discovery')}
          showNotifications={true}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-24">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h2>
            <p className="text-white/80">Select the best option for your dating journey</p>
          </div>

          {/* Current Balance - Only show if in credits model */}
          {paymentModel === 'credits' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <ModernCard background="gradient" className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Coins className="w-8 h-8 text-yellow-400" />
                </div>
                <p className="text-white/80 text-sm">Complimentary</p>
                <p className="text-2xl font-bold text-white">{dbCredits?.complimentary_credits || userData.complimentaryCredits}</p>
              </ModernCard>

              <ModernCard background="gradient" className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <CreditCard className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-white/80 text-sm">Purchased</p>
                <p className="text-2xl font-bold text-white">{dbCredits?.purchased_credits || userData.purchasedCredits}</p>
              </ModernCard>

              <ModernCard background="gradient" className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Heart className="w-8 h-8 text-pink-400" />
                </div>
                <p className="text-white/80 text-sm">Kobos</p>
                <p className="text-2xl font-bold text-white">{dbCredits?.total_kobos || userData.kobos}</p>
              </ModernCard>
            </div>
          )}

          {/* Payment Model Toggle */}
          <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-1">
            <button
              onClick={() => setPaymentModel('subscription')}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all duration-300 ${
                paymentModel === 'subscription'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-white hover:bg-white/10'
              }`}
              type="button"
            >
              <Crown className="w-5 h-5 mr-2" />
              <span className="font-medium">Monthly Subscription</span>
            </button>
            <button
              onClick={() => setPaymentModel('credits')}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all duration-300 ${
                paymentModel === 'credits'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-white hover:bg-white/10'
              }`}
              type="button"
            >
              <Coins className="w-5 h-5 mr-2" />
              <span className="font-medium">Pay-as-You-Go</span>
            </button>
          </div>

          {/* Subscription Tiers */}
          {paymentModel === 'subscription' && (
            <>
              {/* Billing Period Toggle */}
              <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-1 max-w-md mx-auto">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`flex-1 py-2 px-4 rounded-xl transition-all duration-300 ${
                    billingPeriod === 'monthly'
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'text-white hover:bg-white/10'
                  }`}
                  type="button"
                >
                  <span className="font-medium">Monthly</span>
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`flex-1 py-2 px-4 rounded-xl transition-all duration-300 ${
                    billingPeriod === 'annual'
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'text-white hover:bg-white/10'
                  }`}
                  type="button"
                >
                  <span className="font-medium">Annual</span>
                  <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Save 25%</span>
                </button>
              </div>

              {/* Subscription Tier Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {subscriptionTiers.map((tier) => {
                  const Icon = getTierIcon(tier.tier_name);
                  const gradient = getTierGradient(tier.tier_name);
                  const price = billingPeriod === 'monthly' ? parseFloat(tier.monthly_price_usd) : parseFloat(tier.annual_price_usd);
                  const isCurrentTier = userSubscription?.tier_name === tier.tier_name;
                  const isFeatured = tier.is_featured || tier.tier_name === 'platinum';

                  return (
                    <ModernCard
                      key={tier.id}
                      className={`relative ${isFeatured ? 'ring-2 ring-yellow-400' : ''}`}
                      background="white"
                      hover={true}
                    >
                      {isFeatured && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                            ⭐ MOST POPULAR
                          </span>
                        </div>
                      )}

                      {isCurrentTier && (
                        <div className="absolute -top-3 right-4">
                          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                            CURRENT PLAN
                          </span>
                        </div>
                      )}

                      <div className="text-center mb-4">
                        <div className={`w-16 h-16 mx-auto mb-3 bg-gradient-to-r ${gradient} rounded-full flex items-center justify-center`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{tier.display_name}</h3>
                        <p className="text-gray-600 text-sm mb-3">{tier.description}</p>
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-3xl font-bold text-gray-900">${formatPrice(price)}</span>
                          <span className="text-sm text-gray-600">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                        </div>
                        {billingPeriod === 'annual' && (
                          <p className="text-sm text-green-600 font-medium mt-1">
                            Save ${(parseFloat(tier.monthly_price_usd) * 12 - price).toFixed(2)}/year
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 mb-6">
                        {tier.features.slice(0, 5).map((feature: string, index: number) => (
                          <div key={index} className="flex items-start text-gray-700 text-sm">
                            <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        onClick={() => handlePurchase({
                          ...tier,
                          price_usd: price,
                          billing_period: billingPeriod,
                          type: 'subscription'
                        })}
                        className={`w-full bg-gradient-to-r ${gradient} text-white font-semibold hover:scale-105 transition-all duration-300 cursor-pointer touch-manipulation active:scale-95 ${
                          isCurrentTier ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={isCurrentTier}
                        type="button"
                      >
                        {isCurrentTier ? (
                          <>Current Plan</>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Subscribe ${formatPrice(price)}
                          </>
                        )}
                      </Button>
                    </ModernCard>
                  );
                })}
              </div>
            </>
          )}

          {/* Credit Packages */}
          {paymentModel === 'credits' && (
            <>
              <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-1">
                {[
                  { id: 'credits', label: 'Credits', icon: Coins },
                  { id: 'kobos', label: 'Kobos', icon: KoboIcon },
                  { id: 'combo', label: 'Combo Packs', icon: Crown }
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
                      type="button"
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPackages.map((pkg) => {
                  const Icon = getPackageIcon(pkg.id);
                  const gradient = getPackageGradient(pkg.id);
                  return (
                    <ModernCard
                      key={pkg.id}
                      className={`relative ${pkg.popular ? 'ring-2 ring-yellow-400' : ''}`}
                      background="white"
                      hover={true}
                    >
                      {pkg.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                            ⭐ MOST POPULAR
                          </span>
                        </div>
                      )}

                      <div className="text-center mb-4">
                        <div className={`w-16 h-16 mx-auto mb-3 bg-gradient-to-r ${gradient} rounded-full flex items-center justify-center`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{pkg.name}</h3>
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-3xl font-bold text-gray-900">{formatPrice(pkg.price_usd)}</span>
                          {pkg.savings && (
                            <span className="text-sm text-green-600 font-medium">{pkg.savings}</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mb-6">
                        {pkg.features.map((feature: string, index: number) => (
                          <div key={index} className="flex items-center text-gray-700 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                            {feature}
                          </div>
                        ))}
                      </div>

                      <Button
                        onClick={() => handlePurchase({ ...pkg, type: 'credits' })}
                        className={`w-full bg-gradient-to-r ${gradient} text-white font-semibold hover:scale-105 transition-all duration-300 cursor-pointer touch-manipulation active:scale-95`}
                        type="button"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy ${formatPrice(pkg.price_usd)}
                      </Button>
                    </ModernCard>
                  );
                })}
              </div>
            </>
          )}

          {/* Pricing Information - Only for credits */}
          {paymentModel === 'credits' && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">How Credits Work</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-3 flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2 text-blue-500" />
                    Chat Features
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Live chat (per minute)</span>
                      <span className="font-medium">2 Credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Stickers in chat</span>
                      <span className="font-medium">5 Credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Sending photos in chat</span>
                      <span className="font-medium">10 Credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Opening audios in chat</span>
                      <span className="font-medium">30 Credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Opening videos in chat</span>
                      <span className="font-medium">50 Credits</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-3 flex items-center">
                    <Mail className="w-5 h-5 mr-2 text-green-500" />
                    Mail Features
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Sending letters (first)</span>
                      <span className="font-medium">10 Credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Sending letters (following)</span>
                      <span className="font-medium">30 Credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Opening letters (first)</span>
                      <span className="font-medium text-green-600">FREE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Opening letters (following)</span>
                      <span className="font-medium">10 Credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Opening videos in mail</span>
                      <span className="font-medium">50 Credits</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-3 flex items-center">
                    <Video className="w-5 h-5 mr-2 text-purple-500" />
                    Video & Audio Calls
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Video Calls (per minute)</span>
                      <span className="font-medium">60 Credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Audio Calls (per minute)</span>
                      <span className="font-medium">50 Credits</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Transactions - Only for credits */}
          {paymentModel === 'credits' && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {(transactions.length > 0 ? transactions : userData.transactions).slice(-5).reverse().map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-white/20 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        (transaction.transaction_type || transaction.type) === 'earn' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {(transaction.transaction_type || transaction.type) === 'earn' ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{transaction.description}</p>
                        <p className="text-xs text-white/60">
                          {new Date(transaction.created_at || transaction.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${
                      (transaction.transaction_type || transaction.type) === 'earn' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {(transaction.transaction_type || transaction.type) === 'earn' ? '+' : '-'}{transaction.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Gateway Modal */}
        {showPaymentGateway && selectedPackage && (
          <PaymentGateway
            amount={selectedPackage.price_usd || parseFloat(selectedPackage.monthly_price_usd || selectedPackage.annual_price_usd)}
            packageName={selectedPackage.name || selectedPackage.display_name}
            credits={selectedPackage.credits}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        )}
      </div>
    </ResponsiveLayout>
  );
};

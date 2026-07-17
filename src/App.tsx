import React, { useState, useEffect } from 'react';
import { trackPageView } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { Menu } from '@/components/Menu';
import { SEO } from '@/components/SEO';
import { Welcome } from '@/screens/Welcome/Welcome';

// Lazy-loaded screens: split out of the main bundle so the first paint
// (Welcome + auth) stays small; each screen loads on first visit.
import { SignIn } from '@/screens/Auth/SignIn';
import { SignUp } from '@/screens/Auth/SignUp';
import { Discovery } from '@/screens/Discovery/Discovery';
import { ModernDiscovery } from '@/screens/Discovery/ModernDiscovery';
import { Matches } from '@/screens/Matches/Matches';
import { Likes } from '@/screens/Likes/Likes';
import { ModernCredits } from '@/screens/Credits/ModernCredits';
const GiftShop = React.lazy(() => import('@/screens/GiftShop/GiftShop').then(m => ({ default: m.GiftShop })));
import { Mail } from '@/screens/Mail/Mail';
const Profile = React.lazy(() => import('@/screens/Profile/Profile').then(m => ({ default: m.Profile })));
const ViewUserProfile = React.lazy(() => import('@/screens/Profile/ViewUserProfile').then(m => ({ default: m.ViewUserProfile })));
const Newsfeed = React.lazy(() => import('@/screens/Newsfeed/Newsfeed').then(m => ({ default: m.Newsfeed })));
const Feedback = React.lazy(() => import('@/screens/Feedback/Feedback').then(m => ({ default: m.Feedback })));
const Settings = React.lazy(() => import('@/screens/Settings/Settings').then(m => ({ default: m.Settings })));
const Terms = React.lazy(() => import('@/screens/Legal/Terms').then(m => ({ default: m.Terms })));
const Privacy = React.lazy(() => import('@/screens/Legal/Privacy').then(m => ({ default: m.Privacy })));
const Dispute = React.lazy(() => import('@/screens/Legal/Dispute').then(m => ({ default: m.Dispute })));
const Disclaimer = React.lazy(() => import('@/screens/Legal/Disclaimer').then(m => ({ default: m.Disclaimer })));
const PaymentRefund = React.lazy(() => import('@/screens/Legal/PaymentRefund').then(m => ({ default: m.PaymentRefund })));
const MisconductPolicy = React.lazy(() => import('@/screens/Legal/MisconductPolicy').then(m => ({ default: m.MisconductPolicy })));
const ConsentPolicy = React.lazy(() => import('@/screens/Legal/ConsentPolicy').then(m => ({ default: m.ConsentPolicy })));
const AcceptableUsePolicy = React.lazy(() => import('@/screens/Legal/AcceptableUsePolicy').then(m => ({ default: m.AcceptableUsePolicy })));
const SuccessPage = React.lazy(() => import('@/screens/Success/SuccessPage').then(m => ({ default: m.SuccessPage })));
const CancelPage = React.lazy(() => import('@/screens/Cancel/CancelPage').then(m => ({ default: m.CancelPage })));
const CheckoutPage = React.lazy(() => import('@/screens/Checkout/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const StaffPanel = React.lazy(() => import('@/screens/StaffPanel/StaffPanel').then(m => ({ default: m.StaffPanel })));
const MenuShowcase = React.lazy(() => import('@/screens/MenuShowcase/MenuShowcase').then(m => ({ default: m.MenuShowcase })));
const VideoChat = React.lazy(() => import('@/screens/VideoChat/VideoChat').then(m => ({ default: m.VideoChat })));
const AudioChat = React.lazy(() => import('@/screens/AudioChat/AudioChat').then(m => ({ default: m.AudioChat })));
const RelationshipServices = React.lazy(() => import('@/screens/RelationshipServices/RelationshipServices').then(m => ({ default: m.RelationshipServices })));
const Education = React.lazy(() => import('@/screens/Education/Education').then(m => ({ default: m.Education })));
const MatchSuitor = React.lazy(() => import('@/screens/MatchSuitor/MatchSuitor').then(m => ({ default: m.MatchSuitor })));
const Verification = React.lazy(() => import('@/screens/Verification/Verification').then(m => ({ default: m.Verification })));
const PaymentSetup = React.lazy(() => import('@/screens/PaymentSetup/PaymentSetup').then(m => ({ default: m.PaymentSetup })));
const Help = React.lazy(() => import('@/screens/Help/Help').then(m => ({ default: m.Help })));
const CareBlog = React.lazy(() => import('@/screens/CareBlog/CareBlog').then(m => ({ default: m.CareBlog })));
const Quizzes = React.lazy(() => import('@/screens/Quizzes/Quizzes').then(m => ({ default: m.Quizzes })));
import { Onboarding } from '@/screens/Onboarding/Onboarding';
import { AuthCallback } from '@/screens/Auth/AuthCallback';
import { useStaffAccess } from '@/hooks/useStaffAccess';
import { MonitoringDashboard } from '@/components/MonitoringDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicRoute } from '@/components/PublicRoute';
import { useAuth } from '@/hooks/useAuth';
import { creditManager } from '@/lib/creditSystem';
import { supabaseConfigError } from '@/lib/supabase';
import { getRouteConfig } from '@/lib/routeConfig';
import { AlertTriangle } from 'lucide-react';

interface SelectedChatUser {
  id: string;
  name: string;
  image: string;
}

function ScreenLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600">
      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<SelectedChatUser | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const { staffAuth, isStaff, loading: staffLoading } = useStaffAccess();

  const handleStaffLogout = () => {
    try {
      setCurrentScreen('discovery');
      console.log('✅ Left staff panel');
    } catch (error) {
      console.error('Staff logout error:', error);
      setCurrentScreen('discovery');
    }
  };

  const handleNavigate = (screen: string, params?: { userId?: string }) => {
    // Add smooth transition
    setIsTransitioning(true);
    console.log('Navigating to:', screen, params);

    // Handle userId parameter for view-profile
    if (params?.userId) {
      setSelectedUserId(params.userId);
    }

    setTimeout(() => {
      setCurrentScreen(screen);
      setIsTransitioning(false);
    }, 150);

    trackPageView(screen);

    // URL update
    try {
      const newUrl = screen === 'welcome' ? '/' : `/#${screen}`;
      window.history.pushState({ screen }, '', newUrl);
    } catch (error) {
      // Ignore URL update errors
    }
  };

  // Initialize user credits on app load
  useEffect(() => {
    if (user) {
      creditManager.initializeUser(user.id);
      console.log('💳 User credits initialized for:', user.id);
    }
  }, [user]);

  // Handle URL-based navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const screen = event.state?.screen || 'welcome';
      setCurrentScreen(screen);
    };

    // Check initial URL
    const hash = window.location.hash.slice(1);
    if (hash && hash !== currentScreen) {
      setCurrentScreen(hash);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentScreen]);

  // Show configuration error if Supabase isn't set up
  if (supabaseConfigError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Configuration Required</h2>
          <p className="text-gray-600 mb-4">
            The app needs to be configured before it can be used.
          </p>
          <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg font-mono">
            {supabaseConfigError}
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Please contact your administrator to set up the Supabase environment variables.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center animate-fade-in">
        <div className="text-white text-center space-y-4">
          <div className="w-20 h-20 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-2xl">💕</span>
          </div>
          <div className="space-y-2">
            <div className="h-2 w-32 bg-white/20 rounded-full mx-auto animate-pulse"></div>
            <div className="h-2 w-24 bg-white/20 rounded-full mx-auto animate-pulse delay-100"></div>
            <div className="h-2 w-28 bg-white/20 rounded-full mx-auto animate-pulse delay-200"></div>
          </div>
          <p className="text-white/80 animate-pulse">Loading your dating experience...</p>
        </div>
      </div>
    );
  }

  const getSEOProps = () => {
    const baseUrl = 'https://dates.care';
    switch (currentScreen) {
      case 'welcome':
        return {
          title: 'Dates.care - Dating, Done Properly | Verified, Trusted Matches',
          description: 'Verified profiles, thoughtful matching, and real conversations. Free to join — browsing and your first message to every connection are always free.',
          canonicalUrl: baseUrl
        };
      case 'signin':
        return {
          title: 'Sign In - Dates Dating App',
          description: 'Sign in to your Dates account to connect with singles, chat, and find meaningful relationships.',
          canonicalUrl: `${baseUrl}/#signin`
        };
      case 'signup':
        return {
          title: 'Sign Up - Join Dates Dating App',
          description: 'Create your free account on Dates and start meeting genuine singles today. Video chat, verified profiles, and more.',
          canonicalUrl: `${baseUrl}/#signup`
        };
      case 'discovery':
        return {
          title: 'Discover Singles - Dates Dating App',
          description: 'Discover and connect with compatible singles near you. Swipe, match, and start conversations.',
          canonicalUrl: `${baseUrl}/#discovery`
        };
      case 'terms':
        return {
          title: 'Terms of Service - Dates Dating App',
          description: 'Read our terms of service and conditions for using the Dates dating platform.',
          canonicalUrl: `${baseUrl}/#terms`
        };
      case 'privacy':
        return {
          title: 'Privacy Policy - Dates Dating App',
          description: 'Learn how Dates protects your privacy and handles your personal information.',
          canonicalUrl: `${baseUrl}/#privacy`
        };
      case 'payment-refund':
        return {
          title: 'Payment & Refund Policy - Dates Dating App',
          description: 'Understand our payment, credits, subscription, and refund policies.',
          canonicalUrl: `${baseUrl}/#payment-refund`
        };
      case 'misconduct':
        return {
          title: 'Misconduct Prevention Policy - Dates Dating App',
          description: 'Our commitment to preventing misconduct, fraud, abuse, and ensuring platform safety.',
          canonicalUrl: `${baseUrl}/#misconduct`
        };
      case 'consent':
        return {
          title: 'Consent Policy - Dates Dating App',
          description: 'Understand your consent rights and how we protect your choices.',
          canonicalUrl: `${baseUrl}/#consent`
        };
      case 'acceptable-use':
        return {
          title: 'Acceptable Use Policy - Dates Dating App',
          description: 'Guidelines for acceptable behavior and content on Dates.care platform.',
          canonicalUrl: `${baseUrl}/#acceptable-use`
        };
      case 'help':
        return {
          title: 'Help & Support - Dates Dating App',
          description: 'Get help and support for your Dates account. FAQs, contact information, and troubleshooting.',
          canonicalUrl: `${baseUrl}/#help`
        };
      case 'care-blog':
        return {
          title: 'Dating Tips & Relationship Advice - Dates Blog',
          description: 'Relationship advice, dating tips, and expert guidance for modern singles looking for meaningful connections.',
          canonicalUrl: `${baseUrl}/#care-blog`
        };
      case 'quizzes':
        return {
          title: 'Interactive Dating Quizzes - Discover Your Love Style',
          description: 'Take fun personality quizzes to discover your love language, dating style, and relationship preferences. Instant results with shareable graphics!',
          canonicalUrl: `${baseUrl}/#quizzes`
        };
      default:
        return {
          title: 'Dates.care - Dating, Done Properly | Verified, Trusted Matches',
          description: 'Verified profiles, thoughtful matching, and real conversations — built for people who are serious about connection.',
          canonicalUrl: baseUrl
        };
    }
  };

  const renderScreen = () => {
    const config = getRouteConfig(currentScreen);

    const renderScreenContent = () => {
      switch (currentScreen) {
        case 'welcome':
          return <Welcome onNavigate={handleNavigate} />;

        case 'signin':
          return <SignIn onNavigate={handleNavigate} />;

        case 'signup':
          return <SignUp onNavigate={handleNavigate} />;

      case 'auth-callback':
        return <AuthCallback onNavigate={handleNavigate} />;

      case 'onboarding':
        return <Onboarding onComplete={() => handleNavigate('discovery')} onBack={() => handleNavigate('signup')} />;

      case 'discovery':
        return <ModernDiscovery onNavigate={handleNavigate} />;

      case 'matches':
        return <Matches onNavigate={handleNavigate} onSelectChatUser={setSelectedChatUser} />;
      
      case 'likes':
        return <Likes onNavigate={handleNavigate} />;
      
      case 'credits':
        return <ModernCredits onNavigate={handleNavigate} />;
      
      case 'gift-shop':
        return <GiftShop onNavigate={handleNavigate} />;
      
      case 'mail':
        return <Mail onNavigate={handleNavigate} />;
      
      case 'profile':
        return <Profile onNavigate={handleNavigate} />;

      case 'view-profile':
        return selectedUserId ? (
          <ViewUserProfile onNavigate={handleNavigate} userId={selectedUserId} />
        ) : (
          <Profile onNavigate={handleNavigate} />
        );

      case 'newsfeed':
        return <Newsfeed onNavigate={handleNavigate} />;
      
      case 'feedback':
        return <Feedback onNavigate={handleNavigate} />;
      
      case 'settings':
        return <Settings onNavigate={handleNavigate} />;
      
      case 'terms':
        return <Terms onNavigate={handleNavigate} />;
      
      case 'privacy':
        return <Privacy onNavigate={handleNavigate} />;
      
      case 'dispute':
        return <Dispute onNavigate={handleNavigate} />;
      
      case 'disclaimer':
        return <Disclaimer onNavigate={handleNavigate} />;

      case 'payment-refund':
        return <PaymentRefund onNavigate={handleNavigate} />;

      case 'misconduct':
        return <MisconductPolicy onNavigate={handleNavigate} />;

      case 'consent':
        return <ConsentPolicy onNavigate={handleNavigate} />;

      case 'acceptable-use':
        return <AcceptableUsePolicy />;

      case 'success':
        return <SuccessPage onNavigate={handleNavigate} />;
      
      case 'cancel':
        return <CancelPage onNavigate={handleNavigate} />;
      
      case 'checkout':
        return <CheckoutPage onNavigate={handleNavigate} />;
      
      case 'staff-panel':
        if (loading || staffLoading) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-600 to-purple-700">
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          );
        }
        if (!user) {
          return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-600 to-purple-700 text-white text-center px-6">
              <p className="text-lg font-semibold mb-2">Sign in required</p>
              <p className="text-white/80 text-sm mb-6">Sign in with your Dates account to access the staff panel.</p>
              <button onClick={() => handleNavigate('signin')} className="bg-white text-rose-600 font-semibold px-6 py-3 rounded-xl">
                Sign In
              </button>
            </div>
          );
        }
        if (!isStaff) {
          return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-600 to-purple-700 text-white text-center px-6">
              <p className="text-lg font-semibold mb-2">Not authorized</p>
              <p className="text-white/80 text-sm mb-6">Your account does not have staff access.</p>
              <button onClick={() => handleNavigate('discovery')} className="bg-white text-rose-600 font-semibold px-6 py-3 rounded-xl">
                Back to Discovery
              </button>
            </div>
          );
        }
        return <StaffPanel onLogout={handleStaffLogout} staffAuth={staffAuth} />;
      
      case 'menu-showcase':
        return <MenuShowcase onNavigate={handleNavigate} />;
      
      case 'video-chat':
        return <VideoChat onNavigate={handleNavigate} />;
      
      case 'audio-chat':
        return <AudioChat onNavigate={handleNavigate} />;
      
      case 'relationship-services':
        return <RelationshipServices onNavigate={handleNavigate} />;

      case 'education':
      case 'financial-education':
        return <Education onNavigate={handleNavigate} />;
      
      case 'match-suitor':
        return <MatchSuitor onNavigate={handleNavigate} />;
      
      case 'verification':
        return <Verification onNavigate={handleNavigate} />;
      
      case 'payment-setup':
        return <PaymentSetup onNavigate={handleNavigate} />;
      
      case 'help':
        return <Help onNavigate={handleNavigate} />;

      case 'care-blog':
        return <CareBlog onNavigate={handleNavigate} />;

      case 'quizzes':
        return <Quizzes onNavigate={handleNavigate} />;

      case 'monitoring':
        return <MonitoringDashboard />;

        default:
          return <Discovery onNavigate={handleNavigate} />;
      }
    };

    const content = renderScreenContent();

    if (config.isPublicOnly) {
      return (
        <PublicRoute
          onNavigate={handleNavigate}
          redirectIfAuthenticated={true}
          redirectTo={config.redirectIfAuthenticated}
        >
          {content}
        </PublicRoute>
      );
    }

    if (config.requireAuth) {
      return (
        <ProtectedRoute
          onNavigate={handleNavigate}
          requireAuth={true}
          allowAnonymous={config.allowAnonymous}
          redirectTo="signin"
        >
          {content}
        </ProtectedRoute>
      );
    }

    return content;
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 overflow-x-hidden">
        {/* SEO Component */}
        <SEO {...getSEOProps()} />

        {/* Menu Component - Always Available */}
        <Menu
          onNavigate={handleNavigate}
          currentScreen={currentScreen}
          selectedChatUser={selectedChatUser}
          onSelectChatUser={setSelectedChatUser}
        />

        {/* Current Screen Content */}
        <div className="relative z-10 w-full min-h-screen">
          <div className={cn(
            "transition-all duration-300",
            isTransitioning ? "opacity-50 scale-95" : "opacity-100 scale-100"
          )}>
            <React.Suspense fallback={<ScreenLoadingFallback />}>
              {renderScreen()}
            </React.Suspense>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
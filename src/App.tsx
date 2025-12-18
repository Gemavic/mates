import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Menu } from '@/components/Menu';
import { SEO } from '@/components/SEO';
import { Welcome } from '@/screens/Welcome/Welcome';
import { SignIn } from '@/screens/Auth/SignIn';
import { SignUp } from '@/screens/Auth/SignUp';
import { Discovery } from '@/screens/Discovery/Discovery';
import BrowseProfiles from '@/screens/Discovery/BrowseProfiles';
import { Matches } from '@/screens/Matches/Matches';
import { Likes } from '@/screens/Likes/Likes';
import { ModernCredits } from '@/screens/Credits/ModernCredits';
import { GiftShop } from '@/screens/GiftShop/GiftShop';
import { Mail } from '@/screens/Mail/Mail';
import { Profile } from '@/screens/Profile/Profile';
import { ViewUserProfile } from '@/screens/Profile/ViewUserProfile';
import { Newsfeed } from '@/screens/Newsfeed/Newsfeed';
import { Feedback } from '@/screens/Feedback/Feedback';
import { Settings } from '@/screens/Settings/Settings';
import { Terms } from '@/screens/Legal/Terms';
import { Privacy } from '@/screens/Legal/Privacy';
import { Dispute } from '@/screens/Legal/Dispute';
import { Disclaimer } from '@/screens/Legal/Disclaimer';
import { PaymentRefund } from '@/screens/Legal/PaymentRefund';
import { MisconductPolicy } from '@/screens/Legal/MisconductPolicy';
import { ConsentPolicy } from '@/screens/Legal/ConsentPolicy';
import { SuccessPage } from '@/screens/Success/SuccessPage';
import { CancelPage } from '@/screens/Cancel/CancelPage';
import { CheckoutPage } from '@/screens/Checkout/CheckoutPage';
import { StaffPanel } from '@/screens/StaffPanel/StaffPanel';
import { StaffLogin } from '@/screens/StaffPanel/StaffLogin';
import { MenuShowcase } from '@/screens/MenuShowcase/MenuShowcase';
import { VideoChat } from '@/screens/VideoChat/VideoChat';
import { AudioChat } from '@/screens/AudioChat/AudioChat';
import { RelationshipServices } from '@/screens/RelationshipServices/RelationshipServices';
import { Education } from '@/screens/Education/Education';
import { MatchSuitor } from '@/screens/MatchSuitor/MatchSuitor';
import { Verification } from '@/screens/Verification/Verification';
import { PaymentSetup } from '@/screens/PaymentSetup/PaymentSetup';
import { Help } from '@/screens/Help/Help';
import { CareBlog } from '@/screens/CareBlog/CareBlog';
import { Quizzes } from '@/screens/Quizzes/Quizzes';
import { MonitoringDashboard } from '@/components/MonitoringDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import { creditManager } from '@/lib/creditSystem';

interface SelectedChatUser {
  id: string;
  name: string;
  image: string;
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [staffAuth, setStaffAuth] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<SelectedChatUser | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { user, loading } = useAuth();

  // Check for existing staff authentication - simplified
  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem('staffAuth');
      if (stored) {
        const session = JSON.parse(stored);
        if (session && session.isAuthenticated) {
          setStaffAuth(session);
        }
      }
    } catch (error) {
      console.warn('Error checking existing staff session:', error);
    }
  }, []);

  const handleStaffLogin = (staffId: string) => {
    try {
      const stored = sessionStorage.getItem('staffAuth');
      if (stored) {
        const session = JSON.parse(stored);
        if (session && session.isAuthenticated) {
          setStaffAuth(session);
          setCurrentScreen('staff-panel');
          console.log(`✅ Staff panel access granted: ${staffId} (${session.role})`);
          return;
        }
      }
      console.error('No valid staff session found');
      setStaffAuth(null);
    } catch (error) {
      console.error('Staff login handler error:', error);
      setStaffAuth(null);
    }
  };

  const handleStaffLogout = () => {
    try {
      sessionStorage.removeItem('staffAuth');
      setStaffAuth(null);
      setCurrentScreen('discovery');
      console.log('✅ Staff logged out successfully');
    } catch (error) {
      console.error('Staff logout error:', error);
      // Ensure logout even on error
      try {
        sessionStorage.removeItem('staffAuth');
      } catch {}
      setStaffAuth(null);
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
    const baseUrl = 'https://dates-app.vercel.app';
    switch (currentScreen) {
      case 'welcome':
        return {
          title: 'Dates - Find Your Perfect Match | Modern Dating App',
          description: 'Meet genuine singles on Dates, the modern dating app with video chat, audio calls, couple therapy, and verified profiles. Start meaningful connections today.',
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
          title: 'Dates - Find Your Perfect Match | Modern Dating App',
          description: 'Meet genuine singles on Dates, the modern dating app with video chat, audio calls, couple therapy, and verified profiles.',
          canonicalUrl: baseUrl
        };
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <Welcome onNavigate={handleNavigate} />;
      
      case 'signin':
        return <SignIn onNavigate={handleNavigate} />;
      
      case 'signup':
        return <SignUp onNavigate={handleNavigate} />;
      
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
      
      case 'success':
        return <SuccessPage onNavigate={handleNavigate} />;
      
      case 'cancel':
        return <CancelPage onNavigate={handleNavigate} />;
      
      case 'checkout':
        return <CheckoutPage onNavigate={handleNavigate} />;
      
      case 'staff-panel':
        return staffAuth 
          ? <StaffPanel onLogout={handleStaffLogout} staffAuth={staffAuth} />
          : <StaffLogin onNavigate={handleNavigate} onStaffLogin={handleStaffLogin} />;
      
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
            {renderScreen()}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
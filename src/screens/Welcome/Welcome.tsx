import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Heart,
  ShieldCheck,
  BadgeCheck,
  Lock,
  MessageCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface WelcomeProps {
  onNavigate?: (screen: string) => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onNavigate = () => {} }) => {
  const { user, getFirstName } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-600 via-rose-500 to-purple-700 flex flex-col">
      {/* Subtle decorative glow — no stock photos, no bouncing elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-purple-400/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto flex-1 flex flex-col px-5 sm:px-6">
        {/* Hero */}
        <header className="text-center pt-14 sm:pt-20 pb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/15 backdrop-blur-sm rounded-2xl mb-6 shadow-xl border border-white/20">
            <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="currentColor" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            Dating, done
            <span className="block">properly.</span>
          </h1>
          <p className="text-white/85 text-base sm:text-lg max-w-sm mx-auto leading-relaxed">
            Verified profiles, thoughtful matching, and real conversations —
            built for people who are serious about connection.
          </p>
        </header>

        {/* Primary actions */}
        <div className="space-y-3 mb-10">
          {user ? (
            <>
              <Button
                onClick={() => onNavigate('discovery')}
                className="w-full h-13 py-4 bg-white text-rose-600 hover:bg-white/90 font-semibold text-base rounded-xl shadow-lg"
              >
                Welcome back, {getFirstName()} — start browsing
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                onClick={() => onNavigate('profile')}
                className="w-full py-4 bg-white/10 text-white hover:bg-white/20 font-medium text-base rounded-xl border border-white/25"
              >
                View my profile
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => onNavigate('signup')}
                className="w-full py-4 bg-white text-rose-600 hover:bg-white/90 font-semibold text-base rounded-xl shadow-lg"
              >
                Create your free account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                onClick={() => onNavigate('signin')}
                className="w-full py-4 bg-white/10 text-white hover:bg-white/20 font-medium text-base rounded-xl border border-white/25"
              >
                Sign in
              </Button>
              <p className="text-center text-white/60 text-xs pt-1">
                Free to join. Browsing and your first message to every
                connection are always free.
              </p>
            </>
          )}
        </div>

        {/* Trust & safety — the reason to choose this platform */}
        <section className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5 sm:p-6 mb-8">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
            Built on trust
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <BadgeCheck className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium text-sm">Verified profiles</p>
                <p className="text-white/70 text-xs leading-relaxed">
                  Photo and identity verification keeps fake accounts out.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium text-sm">Active moderation</p>
                <p className="text-white/70 text-xs leading-relaxed">
                  Content moderation and one-tap reporting on every profile
                  and conversation.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium text-sm">Your data stays yours</p>
                <p className="text-white/70 text-xs leading-relaxed">
                  We never sell personal data. Read our{' '}
                  <button
                    onClick={() => onNavigate('privacy')}
                    className="underline underline-offset-2 hover:text-white"
                  >
                    privacy policy
                  </button>
                  .
                </p>
              </div>
            </li>
          </ul>
        </section>

        {/* How it works */}
        <section className="mb-10">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 px-1">
            How it works
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl border border-white/15 p-4 text-center">
              <Sparkles className="w-5 h-5 text-white mx-auto mb-2" />
              <p className="text-white text-xs font-medium">Create a real profile</p>
            </div>
            <div className="bg-white/10 rounded-xl border border-white/15 p-4 text-center">
              <Heart className="w-5 h-5 text-white mx-auto mb-2" />
              <p className="text-white text-xs font-medium">Match on what matters</p>
            </div>
            <div className="bg-white/10 rounded-xl border border-white/15 p-4 text-center">
              <MessageCircle className="w-5 h-5 text-white mx-auto mb-2" />
              <p className="text-white text-xs font-medium">Talk, meet, connect</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto pb-8 text-center">
          <div className="flex items-center justify-center gap-4 text-white/60 text-xs">
            <button onClick={() => onNavigate('terms')} className="hover:text-white transition-colors">
              Terms
            </button>
            <span aria-hidden="true">·</span>
            <button onClick={() => onNavigate('privacy')} className="hover:text-white transition-colors">
              Privacy
            </button>
            <span aria-hidden="true">·</span>
            <button onClick={() => onNavigate('help')} className="hover:text-white transition-colors">
              Help
            </button>
          </div>
          <p className="text-white/40 text-xs mt-3">© 2026 Dates. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

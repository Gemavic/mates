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
  Video,
  Phone,
  Gift,
  Mail,
  Users,
  Check,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CREDIT_COSTS } from '@/lib/creditSystem';
import {
  MAIL_SEND_COST, MAIL_OPEN_COST, MAIL_PHOTO_COST, MAIL_AUDIO_COST,
  MAIL_VIDEO_COST, EXCLUSIVE_SEND_COST, AUDIO_CALL_PER_MINUTE, VIDEO_CALL_PER_MINUTE,
} from '@/lib/exclusivePricing';

interface WelcomeProps {
  onNavigate?: (screen: string) => void;
}

/**
 * The public front page.
 *
 * This used to be a sign-in gate: a logo, a tagline and two buttons. That cost
 * real money twice over. Google's OAuth brand verification rejected the app
 * with "your homepage is behind a login page", which is why the consent screen
 * still shows a Supabase project ref instead of Dates.care. And a site whose
 * only server-rendered content is meta tags is invisible in search - there was
 * nothing for anyone to index or read.
 *
 * So the page now explains the product before it asks for anything: what it is,
 * how it works, what it costs, and who is behind it. Sign-in moved to the
 * header and to CTAs. index.html carries a plain-HTML copy of the same content
 * for anything that does not run JavaScript - keep the two in step.
 */

const CREDIT_PACKS = [
  // Must match getCreditPackages() in src/lib/creditSystem.tsx and
  // CATALOG in api/_catalog.js. The homepage was still advertising the
  // pre-increase amounts, which meant the public page and the checkout
  // quoted different products at the same price.
  { name: 'Starter', credits: 65, bonus: 10, price: '12.99' },
  { name: 'Popular', credits: 130, bonus: 30, price: '18.99', popular: true },
  { name: 'Premium', credits: 580, bonus: 70, price: '50.99' },
];

// Quoted from the same constants the biller uses. This list previously
// advertised 50/min audio and 100/min video, neither of which was what a
// caller was actually charged.
const SPEND = [
  { what: 'Live chat, likes and winks', cost: 'Free' },
  { what: 'Mail', cost: `${MAIL_SEND_COST} to send, ${MAIL_OPEN_COST} to open` },
  { what: 'Photo in mail', cost: `${MAIL_PHOTO_COST} credits` },
  { what: 'Audio note', cost: `${MAIL_AUDIO_COST} credits` },
  { what: 'Video note', cost: `${MAIL_VIDEO_COST} credits` },
  { what: 'Exclusive', cost: `${EXCLUSIVE_SEND_COST} credits each way` },
  { what: 'Virtual gift', cost: 'from 5 credits' },
  { what: 'Super like', cost: `${CREDIT_COSTS.SUPER_LIKE} credits` },
  { what: 'Profile boost (30 min)', cost: `${CREDIT_COSTS.BOOST} credits` },
  { what: 'Audio call', cost: `${AUDIO_CALL_PER_MINUTE} credits/min (caller pays)` },
  { what: 'Video call', cost: `${VIDEO_CALL_PER_MINUTE} credits/min (caller pays)` },
];

const FAQ = [
  {
    q: 'Is Dates.care free to join?',
    a: 'Yes. Creating an account, building a profile, browsing other members and chatting are all free, with no limit on messages. Credits are only needed for the extras listed above.',
  },
  {
    q: 'What are credits for?',
    a: 'Credits pay for the optional extras — sending a photo or a gift, mail, boosting your profile, and audio or video calls. Chatting itself is free. You buy credits in packs and they do not expire.',
  },
  {
    q: 'How do you keep fake profiles out?',
    a: 'Photo and identity verification, automated content moderation on photos and messages, and one-tap reporting on every profile and conversation. Reports are reviewed by our moderation team.',
  },
  {
    q: 'Who can see my personal information?',
    a: 'Only what you choose to put on your profile. We do not sell personal data to anyone. The full detail is in our privacy policy.',
  },
  {
    q: 'Can I use Dates.care on my phone?',
    a: 'Yes. The site works in any mobile browser, and you can install it to your home screen from Chrome or Safari for a full-screen app experience.',
  },
];

export const Welcome: React.FC<WelcomeProps> = ({ onNavigate = () => {} }) => {
  const { user, getFirstName } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* ---------------------------------------------------------------- header */}
      <header className="bg-gradient-to-br from-rose-600 via-rose-500 to-purple-700">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <nav className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/brand/logo.svg"
                alt=""
                width={36}
                height={36}
                className="w-9 h-9 rounded-lg"
              />
              <span className="text-white font-bold text-lg tracking-tight">Dates.care</span>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <Button
                  onClick={() => onNavigate('discovery')}
                  className="bg-none bg-white text-rose-600 hover:bg-white/90 font-semibold text-sm rounded-lg px-4 py-2"
                >
                  Open the app
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => onNavigate('signin')}
                    className="bg-none bg-transparent text-white hover:bg-white/15 font-medium text-sm rounded-lg px-3 py-2"
                  >
                    Sign in
                  </Button>
                  <Button
                    onClick={() => onNavigate('signup')}
                    className="bg-none bg-white text-rose-600 hover:bg-white/90 font-semibold text-sm rounded-lg px-4 py-2"
                  >
                    Join free
                  </Button>
                </>
              )}
            </div>
          </nav>

          {/* -------------------------------------------------------------- hero */}
          <div className="relative py-14 sm:py-20 text-center">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-pink-400/20 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-purple-400/20 blur-3xl" />
            </div>
            <div className="relative">
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-5">
                Dating, done
                <span className="block">properly.</span>
              </h1>
              <p className="text-white/90 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
                Dates.care is an online dating service for people who are serious
                about connection. Verified profiles, thoughtful matching, and
                real conversations — with video and audio calls, private
                messaging, and relationship support when you want it.
              </p>

              {user ? (
                <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                  <Button
                    onClick={() => onNavigate('discovery')}
                    className="flex-1 py-3.5 bg-none bg-white text-rose-600 hover:bg-white/90 font-semibold rounded-xl shadow-lg"
                  >
                    Welcome back, {getFirstName()} — start browsing
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                    <Button
                      onClick={() => onNavigate('signup')}
                      className="flex-1 py-3.5 bg-none bg-white text-rose-600 hover:bg-white/90 font-semibold rounded-xl shadow-lg"
                    >
                      Create your free account
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button
                      onClick={() => onNavigate('signin')}
                      className="flex-1 py-3.5 bg-none bg-white/10 text-white hover:bg-white/20 font-medium rounded-xl border border-white/25"
                    >
                      Sign in
                    </Button>
                  </div>
                  <p className="text-white/70 text-sm mt-4">
                    Free to join. Browsing and chatting are free, with no limit
                    on messages.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ how it works */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-3">
          How Dates.care works
        </h2>
        <p className="text-slate-600 text-center max-w-xl mx-auto mb-10">
          Three steps, no games, and nothing hidden behind a paywall until you
          decide it is worth paying for.
        </p>
        <ol className="grid sm:grid-cols-3 gap-5">
          {[
            { n: '1', icon: Sparkles, t: 'Create a real profile',
              d: 'Add your photos and verify who you are. Verification is what keeps this a community of real people.' },
            { n: '2', icon: Heart, t: 'Match on what matters',
              d: 'Browse and like freely. Matching weighs what you are actually looking for, not just who swiped fastest.' },
            { n: '3', icon: MessageCircle, t: 'Talk, meet, connect',
              d: 'Message as much as you like — chat is free. Calls, gifts and mail are there when you want them.' },
          ].map(s => (
            <li key={s.n} className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-rose-600 text-white text-sm font-bold flex items-center justify-center flex-none">
                  {s.n}
                </span>
                <s.icon className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5">{s.t}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* --------------------------------------------------------------- features */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-10">
            What you can do
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: MessageCircle, t: 'Private messaging', d: 'One-to-one conversations, free and unlimited. Photos are a paid extra.' },
              { icon: Video, t: 'Video calls', d: 'Meet face to face before you meet in person — the safest way to know who you are talking to.' },
              { icon: Phone, t: 'Audio calls', d: 'A voice call when video feels like too much, too soon.' },
              { icon: Gift, t: 'Virtual gifts', d: 'Over a hundred hand-drawn gifts, from a simple hello to something genuinely memorable.' },
              { icon: Mail, t: 'Mail', d: 'Longer letters for the conversations that deserve more than a chat window.' },
              { icon: Users, t: 'Relationship support', d: 'Couple therapy and counselling from qualified practitioners, for members who want it.' },
            ].map(f => (
              <div key={f.t} className="bg-white rounded-2xl border border-slate-200 p-6">
                <f.icon className="w-6 h-6 text-rose-600 mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1.5">{f.t}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ trust */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-3">
          Built on trust
        </h2>
        <p className="text-slate-600 text-center max-w-xl mx-auto mb-10">
          Online dating only works if the people are real and the platform is on
          your side.
        </p>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { icon: BadgeCheck, t: 'Verified profiles', d: 'Photo and identity verification keeps fake accounts out. Verified members carry a badge.' },
            { icon: ShieldCheck, t: 'Active moderation', d: 'Automated moderation on photos and messages, plus one-tap reporting on every profile and conversation.' },
            { icon: Lock, t: 'Your data stays yours', d: 'We never sell personal data. You control what appears on your profile and can delete your account at any time.' },
          ].map(t => (
            <div key={t.t} className="text-center px-2">
              <t.icon className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-1.5">{t.t}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{t.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------- signing in / user data */}
      {/* Google's OAuth homepage requirements include "explain with transparency
          the purpose for which your app requests user data". Everything else on
          their checklist was already met; this section is that line. Keep it in
          step with the same block in index.html. */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20">
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">
            Signing in, and what we ask for
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-3">
            You can create your account with an email address and password, or with
            Google, Facebook or Apple. If you choose one of those, we ask that
            provider for three things only: your name, your email address and your
            profile picture. We use them to create your Dates.care account, to sign
            you in again on your next visit, and to fill in your profile so you are
            not retyping what you have already entered elsewhere.
          </p>
          <p className="text-slate-600 text-sm leading-relaxed">
            We never request access to your mail, contacts, calendar or files, we
            never post anything on your behalf, and we do not sell or share what we
            receive. You can disconnect at any time from your account settings, or
            from your Google Account permissions page. The full detail is in our{' '}
            <a href="/privacy" className="text-rose-600 underline">privacy policy</a>.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- pricing */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-3">
            What it costs
          </h2>
          <p className="text-slate-600 text-center max-w-xl mx-auto mb-10">
            No subscription. You buy credits only if and when you want the
            extras, and they do not expire.
          </p>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 max-w-2xl mx-auto">
            <h3 className="font-semibold text-slate-900 mb-4">Always free</h3>
            <ul className="space-y-2.5">
              {[
                'Creating an account and building your profile',
                'Browsing and liking other members',
                'Chatting — every message, to everyone, with no limit',
              ].map(x => (
                <li key={x} className="flex items-start gap-2.5 text-slate-700 text-sm">
                  <Check className="w-4 h-4 text-emerald-600 flex-none mt-0.5" />
                  {x}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">What credits buy</h3>
              <dl className="space-y-2.5">
                {SPEND.map(s => (
                  <div key={s.what} className="flex justify-between gap-4 text-sm">
                    <dt className="text-slate-700">{s.what}</dt>
                    <dd className="text-slate-900 font-medium whitespace-nowrap">{s.cost}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Credit packs</h3>
              <ul className="space-y-3">
                {CREDIT_PACKS.map(p => (
                  <li
                    key={p.name}
                    className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 border ${
                      p.popular ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-slate-900 text-sm">
                        {p.name}
                        {p.popular && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                            Most popular
                          </span>
                        )}
                      </p>
                      <p className="text-slate-600 text-xs">
                        {p.credits} credits + {p.bonus} bonus
                      </p>
                    </div>
                    <span className="font-bold text-slate-900 whitespace-nowrap">
                      ${p.price}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-slate-500 text-xs mt-4">
                Prices in US dollars. Tax is calculated at checkout for your
                country.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- faq */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-10">
          Common questions
        </h2>
        <dl className="space-y-6">
          {FAQ.map(f => (
            <div key={f.q} className="border-b border-slate-200 pb-6 last:border-0">
              <dt className="font-semibold text-slate-900 mb-2">{f.q}</dt>
              <dd className="text-slate-600 text-sm leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------------- closing cta */}
      {!user && (
        <section className="bg-gradient-to-br from-rose-600 via-rose-500 to-purple-700">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14 sm:py-16 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Ready when you are
            </h2>
            <p className="text-white/85 mb-7 max-w-md mx-auto">
              Join free, browse as long as you like, and only spend a credit
              when something is worth it.
            </p>
            <Button
              onClick={() => onNavigate('signup')}
              className="bg-none bg-white text-rose-600 hover:bg-white/90 font-semibold rounded-xl px-8 py-3.5 shadow-lg"
            >
              Create your free account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- footer */}
      <footer className="bg-slate-900">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <img src="/brand/logo.svg" alt="" width={28} height={28} className="w-7 h-7 rounded-md" />
              <span className="text-white font-semibold">Dates.care</span>
            </div>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {/* Real anchors, not router buttons. Google's OAuth brand check
                  fetches these URLs without running JavaScript, so the policies
                  have to be reachable as ordinary links to static pages. */}
              <a href="/terms" className="text-slate-300 hover:text-white transition-colors">
                Terms
              </a>
              <a href="/privacy" className="text-slate-300 hover:text-white transition-colors">
                Privacy
              </a>
              {[
                ['payment-refund', 'Payments & refunds'],
                ['help', 'Help'],
              ].map(([screen, label]) => (
                <button
                  key={screen}
                  onClick={() => onNavigate(screen)}
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  {label}
                </button>
              ))}
              <a
                href="mailto:support@dates.care"
                className="text-slate-300 hover:text-white transition-colors"
              >
                support@dates.care
              </a>
            </nav>
          </div>
          <p className="text-slate-500 text-xs mt-8">
            © 2026 Dates.care. All rights reserved. Dates.care is an online
            dating service. You must be 18 or older to create an account.
          </p>
        </div>
      </footer>
    </div>
  );
};

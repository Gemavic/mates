import React, { useState } from 'react';
import { Mail, Check, Loader as Loader2, Heart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface NewsletterSignupProps {
  variant?: 'compact' | 'full' | 'inline';
  className?: string;
  title?: string;
  description?: string;
}

export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({
  variant = 'full',
  className = '',
  title = 'Dating Advice Weekly',
  description = 'Get expert dating tips, relationship advice, and exclusive content delivered to your inbox every week.'
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');

    try {
      const { data: existingSubscription } = await supabase
        .from('newsletter_subscriptions')
        .select('id, is_active')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingSubscription?.is_active) {
        setStatus('error');
        setMessage("You're already subscribed! Check your inbox for our latest newsletter.");
        return;
      }

      if (existingSubscription && !existingSubscription.is_active) {
        const { error } = await supabase
          .from('newsletter_subscriptions')
          .update({
            is_active: true,
            name: name || null,
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null
          })
          .eq('id', existingSubscription.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('newsletter_subscriptions')
          .insert([{
            email: email.toLowerCase(),
            name: name || null,
            is_active: true,
            preferences: {
              frequency: 'weekly',
              topics: ['dating_advice', 'relationship_tips', 'date_ideas']
            }
          }]);

        if (error) throw error;
      }

      setStatus('success');
      setMessage("Success! Welcome to our community. Check your email for a welcome message.");
      setEmail('');
      setName('');

      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    } catch (error: any) {
      console.error('Newsletter subscription error:', error);
      setStatus('error');
      setMessage(error.message || 'Something went wrong. Please try again.');

      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    }
  };

  if (variant === 'compact') {
    return (
      <div className={cn("bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl p-4 shadow-lg", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-5 h-5 text-white" />
          <h3 className="text-white font-bold text-base">Get Dating Tips</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            disabled={status === 'loading' || status === 'success'}
            className="w-full px-3 py-2 rounded-lg border-2 border-white/30 bg-white/20 text-white placeholder-white/70 focus:outline-none focus:border-white transition-colors"
          />
          <Button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="w-full bg-white text-pink-600 hover:bg-white/90 font-semibold"
          >
            {status === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {status === 'success' && <Check className="w-4 h-4 mr-2" />}
            {status === 'success' ? 'Subscribed!' : 'Subscribe'}
          </Button>
        </form>
        {message && (
          <p className={cn(
            "text-xs mt-2",
            status === 'success' ? 'text-white' : 'text-red-100'
          )}>
            {message}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn("bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20", className)}>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={status === 'loading' || status === 'success'}
            className="flex-1 px-4 py-2 rounded-lg border-2 border-white/30 bg-white/20 text-white placeholder-white/70 focus:outline-none focus:border-white transition-colors"
          />
          <Button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="bg-white text-pink-600 hover:bg-white/90 font-semibold px-6"
          >
            {status === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {status === 'success' && <Check className="w-4 h-4 mr-2" />}
            {status === 'success' ? 'Done!' : 'Subscribe'}
          </Button>
        </form>
        {message && (
          <p className={cn(
            "text-xs mt-2",
            status === 'success' ? 'text-white' : 'text-red-100'
          )}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden", className)}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-xl sm:text-2xl">{title}</h3>
            <div className="flex items-center gap-1 mt-1">
              <Sparkles className="w-3 h-3 text-yellow-300" />
              <span className="text-white/90 text-xs">Free & Weekly</span>
            </div>
          </div>
        </div>

        <p className="text-white/90 text-sm sm:text-base mb-6">
          {description}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              disabled={status === 'loading' || status === 'success'}
              className="w-full px-4 py-3 rounded-xl border-2 border-white/30 bg-white/20 text-white placeholder-white/70 focus:outline-none focus:border-white transition-colors backdrop-blur-sm"
            />
          </div>

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              disabled={status === 'loading' || status === 'success'}
              className="w-full px-4 py-3 rounded-xl border-2 border-white/30 bg-white/20 text-white placeholder-white/70 focus:outline-none focus:border-white transition-colors backdrop-blur-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="w-full bg-white text-pink-600 hover:bg-white/90 font-bold text-base py-6 rounded-xl shadow-xl hover:scale-105 transition-all duration-300"
          >
            {status === 'loading' && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
            {status === 'success' && <Check className="w-5 h-5 mr-2" />}
            {status === 'success' ? (
              'Welcome to Our Community!'
            ) : (
              <>
                <Heart className="w-5 h-5 mr-2" fill="currentColor" />
                Subscribe to Weekly Tips
              </>
            )}
          </Button>
        </form>

        {message && (
          <div className={cn(
            "mt-4 p-3 rounded-xl text-sm",
            status === 'success'
              ? 'bg-green-500/20 border border-green-300/30 text-white'
              : 'bg-red-500/20 border border-red-300/30 text-white'
          )}>
            {message}
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/70">
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3" />
            No spam
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3" />
            Unsubscribe anytime
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3" />
            Privacy protected
          </span>
        </div>
      </div>
    </div>
  );
};

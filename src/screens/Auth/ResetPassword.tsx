import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabaseClient } from '@/lib/supabase';
import { Lock, CheckCircle } from 'lucide-react';

interface ResetPasswordProps {
  onNavigate: (screen: string) => void;
}

/**
 * Where a password-reset link lands.
 *
 * The reset email was being sent correctly, but it pointed at /reset-password
 * and no such screen existed - the app routes on internal state, not the URL,
 * so the link opened the app at its default screen with no way to set a new
 * password. Reset could be started but never finished, by anyone.
 *
 * By the time this renders, the recovery link has already established a
 * session, so updateUser is all that is needed to set the new password.
 */
export const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Those two passwords do not match.');
      return;
    }

    setIsSaving(true);
    try {
      const { error: updateError } = await supabaseClient.auth.updateUser({ password });

      if (updateError) {
        // The commonest case: the link was already used, or it expired.
        setError(
          updateError.message.toLowerCase().includes('session')
            ? 'That reset link has expired. Request a new one and use it within the hour.'
            : updateError.message
        );
        return;
      }

      setDone(true);
    } catch {
      setError('Could not set your password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900">
        <div className="w-full max-w-sm bg-white dark:bg-night-800 rounded-2xl p-6 text-center shadow-xl">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            Password updated
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-300 mb-5">
            You are signed in and can carry on.
          </p>
          <Button
            onClick={() => onNavigate('discovery')}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white dark:bg-night-800 rounded-2xl p-6 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-5 h-5 text-pink-500" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            Choose a new password
          </h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-slate-300 mb-5">
          At least 8 characters.
        </p>

        <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
          New password
        </label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="mb-4"
          required
        />

        <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
          Confirm new password
        </label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="mb-4"
          required
        />

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isSaving}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Set new password'}
        </Button>

        <button
          type="button"
          onClick={() => onNavigate('signin')}
          className="w-full text-sm text-gray-500 dark:text-slate-400 mt-3 hover:underline"
        >
          Back to sign in
        </button>
      </form>
    </div>
  );
};

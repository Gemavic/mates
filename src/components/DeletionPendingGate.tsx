import React, { useEffect, useState } from 'react';
import { Clock, LogOut, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase';

/**
 * Shown instead of the app while a member's deletion request is pending or
 * held. They can read the date, keep the account, or sign out; nothing
 * else, because the server will refuse messages, calls and likes anyway.
 */
export interface DeletionRequestState {
  status: 'pending' | 'held';
  requested_at: string;
  due_at: string;
  held: boolean;
}

export async function fetchMyDeletionRequest(): Promise<DeletionRequestState | null> {
  const { data, error } = await supabaseClient.rpc('my_deletion_request');
  if (error || !data) return null;
  return data as DeletionRequestState;
}

interface Props {
  request: DeletionRequestState;
  onKept: () => void;
  onSignOut: () => void;
}

export const DeletionPendingGate: React.FC<Props> = ({ request, onKept, onSignOut }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const due = new Date(request.due_at);

  useEffect(() => { setError(null); }, [request.status]);

  const keep = async () => {
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabaseClient.rpc('cancel_account_deletion');
    setBusy(false);
    if (err || !(data as { success?: boolean } | null)?.success) {
      setError('We could not cancel the request just now. Please try again or email admin@dates.care.');
      return;
    }
    onKept();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full text-gray-800">
        <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-7 h-7 text-rose-600" />
        </div>
        <h1 className="text-xl font-bold mb-2">Your account is being deleted</h1>
        <p className="text-sm text-gray-600">
          Your profile is hidden. Your account is reviewed and deleted within 14 days of your request
          {request.held ? '' : <>, by <strong>{due.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</strong></>}.
          Until it is deleted you can change your mind and keep it.
        </p>
        <p className="text-xs text-gray-500 mt-3">
          Records the law requires us to keep are archived as described in our Privacy Policy.
        </p>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <div className="mt-6 space-y-3">
          <Button type="button" onClick={keep} disabled={busy} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-2xl">
            <Undo2 className="w-4 h-4 mr-2" /> {busy ? 'One moment…' : 'Keep my account'}
          </Button>
          <Button type="button" onClick={onSignOut} variant="outline" className="w-full py-3 rounded-2xl">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
};

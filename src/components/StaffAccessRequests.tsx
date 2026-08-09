import React, { useEffect, useState } from 'react';
import { Clock, ShieldCheck, ShieldX, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase';

interface MyRequest {
  id: string;
  scope: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'denied' | 'revoked';
  requested_at: string;
  expires_at: string | null;
}

interface PendingRequest {
  id: string;
  user_id: string;
  requester_name: string;
  scope: string;
  reason: string | null;
  requested_at: string;
}

const SCOPES = [
  { id: 'calling', label: 'Free Calling', description: 'Waives audio/video call credit charges while active.' },
] as const;

export const StaffAccessRequests: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [reason, setReason] = useState('');
  const [scope, setScope] = useState<string>('calling');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const loadMyRequests = async () => {
    const { data } = await supabaseClient.rpc('my_staff_access_requests');
    if (data) setMyRequests(data as MyRequest[]);
  };

  const loadPending = async () => {
    if (!isAdmin) return;
    const { data, error } = await supabaseClient.rpc('pending_staff_access_requests');
    if (!error && data) setPending(data as PendingRequest[]);
  };

  useEffect(() => {
    loadMyRequests();
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const submitRequest = async () => {
    setSubmitting(true);
    setMessage('');
    try {
      const { data, error } = await supabaseClient.rpc('request_staff_access', {
        p_scope: scope,
        p_reason: reason || null,
      });
      if (error || !data?.success) {
        setMessage(
          data?.error === 'already_pending'
            ? 'You already have a pending request for this. An admin needs to review it first.'
            : 'Could not submit request. Please try again.'
        );
      } else {
        setMessage('Request submitted — an admin will review it.');
        setReason('');
        loadMyRequests();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const review = async (requestId: string, approve: boolean, durationDays = 30) => {
    const { data, error } = await supabaseClient.rpc('review_staff_access_request', {
      p_request_id: requestId,
      p_approve: approve,
      p_duration_days: durationDays,
    });
    if (!error && data?.success) {
      loadPending();
      loadMyRequests();
    }
  };

  const revoke = async (requestId: string) => {
    const { data, error } = await supabaseClient.rpc('revoke_staff_access', { p_request_id: requestId });
    if (!error && data?.success) loadMyRequests();
  };

  return (
    <div className="space-y-6">
      {/* Request form — every staff member sees this */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Send className="w-4 h-4" /> Request Free-Feature Access
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Access is time-bound and requires admin approval — being staff no longer grants this automatically.
        </p>
        <div className="space-y-3">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {SCOPES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why do you need this? (optional, helps the reviewer decide)"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={2}
          />
          <Button onClick={submitRequest} disabled={submitting} className="w-full">
            {submitting ? 'Submitting…' : 'Submit Request'}
          </Button>
          {message && <p className="text-sm text-gray-600">{message}</p>}
        </div>
      </div>

      {/* My request history */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-3">My Requests</h3>
        {myRequests.length === 0 ? (
          <p className="text-sm text-gray-400">No requests yet.</p>
        ) : (
          <div className="space-y-2">
            {myRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="font-medium capitalize">{r.scope}</span>{' '}
                  <span
                    className={
                      r.status === 'approved' ? 'text-green-600' :
                      r.status === 'denied' ? 'text-red-500' :
                      r.status === 'revoked' ? 'text-gray-400' : 'text-amber-500'
                    }
                  >
                    · {r.status}
                  </span>
                  {r.status === 'approved' && r.expires_at && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      expires {new Date(r.expires_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {r.status === 'approved' && (
                  <button onClick={() => revoke(r.id)} className="text-xs text-gray-400 hover:text-red-500">
                    give up access
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin-only approval queue */}
      {isAdmin && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Pending Approvals</h3>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing waiting for review.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <div key={p.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{p.requester_name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(p.requested_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 capitalize mb-1">{p.scope}</p>
                  {p.reason && <p className="text-xs text-gray-500 mb-2 italic">"{p.reason}"</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => review(p.id, true, 30)} className="flex-1">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Approve (30 days)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => review(p.id, false)}
                      className="flex-1"
                    >
                      <ShieldX className="w-3.5 h-3.5 mr-1" /> Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

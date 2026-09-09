import React, { useCallback, useEffect, useState } from 'react';
import { Clock, FileSearch, Lock, RefreshCw, ShieldAlert, ShieldCheck, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase';

/**
 * Admin view of account deletion requests, and the lawful-access lookup.
 *
 * Requests: every member who has asked to leave, with what is open on the
 * account right now. Held requests wait for a person; "Release" lets the
 * fourteen-day clock finish, "Hold" stops it with a written reason. The
 * server (hold_/release_account_deletion) checks is_admin and re-checks
 * the account on the day, so a release with a report still open simply
 * holds again.
 *
 * Lawful access: retained records for one account, by ID, only with a
 * written basis (an order, a file number). Every lookup is logged with who
 * asked and why, and the log is shown underneath. There is no browse.
 */

interface Row {
  user_id: string;
  status: 'pending' | 'held' | 'cancelled' | 'completed';
  requested_at: string;
  due_at: string;
  hold_reason: string | null;
  held_at: string | null;
  released_at: string | null;
  completed_at: string | null;
  display_name: string;
  email: string | null;
  open_now: string | null;
}

interface LogRow { id: number; actor_id: string | null; subject_id: string; reason: string; accessed_at: string }

const fmt = (s: string | null) => (s ? new Date(s).toLocaleDateString() : '');

export const AccountDeletionsPanel: React.FC<{ onSuccess?: (m: string) => void; onError?: (m: string) => void }> = ({ onSuccess, onError }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [basis, setBasis] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [log, setLog] = useState<LogRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: logData }] = await Promise.all([
      supabaseClient.rpc('deletion_requests_for_staff'),
      supabaseClient.rpc('lawful_access_history'),
    ]);
    if (error) onError?.(error.message);
    setRows((data ?? []) as Row[]);
    setLog((logData ?? []) as LogRow[]);
    setLoading(false);
  }, [onError]);

  useEffect(() => { void load(); }, [load]);

  const act = async (fn: 'hold_account_deletion' | 'release_account_deletion', userId: string) => {
    const text = (note[userId] ?? '').trim();
    if (text.length < 10) { onError?.('Write a reason of at least 10 characters first.'); return; }
    setBusy(userId);
    const args = fn === 'hold_account_deletion' ? { p_user: userId, p_reason: text } : { p_user: userId, p_note: text };
    const { data, error } = await supabaseClient.rpc(fn, args);
    setBusy(null);
    if (error || !(data as { success?: boolean } | null)?.success) {
      onError?.(error?.message || (data as { error?: string } | null)?.error || 'That did not work.');
      return;
    }
    onSuccess?.(fn === 'hold_account_deletion' ? 'Request held.' : 'Request released; it will run on its due date if nothing reopens.');
    setNote((n) => ({ ...n, [userId]: '' }));
    await load();
  };

  const lookup = async () => {
    const id = subject.trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) { onError?.('Enter the member ID (36 characters).'); return; }
    if (basis.trim().length < 20) { onError?.('State the lawful basis: the order, file number or request (at least 20 characters).'); return; }
    setLooking(true);
    setResult(null);
    const { data, error } = await supabaseClient.rpc('lawful_access_lookup', { p_user: id, p_reason: basis.trim() });
    setLooking(false);
    if (error) { onError?.(error.message); return; }
    setResult(JSON.stringify(data, null, 2));
    await load();
  };

  const open = rows.filter((r) => r.status === 'pending' || r.status === 'held');
  const past = rows.filter((r) => r.status === 'cancelled' || r.status === 'completed');

  return (
    <div className="space-y-6 text-white">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg inline-flex items-center gap-2"><Clock className="w-5 h-5" /> Deletion requests</h3>
          <button type="button" onClick={() => load()} aria-label="Refresh" className="p-1 text-white/70 hover:text-white">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-xs text-white/60 mb-4">
          A member who asks to leave is hidden at once and removed fourteen days later, unless something is open on the
          account. Held requests wait here for a person. Nothing is deleted while a report, dispute or payment is open,
          whatever button is pressed.
        </p>
        {open.length === 0 && !loading && <p className="text-white/60 text-sm">No open requests.</p>}
        <ul className="divide-y divide-white/10">
          {open.map((r) => (
            <li key={r.user_id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium leading-snug">
                    {r.display_name} <span className="text-white/50 text-xs font-mono">{r.user_id.slice(0, 8)}</span>
                  </p>
                  <p className="text-xs text-white/60 mt-0.5">
                    {r.email} · asked {fmt(r.requested_at)} · due {fmt(r.due_at)}
                  </p>
                  {r.status === 'held' && (
                    <p className="text-xs mt-1 inline-flex items-center gap-1 text-amber-200">
                      <ShieldAlert className="w-3.5 h-3.5" /> Held: {r.hold_reason}
                    </p>
                  )}
                  {r.open_now && r.status !== 'held' && (
                    <p className="text-xs mt-1 text-amber-200">Open now: {r.open_now}</p>
                  )}
                  {r.status === 'held' && !r.open_now && (
                    <p className="text-xs mt-1 inline-flex items-center gap-1 text-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" /> Nothing open on the account any more
                    </p>
                  )}
                </div>
                <span className={`shrink-0 text-[11px] uppercase tracking-wide px-2 py-0.5 rounded ${r.status === 'held' ? 'bg-amber-400/20 text-amber-100' : 'bg-white/10 text-white/70'}`}>
                  {r.status}
                </span>
              </div>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  value={note[r.user_id] ?? ''}
                  onChange={(e) => setNote((n) => ({ ...n, [r.user_id]: e.target.value }))}
                  placeholder="Reason or note (kept on the record)"
                  className="flex-1 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-400"
                />
                {r.status === 'held' ? (
                  <Button type="button" disabled={busy === r.user_id} onClick={() => act('release_account_deletion', r.user_id)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    <Unlock className="w-4 h-4 mr-1" /> Release
                  </Button>
                ) : (
                  <Button type="button" disabled={busy === r.user_id} onClick={() => act('hold_account_deletion', r.user_id)} className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Lock className="w-4 h-4 mr-1" /> Hold
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {past.length > 0 && (
          <details className="mt-4">
            <summary className="text-sm text-white/70 cursor-pointer">Last 90 days: {past.length} completed or cancelled</summary>
            <ul className="mt-2 text-xs text-white/60 space-y-1">
              {past.map((r) => (
                <li key={r.user_id}>
                  <span className="font-mono">{r.user_id.slice(0, 8)}</span> · {r.status} · asked {fmt(r.requested_at)}
                  {r.completed_at && <> · removed {fmt(r.completed_at)}</>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">
        <h3 className="font-semibold text-lg inline-flex items-center gap-2 mb-1"><FileSearch className="w-5 h-5" /> Lawful access</h3>
        <p className="text-xs text-white/60 mb-4">
          Retained records for one account - identity, contact details, payments, reports, calls and messages - for a
          production order, preservation demand or other request with lawful authority. Every lookup is logged with your
          name, the account and the reason you give here. Do not use this for anything else.
        </p>
        <div className="grid sm:grid-cols-[1fr_2fr_auto] gap-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Member ID (uuid)"
            className="rounded-lg bg-white text-gray-900 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-rose-400"
          />
          <input
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
            placeholder="Lawful basis: order, file number, requesting agency"
            className="rounded-lg bg-white text-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-400"
          />
          <Button type="button" disabled={looking} onClick={lookup} className="bg-rose-500 hover:bg-rose-600 text-white">
            {looking ? 'Looking…' : 'Look up'}
          </Button>
        </div>
        {result && (
          <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-black/40 p-3 text-[11px] leading-snug text-white/90 whitespace-pre-wrap break-words">{result}</pre>
        )}
        {log.length > 0 && (
          <details className="mt-4">
            <summary className="text-sm text-white/70 cursor-pointer">Access log ({log.length})</summary>
            <ul className="mt-2 text-xs text-white/60 space-y-1">
              {log.map((l) => (
                <li key={l.id}>
                  {new Date(l.accessed_at).toLocaleString()} · <span className="font-mono">{l.subject_id.slice(0, 8)}</span> · {l.reason}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
};

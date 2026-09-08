import { supabaseClient } from './supabase';
import { creditManager } from './creditSystem';

/**
 * The call meter lives on the server now.
 *
 * Until batch 3 a setInterval in this browser charged one minute of credit
 * every sixty seconds - and stopping that timer stopped the charges while the
 * Twilio room carried on. Now twilio-video-token / twilio-voice-twiml open a
 * public.call_sessions row, Twilio's callbacks mark it answered and ended, and
 * pg_cron bills it minute by minute. Nothing this file does moves any credits.
 *
 * What the browser still needs is to *know*: the running balance to display,
 * a warning while there is still time to top up, and the fact that the server
 * hung the call up because the money ran out. This watcher polls for that.
 */

export interface CallSessionRow {
  id: string;
  kind: 'video' | 'audio';
  status: 'ringing' | 'active' | 'ended';
  per_minute: number;
  free_reason: string | null;
  max_seconds: number;
  answered_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
  billed_seconds: number;
  credits_charged: number;
  shortfall_credits: number;
  hangup_requested: boolean;
  hung_up_at: string | null;
}

export interface CallMeterTick {
  balance: number;
  session: CallSessionRow | null;
}

export function watchCallSession(opts: {
  userId: string;
  kind: 'video' | 'audio';
  onTick: (tick: CallMeterTick) => void;
  /** The server ended the call because the caller could no longer pay. */
  onCutOff: (session: CallSessionRow) => void;
  intervalMs?: number;
}): () => void {
  let stopped = false;
  let cutOffReported = false;

  const poll = async () => {
    if (stopped) return;
    try {
      const [balance, { data }] = await Promise.all([
        creditManager.refresh(opts.userId),
        supabaseClient
          .from('call_sessions')
          .select('id, kind, status, per_minute, free_reason, max_seconds, answered_at, ended_at, end_reason, billed_seconds, credits_charged, shortfall_credits, hangup_requested, hung_up_at')
          .eq('caller_id', opts.userId)
          .eq('kind', opts.kind)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (stopped) return;
      const session = (data as CallSessionRow | null) ?? null;
      opts.onTick({ balance, session });

      if (session && !cutOffReported && (session.hangup_requested || session.hung_up_at)) {
        cutOffReported = true;
        opts.onCutOff(session);
      }
    } catch (err) {
      // A missed poll is only a stale number on screen; the meter is unaffected.
      console.warn('call meter poll failed', err);
    }
  };

  void poll();
  const timer = setInterval(() => void poll(), opts.intervalMs ?? 20_000);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

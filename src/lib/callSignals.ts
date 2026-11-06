import { supabaseClient } from './supabase';
import { initialsAvatar } from './callMatches';
import { sendPushToUser } from './pushNotifications';

/**
 * Video call signalling.
 *
 * Audio calling rings by itself - Twilio's Device raises an 'incoming' event on
 * the callee's browser. Video has no such channel: both sides derive the room
 * name from their two user ids, so unless the other person independently opens
 * Video and calls back, the caller sits alone in an empty room. These helpers
 * are that missing channel, carried over Supabase Realtime on public.call_invites.
 */

export type CallKind = 'video' | 'audio';
export type InviteStatus = 'ringing' | 'accepted' | 'declined' | 'cancelled' | 'missed';

export interface CallInvite {
  id: string;
  caller_id: string;
  callee_id: string;
  room_name: string;
  kind: CallKind;
  status: InviteStatus;
  created_at: string;
}

export interface CallerPreview {
  name: string;
  image: string;
}

/** How long a call rings before it is recorded as missed and torn down. */
export const RING_TIMEOUT_MS = 45_000;

/**
 * One room per call, never per pair. The name used to be deterministic from
 * the two ids, and the callee learns it from the invite row anyway - so the
 * determinism bought nothing and cost a great deal: a redial within a minute
 * or two of the last attempt found the previous room still open at Twilio
 * (rooms linger briefly after they empty) and joined it. That room carried
 * the previous session's status callback and duration cap, so the new call
 * was never marked answered, never billed, and was cut off when the OLD cap
 * ran out. A ten-minute video call went through for nothing that way.
 */
export function roomNameFor(a: string, b: string): string {
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `room_${[a, b].sort().join('_')}_${stamp}`;
}

export async function ringUser(
  calleeId: string,
  kind: CallKind = 'video'
): Promise<CallInvite> {
  const { data: auth } = await supabaseClient.auth.getUser();
  const callerId = auth.user?.id;
  if (!callerId) throw new Error('Not authenticated. Please sign in and try again.');

  const { data, error } = await supabaseClient
    .from('call_invites')
    .insert({
      caller_id: callerId,
      callee_id: calleeId,
      room_name: roomNameFor(callerId, calleeId),
      kind,
      status: 'ringing',
    })
    .select()
    .single();

  if (error) throw new Error(error.message || 'Could not start the call.');

  // Realtime only rings a page that is actually open. If the callee has the
  // app closed, or their phone is locked, nothing above reaches them - which
  // is exactly the "it never rang on my side" report. Push is the only
  // channel that survives a closed app.
  //
  // Fire-and-forget on purpose: the caller should not wait on a notification
  // round-trip before their own call screen appears, and a failed push must
  // never abort a call that is otherwise working.
  void notifyCalleeByPush(callerId, calleeId, kind, (data as CallInvite).id);

  return data as CallInvite;
}

/** How often the callee's phone is alerted again while a call keeps ringing. */
const RE_RING_EVERY_MS = 7_000;

/**
 * Lock-screen alerts for a call that is ringing right now - repeated, so a
 * phone in a pocket rings like a call instead of beeping once.
 *
 * A website cannot play its own ringtone once it is closed; the only thing
 * that reaches a closed app or a locked phone is a notification, and each one
 * makes a single sound. So while the call is still ringing the alert is sent
 * again every few seconds (same tag: it replaces itself rather than stacking,
 * and sounds and vibrates each time). It stops the moment the call is
 * answered, declined, cancelled or times out - the server also refuses any
 * repeat once the invite is no longer ringing. If nobody answered, the alert
 * is replaced by a quiet "Missed call".
 */
async function notifyCalleeByPush(
  callerId: string,
  calleeId: string,
  kind: CallKind,
  inviteId: string
): Promise<void> {
  try {
    const { name } = await fetchCallerPreview(callerId);
    const tag = `call-${callerId}`;
    const ring = () =>
      sendPushToUser(calleeId, {
        title: `${name} is calling`,
        body: kind === 'audio' ? 'Incoming voice call - tap to answer' : 'Incoming video call - tap to answer',
        // The app routes on the URL hash, so this opens straight into the call
        // screen rather than dumping them on the home screen.
        url: kind === 'audio' ? '/#audio-chat' : '/#video-chat',
        tag,
        requireInteraction: true,
        vibrate: [800, 400, 800, 400, 800],
      });

    const startedAt = Date.now();
    await ring();

    // Keep watching a little past the ring time, so a call that times out
    // (marked missed at RING_TIMEOUT_MS) still gets its "Missed call".
    while (Date.now() - startedAt < RING_TIMEOUT_MS + 2 * RE_RING_EVERY_MS) {
      await new Promise((r) => setTimeout(r, RE_RING_EVERY_MS));
      const { data: row } = await supabaseClient
        .from('call_invites')
        .select('status')
        .eq('id', inviteId)
        .maybeSingle();
      const status = (row as { status?: string } | null)?.status;
      if (status && status !== 'ringing') {
        if (status === 'missed' || status === 'cancelled') {
          await sendPushToUser(calleeId, {
            title: `Missed call from ${name}`,
            body: 'Open Dates.care to call back.',
            url: '/#mail',
            tag,
            purpose: 'call-missed',
            silent: true,
          });
        }
        return;
      }
      if (Date.now() - startedAt < RING_TIMEOUT_MS - RE_RING_EVERY_MS / 2) await ring();
    }
  } catch (err) {
    console.error('Could not send call push notification:', err);
  }
}

/**
 * Settle an invite. Deliberately scoped to rows still `ringing` so a late
 * decline cannot overwrite an accept (and vice versa) - whoever gets there
 * first wins, and the loser's update simply affects no rows.
 */
export async function resolveInvite(
  inviteId: string,
  status: Exclude<InviteStatus, 'ringing'>
): Promise<void> {
  const { error } = await supabaseClient
    .from('call_invites')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('status', 'ringing');

  if (error) console.error(`Failed to mark call invite ${status}:`, error);
}

/** Watch one invite for the caller, so they see an accept/decline immediately. */
export function watchInvite(
  inviteId: string,
  onStatus: (status: InviteStatus) => void
): () => void {
  const channel = supabaseClient
    .channel(`call-invite-${inviteId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'call_invites', filter: `id=eq.${inviteId}` },
      (payload) => {
        const next = (payload.new as CallInvite | null)?.status;
        if (next) onStatus(next);
      }
    )
    .subscribe((status) => {
      // Without this callback a channel that never delivers looks identical to
      // one that works - the failure mode that hid the chat outage for weeks.
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`call-invite-${inviteId} subscription failed:`, status);
      }
    });

  return () => {
    void supabaseClient.removeChannel(channel);
  };
}

/**
 * Is somebody ringing this person right now? Used when the app opens or
 * returns to the foreground, because a call that started while the page was
 * closed never reached the realtime listener. A ring older than the ring
 * timeout is over by definition; the caller's side has already marked it.
 */
export async function fetchRingingInviteFor(userId: string): Promise<CallInvite | null> {
  const since = new Date(Date.now() - RING_TIMEOUT_MS).toISOString();
  const { data } = await supabaseClient
    .from('call_invites')
    .select('*')
    .eq('callee_id', userId)
    .eq('status', 'ringing')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as CallInvite | null) ?? null;
}

/** Watch for people calling this user, from anywhere in the app. */
export function subscribeToIncomingCalls(
  userId: string,
  handlers: {
    onRing: (invite: CallInvite) => void;
    onWithdrawn: (invite: CallInvite) => void;
  }
): () => void {
  const channel = supabaseClient
    .channel(`incoming-calls-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'call_invites',
        filter: `callee_id=eq.${userId}`,
      },
      (payload) => {
        const invite = payload.new as CallInvite;
        if (invite?.status === 'ringing') handlers.onRing(invite);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_invites',
        filter: `callee_id=eq.${userId}`,
      },
      (payload) => {
        const invite = payload.new as CallInvite;
        // Caller hung up, or the invite was answered on another device.
        if (invite && invite.status !== 'ringing') handlers.onWithdrawn(invite);
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`incoming-calls-${userId} subscription failed:`, status);
      }
    });

  return () => {
    void supabaseClient.removeChannel(channel);
  };
}

/** Name and photo for the person calling, for the incoming-call screen. */
export async function fetchCallerPreview(userId: string): Promise<CallerPreview> {
  const { data: profile } = await supabaseClient
    .from('user_profiles')
    .select('first_name, full_name')
    .eq('user_id', userId)
    .maybeSingle();

  const name =
    (profile?.first_name ?? '').trim() || (profile?.full_name ?? '').trim() || 'Someone';

  const { data: photo } = await supabaseClient
    .from('user_photos')
    .select('photo_url')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .maybeSingle();

  return { name, image: photo?.photo_url || initialsAvatar(name) };
}

/**
 * Hand-off between the incoming-call screen and VideoChat. App navigates to
 * 'video-chat' after an accept; VideoChat reads this on mount and joins the
 * room the caller is already sitting in, rather than starting a fresh call.
 */
export interface AcceptedCall {
  inviteId: string;
  roomName: string;
  peerId: string;
  peerName: string;
}

let acceptedCall: AcceptedCall | null = null;

/**
 * Bumped every time a new call is handed to the call screens. The app uses it
 * as the call screen's key, so a call answered while the call screen is
 * already open (straight after an earlier call, say) starts a fresh screen.
 * Without it the screen was already mounted, never read the new call, and the
 * answered call never connected - the caller just kept "Ringing".
 */
let callEpoch = 0;
export function getCallEpoch(): number {
  return callEpoch;
}

export function setAcceptedCall(call: AcceptedCall): void {
  acceptedCall = call;
  callEpoch += 1;
}

/** Read-once: consuming it prevents rejoining a stale room on a later visit. */
export function takeAcceptedCall(): AcceptedCall | null {
  const call = acceptedCall;
  acceptedCall = null;
  return call;
}

/**
 * Outgoing equivalent: "call THIS person", set by a Call button on someone's
 * profile before navigating to the call screen. Without it the profile's call
 * buttons only opened the call screen's list of members, leaving the user to
 * find again the person whose profile they were already looking at.
 */
export interface PendingCall {
  peerId: string;
  peerName: string;
}

let pendingCall: PendingCall | null = null;

export function setPendingCall(call: PendingCall): void {
  pendingCall = call;
  callEpoch += 1;
}

/** Read-once, so returning to the screen later does not redial. */
export function takePendingCall(): PendingCall | null {
  const call = pendingCall;
  pendingCall = null;
  return call;
}

export interface MissedCall {
  id: string;
  callerId: string;
  kind: CallKind;
  at: string;
  name: string;
  image: string;
}

/**
 * Calls you did not answer.
 *
 * The 'missed' status was already being written when a ring timed out, but
 * nothing ever read it - so a call you missed left no trace anywhere in the
 * app and the caller appeared never to have tried.
 */
export async function fetchMissedCalls(userId: string): Promise<MissedCall[]> {
  const { data, error } = await supabaseClient
    .from('call_invites')
    .select('id, caller_id, kind, created_at')
    .eq('callee_id', userId)
    .eq('status', 'missed')
    .is('callee_seen_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Could not load missed calls:', error);
    return [];
  }
  if (!data?.length) return [];

  // One profile lookup per distinct caller, not per call - somebody who tried
  // six times should not cost six queries.
  const callerIds = [...new Set(data.map((row) => row.caller_id))];
  const previews = await Promise.all(callerIds.map((id) => fetchCallerPreview(id)));
  const previewById = new Map(callerIds.map((id, i) => [id, previews[i]]));

  return data.map((row) => ({
    id: row.id,
    callerId: row.caller_id,
    kind: row.kind as CallKind,
    at: row.created_at,
    name: previewById.get(row.caller_id)?.name ?? 'Someone',
    image: previewById.get(row.caller_id)?.image ?? initialsAvatar('Someone'),
  }));
}

/**
 * Dismiss the notice. The call itself stays on record.
 *
 * Goes through dismiss_missed_call rather than a direct update: the invite's
 * status must not be writable from here, and a plain UPDATE would have been
 * allowed to change it by the existing resolve-invite policy.
 */
export async function markMissedCallSeen(inviteId: string): Promise<void> {
  const { error } = await supabaseClient.rpc('dismiss_missed_call', {
    p_invite_id: inviteId,
  });

  if (error) console.error('Could not dismiss missed call:', error);
}

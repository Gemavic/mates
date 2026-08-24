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
 * Deterministic from the two ids, so both sides compute the same room without
 * having to exchange it. Kept identical to the original VideoChat formula so
 * in-flight behaviour does not change.
 */
export function roomNameFor(a: string, b: string): string {
  return `room_${[a, b].sort().join('_')}`;
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
  void notifyCalleeByPush(callerId, calleeId, kind);

  return data as CallInvite;
}

/** Best-effort lock-screen alert for a call that is ringing right now. */
async function notifyCalleeByPush(
  callerId: string,
  calleeId: string,
  kind: CallKind
): Promise<void> {
  try {
    const { name } = await fetchCallerPreview(callerId);
    await sendPushToUser(calleeId, {
      title: `${name} is calling`,
      body: kind === 'audio' ? 'Incoming voice call' : 'Incoming video call',
      // The app routes on the URL hash, so this opens straight into the call
      // screen rather than dumping them on the home screen.
      url: kind === 'audio' ? '/#audio-chat' : '/#video-chat',
      // One notification per caller, replaced rather than stacked if they
      // try again, and it stays put until answered or dismissed.
      tag: `call-${callerId}`,
      requireInteraction: true,
      vibrate: [600, 400, 600],
    });
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

export function setAcceptedCall(call: AcceptedCall): void {
  acceptedCall = call;
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

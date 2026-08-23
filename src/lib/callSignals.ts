import { supabaseClient } from './supabase';
import { initialsAvatar } from './callMatches';

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
  return data as CallInvite;
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

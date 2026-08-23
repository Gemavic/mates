import React, { useEffect, useState } from 'react';
import { Video, Phone, PhoneOff } from 'lucide-react';
import {
  RING_TIMEOUT_MS,
  fetchCallerPreview,
  resolveInvite,
  setAcceptedCall,
  type CallInvite,
  type CallerPreview,
} from '@/lib/callSignals';
import { startRingtone } from '@/lib/ringtone';

interface IncomingCallModalProps {
  invite: CallInvite;
  /** Called once the invite is settled, so the host can clear it. */
  onDismiss: () => void;
  onNavigate: (screen: string) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  invite,
  onDismiss,
  onNavigate,
}) => {
  const [caller, setCaller] = useState<CallerPreview | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCallerPreview(invite.caller_id)
      .then((preview) => {
        if (!cancelled) setCaller(preview);
      })
      .catch(() => {
        if (!cancelled) setCaller({ name: 'Someone', image: '' });
      });
    return () => {
      cancelled = true;
    };
  }, [invite.caller_id]);

  // Ring audibly and vibrate for as long as this screen is up. The cleanup runs
  // on accept, decline, timeout and withdrawal alike, so the tone can never
  // outlive the call.
  useEffect(() => startRingtone('incoming'), []);

  // Stop ringing on the callee's side too. The caller runs its own timeout, but
  // this side must not be left with a dead modal if the caller's tab is closed.
  useEffect(() => {
    const elapsed = Date.now() - new Date(invite.created_at).getTime();
    const remaining = Math.max(RING_TIMEOUT_MS - elapsed, 0);
    const timer = setTimeout(() => {
      void resolveInvite(invite.id, 'missed');
      onDismiss();
    }, remaining);
    return () => clearTimeout(timer);
  }, [invite.id, invite.created_at, onDismiss]);

  const accept = async () => {
    if (busy) return;
    setBusy(true);
    await resolveInvite(invite.id, 'accepted');
    setAcceptedCall({
      inviteId: invite.id,
      roomName: invite.room_name,
      peerId: invite.caller_id,
      peerName: caller?.name ?? 'Caller',
    });
    onDismiss();
    onNavigate(invite.kind === 'audio' ? 'audio-chat' : 'video-chat');
  };

  const decline = async () => {
    if (busy) return;
    setBusy(true);
    await resolveInvite(invite.id, 'declined');
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 h-28 w-28 overflow-hidden rounded-full border-4 border-white/30">
          {caller?.image ? (
            <img src={caller.image} alt={caller.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/20">
              <Phone className="h-12 w-12 text-white" />
            </div>
          )}
        </div>

        <h2 className="mb-1 text-2xl font-bold text-white">{caller?.name ?? 'Incoming call'}</h2>
        <p className="mb-8 flex items-center justify-center gap-2 text-white/80">
          {invite.kind === 'audio' ? (
            <Phone className="h-4 w-4" />
          ) : (
            <Video className="h-4 w-4" />
          )}
          Incoming {invite.kind} call…
        </p>

        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={decline}
            disabled={busy}
            aria-label="Decline call"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            <PhoneOff className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={accept}
            disabled={busy}
            aria-label="Accept call"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-600 disabled:opacity-60"
          >
            {invite.kind === 'audio' ? (
              <Phone className="h-7 w-7" />
            ) : (
              <Video className="h-7 w-7" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { PhoneMissed, Video, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchMissedCalls,
  markMissedCallSeen,
  setPendingCall,
  type MissedCall,
} from '@/lib/callSignals';

interface MissedCallsNoticeProps {
  onNavigate: (screen: string) => void;
}

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Shows calls you did not answer.
 *
 * A missed call was recorded but never surfaced anywhere, so from the callee's
 * side an attempted call simply never happened - and the caller looked like
 * they had been ignored.
 */
export const MissedCallsNotice: React.FC<MissedCallsNoticeProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [missed, setMissed] = useState<MissedCall[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchMissedCalls(user.id).then((calls) => {
      if (!cancelled) setMissed(calls);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const dismiss = (id: string) => {
    setMissed((prev) => prev.filter((c) => c.id !== id));
    void markMissedCallSeen(id);
  };

  const callBack = (call: MissedCall) => {
    setPendingCall({ peerId: call.callerId, peerName: call.name });
    void markMissedCallSeen(call.id);
    onNavigate(call.kind === 'audio' ? 'audio-chat' : 'video-chat');
  };

  if (missed.length === 0) return null;

  return (
    <div className="px-3 sm:px-4 pt-3 space-y-2">
      {missed.map((call) => (
        <div
          key={call.id}
          className="flex items-center gap-3 rounded-xl bg-white/95 dark:bg-night-800 border border-red-200 dark:border-night-700 px-3 py-2.5 shadow-sm"
        >
          <img
            src={call.image}
            alt=""
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
              Missed {call.kind} call from {call.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
              {call.kind === 'audio' ? (
                <PhoneMissed className="w-3 h-3 text-red-500" />
              ) : (
                <Video className="w-3 h-3 text-red-500" />
              )}
              {timeAgo(call.at)}
            </p>
          </div>
          <button
            onClick={() => callBack(call)}
            className="rounded-lg bg-pink-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-pink-600 flex-shrink-0"
          >
            Call back
          </button>
          <button
            onClick={() => dismiss(call.id)}
            aria-label="Dismiss missed call"
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

import React, { useState } from 'react';
import { Gift as GiftIcon, X } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase';

export interface GiftPayload {
  id: string;
  name: string;
  icon: string | null;
  image_url: string | null;
  credit_cost: number;
}

interface GiftMessageProps {
  messageId: string;
  gift: GiftPayload;
  note: string | null;
  senderName: string;
  /** Their own gift back in the thread, so they can open but not "unwrap" it. */
  isMine: boolean;
  openedAt: string | null;
  onSendYours: () => void;
}

/**
 * A gift as a package, not a sentence.
 *
 * Gifts used to arrive as the line "🎁 Sent you a Rose!" in an ordinary chat
 * bubble - indistinguishable from someone typing that text, with the artwork
 * they were paid for never shown. This renders the wrapped box, and opening it
 * reveals the gift, who sent it and any note.
 */
export const GiftMessage: React.FC<GiftMessageProps> = ({
  messageId,
  gift,
  note,
  senderName,
  isMine,
  openedAt,
  onSendYours,
}) => {
  const [open, setOpen] = useState(false);
  const [unwrapped, setUnwrapped] = useState(!!openedAt);

  const handleOpen = async () => {
    setOpen(true);
    if (unwrapped || isMine) return;

    setUnwrapped(true);
    // Best effort: seeing the gift matters more than recording that they did.
    const { error } = await supabaseClient
      .from('mail_messages')
      .update({ gift_opened_at: new Date().toISOString() })
      .eq('id', messageId);
    if (error) console.error('Could not mark gift opened:', error);
  };

  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-night-800 border border-pink-200 dark:border-night-700 p-3 w-[168px] shadow-sm">
        <div className="relative h-24 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 dark:from-night-700 dark:to-night-900 flex items-center justify-center overflow-hidden">
          {unwrapped && gift.image_url ? (
            <img src={gift.image_url} alt={gift.name} className="h-20 object-contain" />
          ) : unwrapped ? (
            <span className="text-4xl">{gift.icon || '🎁'}</span>
          ) : (
            // Still wrapped: the box, not the contents.
            <div className="flex flex-col items-center">
              <GiftIcon className="w-10 h-10 text-pink-500" />
              <span className="text-[10px] uppercase tracking-wider text-pink-500 mt-1">
                A gift
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-600 dark:text-slate-300 mt-2 truncate">
          {unwrapped ? gift.name : `From ${senderName}`}
        </p>

        <button
          onClick={handleOpen}
          className="mt-2 w-full rounded-lg border border-pink-300 dark:border-night-600 py-1.5 text-sm font-medium text-pink-600 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-night-700"
        >
          Open
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xs bg-white dark:bg-night-800 rounded-2xl p-6 text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            {gift.image_url ? (
              <img
                src={gift.image_url}
                alt={gift.name}
                className="h-32 mx-auto object-contain mb-4"
              />
            ) : (
              <div className="text-6xl mb-4">{gift.icon || '🎁'}</div>
            )}

            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
              {isMine ? `You sent a ${gift.name}` : `${senderName} sent you a ${gift.name}`}
            </h3>

            {note && (
              <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{note}</p>
            )}

            {!isMine && (
              <button
                onClick={() => {
                  setOpen(false);
                  onSendYours();
                }}
                className="mt-5 w-full rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 flex items-center justify-center gap-2"
              >
                <GiftIcon className="w-5 h-5" />
                Send mine
              </button>
            )}

            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-night-600 py-3 text-gray-700 dark:text-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

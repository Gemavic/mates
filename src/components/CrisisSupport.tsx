import React from 'react';
import { Phone, ExternalLink, X } from 'lucide-react';

interface CrisisSupportProps {
  onClose: () => void;
}

/**
 * What the "Emergency Support" button used to do: show a red toast reading
 * "Emergency support contacted. Help is on the way." It contacted nobody.
 * Someone in real trouble would have sat waiting for help that was never
 * coming.
 *
 * This gives them something that actually works instead. findahelpline.com is
 * a directory run by ThroughLine that finds free, 24/7 crisis lines for the
 * country the visitor is actually in - which matters, because this site has
 * members on several continents and a hard-coded number is wrong for most of
 * them. Nothing here claims we have done anything on their behalf.
 */
export const CrisisSupport: React.FC<CrisisSupportProps> = ({ onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="crisis-title"
  >
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <div className="mb-4 flex items-start justify-between">
        <h2 id="crisis-title" className="text-xl font-bold text-gray-900">
          Getting help right now
        </h2>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="mb-5 text-sm text-gray-700">
        If you or someone else is in immediate danger, call your local emergency
        number now — <span className="font-semibold">999</span> in Nigeria,{' '}
        <span className="font-semibold">911</span> in the US and Canada,{' '}
        <span className="font-semibold">112</span> across the EU and much of the
        world.
      </p>

      <a
        href="https://findahelpline.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-3 flex items-center justify-between rounded-xl bg-rose-600 px-4 py-3 text-white transition hover:bg-rose-700"
      >
        <span className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          <span className="font-semibold">Find a helpline in your country</span>
        </span>
        <ExternalLink className="h-4 w-4 opacity-80" />
      </a>

      <a
        href="https://www.iasp.info/crisis-centres-helplines/"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-5 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-gray-800 transition hover:bg-gray-50"
      >
        <span className="font-medium">International directory of crisis centres</span>
        <ExternalLink className="h-4 w-4 opacity-60" />
      </a>

      <p className="text-xs leading-relaxed text-gray-500">
        These are free, confidential services staffed by trained people, and
        they are open around the clock. Dates.care is not a crisis service and
        cannot contact anyone on your behalf — please use one of the lines
        above.
      </p>
    </div>
  </div>
);

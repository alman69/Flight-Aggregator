import { useEffect, useRef } from 'react';
import { AlertIcon } from './Icons';

export const HIDDEN_CITY_RISKS = [
  'Airlines prohibit hidden-city ticketing in their contracts of carriage and may cancel the ticket, charge the fare difference, or close your frequent-flyer account.',
  'Checked bags travel to the ticketed final destination, so these fares only work with carry-on bags — and a carry-on may still be gate-checked to the final destination.',
  'Skipping a segment usually cancels every later segment, including your return flight. Book these fares as one-way trips only.',
  'If a flight is rerouted or delayed, the airline may rebook you through a different connection city.',
  'Never put a frequent-flyer number on a hidden-city booking.',
];

/**
 * Shown before opening Skiplagged, which can return hidden-city itineraries.
 * The app never builds hidden-city itineraries itself.
 */
export function HiddenCityDialog({
  onContinue,
  onCancel,
}: {
  onContinue: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="hidden-city-title"
        aria-describedby="hidden-city-body"
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
      >
        <h2 id="hidden-city-title" className="flex items-center gap-2 text-lg font-semibold">
          <AlertIcon className="text-amber-500" /> Before you open Skiplagged
        </h2>
        <div
          id="hidden-city-body"
          className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300"
        >
          <p>
            Skiplagged may show <strong>hidden-city</strong> fares: you book a flight to a farther
            city and get off at the connection. They can be cheaper, but they carry real risks:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            {HIDDEN_CITY_RISKS.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
          <p>Skiplagged also lists ordinary fares. Check which kind you're booking.</p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
          >
            I understand — open Skiplagged
          </button>
        </div>
      </div>
    </div>
  );
}

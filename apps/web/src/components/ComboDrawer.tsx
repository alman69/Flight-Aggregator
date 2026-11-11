import {
  type ComboCell,
  type FareOffer,
  type PlannedCombo,
  type ProviderLink,
  type SearchQuery,
  CABIN_LABELS,
  bestValueScore,
  describeFreshness,
  formatMoney,
  groupComparabilityIssues,
} from '@flight/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { deleteObservation } from '../api/client';
import { formatDateLong, formatMinutes, nightsLabel, stopsLabel } from '../lib/format';
import { HIDDEN_CITY_RISKS, HiddenCityDialog } from './HiddenCityDialog';
import { AlertIcon, CloseIcon, ExternalIcon } from './Icons';
import { ManualPriceForm } from './ManualPriceForm';
import { StatusTag } from './StatusTag';

const STATUS_EXPLANATION: Record<ComboCell['status'], string> = {
  observed: 'Fares were observed for these dates. Prices are not guaranteed until you book.',
  no_observation:
    'No fare was observed for these dates. That does not mean there are no flights — check the providers below.',
  not_queried:
    'No price has been recorded for these dates yet. Check them on the providers below, then add what you find.',
  query_failed: 'Searching for prices failed for these dates.',
  loading: 'Searching…',
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

const NOT_PROVIDED = 'Not provided by source';

function RemoveButton({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteObservation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['search'] }),
  });
  if (remove.isError) return <span className="text-xs text-rose-600">{remove.error.message}</span>;
  return confirming ? (
    <span className="flex items-center gap-2 text-xs">
      <button
        type="button"
        onClick={() => remove.mutate()}
        disabled={remove.isPending}
        className="font-semibold text-rose-700 hover:underline dark:text-rose-400"
      >
        {remove.isPending ? 'Removing…' : 'Confirm remove'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-slate-500 hover:underline"
      >
        Keep
      </button>
    </span>
  ) : (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs text-slate-500 hover:text-rose-700 hover:underline"
    >
      Remove
    </button>
  );
}

function OfferCard({ offer, isLowest }: { offer: FareOffer; isLowest: boolean }) {
  const freshness = describeFreshness(offer);
  const hiddenCity = offer.itineraryKind === 'hidden_city';
  const value = bestValueScore(offer);
  const stops = (n: number | null) => (n === null ? NOT_PROVIDED : stopsLabel(n));
  return (
    <article
      className={`rounded-xl border p-4 ${
        isLowest
          ? 'border-emerald-400 dark:border-emerald-700'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums">{formatMoney(offer.price)}</p>
          <p className="text-xs text-slate-500">
            {offer.priceBasis === 'per_adult' ? 'Per adult' : `Total for ${offer.adults}`} ·{' '}
            {offer.price.currency}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusTag status={offer.status} />
          {hiddenCity && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-900 uppercase dark:bg-amber-950 dark:text-amber-200">
              Hidden city
            </span>
          )}
          {isLowest && (
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              Lowest observed fare
            </span>
          )}
        </div>
      </header>
      <p
        className={`mt-2 text-xs ${freshness.expired ? 'text-rose-600' : 'text-slate-600 dark:text-slate-400'}`}
      >
        {freshness.detail}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        <Detail label="Route" value={`${offer.originAirport} → ${offer.destinationAirport}`} />
        <Detail label="Airline" value={offer.airline ?? NOT_PROVIDED} />
        <Detail label="Outbound" value={stops(offer.stopsOut)} />
        {offer.tripType === 'round_trip' && (
          <Detail label="Return" value={stops(offer.stopsBack)} />
        )}
        <Detail
          label="Total travel time"
          value={
            offer.durationMinutes === null ? NOT_PROVIDED : formatMinutes(offer.durationMinutes)
          }
        />
        <Detail
          label="Layovers"
          value={offer.layoverMinutes === null ? NOT_PROVIDED : formatMinutes(offer.layoverMinutes)}
        />
        <Detail label="Departs" value={offer.departTime ?? NOT_PROVIDED} />
        <Detail
          label="Cabin"
          value={offer.cabin === 'unknown' ? NOT_PROVIDED : CABIN_LABELS[offer.cabin]}
        />
        <Detail
          label="Bags"
          value={
            offer.baggage === 'unknown'
              ? NOT_PROVIDED
              : `${offer.baggage.checkedBags} checked${offer.baggage.carryOn ? ', carry-on' : ''}`
          }
        />
        <Detail label="Source" value={offer.sourceName} />
      </dl>
      {value && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          Best-value score{' '}
          {formatMoney({ amountMinor: value.totalMinor, currency: offer.price.currency })} ={' '}
          {formatMoney({ amountMinor: value.priceMinor, currency: offer.price.currency })} fare +{' '}
          {formatMoney({ amountMinor: value.timeCostMinor, currency: offer.price.currency })} for{' '}
          {value.hours.toFixed(1)} h +{' '}
          {formatMoney({ amountMinor: value.stopCostMinor, currency: offer.price.currency })} for{' '}
          {value.stops} stop{value.stops === 1 ? '' : 's'}
        </p>
      )}
      {offer.notes.map((note) => (
        <p key={note} className="mt-2 text-xs text-slate-500">
          {note}
        </p>
      ))}
      {hiddenCity && (
        <details className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <summary className="cursor-pointer font-semibold">
            Hidden-city fare: not compared with regular fares
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {HIDDEN_CITY_RISKS.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </details>
      )}
      {(offer.bookingUrl || offer.status === 'manual') && (
        <footer className="mt-3 flex items-center justify-between gap-3">
          {offer.bookingUrl ? (
            <a
              href={offer.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline dark:text-sky-400"
            >
              Open listing <ExternalIcon />
            </a>
          ) : (
            <span />
          )}
          {offer.status === 'manual' && <RemoveButton id={offer.id} />}
        </footer>
      )}
    </article>
  );
}

function ProviderLinks({ links }: { links: ProviderLink[] }) {
  const [pending, setPending] = useState<ProviderLink | null>(null);
  const linkClass =
    'flex w-full items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition hover:border-sky-400 hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none dark:border-slate-800 dark:hover:border-sky-700 dark:hover:bg-sky-950/40';

  const body = (link: ProviderLink) => (
    <>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-medium">
          {link.providerName}
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
              link.kind === 'prefilled'
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {link.kind === 'prefilled' ? 'Dates filled in' : 'Homepage'}
          </span>
          {link.requiresHiddenCityWarning && (
            <AlertIcon className="text-amber-500" aria-label="Hidden-city warning" />
          )}
        </span>
        {link.notes.map((note) => (
          <span key={note} className="mt-0.5 block text-xs text-slate-500">
            {note}
          </span>
        ))}
      </span>
      <ExternalIcon className="mt-1 shrink-0 text-slate-400" />
    </>
  );

  return (
    <>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.providerId}>
            {link.requiresHiddenCityWarning ? (
              <button type="button" className={linkClass} onClick={() => setPending(link)}>
                {body(link)}
              </button>
            ) : (
              <a href={link.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {body(link)}
              </a>
            )}
          </li>
        ))}
      </ul>
      {pending && (
        <HiddenCityDialog
          onCancel={() => setPending(null)}
          onContinue={() => {
            window.open(pending.url, '_blank', 'noopener,noreferrer');
            setPending(null);
          }}
        />
      )}
    </>
  );
}

/** Side panel for one date combination: its fares (if any) and links to every provider. */
export function ComboDrawer({
  cell,
  query,
  lowestKey,
  demo,
  onClose,
}: {
  cell: ComboCell<PlannedCombo>;
  query: SearchQuery;
  lowestKey: string | null;
  /** In demo mode real prices can't be added, so demo and real data never mix. */
  demo: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [adding, setAdding] = useState(false);
  const { combo } = cell;
  const offers = [...cell.offers].sort((a, b) => a.price.amountMinor - b.price.amountMinor);
  const comparability = groupComparabilityIssues(offers);

  useEffect(() => {
    closeRef.current?.focus();
    setAdding(false);
  }, [combo.key]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/30" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <p className="text-sm text-slate-500">
              {query.origin} → {query.destination} · {query.adults} adult
              {query.adults === 1 ? '' : 's'} · {CABIN_LABELS[query.cabin]}
            </p>
            <h2 id="drawer-title" className="mt-1 text-lg font-semibold">
              {formatDateLong(combo.departDate)}
              {combo.returnDate && <> → {formatDateLong(combo.returnDate)}</>}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {combo.nights !== null ? `Round trip · ${nightsLabel(combo.nights)}` : 'One way'}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section aria-label="Fares">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {STATUS_EXPLANATION[cell.status]}
              {cell.failureReason && ` (${cell.failureReason})`}
            </p>
            {comparability.length > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <strong>Not directly comparable:</strong> {comparability.join(', ').toLowerCase()}.
              </p>
            )}
            {offers.length > 0 && (
              <div className="mt-3 space-y-3">
                {offers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    isLowest={combo.key === lowestKey && offer.id === cell.lowest?.id}
                  />
                ))}
              </div>
            )}
            <div className="mt-4">
              {demo ? (
                <p className="text-xs text-slate-500">
                  Exit demo mode to record prices you've seen.
                </p>
              ) : adding ? (
                <ManualPriceForm combo={combo} query={query} onDone={() => setAdding(false)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="w-full rounded-lg border border-dashed border-violet-300 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40"
                >
                  + Add a price I saw
                </button>
              )}
            </div>
          </section>

          <section aria-labelledby="providers-title">
            <h3 id="providers-title" className="text-sm font-semibold">
              Check these dates on each provider
            </h3>
            <p className="mt-1 mb-3 text-xs text-slate-500">
              Opens the provider's own site in a new tab. Nothing is fetched automatically.
            </p>
            <ProviderLinks links={combo.links} />
          </section>
        </div>
      </aside>
    </div>
  );
}

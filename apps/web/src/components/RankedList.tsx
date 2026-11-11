import {
  type FilteredCell,
  type PlannedCombo,
  SORT_LABELS,
  type SortKey,
  formatMoney,
  rankCells,
  sortAvailability,
  totalStops,
} from '@flight/core';
import { useMemo } from 'react';
import { formatDate, formatMinutes, nightsLabel, stopsLabel } from '../lib/format';
import { inputBase } from './Field';
import { StatusTag } from './StatusTag';

type Cell = FilteredCell<PlannedCombo>;

function DateLabel({ combo }: { combo: PlannedCombo }) {
  return (
    <span>
      <span className="font-medium">{formatDate(combo.departDate)}</span>
      {combo.returnDate && (
        <>
          {' → '}
          <span className="font-medium">{formatDate(combo.returnDate)}</span>
          <span className="ml-2 text-slate-500">{nightsLabel(combo.nights!)}</span>
        </>
      )}
    </span>
  );
}

const SORT_KEYS: SortKey[] = ['price', 'duration', 'best_value', 'layover'];

export function RankedList({
  cells,
  sortKey,
  onSortChange,
  lowestKey,
  onSelect,
}: {
  cells: Cell[];
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  lowestKey: string | null;
  onSelect: (key: string) => void;
}) {
  const visible = useMemo(() => cells.filter((c) => !c.hiddenByFilter), [cells]);
  const available = useMemo(() => sortAvailability(visible), [visible]);
  const effectiveSort = available[sortKey] ? sortKey : 'price';
  const result = useMemo(
    () => rankCells(visible, effectiveSort, { currency: 'USD' }),
    [visible, effectiveSort],
  );
  const unavailableSorts = SORT_KEYS.filter((k) => !available[k]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="sort" className="text-sm font-medium">
          Sort by
        </label>
        <select
          id="sort"
          className={`${inputBase} w-52`}
          value={effectiveSort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
        >
          {SORT_KEYS.map((key) => (
            <option key={key} value={key} disabled={!available[key]}>
              {SORT_LABELS[key]}
              {available[key] ? '' : ' (no data)'}
            </option>
          ))}
        </select>
        {available.price && unavailableSorts.length > 0 && (
          <p className="text-xs text-slate-500">
            {unavailableSorts.map((k) => SORT_LABELS[k]).join(', ')}{' '}
            {unavailableSorts.length === 1 ? 'is' : 'are'} unavailable: the current data doesn't
            include the details needed.
          </p>
        )}
        {effectiveSort === 'best_value' && (
          <p className="text-xs text-slate-500">
            Best value = price + $15 per hour of travel + $40 per stop. Lower is better.
          </p>
        )}
      </div>

      {result.ranked.length > 0 ? (
        <ol className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {result.ranked.map(({ cell, offer }, index) => {
            const stops = totalStops(offer);
            const isLowest = cell.combo.key === lowestKey;
            return (
              <li key={cell.combo.key}>
                <button
                  type="button"
                  onClick={() => onSelect(cell.combo.key)}
                  className="grid w-full grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none sm:grid-cols-[2rem_1fr_14rem_auto] dark:hover:bg-slate-800/60 dark:focus-visible:bg-slate-800/60"
                >
                  <span className="text-sm text-slate-400 tabular-nums">{index + 1}</span>
                  <span className="text-sm">
                    <DateLabel combo={cell.combo} />
                    {isLowest && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        Lowest observed fare
                      </span>
                    )}
                  </span>
                  <span className="col-span-3 text-xs text-slate-500 sm:col-span-1">
                    {[
                      stops === null ? 'Stops unknown' : stopsLabel(stops),
                      offer.durationMinutes === null
                        ? 'Duration unknown'
                        : formatMinutes(offer.durationMinutes),
                      offer.airline ?? 'Airline unknown',
                    ].join(' · ')}
                  </span>
                  <span className="col-start-3 row-start-1 flex items-center gap-2 justify-self-end sm:col-start-4">
                    <StatusTag status={offer.status} />
                    <span className="text-base font-semibold tabular-nums">
                      {formatMoney(offer.price)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          No observed fares to rank yet. Every date combination below still has provider links.
        </p>
      )}

      {result.unscored.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <summary className="cursor-pointer text-sm font-medium">
            {result.unscored.length} combination{result.unscored.length === 1 ? '' : 's'} with
            prices that can't be sorted by “{SORT_LABELS[effectiveSort]}”
          </summary>
          <ul className="mt-2 space-y-1">
            {result.unscored.map(({ cell, reason }) => (
              <li key={cell.combo.key}>
                <button
                  type="button"
                  onClick={() => onSelect(cell.combo.key)}
                  className="text-left text-sm hover:underline"
                >
                  <DateLabel combo={cell.combo} />
                  <span className="ml-2 text-xs text-slate-500">{reason}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {result.withoutData.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <summary className="cursor-pointer text-sm font-medium">
            {result.withoutData.length} date combination{result.withoutData.length === 1 ? '' : 's'}{' '}
            without price data
          </summary>
          <p className="mt-1 text-xs text-slate-500">
            Not ranked, and never treated as $0. Open one to check it on the providers.
          </p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {result.withoutData.map((cell) => (
              <li key={cell.combo.key}>
                <button
                  type="button"
                  onClick={() => onSelect(cell.combo.key)}
                  className="text-left text-sm text-sky-700 hover:underline dark:text-sky-400"
                >
                  <DateLabel combo={cell.combo} />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

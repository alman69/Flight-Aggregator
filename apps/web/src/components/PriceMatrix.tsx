import {
  type FilteredCell,
  type IsoDate,
  type PlannedCombo,
  comboKey,
  formatMoney,
} from '@flight/core';
import { type KeyboardEvent, useMemo } from 'react';
import { formatDate, formatDateShort, nightsLabel, weekdayShort } from '../lib/format';
import { type PriceTier, makePriceTier } from '../lib/priceTiers';
import { StatusTag } from './StatusTag';

type Cell = FilteredCell<PlannedCombo>;

const TIER_CLASS: Record<PriceTier, string> = {
  low: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100',
  mid: 'bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100',
  high: 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100',
};

/** Text describing a cell for screen readers and tooltips. */
export function describeCell(cell: Cell): string {
  const { combo } = cell;
  const dates = combo.returnDate
    ? `${formatDate(combo.departDate)} to ${formatDate(combo.returnDate)}, ${nightsLabel(combo.nights!)}`
    : formatDate(combo.departDate);
  if (cell.hiddenByFilter) return `${dates}: hidden by filters`;
  switch (cell.status) {
    case 'observed':
      if (cell.lowest) {
        return `${dates}: lowest observed fare ${formatMoney(cell.lowest.price)} (${cell.lowest.status})`;
      }
      return cell.offers.every((o) => o.itineraryKind === 'hidden_city')
        ? `${dates}: only hidden-city fares observed (not compared with regular fares)`
        : `${dates}: fares observed in another currency`;
    case 'no_observation':
      return `${dates}: no fare observed. This does not mean no flights exist.`;
    case 'not_queried':
      return `${dates}: not searched for prices. Open for provider links.`;
    case 'query_failed':
      return `${dates}: price search failed${cell.failureReason ? ` (${cell.failureReason})` : ''}`;
    case 'loading':
      return `${dates}: loading`;
  }
}

function CellContent({ cell, isLowest }: { cell: Cell; isLowest: boolean }) {
  if (cell.hiddenByFilter) return <span className="text-xs text-slate-400">Filtered</span>;
  switch (cell.status) {
    case 'observed':
      if (!cell.lowest) {
        const hiddenOnly = cell.offers.every((o) => o.itineraryKind === 'hidden_city');
        return (
          <span className="text-xs text-slate-500">
            {hiddenOnly ? 'Hidden-city only' : 'Other currency'}
          </span>
        );
      }
      return (
        <span className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-semibold tabular-nums">
            {formatMoney(cell.lowest.price)}
          </span>
          {isLowest ? (
            <span className="text-[10px] leading-none font-semibold text-emerald-700 dark:text-emerald-300">
              Lowest observed
            </span>
          ) : (
            <StatusTag status={cell.lowest.status} />
          )}
        </span>
      );
    case 'no_observation':
      return <span className="text-slate-400">—</span>;
    case 'not_queried':
      return <span className="text-slate-300 dark:text-slate-600">—</span>;
    case 'query_failed':
      return <span className="text-xs font-semibold text-rose-600">Failed</span>;
    case 'loading':
      return (
        <span className="block h-3 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      );
  }
}

/**
 * Departure dates down the side, return dates across the top. One-way searches get a single column.
 * Positions that are not part of the search (e.g. returning before departing) are blank.
 */
export function PriceMatrix({
  cells,
  departDates,
  returnDates,
  lowestKey,
  selectedKey,
  onSelect,
}: {
  cells: Cell[];
  departDates: IsoDate[];
  returnDates: IsoDate[];
  lowestKey: string | null;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const byKey = useMemo(() => new Map(cells.map((c) => [c.combo.key, c])), [cells]);
  const tierOf = useMemo(
    () =>
      makePriceTier(
        cells.flatMap((c) => (!c.hiddenByFilter && c.lowest ? [c.lowest.price.amountMinor] : [])),
      ),
    [cells],
  );
  const oneWay = returnDates.length === 0;
  const columns: (IsoDate | null)[] = oneWay ? [null] : returnDates;

  // Arrow keys move between cells that belong to the search, skipping blanks.
  function onKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const move = moves[event.key];
    const from = (event.target as HTMLElement).closest<HTMLElement>('[data-r]');
    if (!move || !from) return;
    event.preventDefault();
    let r = Number(from.dataset.r);
    let c = Number(from.dataset.c);
    for (;;) {
      r += move[0];
      c += move[1];
      if (r < 0 || c < 0 || r >= departDates.length || c >= columns.length) return;
      const target = event.currentTarget.querySelector<HTMLElement>(
        `button[data-r="${r}"][data-c="${c}"]`,
      );
      if (target) {
        target.focus();
        return;
      }
    }
  }

  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="border-separate border-spacing-0 text-center" onKeyDown={onKeyDown}>
        <caption className="sr-only">
          Lowest observed fare for each departure (rows) and return (columns) date
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky top-0 left-0 z-20 border-r border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900"
            >
              Depart ↓{!oneWay && <> / Return →</>}
            </th>
            {columns.map((ret) => (
              <th
                key={ret ?? 'one-way'}
                scope="col"
                className="sticky top-0 z-10 min-w-[5.5rem] border-b border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-800 dark:bg-slate-900"
              >
                {ret ? (
                  <>
                    <span className="block text-[11px] font-normal text-slate-500">
                      {weekdayShort(ret)}
                    </span>
                    <span className="text-sm font-semibold">{formatDateShort(ret)}</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold">One-way fare</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {departDates.map((dep, r) => (
            <tr key={dep}>
              <th
                scope="row"
                className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 px-3 py-1 text-left whitespace-nowrap dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="mr-1.5 text-[11px] font-normal text-slate-500">
                  {weekdayShort(dep)}
                </span>
                <span className="text-sm font-semibold">{formatDateShort(dep)}</span>
              </th>
              {columns.map((ret, c) => {
                const cell = byKey.get(comboKey(dep, ret));
                if (!cell) {
                  return (
                    <td
                      key={ret ?? 'one-way'}
                      className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800/60 dark:bg-slate-950/40"
                    />
                  );
                }
                const key = cell.combo.key;
                const isLowest = key === lowestKey;
                const tier =
                  cell.status === 'observed' && cell.lowest && !cell.hiddenByFilter
                    ? tierOf(cell.lowest.price.amountMinor)
                    : null;
                const label = describeCell(cell);
                return (
                  <td key={key} className="border-b border-slate-100 p-1 dark:border-slate-800/60">
                    <button
                      type="button"
                      data-r={r}
                      data-c={c}
                      data-status={cell.status}
                      aria-label={label}
                      title={label}
                      aria-pressed={selectedKey === key}
                      onClick={() => onSelect(key)}
                      className={[
                        'flex h-14 w-full min-w-[5rem] items-center justify-center rounded-lg px-1 transition',
                        'hover:ring-2 hover:ring-sky-400 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none',
                        tier ? TIER_CLASS[tier] : 'bg-white dark:bg-slate-900',
                        cell.status === 'no_observation' && !cell.hiddenByFilter ? 'hatch' : '',
                        cell.hiddenByFilter ? 'opacity-50' : '',
                        isLowest ? 'ring-2 ring-emerald-500' : '',
                        selectedKey === key ? 'ring-2 ring-sky-600' : '',
                      ].join(' ')}
                    >
                      <CellContent cell={cell} isLowest={isLowest} />
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MatrixLegend({ hasPrices }: { hasPrices: boolean }) {
  const swatch = 'inline-block h-3 w-5 rounded-sm align-middle';
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
      {hasPrices && (
        <>
          <li>
            <span className={`${swatch} ring-2 ring-emerald-500`} /> Lowest observed fare
          </li>
          <li>
            <span className={`${swatch} bg-emerald-100 dark:bg-emerald-900`} /> Lower third
          </li>
          <li>
            <span className={`${swatch} bg-amber-100 dark:bg-amber-900`} /> Upper third
          </li>
        </>
      )}
      <li>
        <span className={`${swatch} hatch border border-slate-200 dark:border-slate-700`} /> — No
        fare observed
      </li>
      <li>
        <span className={`${swatch} border border-slate-200 dark:border-slate-700`} /> — Not
        searched yet
      </li>
      <li>
        <span className={`${swatch} bg-slate-100 dark:bg-slate-800`} /> Blank: not part of this
        search
      </li>
    </ul>
  );
}

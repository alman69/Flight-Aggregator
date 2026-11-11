import type { ComboCell } from '../coverage';
import type { DateCombo } from '../combos/generate';
import { type BestValueWeights, DEFAULT_BEST_VALUE_WEIGHTS, bestValueScore } from './bestValue';
import type { FareOffer } from './model';

export type SortKey = 'price' | 'duration' | 'best_value' | 'layover';

export const SORT_LABELS: Record<SortKey, string> = {
  price: 'Cheapest',
  duration: 'Fastest',
  best_value: 'Best value',
  layover: 'Shortest layover',
};

const MISSING_FIELD: Record<SortKey, string> = {
  price: 'Price',
  duration: 'Travel time',
  best_value: 'Travel time or stops',
  layover: 'Layover time',
};

export interface RankOptions {
  currency: string;
  weights?: BestValueWeights;
}

export interface RankedEntry<C extends DateCombo = DateCombo> {
  cell: ComboCell<C>;
  /** The offer in this combination that scores best for the chosen sort. */
  offer: FareOffer;
  metric: number;
}

export interface UnscoredEntry<C extends DateCombo = DateCombo> {
  cell: ComboCell<C>;
  reason: string;
}

export interface RankingResult<C extends DateCombo = DateCombo> {
  ranked: RankedEntry<C>[];
  /** Combinations with prices that cannot be scored for this sort (e.g. duration unknown). */
  unscored: UnscoredEntry<C>[];
  /** Combinations without any price. Never mixed into the ranking. */
  withoutData: ComboCell<C>[];
}

/** The number a sort uses (lower is better), or null if the offer lacks the data. */
export function sortMetric(
  offer: FareOffer,
  key: SortKey,
  weights: BestValueWeights = DEFAULT_BEST_VALUE_WEIGHTS,
): number | null {
  switch (key) {
    case 'price':
      return offer.price.amountMinor;
    case 'duration':
      return offer.durationMinutes;
    case 'layover':
      return offer.layoverMinutes;
    case 'best_value':
      return bestValueScore(offer, weights)?.totalMinor ?? null;
  }
}

/**
 * Ranks date combinations by their best offer for the chosen sort.
 * Combinations without prices go to `withoutData` and are never treated as $0.
 * Ties break on price, then departure date, then return date.
 */
export function rankCells<C extends DateCombo>(
  cells: readonly ComboCell<C>[],
  key: SortKey,
  options: RankOptions,
): RankingResult<C> {
  const weights = options.weights ?? DEFAULT_BEST_VALUE_WEIGHTS;
  const result: RankingResult<C> = { ranked: [], unscored: [], withoutData: [] };

  for (const cell of cells) {
    if (cell.offers.length === 0) {
      result.withoutData.push(cell);
      continue;
    }
    const regular = cell.offers.filter((o) => o.itineraryKind !== 'hidden_city');
    if (regular.length === 0) {
      result.unscored.push({
        cell,
        reason: 'Hidden-city fares only (never ranked against regular fares)',
      });
      continue;
    }
    const sameCurrency = regular.filter((o) => o.price.currency === options.currency);
    if (sameCurrency.length === 0) {
      result.unscored.push({ cell, reason: `Priced in a currency other than ${options.currency}` });
      continue;
    }
    let best: RankedEntry<C> | null = null;
    for (const offer of sameCurrency) {
      const metric = sortMetric(offer, key, weights);
      if (metric === null) continue;
      if (
        !best ||
        metric < best.metric ||
        (metric === best.metric && offer.price.amountMinor < best.offer.price.amountMinor)
      ) {
        best = { cell, offer, metric };
      }
    }
    if (best) result.ranked.push(best);
    else result.unscored.push({ cell, reason: `${MISSING_FIELD[key]} not provided by the source` });
  }

  result.ranked.sort(
    (a, b) =>
      a.metric - b.metric ||
      a.offer.price.amountMinor - b.offer.price.amountMinor ||
      a.cell.combo.departDate.localeCompare(b.cell.combo.departDate) ||
      (a.cell.combo.returnDate ?? '').localeCompare(b.cell.combo.returnDate ?? ''),
  );
  return result;
}

/** Which sorts the current data can support: a sort needs at least one offer with its field. */
export function sortAvailability(cells: readonly ComboCell[]): Record<SortKey, boolean> {
  const offers = cells.flatMap((c) => c.offers);
  const has = (key: SortKey) => offers.some((o) => sortMetric(o, key) !== null);
  return {
    price: offers.length > 0,
    duration: has('duration'),
    best_value: has('best_value'),
    layover: has('layover'),
  };
}

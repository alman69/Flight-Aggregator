import { type DateCombo, comboKey } from './combos/generate';
import type { FareOffer, FareStatus } from './fares/model';

/**
 * What we know about one date combination. These states are deliberately distinct:
 * none of them means "no flights exist", which no source we use can confirm.
 * - observed:       at least one price was found.
 * - no_observation: a price source was asked and returned nothing for this pair.
 * - not_queried:    no price source covered this pair (none connected, out of range, or budget used).
 * - query_failed:   asking a source failed (error, timeout, rate limit).
 * - loading:        a request is in progress.
 */
export type CellStatus = 'observed' | 'no_observation' | 'not_queried' | 'query_failed' | 'loading';

export type UnobservedStatus = Exclude<CellStatus, 'observed'>;

export interface ComboCell<C extends DateCombo = DateCombo> {
  combo: C;
  status: CellStatus;
  offers: FareOffer[];
  /** Cheapest offer in the display currency, or null if there is none. */
  lowest: FareOffer | null;
  failureReason: string | null;
}

export interface CellOverride {
  status: UnobservedStatus;
  failureReason?: string;
}

export interface BuildCellsOptions {
  /** Display currency. Offers in other currencies are kept but never picked as the lowest. */
  currency: string;
  /** Status for combinations without offers or an override. Defaults to `not_queried`. */
  defaultStatus?: UnobservedStatus;
  overrides?: ReadonlyMap<string, CellOverride>;
}

export function lowestOffer(offers: readonly FareOffer[], currency: string): FareOffer | null {
  let best: FareOffer | null = null;
  for (const offer of offers) {
    if (offer.price.currency !== currency) continue;
    if (!best || offer.price.amountMinor < best.price.amountMinor) best = offer;
  }
  return best;
}

/**
 * Attaches offers to the date combinations they belong to.
 * Offers whose dates are not one of the combinations are ignored — prices are never
 * moved to a neighbouring date.
 */
export function buildCells<C extends DateCombo>(
  combos: readonly C[],
  offers: readonly FareOffer[],
  options: BuildCellsOptions,
): ComboCell<C>[] {
  const byKey = new Map<string, FareOffer[]>();
  for (const offer of offers) {
    const key = comboKey(offer.departDate, offer.returnDate);
    const list = byKey.get(key);
    if (list) list.push(offer);
    else byKey.set(key, [offer]);
  }
  return combos.map((combo) => {
    const cellOffers = byKey.get(combo.key) ?? [];
    if (cellOffers.length > 0) {
      return {
        combo,
        status: 'observed',
        offers: cellOffers,
        lowest: lowestOffer(cellOffers, options.currency),
        failureReason: null,
      };
    }
    const override = options.overrides?.get(combo.key);
    return {
      combo,
      status: override?.status ?? options.defaultStatus ?? 'not_queried',
      offers: [],
      lowest: null,
      failureReason: override?.failureReason ?? null,
    };
  });
}

export interface CoverageSummary {
  total: number;
  observed: number;
  noObservation: number;
  notQueried: number;
  failed: number;
  loading: number;
  /** Observed combinations that have at least one offer of each kind. */
  observedByStatus: Record<FareStatus, number>;
}

export function summarizeCoverage(cells: readonly ComboCell[]): CoverageSummary {
  const summary: CoverageSummary = {
    total: cells.length,
    observed: 0,
    noObservation: 0,
    notQueried: 0,
    failed: 0,
    loading: 0,
    observedByStatus: { live: 0, cached: 0, manual: 0, demo: 0 },
  };
  for (const cell of cells) {
    switch (cell.status) {
      case 'observed': {
        summary.observed++;
        for (const status of new Set(cell.offers.map((o) => o.status))) {
          summary.observedByStatus[status]++;
        }
        break;
      }
      case 'no_observation':
        summary.noObservation++;
        break;
      case 'not_queried':
        summary.notQueried++;
        break;
      case 'query_failed':
        summary.failed++;
        break;
      case 'loading':
        summary.loading++;
        break;
    }
  }
  return summary;
}

/** e.g. "12 of 45 date combinations have observed fares". */
export function coverageHeadline(summary: CoverageSummary): string {
  const noun = summary.total === 1 ? 'date combination' : 'date combinations';
  const verb = summary.observed === 1 && summary.total === 1 ? 'has' : 'have';
  return `${summary.observed} of ${summary.total} ${noun} ${verb} observed fares`;
}

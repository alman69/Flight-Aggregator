import { type ComboCell, lowestOffer } from '../coverage';
import type { DateCombo } from '../combos/generate';
import { type FareOffer, maxStopsPerDirection } from './model';

export interface ViewFilters {
  /** Maximum price in the display currency's minor units. */
  maxPriceMinor?: number | null;
  /** Maximum stops in each direction (0 = direct only). */
  maxStops?: number | null;
  minNights?: number | null;
  maxNights?: number | null;
}

export interface FilteredCell<C extends DateCombo = DateCombo> extends ComboCell<C> {
  /** True when the combination is outside the night filters, or all its fares were filtered out. */
  hiddenByFilter: boolean;
  /** Offers removed by the filters. */
  hiddenOfferCount: number;
}

export interface FilterResult<C extends DateCombo> {
  cells: FilteredCell<C>[];
  /** Offers removed only because a filtered field was unknown (e.g. stops not provided). */
  hiddenForUnknownField: number;
}

/**
 * Applies view filters. Offers whose filtered field is unknown are removed (we cannot show they
 * meet the filter) and counted, so the UI can say so instead of hiding them silently.
 */
export function applyFilters<C extends DateCombo>(
  cells: readonly ComboCell<C>[],
  filters: ViewFilters,
  currency: string,
): FilterResult<C> {
  let hiddenForUnknownField = 0;

  const keep = (offer: FareOffer): boolean => {
    if (filters.maxPriceMinor != null) {
      if (offer.price.currency !== currency) {
        hiddenForUnknownField++;
        return false;
      }
      if (offer.price.amountMinor > filters.maxPriceMinor) return false;
    }
    if (filters.maxStops != null) {
      const stops = maxStopsPerDirection(offer);
      if (stops === null) {
        hiddenForUnknownField++;
        return false;
      }
      if (stops > filters.maxStops) return false;
    }
    return true;
  };

  const result = cells.map((cell): FilteredCell<C> => {
    const { nights } = cell.combo;
    const outsideNights =
      nights !== null &&
      ((filters.minNights != null && nights < filters.minNights) ||
        (filters.maxNights != null && nights > filters.maxNights));
    if (outsideNights) {
      return { ...cell, hiddenByFilter: true, hiddenOfferCount: cell.offers.length };
    }
    const offers = cell.offers.filter(keep);
    return {
      ...cell,
      offers,
      lowest: lowestOffer(offers, currency),
      hiddenByFilter: cell.offers.length > 0 && offers.length === 0,
      hiddenOfferCount: cell.offers.length - offers.length,
    };
  });

  return { cells: result, hiddenForUnknownField };
}

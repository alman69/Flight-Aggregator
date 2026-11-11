import { type FareOffer, totalStops } from './model';

/** How much an extra hour of travel and an extra stop are worth to you, in the fare's minor units. */
export interface BestValueWeights {
  perHourMinor: number;
  perStopMinor: number;
}

/** $15 per hour of travel and $40 per stop. Editable by the user. */
export const DEFAULT_BEST_VALUE_WEIGHTS: BestValueWeights = {
  perHourMinor: 1500,
  perStopMinor: 4000,
};

export interface BestValueBreakdown {
  priceMinor: number;
  hours: number;
  timeCostMinor: number;
  stops: number;
  stopCostMinor: number;
  /** price + time cost + stop cost. Lower is better. */
  totalMinor: number;
}

/**
 * Transparent best-value score: price + hours × (value of an hour) + stops × (cost of a stop).
 * Returns null when duration or stops are unknown, rather than guessing.
 */
export function bestValueScore(
  offer: FareOffer,
  weights: BestValueWeights = DEFAULT_BEST_VALUE_WEIGHTS,
): BestValueBreakdown | null {
  const stops = totalStops(offer);
  if (offer.durationMinutes === null || stops === null) return null;
  const hours = offer.durationMinutes / 60;
  const timeCostMinor = Math.round(hours * weights.perHourMinor);
  const stopCostMinor = stops * weights.perStopMinor;
  return {
    priceMinor: offer.price.amountMinor,
    hours,
    timeCostMinor,
    stops,
    stopCostMinor,
    totalMinor: offer.price.amountMinor + timeCostMinor + stopCostMinor,
  };
}

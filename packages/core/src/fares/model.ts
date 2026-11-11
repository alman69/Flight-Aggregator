import type { IsoDate } from '../dates/epochDay';
import type { Cabin, TripType } from '../schemas';

/**
 * Where a price came from. The UI must always show this.
 * - live:   a real-time quote from an authorized API. No Milestone 1–3 source produces this.
 * - cached: an earlier observation from a cache API (e.g. Travelpayouts). Not a guarantee of availability.
 * - manual: a price the user saw on a provider's site and typed in.
 * - demo:   generated for interface previews only. Never a real fare.
 */
export type FareStatus = 'live' | 'cached' | 'manual' | 'demo';

export interface Money {
  /** Integer amount in the currency's minor unit (cents for USD). Never floating-point dollars. */
  amountMinor: number;
  /** ISO 4217 code, e.g. USD. */
  currency: string;
}

export type Baggage = 'unknown' | { checkedBags: number; carryOn: boolean };

/**
 * One observed fare, normalized so any source can feed the same interface.
 * Fields the source did not provide are `null` (or 'unknown'), never 0.
 */
export interface FareOffer {
  id: string;
  sourceId: string;
  sourceName: string;
  status: FareStatus;
  itineraryKind: 'standard' | 'hidden_city';
  tripType: TripType;
  originAirport: string;
  destinationAirport: string;
  departDate: IsoDate;
  returnDate: IsoDate | null;
  /** Local departure time `HH:MM`, if known. */
  departTime: string | null;
  stopsOut: number | null;
  stopsBack: number | null;
  /** Total travel time in minutes (both directions for a round trip), if known. */
  durationMinutes: number | null;
  /** Total layover time in minutes, if known. */
  layoverMinutes: number | null;
  airline: string | null;
  flightNumber: string | null;
  price: Money;
  priceBasis: 'per_adult' | 'total';
  adults: number;
  cabin: Cabin | 'unknown';
  baggage: Baggage;
  /** When our app fetched or recorded this value (ISO timestamp). Always known. */
  retrievedAt: string;
  /** When the source says the fare was seen. Only set when the source provides it. */
  observedAt: string | null;
  /** When the source says the fare stops being valid. Only set when the source provides it. */
  expiresAt: string | null;
  /** The source's own statement about freshness, shown as its claim (e.g. "found within ~48 h"). */
  sourceWindowNote: string | null;
  bookingUrl: string | null;
  notes: string[];
}

/** Stops across the whole trip, or null if any direction is unknown. */
export function totalStops(offer: FareOffer): number | null {
  if (offer.stopsOut === null) return null;
  if (offer.tripType === 'one_way') return offer.stopsOut;
  return offer.stopsBack === null ? null : offer.stopsOut + offer.stopsBack;
}

/** The most stops in any single direction (what "max stops" filters mean), or null if unknown. */
export function maxStopsPerDirection(offer: FareOffer): number | null {
  if (offer.stopsOut === null) return null;
  if (offer.tripType === 'one_way') return offer.stopsOut;
  return offer.stopsBack === null ? null : Math.max(offer.stopsOut, offer.stopsBack);
}

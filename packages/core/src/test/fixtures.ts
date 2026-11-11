import type { DateCombo } from '../combos/generate';
import { comboKey } from '../combos/generate';
import type { FareOffer } from '../fares/model';
import { SearchQuerySchema, type SearchQuery, type SearchQueryInput } from '../schemas';

/** "Today" for tests, so results don't depend on the real clock. */
export const TODAY = '2026-11-11';

export function query(overrides: Partial<SearchQueryInput> = {}): SearchQuery {
  return SearchQuerySchema.parse({
    tripType: 'round_trip',
    origin: 'BUF',
    destination: 'TYO',
    dates: { mode: 'window', start: '2027-01-01', end: '2027-01-10' },
    ...overrides,
  });
}

export function combo(departDate: string, returnDate: string | null = null): DateCombo {
  const nights = returnDate ? (Date.parse(returnDate) - Date.parse(departDate)) / 86_400_000 : null;
  return { key: comboKey(departDate, returnDate), departDate, returnDate, nights };
}

let nextId = 1;
export function offer(overrides: Partial<FareOffer> = {}): FareOffer {
  return {
    id: `offer-${nextId++}`,
    sourceId: 'test',
    sourceName: 'Test source',
    status: 'cached',
    itineraryKind: 'standard',
    tripType: 'round_trip',
    originAirport: 'BUF',
    destinationAirport: 'NRT',
    departDate: '2027-01-01',
    returnDate: '2027-01-05',
    departTime: null,
    stopsOut: 1,
    stopsBack: 1,
    durationMinutes: 1200,
    layoverMinutes: 180,
    airline: null,
    flightNumber: null,
    price: { amountMinor: 90000, currency: 'USD' },
    priceBasis: 'per_adult',
    adults: 1,
    cabin: 'economy',
    baggage: 'unknown',
    retrievedAt: '2026-11-11T12:00:00.000Z',
    observedAt: null,
    expiresAt: null,
    sourceWindowNote: null,
    bookingUrl: null,
    notes: [],
    ...overrides,
  };
}

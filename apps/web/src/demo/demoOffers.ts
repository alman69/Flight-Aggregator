import type { DateCombo, FareOffer, SearchQuery } from '@flight/core';

/**
 * DEMO ONLY. Generates obviously fake fares so the interface can be previewed before any price
 * source exists. Runs in the browser, is never sent to the server and never stored.
 * Deterministic per route and date, so reloading shows the same numbers.
 */

const DEMO_AIRLINES = ['Demo Air', 'Sample Airways', 'Placeholder Jet'];
export const DEMO_SOURCE_ID = 'demo';

function hash(text: string): number {
  let h = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function random(seed: number): () => number {
  let a = seed; // mulberry32
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDemoOffers(
  combos: readonly DateCombo[],
  query: SearchQuery,
  retrievedAt: string,
): FareOffer[] {
  const offers: FareOffer[] = [];
  const roundTrip = query.tripType === 'round_trip';
  for (const combo of combos) {
    const rand = random(hash(`${query.origin}-${query.destination}-${combo.key}`));
    // About a third of combinations get no demo price, to show what gaps look like.
    if (rand() < 0.33) continue;
    const count = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const stopsOut = rand() < 0.2 ? 0 : rand() < 0.75 ? 1 : 2;
      const stopsBack = roundTrip ? (rand() < 0.2 ? 0 : rand() < 0.75 ? 1 : 2) : null;
      const legs = roundTrip ? 2 : 1;
      const layoverMinutes = (stopsOut + (stopsBack ?? 0)) * Math.round(45 + rand() * 200);
      const durationKnown = rand() > 0.1;
      const dollars = Math.round(
        (roundTrip ? 520 : 310) + rand() * 650 + (combo.nights ?? 0) * 9 - stopsOut * 40,
      );
      offers.push({
        id: `demo-${combo.key}-${i}`,
        sourceId: DEMO_SOURCE_ID,
        sourceName: 'Demo generator',
        status: 'demo',
        itineraryKind: 'standard',
        tripType: query.tripType,
        originAirport: query.origin,
        destinationAirport: query.destination,
        departDate: combo.departDate,
        returnDate: combo.returnDate,
        departTime: `${String(6 + Math.floor(rand() * 16)).padStart(2, '0')}:${rand() < 0.5 ? '00' : '30'}`,
        stopsOut,
        stopsBack,
        durationMinutes: durationKnown
          ? legs * Math.round(700 + rand() * 300) + layoverMinutes
          : null,
        layoverMinutes: durationKnown ? layoverMinutes : null,
        airline: DEMO_AIRLINES[Math.floor(rand() * DEMO_AIRLINES.length)]!,
        flightNumber: null,
        price: { amountMinor: dollars * 100, currency: 'USD' },
        priceBasis: 'per_adult',
        adults: 1,
        cabin: query.cabin,
        baggage: 'unknown',
        retrievedAt,
        observedAt: null,
        expiresAt: null,
        sourceWindowNote: null,
        bookingUrl: null,
        notes: ['Randomly generated to preview the interface. Not a real fare.'],
      });
    }
  }
  return offers;
}

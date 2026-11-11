import { SearchQuerySchema, generateCombos } from '@flight/core';
import { describe, expect, it } from 'vitest';
import { generateDemoOffers } from './demoOffers';

const query = SearchQuerySchema.parse({
  tripType: 'round_trip',
  origin: 'BUF',
  destination: 'TYO',
  dates: { mode: 'window', start: '2027-01-01', end: '2027-01-10' },
});
const combos = generateCombos(query);

describe('generateDemoOffers', () => {
  const offers = generateDemoOffers(combos, query, '2026-11-11T12:00:00.000Z');

  it('labels every offer as demo data and never as cached or live', () => {
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((o) => o.status === 'demo' && o.sourceId === 'demo')).toBe(true);
    expect(offers.every((o) => o.notes.some((n) => /Not a real fare/.test(n)))).toBe(true);
  });

  it('uses obviously fake airline names', () => {
    expect(new Set(offers.map((o) => o.airline))).toEqual(
      new Set(
        ['Demo Air', 'Sample Airways', 'Placeholder Jet'].filter((a) =>
          offers.some((o) => o.airline === a),
        ),
      ),
    );
  });

  it('is deterministic and leaves some combinations empty', () => {
    const again = generateDemoOffers(combos, query, '2026-11-11T12:00:00.000Z');
    expect(again).toEqual(offers);
    const covered = new Set(offers.map((o) => `${o.departDate}_${o.returnDate}`));
    expect(covered.size).toBeLessThan(combos.length);
    expect(covered.size).toBeGreaterThan(0);
  });

  it('never produces zero or negative prices', () => {
    expect(offers.every((o) => o.price.amountMinor > 0)).toBe(true);
  });
});

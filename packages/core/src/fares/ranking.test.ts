import { describe, expect, it } from 'vitest';
import { buildCells } from '../coverage';
import { combo, offer } from '../test/fixtures';
import { rankCells, sortAvailability } from './ranking';

const combos = [
  combo('2027-01-01', '2027-01-03'),
  combo('2027-01-01', '2027-01-04'),
  combo('2027-01-02', '2027-01-04'),
  combo('2027-01-02', '2027-01-05'),
];
const at = (i: number) => ({
  departDate: combos[i]!.departDate,
  returnDate: combos[i]!.returnDate,
});
const usd = (amount: number) => ({ amountMinor: amount * 100, currency: 'USD' });

const cells = buildCells(
  combos,
  [
    offer({
      ...at(0),
      price: usd(900),
      durationMinutes: 900,
      stopsOut: 1,
      stopsBack: 1,
      layoverMinutes: 200,
    }),
    offer({
      ...at(1),
      price: usd(700),
      durationMinutes: 1500,
      stopsOut: 2,
      stopsBack: 2,
      layoverMinutes: 600,
    }),
    offer({
      ...at(2),
      price: usd(800),
      durationMinutes: null,
      stopsOut: null,
      stopsBack: null,
      layoverMinutes: null,
    }),
  ],
  { currency: 'USD' },
);

describe('rankCells', () => {
  it('sorts by price and keeps combinations without data separate', () => {
    const result = rankCells(cells, 'price', { currency: 'USD' });
    expect(result.ranked.map((r) => r.offer.price.amountMinor)).toEqual([70000, 80000, 90000]);
    expect(result.withoutData.map((c) => c.combo.key)).toEqual([combos[3]!.key]);
    expect(result.unscored).toEqual([]);
  });

  it('sorts by travel time and lists fares without it as unscored', () => {
    const result = rankCells(cells, 'duration', { currency: 'USD' });
    expect(result.ranked.map((r) => r.metric)).toEqual([900, 1500]);
    expect(result.unscored).toHaveLength(1);
    expect(result.unscored[0]!.reason).toMatch(/Travel time not provided/);
  });

  it('sorts by shortest layover', () => {
    const result = rankCells(cells, 'layover', { currency: 'USD' });
    expect(result.ranked.map((r) => r.metric)).toEqual([200, 600]);
  });

  it('sorts by the transparent best-value score', () => {
    // $900 + 15h×$15 + 2 stops×$40 = 900 + 225 + 80 = $1,205
    // $700 + 25h×$15 + 4 stops×$40 = 700 + 375 + 160 = $1,235
    const result = rankCells(cells, 'best_value', { currency: 'USD' });
    expect(result.ranked.map((r) => r.metric)).toEqual([120500, 123500]);
  });

  it('uses custom best-value weights', () => {
    // With time worth nothing, the cheaper fare wins despite more stops: 700 + 4×10 = 740 < 900 + 2×10
    const result = rankCells(cells, 'best_value', {
      currency: 'USD',
      weights: { perHourMinor: 0, perStopMinor: 1000 },
    });
    expect(result.ranked[0]!.offer.price.amountMinor).toBe(70000);
  });

  it('breaks price ties by departure date then return date', () => {
    const tied = buildCells(
      combos,
      [
        offer({ ...at(2), price: usd(500) }),
        offer({ ...at(1), price: usd(500) }),
        offer({ ...at(0), price: usd(500) }),
      ],
      { currency: 'USD' },
    );
    expect(
      rankCells(tied, 'price', { currency: 'USD' }).ranked.map((r) => r.cell.combo.key),
    ).toEqual([combos[0]!.key, combos[1]!.key, combos[2]!.key]);
  });

  it('never ranks fares priced in another currency against the display currency', () => {
    const mixed = buildCells(
      combos,
      [
        offer({ ...at(0), price: { amountMinor: 100, currency: 'CAD' } }),
        offer({ ...at(1), price: usd(700) }),
      ],
      { currency: 'USD' },
    );
    const result = rankCells(mixed, 'price', { currency: 'USD' });
    expect(result.ranked).toHaveLength(1);
    expect(result.unscored[0]!.reason).toMatch(/currency/);
  });

  it('returns an empty ranking when there is no price data at all', () => {
    const result = rankCells(buildCells(combos, [], { currency: 'USD' }), 'price', {
      currency: 'USD',
    });
    expect(result.ranked).toEqual([]);
    expect(result.withoutData).toHaveLength(4);
  });
});

describe('sortAvailability', () => {
  it('reports which sorts the data supports', () => {
    expect(sortAvailability(cells)).toEqual({
      price: true,
      duration: true,
      best_value: true,
      layover: true,
    });
    const priceOnly = buildCells(
      combos,
      [offer({ ...at(0), durationMinutes: null, layoverMinutes: null })],
      { currency: 'USD' },
    );
    expect(sortAvailability(priceOnly)).toEqual({
      price: true,
      duration: false,
      best_value: false,
      layover: false,
    });
    expect(sortAvailability(buildCells(combos, [], { currency: 'USD' })).price).toBe(false);
  });
});

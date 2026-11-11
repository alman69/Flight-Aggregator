import { describe, expect, it } from 'vitest';
import { buildCells } from '../coverage';
import { combo, offer } from '../test/fixtures';
import { applyFilters } from './filters';

const combos = [
  combo('2027-01-01', '2027-01-03'),
  combo('2027-01-01', '2027-01-06'),
  combo('2027-01-02', '2027-01-04'),
];
const at = (i: number) => ({
  departDate: combos[i]!.departDate,
  returnDate: combos[i]!.returnDate,
});

const cells = buildCells(
  combos,
  [
    offer({ ...at(0), price: { amountMinor: 50000, currency: 'USD' }, stopsOut: 0, stopsBack: 0 }),
    offer({ ...at(0), price: { amountMinor: 40000, currency: 'USD' }, stopsOut: 1, stopsBack: 0 }),
    offer({
      ...at(1),
      price: { amountMinor: 30000, currency: 'USD' },
      stopsOut: null,
      stopsBack: null,
    }),
  ],
  { currency: 'USD' },
);

describe('applyFilters', () => {
  it('direct only keeps non-stop fares and recomputes the lowest', () => {
    const { cells: out, hiddenForUnknownField } = applyFilters(cells, { maxStops: 0 }, 'USD');
    expect(out[0]!.offers).toHaveLength(1);
    expect(out[0]!.lowest!.price.amountMinor).toBe(50000);
    // The fare with unknown stops is hidden and counted, not silently treated as direct.
    expect(out[1]!.hiddenByFilter).toBe(true);
    expect(hiddenForUnknownField).toBe(1);
  });

  it('filters by maximum price', () => {
    const { cells: out } = applyFilters(cells, { maxPriceMinor: 45000 }, 'USD');
    expect(out[0]!.lowest!.price.amountMinor).toBe(40000);
    expect(out[0]!.hiddenOfferCount).toBe(1);
  });

  it('hides combinations outside the night range', () => {
    const { cells: out } = applyFilters(cells, { minNights: 3 }, 'USD');
    expect(out.map((c) => c.hiddenByFilter)).toEqual([true, false, true]);
  });

  it('does not mark empty combinations as filtered', () => {
    const { cells: out } = applyFilters(cells, { maxPriceMinor: 1 }, 'USD');
    expect(out[2]!.hiddenByFilter).toBe(false);
    expect(out[2]!.status).toBe('not_queried');
  });
});

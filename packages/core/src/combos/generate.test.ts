import { describe, expect, it } from 'vitest';
import { query } from '../test/fixtures';
import { generateCombos, resolveNights } from './generate';

const nov = { mode: 'window' as const, start: '2027-11-01', end: '2027-11-10' };

describe('Mode A: single flexible window', () => {
  it('produces 45 round trips for a 10-day window with no duration limit', () => {
    const combos = generateCombos(query({ dates: nov }));
    expect(combos).toHaveLength(45);
    expect(combos.every((c) => c.returnDate! > c.departDate)).toBe(true);
    expect(new Set(combos.map((c) => c.key)).size).toBe(45);
  });

  it('starts with Nov 1 → Nov 2 and ends with Nov 9 → Nov 10, in order', () => {
    const combos = generateCombos(query({ dates: nov }));
    expect(combos.slice(0, 3).map((c) => [c.departDate, c.returnDate])).toEqual([
      ['2027-11-01', '2027-11-02'],
      ['2027-11-01', '2027-11-03'],
      ['2027-11-01', '2027-11-04'],
    ]);
    expect(combos.at(-1)).toMatchObject({
      departDate: '2027-11-09',
      returnDate: '2027-11-10',
      nights: 1,
    });
  });

  it('produces 18 combinations for 3–5 nights (7 + 6 + 5)', () => {
    const combos = generateCombos(
      query({ dates: nov, duration: { kind: 'range', minNights: 3, maxNights: 5 } }),
    );
    expect(combos).toHaveLength(18);
    const byNights = (n: number) => combos.filter((c) => c.nights === n).length;
    expect([byNights(3), byNights(4), byNights(5)]).toEqual([7, 6, 5]);
  });

  it('supports an exact trip length', () => {
    const combos = generateCombos(query({ dates: nov, duration: { kind: 'exact', nights: 4 } }));
    expect(combos).toHaveLength(6);
    expect(combos.every((c) => c.nights === 4)).toBe(true);
  });

  it('supports only a minimum or only a maximum', () => {
    expect(
      generateCombos(query({ dates: nov, duration: { kind: 'range', minNights: 8 } })),
    ).toHaveLength(3); // 8: 2, 9: 1
    expect(
      generateCombos(query({ dates: nov, duration: { kind: 'range', maxNights: 1 } })),
    ).toHaveLength(9);
  });

  it('returns nothing when the trip length cannot fit in the window', () => {
    expect(generateCombos(query({ dates: nov, duration: { kind: 'exact', nights: 10 } }))).toEqual(
      [],
    );
  });

  it('crosses a leap day correctly', () => {
    const combos = generateCombos(
      query({ dates: { mode: 'window', start: '2028-02-27', end: '2028-03-02' } }),
    );
    // 5 days in the window (27, 28, 29, 1, 2) → C(5,2) = 10
    expect(combos).toHaveLength(10);
    expect(combos.find((c) => c.key === '2028-02-28_2028-03-01')?.nights).toBe(2);
  });

  it('crosses a year boundary', () => {
    const combos = generateCombos(
      query({
        dates: { mode: 'window', start: '2027-12-30', end: '2028-01-02' },
        duration: { kind: 'exact', nights: 2 },
      }),
    );
    expect(combos.map((c) => c.key)).toEqual(['2027-12-30_2028-01-01', '2027-12-31_2028-01-02']);
  });
});

describe('Mode B: separate departure and return windows', () => {
  it('pairs every departure with every later return', () => {
    const combos = generateCombos(
      query({
        dates: {
          mode: 'split',
          depart: { start: '2027-11-01', end: '2027-11-04' },
          return: { start: '2027-11-07', end: '2027-11-10' },
        },
      }),
    );
    expect(combos).toHaveLength(16);
    expect(combos[0]).toMatchObject({
      departDate: '2027-11-01',
      returnDate: '2027-11-07',
      nights: 6,
    });
  });

  it('applies trip-length limits within the windows', () => {
    const combos = generateCombos(
      query({
        dates: {
          mode: 'split',
          depart: { start: '2027-11-01', end: '2027-11-04' },
          return: { start: '2027-11-07', end: '2027-11-10' },
        },
        duration: { kind: 'range', minNights: 5, maxNights: 6 },
      }),
    );
    expect(combos.every((c) => c.nights! >= 5 && c.nights! <= 6)).toBe(true);
    // nights 5: (2→7)(3→8)(4→9) ; nights 6: (1→7)(2→8)(3→9)(4→10)
    expect(combos).toHaveLength(7);
  });

  it('never returns before departing when windows overlap', () => {
    const combos = generateCombos(
      query({
        dates: {
          mode: 'split',
          depart: { start: '2027-11-01', end: '2027-11-05' },
          return: { start: '2027-11-03', end: '2027-11-06' },
        },
      }),
    );
    expect(combos.every((c) => c.returnDate! > c.departDate)).toBe(true);
    // dep 1: 4 returns, dep 2: 4, dep 3: 3, dep 4: 2, dep 5: 1
    expect(combos).toHaveLength(14);
  });

  it('produces nothing for a one-way search (validation reports why)', () => {
    expect(
      generateCombos(
        query({
          tripType: 'one_way',
          dates: {
            mode: 'split',
            depart: { start: '2027-11-01', end: '2027-11-04' },
            return: { start: '2027-11-07', end: '2027-11-10' },
          },
        }),
      ),
    ).toEqual([]);
  });
});

describe('fixed dates and one-way', () => {
  it('returns the single fixed pair, ignoring trip-length filters', () => {
    const combos = generateCombos(
      query({
        dates: { mode: 'fixed', departDate: '2027-11-03', returnDate: '2027-11-08' },
        duration: { kind: 'exact', nights: 2 },
      }),
    );
    expect(combos).toEqual([
      {
        key: '2027-11-03_2027-11-08',
        departDate: '2027-11-03',
        returnDate: '2027-11-08',
        nights: 5,
      },
    ]);
  });

  it('returns nothing for a fixed round trip without a valid return', () => {
    expect(generateCombos(query({ dates: { mode: 'fixed', departDate: '2027-11-03' } }))).toEqual(
      [],
    );
    expect(
      generateCombos(
        query({ dates: { mode: 'fixed', departDate: '2027-11-03', returnDate: '2027-11-03' } }),
      ),
    ).toEqual([]);
  });

  it('lists one combination per departure date for a one-way window', () => {
    const combos = generateCombos(query({ tripType: 'one_way', dates: nov }));
    expect(combos).toHaveLength(10);
    expect(combos.every((c) => c.returnDate === null && c.nights === null)).toBe(true);
    expect(combos[0]!.key).toBe('2027-11-01');
  });

  it('returns a single one-way combination for a fixed date', () => {
    expect(
      generateCombos(
        query({ tripType: 'one_way', dates: { mode: 'fixed', departDate: '2027-11-03' } }),
      ),
    ).toHaveLength(1);
  });
});

describe('resolveNights', () => {
  it('always requires at least one night', () => {
    expect(resolveNights({ kind: 'any' })).toEqual({ min: 1, max: Infinity });
    expect(resolveNights({ kind: 'range' })).toEqual({ min: 1, max: Infinity });
    expect(resolveNights({ kind: 'exact', nights: 4 })).toEqual({ min: 4, max: 4 });
  });
});

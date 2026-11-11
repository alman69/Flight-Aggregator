import { describe, expect, it } from 'vitest';
import { TODAY, query } from '../test/fixtures';
import { SEARCH_LIMITS, planSearch, validateQuery } from './plan';

const codes = (q: ReturnType<typeof query>) => planSearch(q, TODAY).issues.map((i) => i.code);

describe('planSearch', () => {
  it('returns combinations and matrix axes for a valid search', () => {
    const plan = planSearch(
      query({ dates: { mode: 'window', start: '2027-01-01', end: '2027-01-10' } }),
      TODAY,
    );
    expect(plan.ok).toBe(true);
    expect(plan.totalCombinations).toBe(45);
    expect(plan.departDates).toHaveLength(9); // Jan 1–9
    expect(plan.returnDates).toHaveLength(9); // Jan 2–10
    expect(plan.issues).toEqual([]);
  });

  it('has no return axis for one-way searches', () => {
    const plan = planSearch(query({ tripType: 'one_way' }), TODAY);
    expect(plan.ok).toBe(true);
    expect(plan.returnDates).toEqual([]);
    expect(plan.departDates).toHaveLength(10);
  });

  it('rejects a reversed range', () => {
    const plan = planSearch(
      query({ dates: { mode: 'window', start: '2027-01-10', end: '2027-01-01' } }),
      TODAY,
    );
    expect(plan.ok).toBe(false);
    expect(plan.combos).toEqual([]);
    expect(plan.issues.map((i) => i.code)).toContain('reversed_range');
  });

  it('rejects departures in the past', () => {
    expect(
      codes(query({ dates: { mode: 'window', start: '2026-11-10', end: '2026-11-20' } })),
    ).toContain('date_in_past');
    expect(
      codes(
        query({ dates: { mode: 'fixed', departDate: '2026-11-01', returnDate: '2026-11-20' } }),
      ),
    ).toContain('date_in_past');
  });

  it('allows departing today', () => {
    expect(
      planSearch(query({ dates: { mode: 'window', start: TODAY, end: '2026-11-15' } }), TODAY).ok,
    ).toBe(true);
  });

  it('rejects the same origin and destination', () => {
    expect(codes(query({ destination: 'BUF' }))).toContain('same_airport');
  });

  it('rejects a minimum above the maximum', () => {
    expect(codes(query({ duration: { kind: 'range', minNights: 6, maxNights: 3 } }))).toContain(
      'invalid_duration',
    );
  });

  it('explains when filters leave no combinations', () => {
    const plan = planSearch(
      query({
        dates: { mode: 'window', start: '2027-01-01', end: '2027-01-05' },
        duration: { kind: 'exact', nights: 7 },
      }),
      TODAY,
    );
    expect(plan.ok).toBe(false);
    expect(plan.issues[0]).toMatchObject({ level: 'error', code: 'no_combinations' });
  });

  it('rejects windows longer than the limit', () => {
    expect(
      codes(query({ dates: { mode: 'window', start: '2027-01-01', end: '2027-03-15' } })),
    ).toContain('window_too_large');
  });

  it('rejects searches with too many combinations', () => {
    // 40-day window, no limit → C(40,2) = 780
    const plan = planSearch(
      query({ dates: { mode: 'window', start: '2027-01-01', end: '2027-02-09' } }),
      TODAY,
    );
    expect(plan.ok).toBe(false);
    expect(plan.issues.map((i) => i.code)).toContain('too_many_combinations');
    expect(SEARCH_LIMITS.maxCombinations).toBe(400);
  });

  it('accepts the same window once nights are limited', () => {
    const plan = planSearch(
      query({
        dates: { mode: 'window', start: '2027-01-01', end: '2027-02-09' },
        duration: { kind: 'range', minNights: 5, maxNights: 9 },
      }),
      TODAY,
    );
    expect(plan.ok).toBe(true);
    expect(plan.totalCombinations).toBeLessThanOrEqual(400);
  });

  it('warns, without failing, about dates beyond the fare-publishing horizon', () => {
    const plan = planSearch(
      query({ dates: { mode: 'window', start: '2027-11-01', end: '2027-11-10' } }),
      TODAY,
    );
    expect(plan.ok).toBe(true);
    expect(plan.totalCombinations).toBe(45);
    expect(plan.issues).toEqual([
      expect.objectContaining({ level: 'warning', code: 'beyond_publish_horizon' }),
    ]);
  });
});

describe('separate windows validation', () => {
  const split = (depart: [string, string], ret: [string, string]) =>
    query({
      dates: {
        mode: 'split',
        depart: { start: depart[0], end: depart[1] },
        return: { start: ret[0], end: ret[1] },
      },
    });

  it('accepts overlapping windows', () => {
    expect(
      planSearch(split(['2027-01-01', '2027-01-05'], ['2027-01-03', '2027-01-08']), TODAY).ok,
    ).toBe(true);
  });

  it('rejects a return window that ends before departures start', () => {
    expect(codes(split(['2027-01-10', '2027-01-12'], ['2027-01-01', '2027-01-05']))).toContain(
      'return_before_departure',
    );
  });

  it('rejects a reversed return window', () => {
    const issues = planSearch(
      split(['2027-01-01', '2027-01-03'], ['2027-01-09', '2027-01-07']),
      TODAY,
    ).issues;
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'reversed_range', field: 'returnWindow' }),
    );
  });

  it('rejects separate windows for one-way trips', () => {
    const q = {
      ...split(['2027-01-01', '2027-01-03'], ['2027-01-07', '2027-01-09']),
      tripType: 'one_way' as const,
    };
    expect(validateQuery(q, TODAY).map((i) => i.code)).toContain('split_requires_round_trip');
  });
});

describe('fixed dates validation', () => {
  it('requires a return date for round trips', () => {
    expect(codes(query({ dates: { mode: 'fixed', departDate: '2027-01-03' } }))).toContain(
      'missing_return',
    );
  });

  it('requires the return to be after departure', () => {
    expect(
      codes(
        query({ dates: { mode: 'fixed', departDate: '2027-01-03', returnDate: '2027-01-03' } }),
      ),
    ).toContain('return_not_after_departure');
  });

  it('does not need a return date for one-way', () => {
    const plan = planSearch(
      query({ tripType: 'one_way', dates: { mode: 'fixed', departDate: '2027-01-03' } }),
      TODAY,
    );
    expect(plan.ok).toBe(true);
    expect(plan.totalCombinations).toBe(1);
  });
});

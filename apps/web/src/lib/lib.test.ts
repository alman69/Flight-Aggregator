import { SearchQuerySchema } from '@flight/core';
import { describe, expect, it } from 'vitest';
import { formatDate, formatMinutes } from './format';
import { makePriceTier } from './priceTiers';
import { defaultFormState, formToInput, queryToForm } from './searchForm';
import { paramsToState, queryToParams } from './urlState';

const window = SearchQuerySchema.parse({
  tripType: 'round_trip',
  origin: 'BUF',
  destination: 'TYO',
  dates: { mode: 'window', start: '2027-11-01', end: '2027-11-10' },
  duration: { kind: 'range', minNights: 3, maxNights: 5 },
  adults: 2,
  cabin: 'business',
});
const split = SearchQuerySchema.parse({
  tripType: 'round_trip',
  origin: 'YYZ',
  destination: 'LON',
  dates: {
    mode: 'split',
    depart: { start: '2027-11-01', end: '2027-11-04' },
    return: { start: '2027-11-07', end: '2027-11-10' },
  },
  duration: { kind: 'exact', nights: 6 },
});
const fixedOneWay = SearchQuerySchema.parse({
  tripType: 'one_way',
  origin: 'BUF',
  destination: 'MCO',
  dates: { mode: 'fixed', departDate: '2027-01-15' },
});

describe('URL state', () => {
  it.each([window, split, fixedOneWay])('round-trips %#', (query) => {
    const state = paramsToState(queryToParams(query, true));
    expect(state).toEqual({ query, demo: true });
  });

  it('uses readable keys', () => {
    expect(queryToParams(window).toString()).toBe(
      'trip=rt&from=BUF&to=TYO&mode=window&start=2027-11-01&end=2027-11-10&dur=range&min=3&max=5&adults=2&cabin=business',
    );
  });

  it('returns no query for invalid or missing parameters instead of guessing', () => {
    expect(paramsToState(new URLSearchParams('')).query).toBeNull();
    expect(
      paramsToState(
        new URLSearchParams('trip=rt&from=BUF&to=TYO&mode=window&start=2027-02-30&end=2027-03-02'),
      ).query,
    ).toBeNull();
    expect(paramsToState(new URLSearchParams('demo=1')).demo).toBe(true);
  });
});

describe('search form model', () => {
  it('converts loaded searches back to the same query', () => {
    for (const query of [window, split, fixedOneWay]) {
      expect(SearchQuerySchema.parse(formToInput(queryToForm(query, '2026-11-11')))).toEqual(query);
    }
  });

  it('starts with a valid default search except for the destination', () => {
    const result = SearchQuerySchema.safeParse(formToInput(defaultFormState('2026-11-11')));
    expect(result.success).toBe(false);
    expect(result.error!.issues.map((i) => i.path[0])).toEqual(['destination']);
  });

  it('rejects an empty exact-nights field rather than defaulting it', () => {
    const form = {
      ...defaultFormState('2026-11-11'),
      destination: 'TYO',
      durationKind: 'exact' as const,
    };
    expect(SearchQuerySchema.safeParse(formToInput(form)).success).toBe(false);
  });
});

describe('price tiers', () => {
  it('needs at least three prices', () => {
    expect(makePriceTier([100, 200])(100)).toBeNull();
  });

  it('splits prices into thirds', () => {
    const tier = makePriceTier([100, 200, 300, 400, 500, 600]);
    expect([100, 200, 300, 400, 500, 600].map(tier)).toEqual([
      'low',
      'low',
      'mid',
      'mid',
      'high',
      'high',
    ]);
  });
});

describe('formatting', () => {
  it('formats dates and durations', () => {
    expect(formatDate('2027-11-01')).toBe('Mon, Nov 1');
    expect(formatMinutes(1230)).toBe('20h 30m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(120)).toBe('2h');
  });
});

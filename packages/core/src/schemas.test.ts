import { describe, expect, it } from 'vitest';
import { SearchQuerySchema } from './schemas';

const base = {
  tripType: 'round_trip',
  origin: 'buf',
  destination: ' tyo ',
  dates: { mode: 'window', start: '2027-11-01', end: '2027-11-10' },
};

describe('SearchQuerySchema', () => {
  it('normalizes codes and applies defaults', () => {
    const parsed = SearchQuerySchema.parse(base);
    expect(parsed.origin).toBe('BUF');
    expect(parsed.destination).toBe('TYO');
    expect(parsed.duration).toEqual({ kind: 'any' });
    expect(parsed.adults).toBe(1);
    expect(parsed.cabin).toBe('economy');
  });

  it('rejects impossible dates and bad codes', () => {
    expect(
      SearchQuerySchema.safeParse({
        ...base,
        dates: { mode: 'window', start: '2027-02-29', end: '2027-03-05' },
      }).success,
    ).toBe(false);
    expect(SearchQuerySchema.safeParse({ ...base, origin: 'BUFF' }).success).toBe(false);
    expect(SearchQuerySchema.safeParse({ ...base, origin: 'B1F' }).success).toBe(false);
  });

  it('rejects out-of-range passengers and nights', () => {
    expect(SearchQuerySchema.safeParse({ ...base, adults: 0 }).success).toBe(false);
    expect(SearchQuerySchema.safeParse({ ...base, adults: 10 }).success).toBe(false);
    expect(
      SearchQuerySchema.safeParse({ ...base, duration: { kind: 'exact', nights: 0 } }).success,
    ).toBe(false);
    expect(
      SearchQuerySchema.safeParse({ ...base, duration: { kind: 'range', minNights: 2.5 } }).success,
    ).toBe(false);
  });
});

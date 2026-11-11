import { describe, expect, it } from 'vitest';
import { METRO_AREAS, expandAirportCode, isMetroCode } from './metros';
import { describeSuggestion } from './types';

describe('metro areas', () => {
  it('expands metro codes to their airports', () => {
    expect(expandAirportCode('tyo')).toEqual(['TYO', 'NRT', 'HND']);
    expect(expandAirportCode('YTO')).toEqual(['YTO', 'YYZ', 'YTZ']);
    expect(expandAirportCode('BUF')).toEqual(['BUF']);
  });

  it('does not treat airport codes that double as city codes as metros', () => {
    expect(isMetroCode('SHA')).toBe(false);
    expect(isMetroCode('NRT')).toBe(false);
  });

  it('never lists a member airport twice or a metro inside another', () => {
    const all = Object.values(METRO_AREAS).flatMap((m) => m.airports);
    expect(new Set(all).size).toBe(all.length);
    expect(all.some((code) => isMetroCode(code))).toBe(false);
  });

  it('describes suggestions', () => {
    expect(
      describeSuggestion({
        code: 'TYO',
        kind: 'metro',
        name: 'Tokyo',
        city: 'Tokyo',
        countryCode: 'JP',
        country: 'Japan',
        airports: ['NRT', 'HND'],
      }),
    ).toBe('Tokyo · all airports (NRT, HND)');
    expect(
      describeSuggestion({
        code: 'BUF',
        kind: 'airport',
        name: 'Buffalo Niagara International Airport',
        city: 'Buffalo',
        countryCode: 'US',
        country: 'United States',
        airports: [],
      }),
    ).toBe('Buffalo Niagara International Airport · Buffalo, United States');
  });
});

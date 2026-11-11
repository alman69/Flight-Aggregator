import { describe, expect, it } from 'vitest';
import { formatMoney, toMinorUnits, currencyMinorDigits } from '../money';
import { offer } from '../test/fixtures';
import { bestValueScore } from './bestValue';
import { comparabilityIssues, groupComparabilityIssues } from './comparability';
import { dedupeOffers } from './dedupe';
import { describeFreshness, relativeTime } from './freshness';
import { maxStopsPerDirection, totalStops } from './model';

const NOW = new Date('2026-11-11T12:00:00.000Z');

describe('money', () => {
  it('uses integer minor units per currency', () => {
    expect(currencyMinorDigits('USD')).toBe(2);
    expect(currencyMinorDigits('JPY')).toBe(0);
    expect(toMinorUnits(842.5, 'USD')).toBe(84250);
    expect(toMinorUnits(0.1 + 0.2, 'USD')).toBe(30);
    expect(toMinorUnits(98000, 'JPY')).toBe(98000);
  });

  it('formats amounts', () => {
    expect(formatMoney({ amountMinor: 123400, currency: 'USD' })).toBe('$1,234');
    expect(formatMoney({ amountMinor: 123450, currency: 'USD' })).toBe('$1,234.50');
    expect(formatMoney({ amountMinor: 98000, currency: 'JPY' })).toBe('¥98,000');
    expect(formatMoney({ amountMinor: 123400, currency: 'CAD' })).toBe('CA$1,234');
  });
});

describe('freshness', () => {
  it('describes relative times', () => {
    expect(relativeTime('2026-11-11T11:59:30.000Z', NOW)).toBe('just now');
    expect(relativeTime('2026-11-11T11:00:00.000Z', NOW)).toBe('1 hour ago');
    expect(relativeTime('2026-11-09T12:00:00.000Z', NOW)).toBe('2 days ago');
  });

  it('only mentions when a cached fare was seen if the source said so', () => {
    const withoutObservation = describeFreshness(
      offer({
        retrievedAt: '2026-11-11T09:00:00.000Z',
        sourceWindowNote: 'Source says: found within ~48 h.',
      }),
      NOW,
    );
    expect(withoutObservation.label).toBe('Cached');
    expect(withoutObservation.detail).toMatch(/did not say when it was seen/);
    expect(withoutObservation.detail).toMatch(/Source says: found within ~48 h/);

    const withObservation = describeFreshness(
      offer({ observedAt: '2026-11-09T12:00:00.000Z', retrievedAt: '2026-11-11T11:00:00.000Z' }),
      NOW,
    );
    expect(withObservation.detail).toBe(
      'Cached observation, seen 2 days ago; retrieved 1 hour ago.',
    );
  });

  it('flags fares past their source expiry', () => {
    expect(describeFreshness(offer({ expiresAt: '2026-11-10T00:00:00.000Z' }), NOW).expired).toBe(
      true,
    );
    expect(describeFreshness(offer({ expiresAt: '2026-11-12T00:00:00.000Z' }), NOW).expired).toBe(
      false,
    );
  });

  it('labels demo and manual data plainly', () => {
    expect(describeFreshness(offer({ status: 'demo' }), NOW).detail).toMatch(/Not a real fare/);
    expect(
      describeFreshness(offer({ status: 'manual', observedAt: '2026-11-11T11:00:00.000Z' }), NOW)
        .detail,
    ).toBe('Entered by you 1 hour ago.');
  });
});

describe('stops', () => {
  it('returns null instead of 0 when stops are unknown', () => {
    expect(totalStops(offer({ stopsOut: 1, stopsBack: null }))).toBeNull();
    expect(maxStopsPerDirection(offer({ stopsOut: null }))).toBeNull();
    expect(totalStops(offer({ stopsOut: 1, stopsBack: 2 }))).toBe(3);
    expect(maxStopsPerDirection(offer({ stopsOut: 1, stopsBack: 2 }))).toBe(2);
    expect(
      totalStops(offer({ tripType: 'one_way', returnDate: null, stopsOut: 0, stopsBack: null })),
    ).toBe(0);
  });
});

describe('bestValueScore', () => {
  it('shows its working', () => {
    expect(
      bestValueScore(
        offer({
          price: { amountMinor: 80000, currency: 'USD' },
          durationMinutes: 600,
          stopsOut: 1,
          stopsBack: 0,
        }),
      ),
    ).toEqual({
      priceMinor: 80000,
      hours: 10,
      timeCostMinor: 15000,
      stops: 1,
      stopCostMinor: 4000,
      totalMinor: 99000,
    });
  });

  it('refuses to score when data is missing', () => {
    expect(bestValueScore(offer({ durationMinutes: null }))).toBeNull();
    expect(bestValueScore(offer({ stopsBack: null }))).toBeNull();
  });
});

describe('dedupeOffers', () => {
  it('removes exact duplicates from the same source and keeps distinct fares', () => {
    const a = offer({ airline: 'AA', flightNumber: '100' });
    const dup = { ...a, id: 'other-id' };
    const differentPrice = offer({
      airline: 'AA',
      flightNumber: '100',
      price: { amountMinor: 1, currency: 'USD' },
    });
    const otherSource = { ...a, id: 'x', sourceId: 'manual' };
    expect(dedupeOffers([a, dup, differentPrice, otherSource]).map((o) => o.id)).toEqual([
      a.id,
      differentPrice.id,
      'x',
    ]);
  });
});

describe('comparability', () => {
  it('flags material differences', () => {
    const a = offer({ baggage: { checkedBags: 1, carryOn: true } });
    expect(comparabilityIssues(a, { ...a })).toEqual([]);
    expect(comparabilityIssues(a, { ...a, destinationAirport: 'HND' })).toContain(
      'Different airports',
    );
    expect(comparabilityIssues(a, { ...a, adults: 2 })).toContain(
      'Priced for different passengers',
    );
    expect(comparabilityIssues(a, { ...a, baggage: { checkedBags: 0, carryOn: true } })).toContain(
      'Different baggage allowance',
    );
    expect(comparabilityIssues(a, { ...a, itineraryKind: 'hidden_city' })).toContain(
      'Hidden-city and regular itineraries',
    );
    expect(comparabilityIssues(a, { ...a, price: { amountMinor: 1, currency: 'CAD' } })).toContain(
      'Different currencies',
    );
  });

  it('treats unknown baggage as not comparable', () => {
    expect(groupComparabilityIssues([offer(), offer()])).toEqual(['Baggage allowance unknown']);
    expect(groupComparabilityIssues([offer()])).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { buildCells } from '../coverage';
import { combo, offer } from '../test/fixtures';
import { ManualObservationSchema, manualObservationToOffer } from './manual';
import { rankCells } from './ranking';

const valid = {
  providerId: 'kayak',
  tripType: 'round_trip',
  originAirport: 'buf',
  destinationAirport: 'NRT',
  departDate: '2027-01-03',
  returnDate: '2027-01-10',
  price: 842.5,
  currency: 'USD',
  priceBasis: 'per_adult',
  adults: 1,
  cabin: 'economy',
};

describe('ManualObservationSchema', () => {
  it('accepts a minimal entry and fills unknowns with null, not zero', () => {
    const parsed = ManualObservationSchema.parse(valid);
    expect(parsed).toMatchObject({
      originAirport: 'BUF',
      stopsOut: null,
      stopsBack: null,
      durationMinutes: null,
      airline: null,
      baggage: 'unknown',
      hiddenCity: false,
      bookingUrl: null,
      note: null,
    });
  });

  it('turns empty optional text into null', () => {
    const parsed = ManualObservationSchema.parse({ ...valid, airline: '  ', note: '' });
    expect(parsed.airline).toBeNull();
    expect(parsed.note).toBeNull();
  });

  it('rejects impossible entries', () => {
    const bad = (patch: object) =>
      ManualObservationSchema.safeParse({ ...valid, ...patch }).success;
    expect(bad({ price: 0 })).toBe(false);
    expect(bad({ price: -5 })).toBe(false);
    expect(bad({ returnDate: '2027-01-03' })).toBe(false);
    expect(bad({ returnDate: null })).toBe(false);
    expect(bad({ tripType: 'one_way' })).toBe(false); // one-way with a return date
    expect(bad({ tripType: 'one_way', returnDate: null, stopsBack: 1 })).toBe(false);
    expect(bad({ destinationAirport: 'BUF' })).toBe(false);
    expect(bad({ currency: 'XYZ' })).toBe(false);
    expect(bad({ bookingUrl: 'javascript:alert(1)' })).toBe(false);
    expect(bad({ providerId: 'expedia' })).toBe(false);
  });

  it('accepts a one-way entry', () => {
    expect(
      ManualObservationSchema.safeParse({ ...valid, tripType: 'one_way', returnDate: null })
        .success,
    ).toBe(true);
  });
});

describe('manualObservationToOffer', () => {
  it('stores money in minor units and labels the source', () => {
    const o = manualObservationToOffer(ManualObservationSchema.parse(valid), {
      id: 'abc',
      enteredAt: '2026-11-11T12:00:00.000Z',
    });
    expect(o).toMatchObject({
      id: 'abc',
      status: 'manual',
      sourceId: 'manual:kayak',
      sourceName: 'Seen on KAYAK (entered by you)',
      price: { amountMinor: 84250, currency: 'USD' },
      observedAt: '2026-11-11T12:00:00.000Z',
      itineraryKind: 'standard',
    });
  });

  it('handles currencies without minor units', () => {
    const o = manualObservationToOffer(
      ManualObservationSchema.parse({ ...valid, price: 98000, currency: 'JPY' }),
      { id: 'x', enteredAt: '2026-11-11T12:00:00.000Z' },
    );
    expect(o.price).toEqual({ amountMinor: 98000, currency: 'JPY' });
  });
});

describe('hidden-city fares', () => {
  const combos = [combo('2027-01-01', '2027-01-05'), combo('2027-01-02', '2027-01-05')];
  const hidden = offer({
    departDate: '2027-01-01',
    returnDate: '2027-01-05',
    itineraryKind: 'hidden_city',
    price: { amountMinor: 10000, currency: 'USD' },
  });
  const regular = offer({
    departDate: '2027-01-01',
    returnDate: '2027-01-05',
    price: { amountMinor: 50000, currency: 'USD' },
  });

  it('are never chosen as the lowest fare, even when cheaper', () => {
    const [cell] = buildCells(combos, [hidden, regular], { currency: 'USD' });
    expect(cell!.lowest!.price.amountMinor).toBe(50000);
    expect(cell!.offers).toHaveLength(2);
  });

  it('are kept but never ranked against regular fares', () => {
    const cells = buildCells(combos, [hidden], { currency: 'USD' });
    expect(cells[0]!.status).toBe('observed');
    expect(cells[0]!.lowest).toBeNull();
    const result = rankCells(cells, 'price', { currency: 'USD' });
    expect(result.ranked).toEqual([]);
    expect(result.unscored[0]!.reason).toMatch(/Hidden-city/);
  });
});

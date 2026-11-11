import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ManualObservationSchema } from '@flight/core';
import { afterAll, describe, expect, it } from 'vitest';
import { testDb } from '../test/helpers';
import { migrate, openDatabase } from './connection';
import { createAirportsRepo } from './repos/airports';
import { DuplicateObservationError, createObservationsRepo } from './repos/observations';

const manual = (patch: object = {}) =>
  ManualObservationSchema.parse({
    providerId: 'kayak',
    tripType: 'round_trip',
    originAirport: 'BUF',
    destinationAirport: 'NRT',
    departDate: '2027-01-03',
    returnDate: '2027-01-10',
    price: 842.5,
    currency: 'USD',
    priceBasis: 'per_adult',
    adults: 1,
    cabin: 'economy',
    ...patch,
  });

const filter = {
  origins: ['BUF'],
  destinations: ['TYO', 'NRT', 'HND'],
  tripType: 'round_trip' as const,
  departFrom: '2027-01-01',
  departTo: '2027-01-10',
  cabin: 'economy' as const,
  adults: 1,
};

describe('migrations', () => {
  it('apply once and are idempotent', () => {
    const db = openDatabase(':memory:');
    expect(migrate(db)).toEqual([]);
    const versions = db
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((r) => r.version);
    expect(versions).toEqual([1]);
  });
});

describe('airports repository', () => {
  const airports = createAirportsRepo(testDb());

  it('finds airports by exact code first', () => {
    expect(airports.search('buf')[0]).toMatchObject({
      code: 'BUF',
      kind: 'airport',
      city: 'Buffalo',
    });
    expect(airports.search('ROC')[0]!.code).toBe('ROC');
    expect(airports.search('yyz')[0]!.code).toBe('YYZ');
  });

  it('finds airports by city, larger airports first', () => {
    expect(airports.search('rochester').map((s) => s.code)).toEqual(['ROC', 'RST']);
    expect(airports.search('Buffalo')[0]!.code).toBe('BUF');
  });

  it('lists metro codes before their airports', () => {
    const toronto = airports.search('toronto');
    expect(toronto[0]).toMatchObject({ code: 'YTO', kind: 'metro', airports: ['YYZ', 'YTZ'] });
    expect(toronto.slice(1).map((s) => s.code)).toEqual(['YYZ', 'YTZ']);
    expect(airports.search('TYO')[0]).toMatchObject({
      code: 'TYO',
      kind: 'metro',
      country: 'Japan',
    });
  });

  it('ranks a city match above a word inside an airport name', () => {
    // IAG's city is "Niagara Falls"; BUF only has "Niagara" inside its airport name.
    expect(airports.search('niagara').map((s) => s.code)).toEqual(['IAG', 'BUF']);
  });

  it('ignores very short queries and escapes wildcards', () => {
    expect(airports.search('b')).toEqual([]);
    expect(airports.search('%%')).toEqual([]);
    expect(airports.search('__')).toEqual([]);
  });

  it('looks up airports and metro codes', () => {
    expect(airports.lookup('nrt')).toMatchObject({
      code: 'NRT',
      name: 'Narita International Airport',
    });
    expect(airports.lookup('TYO')).toMatchObject({ kind: 'metro', airports: ['NRT', 'HND'] });
    expect(airports.lookup('ZZZ')).toBeNull();
  });
});

describe('observations repository', () => {
  it('saves a manual price and finds it through the metro code', () => {
    const repo = createObservationsRepo(testDb());
    const saved = repo.insertManual(manual(), new Date('2026-11-11T12:00:00Z'));
    expect(saved).toMatchObject({
      status: 'manual',
      price: { amountMinor: 84250, currency: 'USD' },
    });
    expect(repo.get(saved.id)).toEqual(saved);
    expect(repo.findForSearch(filter)).toEqual([saved]);
  });

  it('keeps unknown fields as null rather than zero', () => {
    const repo = createObservationsRepo(testDb());
    const saved = repo.get(repo.insertManual(manual()).id)!;
    expect(saved.stopsOut).toBeNull();
    expect(saved.durationMinutes).toBeNull();
    expect(saved.baggage).toBe('unknown');
  });

  it('stores baggage and hidden-city details', () => {
    const repo = createObservationsRepo(testDb());
    const saved = repo.get(
      repo.insertManual(
        manual({
          baggage: { checkedBags: 1, carryOn: true },
          hiddenCity: true,
          stopsOut: 0,
          stopsBack: 1,
        }),
      ).id,
    )!;
    expect(saved).toMatchObject({
      baggage: { checkedBags: 1, carryOn: true },
      itineraryKind: 'hidden_city',
      stopsOut: 0,
      stopsBack: 1,
    });
  });

  it('only returns fares matching the trip type, cabin, dates and passengers', () => {
    const repo = createObservationsRepo(testDb());
    const now = new Date('2026-11-11T12:00:00Z');
    repo.insertManual(manual({ cabin: 'business' }), now);
    repo.insertManual(manual({ tripType: 'one_way', returnDate: null }), now);
    repo.insertManual(manual({ departDate: '2027-02-01', returnDate: '2027-02-05' }), now);
    repo.insertManual(manual({ priceBasis: 'total', adults: 2 }), now);
    repo.insertManual(manual({ originAirport: 'ROC' }), now);
    expect(repo.findForSearch(filter)).toEqual([]);
    expect(repo.findForSearch({ ...filter, adults: 2 })).toHaveLength(1);
  });

  it('treats an identical entry within the same minute as a double submit', () => {
    const repo = createObservationsRepo(testDb());
    const now = new Date('2026-11-11T12:00:10Z');
    repo.insertManual(manual(), now);
    expect(() => repo.insertManual(manual(), new Date('2026-11-11T12:00:40Z'))).toThrow(
      DuplicateObservationError,
    );
    // The same price seen again later is a new observation.
    expect(() => repo.insertManual(manual(), new Date('2026-11-11T12:05:00Z'))).not.toThrow();
  });

  it('deletes manual entries only', () => {
    const repo = createObservationsRepo(testDb());
    const saved = repo.insertManual(manual());
    expect(repo.deleteManual(saved.id)).toBe(true);
    expect(repo.deleteManual(saved.id)).toBe(false);
    expect(repo.get(saved.id)).toBeNull();
  });
});

describe('persistence', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'flight-aggregator-test-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('keeps manual prices after the database is closed and reopened', () => {
    const file = path.join(dir, 'app.db');
    const first = openDatabase(file);
    const saved = createObservationsRepo(first).insertManual(manual());
    first.close();

    const second = openDatabase(file);
    expect(createObservationsRepo(second).get(saved.id)).toEqual(saved);
    second.close();
  });
});

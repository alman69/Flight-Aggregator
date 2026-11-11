import type { SearchResponse } from '@flight/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { testDb } from '../test/helpers';

const newApp = () => createApp({ db: testDb(), today: () => '2026-11-11' });

const search = {
  tripType: 'round_trip',
  origin: 'BUF',
  destination: 'TYO',
  dates: { mode: 'window', start: '2027-01-01', end: '2027-01-10' },
  duration: { kind: 'range', minNights: 3, maxNights: 5 },
};

const price = {
  providerId: 'google_flights',
  tripType: 'round_trip',
  originAirport: 'BUF',
  destinationAirport: 'HND',
  departDate: '2027-01-03',
  returnDate: '2027-01-07',
  price: 912,
  currency: 'USD',
  priceBasis: 'per_adult',
  adults: 1,
  cabin: 'economy',
};

describe('GET /api/airports', () => {
  it('autocompletes codes, cities and metro areas', async () => {
    const app = newApp();
    const codes = async (q: string) =>
      (await request(app).get('/api/airports').query({ q })).body.results.map(
        (r: { code: string }) => r.code,
      );
    expect((await codes('buf'))[0]).toBe('BUF');
    expect(await codes('rochester')).toContain('ROC');
    expect((await codes('toronto')).slice(0, 2)).toEqual(['YTO', 'YYZ']);
  });

  it('returns nothing for a one-letter query', async () => {
    const res = await request(newApp()).get('/api/airports').query({ q: 'b' });
    expect(res.body).toEqual({ results: [] });
  });

  it('looks up a single code', async () => {
    const app = newApp();
    expect((await request(app).get('/api/airports/yyz')).body).toMatchObject({
      code: 'YYZ',
      city: 'Toronto',
    });
    expect((await request(app).get('/api/airports/TYO')).body).toMatchObject({ kind: 'metro' });
    expect((await request(app).get('/api/airports/ZZZ')).status).toBe(404);
    expect((await request(app).get('/api/airports/toolong')).status).toBe(404);
  });
});

describe('GET /api/providers', () => {
  it('lists the eight providers and the price sources', async () => {
    const res = await request(newApp()).get('/api/providers');
    expect(res.body.providers).toHaveLength(8);
    expect(
      res.body.priceSources.map((s: { id: string; status: string }) => [s.id, s.status]),
    ).toEqual([
      ['manual', 'available'],
      ['travelpayouts', 'not_configured'],
    ]);
  });
});

describe('manual prices', () => {
  it('saves a price and returns it in matching searches', async () => {
    const app = newApp();
    const saved = await request(app).post('/api/observations').send(price);
    expect(saved.status).toBe(201);
    expect(saved.body).toMatchObject({
      status: 'manual',
      price: { amountMinor: 91200, currency: 'USD' },
    });

    const res = await request(app).post('/api/search').send(search);
    expect(res.status).toBe(200);
    const body = res.body as SearchResponse;
    expect(body.totalCombinations).toBe(18);
    expect(body.offers).toHaveLength(1);
    expect(body.offers[0]).toMatchObject({
      id: saved.body.id,
      departDate: '2027-01-03',
      returnDate: '2027-01-07',
    });
    expect(body.sources.find((s) => s.id === 'manual')!.offerCount).toBe(1);
  });

  it('does not attach prices whose dates are outside the search', async () => {
    const app = newApp();
    // 1 night: valid dates, but outside the 3–5 night filter.
    await request(app)
      .post('/api/observations')
      .send({ ...price, returnDate: '2027-01-04' });
    const res = await request(app).post('/api/search').send(search);
    expect(res.body.offers).toEqual([]);
  });

  it('rejects invalid entries with readable details', async () => {
    const res = await request(newApp())
      .post('/api/observations')
      .send({ ...price, price: -1, returnDate: '2027-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(['price']),
    );
  });

  it('rejects a double submit', async () => {
    const app = newApp();
    expect((await request(app).post('/api/observations').send(price)).status).toBe(201);
    const again = await request(app).post('/api/observations').send(price);
    expect(again.status).toBe(409);
    expect(again.body.error).toBe('duplicate');
  });

  it('lists and deletes entries', async () => {
    const app = newApp();
    const saved = await request(app).post('/api/observations').send(price);
    expect((await request(app).get('/api/observations')).body.observations).toHaveLength(1);
    expect((await request(app).delete(`/api/observations/${saved.body.id}`)).status).toBe(204);
    expect((await request(app).delete(`/api/observations/${saved.body.id}`)).status).toBe(404);
    expect((await request(app).post('/api/search').send(search)).body.offers).toEqual([]);
  });
});

describe('POST /api/search', () => {
  it('returns no offers and an unconfigured cached source when nothing is saved', async () => {
    const res = await request(newApp()).post('/api/search').send(search);
    expect(res.body.offers).toEqual([]);
    expect(res.body.sources.map((s: { id: string; offerCount: number }) => s.offerCount)).toEqual([
      0, 0,
    ]);
  });

  it('returns 422 with explanations when the search cannot run', async () => {
    const res = await request(newApp())
      .post('/api/search')
      .send({ ...search, dates: { mode: 'window', start: '2027-01-10', end: '2027-01-01' } });
    expect(res.status).toBe(422);
    expect(res.body.offers).toEqual([]);
  });
});

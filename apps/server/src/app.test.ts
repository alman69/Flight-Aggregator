import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { SearchPlanResponse } from '@flight/core';
import { createApp } from './app';
import { openDatabase } from './db/connection';

const app = createApp({ db: openDatabase(':memory:'), today: () => '2026-11-11' });

const search = {
  tripType: 'round_trip',
  origin: 'BUF',
  destination: 'TYO',
  dates: { mode: 'window', start: '2027-01-01', end: '2027-01-10' },
};

describe('GET /api/health', () => {
  it('reports the service is up', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, milestone: 2, today: '2026-11-11' });
  });
});

describe('POST /api/search/plan', () => {
  it('returns every combination with links for its exact dates', async () => {
    const res = await request(app).post('/api/search/plan').send(search);
    expect(res.status).toBe(200);
    const body = res.body as SearchPlanResponse;
    expect(body.ok).toBe(true);
    expect(body.totalCombinations).toBe(45);
    expect(body.combos).toHaveLength(45);
    const first = body.combos[0]!;
    expect(first.links).toHaveLength(8);
    expect(first.links.find((l) => l.providerId === 'kayak')!.url).toBe(
      'https://www.kayak.com/flights/BUF-TYO/2027-01-01/2027-01-02?sort=price_a',
    );
    expect(body.query.duration).toEqual({ kind: 'any' });
  });

  it('applies trip-length limits', async () => {
    const res = await request(app)
      .post('/api/search/plan')
      .send({ ...search, duration: { kind: 'range', minNights: 3, maxNights: 5 } });
    expect(res.body.totalCombinations).toBe(18);
  });

  it('never includes prices in a plan', async () => {
    const res = await request(app).post('/api/search/plan').send(search);
    expect(JSON.stringify(res.body)).not.toMatch(/amountMinor|"price"/);
  });

  it('returns 422 with explanations when the search cannot run', async () => {
    const res = await request(app)
      .post('/api/search/plan')
      .send({ ...search, dates: { mode: 'window', start: '2027-01-10', end: '2027-01-01' } });
    expect(res.status).toBe(422);
    expect(res.body.ok).toBe(false);
    expect(res.body.combos).toEqual([]);
    expect(res.body.issues[0]).toMatchObject({ level: 'error', code: 'reversed_range' });
  });

  it('returns 400 for a malformed body', async () => {
    const res = await request(app)
      .post('/api/search/plan')
      .send({
        ...search,
        origin: 'BUFFALO',
        dates: { mode: 'window', start: '2027-02-30', end: 'x' },
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
    expect(res.body.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(['origin', 'dates.start', 'dates.end']),
    );
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await request(app)
      .post('/api/search/plan')
      .set('Content-Type', 'application/json')
      .send('{"tripType":');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('bad_request');
  });
});

describe('unknown routes', () => {
  it('returns JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not_found' });
  });
});

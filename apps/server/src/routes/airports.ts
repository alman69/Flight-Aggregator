import type { AirportSearchResponse } from '@flight/core';
import { Router } from 'express';
import type { AirportsRepo } from '../db/repos/airports';

export function airportRoutes(deps: { airports: AirportsRepo }) {
  const router = Router();

  /** GET /api/airports?q=buf&limit=8 — autocomplete by code, city or airport name. */
  router.get('/airports', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 60) : '';
    const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 20);
    const body: AirportSearchResponse = { results: deps.airports.search(q, limit) };
    res.json(body);
  });

  /** GET /api/airports/BUF — one airport or metro code. */
  router.get('/airports/:code', (req, res) => {
    const found = /^[A-Za-z]{3}$/.test(req.params.code)
      ? deps.airports.lookup(req.params.code)
      : null;
    if (!found) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(found);
  });

  return router;
}

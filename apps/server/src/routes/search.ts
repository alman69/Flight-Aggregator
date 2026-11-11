import { type SearchPlanResponse, SearchQuerySchema } from '@flight/core';
import { Router } from 'express';
import type { ObservationsRepo } from '../db/repos/observations';
import { parseOr400 } from '../lib/validation';
import { runSearch } from '../services/search';

/**
 * POST /api/search/plan — combinations and links only.
 * POST /api/search      — the plan plus matching stored fares.
 * Both: 400 = malformed body, 422 = valid shape but the search can't run (issues explain why).
 */
export function searchRoutes(deps: { today: () => string; observations: ObservationsRepo }) {
  const router = Router();

  router.post('/search/plan', (req, res) => {
    const query = parseOr400(SearchQuerySchema, req.body, res);
    if (!query) return;
    const {
      offers: _offers,
      sources: _sources,
      ...plan
    } = runSearch(query, deps.today(), deps.observations);
    void _offers;
    void _sources;
    const body: SearchPlanResponse = plan;
    res.status(plan.ok ? 200 : 422).json(body);
  });

  router.post('/search', (req, res) => {
    const query = parseOr400(SearchQuerySchema, req.body, res);
    if (!query) return;
    const result = runSearch(query, deps.today(), deps.observations);
    res.status(result.ok ? 200 : 422).json(result);
  });

  return router;
}

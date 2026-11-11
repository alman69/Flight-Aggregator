import { ManualObservationSchema } from '@flight/core';
import { Router } from 'express';
import { DuplicateObservationError, type ObservationsRepo } from '../db/repos/observations';
import { parseOr400 } from '../lib/validation';

export function observationRoutes(deps: { observations: ObservationsRepo }) {
  const router = Router();

  /** POST /api/observations — save a price you saw on a provider. */
  router.post('/observations', (req, res) => {
    const input = parseOr400(ManualObservationSchema, req.body, res);
    if (!input) return;
    try {
      res.status(201).json(deps.observations.insertManual(input));
    } catch (err) {
      if (err instanceof DuplicateObservationError) {
        res.status(409).json({ error: 'duplicate', message: err.message });
        return;
      }
      throw err;
    }
  });

  /** GET /api/observations?limit=50 — most recent first. */
  router.get('/observations', (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    res.json({ observations: deps.observations.recent(limit) });
  });

  /** DELETE /api/observations/:id — only manual entries can be removed. */
  router.delete('/observations/:id', (req, res) => {
    if (deps.observations.deleteManual(req.params.id)) res.status(204).end();
    else res.status(404).json({ error: 'not_found' });
  });

  return router;
}

import { todayLocal } from '@flight/core';
import express, { type ErrorRequestHandler } from 'express';
import type { Database } from './db/connection';
import { createAirportsRepo } from './db/repos/airports';
import { createObservationsRepo } from './db/repos/observations';
import { airportRoutes } from './routes/airports';
import { observationRoutes } from './routes/observations';
import { providerRoutes } from './routes/providers';
import { searchRoutes } from './routes/search';

export interface AppOptions {
  db: Database;
  /** Supplies "today" (YYYY-MM-DD). Tests pass a fixed date. */
  today?: () => string;
}

/** Builds the Express app without starting it, so tests can call it directly. */
export function createApp(options: AppOptions) {
  const today = options.today ?? (() => todayLocal());
  const airports = createAirportsRepo(options.db);
  const observations = createObservationsRepo(options.db);

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'flight-aggregator',
      milestone: 2,
      today: today(),
      airports: airports.count(),
    });
  });
  app.use('/api', searchRoutes({ today, observations }));
  app.use('/api', airportRoutes({ airports }));
  app.use('/api', providerRoutes());
  app.use('/api', observationRoutes({ observations }));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    void _next;
    // Malformed JSON from express.json() arrives here with a 4xx status.
    const status = typeof err?.status === 'number' && err.status < 500 ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 500 ? 'internal_error' : 'bad_request' });
  };
  app.use(errorHandler);

  return app;
}

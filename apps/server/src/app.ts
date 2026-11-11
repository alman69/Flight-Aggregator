import express, { type ErrorRequestHandler } from 'express';
import {
  type InvalidRequestResponse,
  type SearchPlanResponse,
  SearchQuerySchema,
  buildProviderLinks,
  planSearch,
  todayLocal,
} from '@flight/core';

export interface AppOptions {
  /** Supplies "today" (YYYY-MM-DD). Tests pass a fixed date. */
  today?: () => string;
}

/** Builds the Express app without starting it, so tests can call it directly. */
export function createApp(options: AppOptions = {}) {
  const today = options.today ?? (() => todayLocal());
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'flight-aggregator', milestone: 1, today: today() });
  });

  /**
   * Validates a search and lists its date combinations with provider links.
   * Makes no external requests. 400 = malformed body, 422 = valid shape but the search
   * cannot run (the body still explains why), 200 = ready.
   */
  app.post('/api/search/plan', (req, res) => {
    const parsed = SearchQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      const body: InvalidRequestResponse = {
        error: 'invalid_request',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      };
      res.status(400).json(body);
      return;
    }

    const query = parsed.data;
    const now = today();
    const plan = planSearch(query, now);
    const body: SearchPlanResponse = {
      ...plan,
      combos: plan.combos.map((combo) => ({
        ...combo,
        links: buildProviderLinks({
          origin: query.origin,
          destination: query.destination,
          departDate: combo.departDate,
          returnDate: combo.returnDate,
          adults: query.adults,
          cabin: query.cabin,
        }),
      })),
      query,
      today: now,
      generatedAt: new Date().toISOString(),
    };
    res.status(plan.ok ? 200 : 422).json(body);
  });

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

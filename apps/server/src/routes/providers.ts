import { LINK_PROVIDERS, type ProvidersResponse } from '@flight/core';
import { Router } from 'express';
import { PRICE_SOURCES } from '../services/priceSources';

export function providerRoutes() {
  const router = Router();
  router.get('/providers', (_req, res) => {
    const body: ProvidersResponse = {
      providers: LINK_PROVIDERS.map(
        ({ id, name, homepage, integration, summary, verification }) => ({
          id,
          name,
          homepage,
          integration,
          summary,
          verification,
        }),
      ),
      priceSources: [...PRICE_SOURCES],
    };
    res.json(body);
  });
  return router;
}

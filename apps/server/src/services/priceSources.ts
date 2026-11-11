import type { PriceSourceInfo } from '@flight/core';

/** What can supply prices today. Cached and live sources arrive in later milestones. */
export const PRICE_SOURCES: readonly PriceSourceInfo[] = [
  {
    id: 'manual',
    name: 'Prices you enter',
    kind: 'manual',
    status: 'available',
    description: 'Fares you saw on a provider and saved. Stored only on this Mac.',
  },
  {
    id: 'travelpayouts',
    name: 'Travelpayouts / Aviasales cached prices',
    kind: 'cached',
    status: 'not_configured',
    description:
      'Free cached fares from recent Aviasales searches. Planned after a proof of concept (Milestone 3).',
  },
];

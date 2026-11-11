import {
  type SearchQuery,
  type SearchResponse,
  buildProviderLinks,
  expandAirportCode,
  planSearch,
} from '@flight/core';
import type { ObservationsRepo } from '../db/repos/observations';
import { PRICE_SOURCES } from './priceSources';

/**
 * Plans a search and attaches every stored fare that matches it. Makes no external requests.
 * Fares are only ever attached to their own exact dates (the client builds cells by date key).
 */
export function runSearch(
  query: SearchQuery,
  today: string,
  observations: ObservationsRepo,
): SearchResponse {
  const plan = planSearch(query, today);
  const combos = plan.combos.map((combo) => ({
    ...combo,
    links: buildProviderLinks({
      origin: query.origin,
      destination: query.destination,
      departDate: combo.departDate,
      returnDate: combo.returnDate,
      adults: query.adults,
      cabin: query.cabin,
    }),
  }));

  const offers =
    plan.ok && plan.departDates.length > 0
      ? observations.findForSearch({
          origins: expandAirportCode(query.origin),
          destinations: expandAirportCode(query.destination),
          tripType: query.tripType,
          departFrom: plan.departDates[0]!,
          departTo: plan.departDates.at(-1)!,
          cabin: query.cabin,
          adults: query.adults,
        })
      : [];

  const comboKeys = new Set(plan.combos.map((c) => c.key));
  const matched = offers.filter((o) =>
    comboKeys.has(o.returnDate ? `${o.departDate}_${o.returnDate}` : o.departDate),
  );

  return {
    ...plan,
    combos,
    query,
    today,
    generatedAt: new Date().toISOString(),
    offers: matched,
    sources: PRICE_SOURCES.map((s) => ({
      ...s,
      offerCount: s.id === 'manual' ? matched.filter((o) => o.status === 'manual').length : 0,
    })),
  };
}

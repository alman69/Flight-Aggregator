import type { AirportSuggestion } from './airports/types';
import type { DateCombo } from './combos/generate';
import type { SearchPlan } from './combos/plan';
import type { FareOffer } from './fares/model';
import type { LinkProvider, ProviderLink } from './links/types';
import type { SearchQuery } from './schemas';

/** A date combination with provider links pre-filled for its exact dates. */
export interface PlannedCombo extends DateCombo {
  links: ProviderLink[];
}

/** Response of `POST /api/search/plan`. */
export interface SearchPlanResponse extends Omit<SearchPlan, 'combos'> {
  combos: PlannedCombo[];
  query: SearchQuery;
  /** The server's "today", used for past-date checks. */
  today: string;
  generatedAt: string;
}

export type PriceSourceStatus = 'available' | 'not_configured';

export interface PriceSourceInfo {
  id: string;
  name: string;
  kind: 'manual' | 'cached' | 'live';
  status: PriceSourceStatus;
  description: string;
}

/** Response of `POST /api/search`: the plan plus every stored fare that matches it. */
export interface SearchResponse extends SearchPlanResponse {
  /** Observed fares for the searched route and dates. Never invented or extrapolated. */
  offers: FareOffer[];
  sources: (PriceSourceInfo & { offerCount: number })[];
}

/** Response of `GET /api/providers`. */
export interface ProvidersResponse {
  providers: Pick<
    LinkProvider,
    'id' | 'name' | 'homepage' | 'integration' | 'summary' | 'verification'
  >[];
  priceSources: PriceSourceInfo[];
}

/** Response of `GET /api/airports?q=`. */
export interface AirportSearchResponse {
  results: AirportSuggestion[];
}

/** Response body for a request that failed schema validation (HTTP 400). */
export interface InvalidRequestResponse {
  error: 'invalid_request';
  details: { path: string; message: string }[];
}

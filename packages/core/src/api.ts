import type { SearchPlan } from './combos/plan';
import type { DateCombo } from './combos/generate';
import type { ProviderLink } from './links/types';
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

/** Response body for a request that failed schema validation (HTTP 400). */
export interface InvalidRequestResponse {
  error: 'invalid_request';
  details: { path: string; message: string }[];
}

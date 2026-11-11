import type { InvalidRequestResponse, SearchPlanResponse, SearchQuery } from '@flight/core';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const UNREACHABLE =
  "Can't reach the local API server. Start everything with `npm run dev` from the project folder.";

/** Plans a search on the local server. Resolves for 200 and 422 (a plan whose issues explain why it can't run). */
export async function fetchPlan(
  query: SearchQuery,
  signal?: AbortSignal,
): Promise<SearchPlanResponse> {
  let res: Response;
  try {
    res = await fetch('/api/search/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(UNREACHABLE, 0);
  }
  if (res.status === 200 || res.status === 422) return (await res.json()) as SearchPlanResponse;
  if (res.status === 400) {
    const body = (await res.json().catch(() => null)) as InvalidRequestResponse | null;
    const details = body?.details.map((d) => `${d.path}: ${d.message}`).join('; ');
    throw new ApiError(`The server rejected this search${details ? ` (${details})` : ''}.`, 400);
  }
  // The Vite dev proxy answers 500/502/504 when the API process isn't running.
  if (res.status >= 500) throw new ApiError(UNREACHABLE, res.status);
  throw new ApiError(`Unexpected response from the API (HTTP ${res.status}).`, res.status);
}

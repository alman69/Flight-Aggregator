import type {
  AirportSearchResponse,
  AirportSuggestion,
  FareOffer,
  InvalidRequestResponse,
  ManualObservationInput,
  ProvidersResponse,
  SearchQuery,
  SearchResponse,
} from '@flight/core';

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

async function request(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(UNREACHABLE, 0);
  }
  // The Vite dev proxy answers 500/502/504 when the API process isn't running.
  if (res.status >= 500) throw new ApiError(UNREACHABLE, res.status);
  return res;
}

async function rejectionMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as
    (Partial<InvalidRequestResponse> & { message?: string }) | null;
  if (body?.message) return body.message;
  const details = body?.details?.map((d) => `${d.path || 'request'}: ${d.message}`).join('; ');
  return details ? `${fallback} (${details})` : fallback;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/**
 * Plans a search and returns stored fares that match it. Resolves for 200 and 422 (a result whose
 * issues explain why the search can't run).
 */
export async function fetchSearch(
  query: SearchQuery,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const res = await request('/api/search', { ...json(query), signal });
  if (res.status === 200 || res.status === 422) return (await res.json()) as SearchResponse;
  throw new ApiError(await rejectionMessage(res, 'The server rejected this search'), res.status);
}

export async function searchAirports(
  q: string,
  signal?: AbortSignal,
): Promise<AirportSuggestion[]> {
  const res = await request(`/api/airports?q=${encodeURIComponent(q)}&limit=8`, { signal });
  if (!res.ok) return [];
  return ((await res.json()) as AirportSearchResponse).results;
}

export async function lookupAirport(
  code: string,
  signal?: AbortSignal,
): Promise<AirportSuggestion | null> {
  const res = await request(`/api/airports/${encodeURIComponent(code)}`, { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(`Airport lookup failed (HTTP ${res.status}).`, res.status);
  return (await res.json()) as AirportSuggestion;
}

export async function fetchProviders(signal?: AbortSignal): Promise<ProvidersResponse> {
  const res = await request('/api/providers', { signal });
  if (!res.ok) throw new ApiError(`Could not load providers (HTTP ${res.status}).`, res.status);
  return (await res.json()) as ProvidersResponse;
}

export async function createObservation(input: ManualObservationInput): Promise<FareOffer> {
  const res = await request('/api/observations', json(input));
  if (res.status === 201) return (await res.json()) as FareOffer;
  throw new ApiError(await rejectionMessage(res, 'The price could not be saved'), res.status);
}

export async function deleteObservation(id: string): Promise<void> {
  const res = await request(`/api/observations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (res.status !== 204 && res.status !== 404) {
    throw new ApiError(`The price could not be removed (HTTP ${res.status}).`, res.status);
  }
}

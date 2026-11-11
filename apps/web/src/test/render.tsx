import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

/** Renders inside a fresh TanStack Query client (no retries, no shared cache between tests). */
export function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

type Handler = (url: string, init?: RequestInit) => unknown;

/**
 * Replaces fetch with canned JSON responses. `routes` maps "METHOD /path-prefix" to a handler
 * returning a body (status 200) or `{ status, body }`. Unmatched requests get a 404.
 */
export function stubApi(routes: Record<string, Handler>) {
  const calls: { method: string; url: string; body: unknown }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const key = Object.keys(routes).find((k) => {
      const [m, prefix] = k.split(' ');
      return m === method && url.startsWith(prefix!);
    });
    if (!key) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    const result = routes[key]!(url, init) as { status?: number; body?: unknown } | unknown;
    const withStatus =
      result && typeof result === 'object' && 'status' in result && 'body' in result
        ? (result as { status: number; body: unknown })
        : { status: 200, body: result };
    return new Response(withStatus.status === 204 ? null : JSON.stringify(withStatus.body), {
      status: withStatus.status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

import type { SearchResponse } from '@flight/core';
import { useQuery } from '@tanstack/react-query';
import { fetchProviders } from '../api/client';

const SOURCE_STATUS: Record<string, { label: string; className: string }> = {
  available: {
    label: 'Available',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  },
  not_configured: {
    label: 'Not set up yet',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
};

/** How each provider is integrated, and which price sources fed this search. */
export function ProvidersPanel({
  sources,
  demo,
}: {
  sources: SearchResponse['sources'];
  demo: boolean;
}) {
  const providers = useQuery({
    queryKey: ['providers'],
    queryFn: ({ signal }) => fetchProviders(signal),
    staleTime: Infinity,
  });

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <summary className="cursor-pointer text-sm font-semibold">
        Providers and price sources
      </summary>

      <h3 className="mt-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Price sources for this search
      </h3>
      <ul className="mt-2 space-y-2">
        {demo && (
          <li className="text-sm text-fuchsia-700 dark:text-fuchsia-300">
            Demo mode: prices shown are generated, not from any source below.
          </li>
        )}
        {sources.map((s) => {
          const status = SOURCE_STATUS[s.status]!;
          return (
            <li key={s.id} className="text-sm">
              <span className="font-medium">{s.name}</span>{' '}
              <span
                className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${status.className}`}
              >
                {status.label}
              </span>
              {s.status === 'available' && !demo && (
                <span className="ml-2 text-xs text-slate-500">
                  {s.offerCount} fare{s.offerCount === 1 ? '' : 's'} in this search
                </span>
              )}
              <p className="text-xs text-slate-500">{s.description}</p>
            </li>
          );
        })}
      </ul>

      <h3 className="mt-5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Flight providers
      </h3>
      {providers.isError && <p className="mt-2 text-sm text-rose-600">{providers.error.message}</p>}
      <ul className="mt-2 grid gap-3 sm:grid-cols-2">
        {providers.data?.providers.map((p) => (
          <li key={p.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <a
                href={p.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
              >
                {p.name}
              </a>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                  p.integration === 'prefilled_link'
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {p.integration === 'prefilled_link' ? 'Dates filled in' : 'Homepage link'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{p.summary}</p>
            <p className="mt-1 text-[11px] text-slate-500">{p.verification}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        No provider is searched automatically. Links open the provider's own site, and prices only
        appear here if you save them.
      </p>
    </details>
  );
}

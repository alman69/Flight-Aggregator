import { DemoBanner } from './components/DemoBanner';
import { PlaneIcon } from './components/Icons';
import { Intro } from './components/Intro';
import { Results } from './components/Results';
import { SearchForm } from './components/SearchForm';
import { queryToParams, useUrlState } from './lib/urlState';

export function App() {
  const [{ query, demo }, setUrlState] = useUrlState();

  return (
    <div className="min-h-screen">
      {demo && <DemoBanner onExit={() => setUrlState({ query, demo: false })} />}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4">
          <a
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
            onClick={(e) => {
              e.preventDefault();
              setUrlState({ query: null, demo });
            }}
          >
            <span className="rounded-lg bg-sky-600 p-1.5 text-white">
              <PlaneIcon />
            </span>
            Flight Aggregator
          </a>
          <span className="hidden text-sm text-slate-500 sm:inline">
            Personal · runs on this Mac · $0
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <SearchForm
          // Remount when the URL search changes (e.g. back button) so the form shows it.
          key={`form:${query ? queryToParams(query).toString() : ''}`}
          initialQuery={query}
          onSearch={(next) => setUrlState({ query: next, demo })}
        />
        {query ? (
          <Results key={`results:${queryToParams(query).toString()}`} query={query} demo={demo} />
        ) : (
          <Intro />
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pt-4 pb-10 text-xs text-slate-500">
        No live quotes. Every price is labeled by where it came from.{' '}
        {!demo && (
          <button
            type="button"
            className="underline underline-offset-2 hover:no-underline"
            onClick={() => setUrlState({ query, demo: true })}
          >
            Preview the interface with demo data
          </button>
        )}
      </footer>
    </div>
  );
}

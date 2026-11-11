import { type CoverageSummary as Summary, coverageHeadline } from '@flight/core';

export function CoverageSummary({ summary, demo }: { summary: Summary; demo: boolean }) {
  const pct = summary.total === 0 ? 0 : Math.round((summary.observed / summary.total) * 100);
  const parts = [
    summary.observedByStatus.cached && `${summary.observedByStatus.cached} cached`,
    summary.observedByStatus.manual && `${summary.observedByStatus.manual} manual`,
    summary.observedByStatus.live && `${summary.observedByStatus.live} live`,
    summary.observedByStatus.demo && `${summary.observedByStatus.demo} demo`,
  ].filter(Boolean);

  return (
    <section
      aria-label="Price coverage"
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold" data-testid="coverage-headline">
          {coverageHeadline(summary)}
        </h2>
        {parts.length > 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-400">{parts.join(' · ')}</p>
        )}
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        aria-label="Share of date combinations with observed fares"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        {summary.noObservation > 0 && (
          <div className="flex gap-1">
            <dt>No fare observed:</dt>
            <dd className="font-medium">{summary.noObservation}</dd>
          </div>
        )}
        {summary.notQueried > 0 && (
          <div className="flex gap-1">
            <dt>Not searched for prices:</dt>
            <dd className="font-medium">{summary.notQueried}</dd>
          </div>
        )}
        {summary.failed > 0 && (
          <div className="flex gap-1">
            <dt>Search failed:</dt>
            <dd className="font-medium">{summary.failed}</dd>
          </div>
        )}
      </dl>
      <p className="mt-2 text-xs text-slate-500">
        {demo
          ? 'Demo mode: gaps are deliberate, to show how missing data looks.'
          : summary.observed === 0 && summary.notQueried === summary.total
            ? 'No price source is connected yet, so nothing has been searched. Open any date to check it on the providers below; real cached prices arrive in a later milestone.'
            : 'A missing price means none was observed. It does not mean there are no flights.'}
      </p>
    </section>
  );
}

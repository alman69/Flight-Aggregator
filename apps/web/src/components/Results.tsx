import {
  type SearchQuery,
  type SortKey,
  type ViewFilters,
  applyFilters,
  buildCells,
  formatMoney,
  summarizeCoverage,
} from '@flight/core';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { fetchPlan } from '../api/client';
import { generateDemoOffers } from '../demo/demoOffers';
import { formatDate, nightsLabel } from '../lib/format';
import { ComboDrawer } from './ComboDrawer';
import { CoverageSummary } from './CoverageSummary';
import { FiltersBar } from './FiltersBar';
import { GridIcon, ListIcon } from './Icons';
import { IssueList } from './IssueList';
import { MatrixLegend, PriceMatrix } from './PriceMatrix';
import { RankedList } from './RankedList';
import { Segmented } from './Field';

const CURRENCY = 'USD';
type View = 'matrix' | 'list';

export function Results({ query, demo }: { query: SearchQuery; demo: boolean }) {
  const planQuery = useQuery({
    queryKey: ['plan', query],
    queryFn: ({ signal }) => fetchPlan(query, signal),
  });

  const [view, setView] = useState<View>('matrix');
  const [sortKey, setSortKey] = useState<SortKey>('price');
  const [filters, setFilters] = useState<ViewFilters>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const closeDrawer = useCallback(() => setSelectedKey(null), []);

  const plan = planQuery.data;

  const cells = useMemo(() => {
    if (!plan?.ok) return [];
    // Demo prices are generated here in the browser, only when ?demo=1, and never stored.
    const offers = demo ? generateDemoOffers(plan.combos, plan.query, plan.generatedAt) : [];
    return buildCells(plan.combos, offers, {
      currency: CURRENCY,
      defaultStatus: demo ? 'no_observation' : 'not_queried',
    });
  }, [plan, demo]);

  const summary = useMemo(() => summarizeCoverage(cells), [cells]);
  const filtered = useMemo(() => applyFilters(cells, filters, CURRENCY), [cells, filters]);

  const lowest = useMemo(() => {
    let best: (typeof filtered.cells)[number] | null = null;
    for (const cell of filtered.cells) {
      if (cell.hiddenByFilter || !cell.lowest) continue;
      if (!best || cell.lowest.price.amountMinor < best.lowest!.price.amountMinor) best = cell;
    }
    return best;
  }, [filtered]);

  if (planQuery.isPending) {
    return (
      <div
        className="mt-6 h-64 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60"
        aria-busy="true"
      >
        <span className="sr-only">Preparing date combinations…</span>
      </div>
    );
  }
  if (planQuery.isError) {
    return (
      <p
        role="alert"
        className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
      >
        {planQuery.error.message}
      </p>
    );
  }
  if (!plan!.ok) {
    return (
      <div className="mt-6">
        <IssueList issues={plan!.issues} />
      </div>
    );
  }

  const selected = selectedKey ? cells.find((c) => c.combo.key === selectedKey) : undefined;
  const hasPrices = summary.observed > 0;
  const warnings = plan!.issues.filter((i) => i.level === 'warning');

  return (
    <div className="mt-6 space-y-4">
      {warnings.length > 0 && <IssueList issues={warnings} />}
      <CoverageSummary summary={summary} demo={demo} />

      {lowest?.lowest && (
        <button
          type="button"
          onClick={() => setSelectedKey(lowest.combo.key)}
          className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-left transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70"
        >
          <span className="text-xs font-semibold tracking-wide text-emerald-800 uppercase dark:text-emerald-300">
            Lowest observed fare
          </span>
          <span className="text-xl font-semibold tabular-nums">
            {formatMoney(lowest.lowest.price)}
          </span>
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {formatDate(lowest.combo.departDate)}
            {lowest.combo.returnDate &&
              ` → ${formatDate(lowest.combo.returnDate)} · ${nightsLabel(lowest.combo.nights!)}`}
          </span>
          <span className="text-xs text-slate-500">
            {demo ? 'Demo data, not a real fare.' : 'An observation, not a guaranteed price.'}
          </span>
        </button>
      )}

      <FiltersBar
        filters={filters}
        onChange={setFilters}
        roundTrip={query.tripType === 'round_trip'}
        hasPrices={hasPrices}
        hiddenForUnknownField={filtered.hiddenForUnknownField}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<View>
          label="Results view"
          value={view}
          onChange={setView}
          options={[
            { value: 'matrix', label: 'Date matrix' },
            { value: 'list', label: 'Ranked list' },
          ]}
        />
        <span className="flex items-center gap-1 text-xs text-slate-500">
          {view === 'matrix' ? <GridIcon /> : <ListIcon />}
          {view === 'matrix'
            ? 'Click any date pair for fares and provider links. Arrow keys move between cells.'
            : 'Only combinations with observed fares are ranked.'}
        </span>
      </div>

      {view === 'matrix' ? (
        <>
          <PriceMatrix
            cells={filtered.cells}
            departDates={plan!.departDates}
            returnDates={plan!.returnDates}
            lowestKey={lowest?.combo.key ?? null}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
          />
          <MatrixLegend hasPrices={hasPrices} />
        </>
      ) : (
        <RankedList
          cells={filtered.cells}
          sortKey={sortKey}
          onSortChange={setSortKey}
          lowestKey={lowest?.combo.key ?? null}
          onSelect={setSelectedKey}
        />
      )}

      {selected && (
        <ComboDrawer
          cell={selected}
          query={plan!.query}
          lowestKey={lowest?.combo.key ?? null}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}

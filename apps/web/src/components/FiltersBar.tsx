import type { ViewFilters } from '@flight/core';
import { inputBase } from './Field';

export function FiltersBar({
  filters,
  onChange,
  roundTrip,
  hasPrices,
  hiddenForUnknownField,
}: {
  filters: ViewFilters;
  onChange: (filters: ViewFilters) => void;
  roundTrip: boolean;
  hasPrices: boolean;
  hiddenForUnknownField: number;
}) {
  const update = (patch: Partial<ViewFilters>) => onChange({ ...filters, ...patch });
  const toInt = (v: string) => (v === '' ? null : Math.max(0, Math.floor(Number(v))));
  const active = Object.values(filters).some((v) => v !== null && v !== undefined);

  return (
    <section
      aria-label="Filters"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
        Max price (USD)
        <input
          type="number"
          min={0}
          step={50}
          placeholder="Any"
          disabled={!hasPrices}
          className={`${inputBase} mt-1 w-28`}
          value={filters.maxPriceMinor != null ? filters.maxPriceMinor / 100 : ''}
          onChange={(e) => {
            const dollars = toInt(e.target.value);
            update({ maxPriceMinor: dollars === null ? null : dollars * 100 });
          }}
        />
      </label>
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
        Stops (each way)
        <select
          disabled={!hasPrices}
          className={`${inputBase} mt-1 w-36`}
          value={filters.maxStops ?? ''}
          onChange={(e) => update({ maxStops: toInt(e.target.value) })}
        >
          <option value="">Any</option>
          <option value="0">Nonstop only</option>
          <option value="1">1 stop or fewer</option>
          <option value="2">2 stops or fewer</option>
        </select>
      </label>
      {roundTrip && (
        <fieldset className="text-xs font-medium text-slate-600 dark:text-slate-400">
          <legend>Nights</legend>
          <div className="mt-1 flex items-center gap-1">
            <input
              type="number"
              min={1}
              aria-label="Minimum nights filter"
              placeholder="min"
              className={`${inputBase} w-20`}
              value={filters.minNights ?? ''}
              onChange={(e) => update({ minNights: toInt(e.target.value) })}
            />
            <span>–</span>
            <input
              type="number"
              min={1}
              aria-label="Maximum nights filter"
              placeholder="max"
              className={`${inputBase} w-20`}
              value={filters.maxNights ?? ''}
              onChange={(e) => update({ maxNights: toInt(e.target.value) })}
            />
          </div>
        </fieldset>
      )}
      {active && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="mb-1 text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
        >
          Clear filters
        </button>
      )}
      <div className="w-full text-xs text-slate-500 empty:hidden">
        {!hasPrices && (
          <span className="mr-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Limited
          </span>
        )}
        {!hasPrices && 'Price and stop filters need price data, which no source has provided yet.'}
        {hiddenForUnknownField > 0 &&
          `${hiddenForUnknownField} fare${hiddenForUnknownField === 1 ? ' is' : 's are'} hidden because the source didn't say whether ${hiddenForUnknownField === 1 ? 'it matches' : 'they match'} the filters.`}
      </div>
    </section>
  );
}

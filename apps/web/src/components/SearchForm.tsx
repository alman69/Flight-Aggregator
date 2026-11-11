import {
  CABIN_LABELS,
  type Cabin,
  type SearchQuery,
  SearchQuerySchema,
  planSearch,
  todayLocal,
} from '@flight/core';
import { type FormEvent, useMemo, useState } from 'react';
import {
  type DateMode,
  type DurationKind,
  type FormState,
  defaultFormState,
  formToInput,
  queryToForm,
} from '../lib/searchForm';
import { AirportInput } from './AirportInput';
import { Field, Segmented, inputBase, inputClass } from './Field';
import { SwapIcon } from './Icons';
import { IssueList } from './IssueList';

type FieldKey = 'origin' | 'destination' | 'dates' | 'duration';

/** Maps a schema error path to the form area that shows it. */
function fieldFor(path: readonly PropertyKey[]): FieldKey {
  const head = String(path[0]);
  if (head === 'origin' || head === 'destination') return head;
  if (head === 'duration') return 'duration';
  return 'dates';
}

export function SearchForm({
  initialQuery,
  onSearch,
}: {
  initialQuery: SearchQuery | null;
  onSearch: (query: SearchQuery) => void;
}) {
  const today = todayLocal();
  const [form, setForm] = useState<FormState>(() =>
    initialQuery ? queryToForm(initialQuery, today) : defaultFormState(today),
  );
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const touch = (key: FieldKey) => setTouched((t) => ({ ...t, [key]: true }));

  // Validate and preview on every change, entirely in the browser (no network).
  const parsed = useMemo(() => SearchQuerySchema.safeParse(formToInput(form)), [form]);
  const plan = useMemo(
    () => (parsed.success ? planSearch(parsed.data, today) : null),
    [parsed, today],
  );

  const fieldErrors: Partial<Record<FieldKey, string>> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = fieldFor(issue.path);
      fieldErrors[key] ??= issue.message;
    }
  }
  const showError = (key: FieldKey) =>
    (touched[key] || submitted) && fieldErrors[key] ? fieldErrors[key] : undefined;

  const canSearch = parsed.success && plan?.ok === true;

  // Results already show warnings for the search on screen; repeat them here only while editing.
  const showingCurrentSearch =
    parsed.success &&
    initialQuery !== null &&
    JSON.stringify(parsed.data) === JSON.stringify(initialQuery);
  const formIssues = plan?.issues.filter((i) => i.level === 'error' || !showingCurrentSearch) ?? [];

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (parsed.success && plan?.ok) onSearch(parsed.data);
  }

  function setTripType(tripType: FormState['tripType']) {
    setForm((f) => ({
      ...f,
      tripType,
      // Separate windows only apply to round trips.
      dateMode: tripType === 'one_way' && f.dateMode === 'split' ? 'window' : f.dateMode,
    }));
  }

  const roundTrip = form.tripType === 'round_trip';
  const dateModes: { value: DateMode; label: string }[] = [
    { value: 'fixed', label: 'Fixed dates' },
    { value: 'window', label: roundTrip ? 'Flexible window' : 'Flexible dates' },
    ...(roundTrip ? [{ value: 'split' as const, label: 'Separate windows' }] : []),
  ];

  const dateInput = (id: string, key: keyof FormState, label: string, min = today) => (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        type="date"
        min={min}
        className={inputClass}
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value as never)}
        onBlur={() => touch('dates')}
        aria-invalid={Boolean(showError('dates'))}
      />
    </Field>
  );

  const codeInput = (key: 'origin' | 'destination', label: string, placeholder: string) => (
    <AirportInput
      id={key}
      label={label}
      value={form[key]}
      placeholder={placeholder}
      error={showError(key)}
      align={key === 'origin' ? 'left' : 'right'}
      onChange={(v) => set(key, v)}
      onBlur={() => touch(key)}
    />
  );

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="Flight search"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Trip type"
          value={form.tripType}
          onChange={setTripType}
          options={[
            { value: 'round_trip', label: 'Round trip' },
            { value: 'one_way', label: 'One way' },
          ]}
        />
        <Segmented
          label="Date mode"
          value={form.dateMode}
          onChange={(v) => set('dateMode', v)}
          options={dateModes}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
        {/* Route */}
        <div className="flex items-start gap-2">
          {codeInput('origin', 'From', 'BUF')}
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, origin: f.destination, destination: f.origin }))}
            className="mt-6 rounded-full border border-slate-300 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Swap origin and destination"
          >
            <SwapIcon className="rotate-90" />
          </button>
          {codeInput('destination', 'To', 'TYO')}
        </div>

        {/* Dates */}
        <div className="grid gap-3 sm:grid-cols-2">
          {form.dateMode === 'fixed' && (
            <>
              {dateInput('departDate', 'departDate', 'Depart')}
              {roundTrip &&
                dateInput('returnDate', 'returnDate', 'Return', form.departDate || today)}
            </>
          )}
          {form.dateMode === 'window' && (
            <>
              {dateInput('windowStart', 'windowStart', 'Earliest departure')}
              {dateInput(
                'windowEnd',
                'windowEnd',
                roundTrip ? 'Latest return' : 'Latest departure',
                form.windowStart || today,
              )}
            </>
          )}
          {form.dateMode === 'split' && (
            <>
              <fieldset className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                <legend className="px-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Departure window
                </legend>
                {dateInput('departStart', 'departStart', 'From')}
                {dateInput('departEnd', 'departEnd', 'To', form.departStart || today)}
              </fieldset>
              <fieldset className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                <legend className="px-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Return window
                </legend>
                {dateInput('returnStart', 'returnStart', 'From', form.departStart || today)}
                {dateInput('returnEnd', 'returnEnd', 'To', form.returnStart || today)}
              </fieldset>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        {roundTrip && form.dateMode !== 'fixed' && (
          <div>
            <span className="mb-1 block text-xs font-medium tracking-wide text-slate-600 uppercase dark:text-slate-400">
              Trip length
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented<DurationKind>
                label="Trip length"
                value={form.durationKind}
                onChange={(v) => set('durationKind', v)}
                options={[
                  { value: 'any', label: 'Any' },
                  { value: 'range', label: 'Min / max' },
                  { value: 'exact', label: 'Exact' },
                ]}
              />
              {form.durationKind === 'range' && (
                <>
                  <NightsInput
                    id="minNights"
                    label="Minimum nights"
                    placeholder="min"
                    value={form.minNights}
                    onChange={(v) => set('minNights', v)}
                    onBlur={() => touch('duration')}
                  />
                  <span className="text-slate-400">–</span>
                  <NightsInput
                    id="maxNights"
                    label="Maximum nights"
                    placeholder="max"
                    value={form.maxNights}
                    onChange={(v) => set('maxNights', v)}
                    onBlur={() => touch('duration')}
                  />
                  <span className="text-sm text-slate-500">nights</span>
                </>
              )}
              {form.durationKind === 'exact' && (
                <>
                  <NightsInput
                    id="exactNights"
                    label="Exact nights"
                    placeholder="n"
                    value={form.exactNights}
                    onChange={(v) => set('exactNights', v)}
                    onBlur={() => touch('duration')}
                  />
                  <span className="text-sm text-slate-500">nights</span>
                </>
              )}
            </div>
            {showError('duration') && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                Nights must be whole numbers from 1 to 60.
              </p>
            )}
          </div>
        )}

        <Field label="Adults" htmlFor="adults" className="w-24">
          <select
            id="adults"
            className={inputClass}
            value={form.adults}
            onChange={(e) => set('adults', Number(e.target.value))}
          >
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cabin" htmlFor="cabin" className="w-44">
          <select
            id="cabin"
            className={inputClass}
            value={form.cabin}
            onChange={(e) => set('cabin', e.target.value as Cabin)}
          >
            {(Object.keys(CABIN_LABELS) as Cabin[]).map((c) => (
              <option key={c} value={c}>
                {CABIN_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>

        <div className="ml-auto flex items-center gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
            {plan?.ok
              ? `${plan.totalCombinations} date combination${plan.totalCombinations === 1 ? '' : 's'}`
              : ' '}
          </p>
          <button
            type="submit"
            disabled={submitted && !canSearch}
            className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900"
          >
            Search
          </button>
        </div>
      </div>

      {formIssues.length > 0 && (submitted || plan?.ok || touched.dates) && (
        <div className="mt-4">
          <IssueList issues={formIssues} />
        </div>
      )}
      {submitted && !parsed.success && fieldErrors.dates && (
        <p className="mt-3 text-sm text-rose-600 dark:text-rose-400" role="alert">
          Check the dates: {fieldErrors.dates}
        </p>
      )}
    </form>
  );
}

function NightsInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <input
      id={id}
      aria-label={label}
      type="number"
      inputMode="numeric"
      min={1}
      max={60}
      placeholder={placeholder}
      className={`${inputBase} w-20`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  );
}

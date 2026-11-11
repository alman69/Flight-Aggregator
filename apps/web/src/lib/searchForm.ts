import {
  type Cabin,
  type SearchQuery,
  type SearchQueryInput,
  type TripType,
  addDays,
  todayLocal,
} from '@flight/core';

export type DateMode = 'fixed' | 'window' | 'split';
export type DurationKind = 'any' | 'range' | 'exact';

/** Raw form values. Strings so half-typed input is kept as-is until it validates. */
export interface FormState {
  tripType: TripType;
  origin: string;
  destination: string;
  dateMode: DateMode;
  departDate: string;
  returnDate: string;
  windowStart: string;
  windowEnd: string;
  departStart: string;
  departEnd: string;
  returnStart: string;
  returnEnd: string;
  durationKind: DurationKind;
  minNights: string;
  maxNights: string;
  exactNights: string;
  adults: number;
  cabin: Cabin;
}

export function defaultFormState(today: string = todayLocal()): FormState {
  const start = addDays(today, 60);
  return {
    tripType: 'round_trip',
    origin: 'BUF',
    destination: '',
    dateMode: 'window',
    departDate: start,
    returnDate: addDays(start, 7),
    windowStart: start,
    windowEnd: addDays(start, 9),
    departStart: start,
    departEnd: addDays(start, 3),
    returnStart: addDays(start, 6),
    returnEnd: addDays(start, 9),
    durationKind: 'any',
    minNights: '',
    maxNights: '',
    exactNights: '',
    adults: 1,
    cabin: 'economy',
  };
}

const optionalInt = (value: string) => (value.trim() === '' ? undefined : Number(value));

/** Converts form values into a query for schema validation. Does not validate by itself. */
export function formToInput(form: FormState): SearchQueryInput {
  const dates =
    form.dateMode === 'fixed'
      ? {
          mode: 'fixed' as const,
          departDate: form.departDate,
          returnDate: form.tripType === 'round_trip' ? form.returnDate : undefined,
        }
      : form.dateMode === 'window'
        ? { mode: 'window' as const, start: form.windowStart, end: form.windowEnd }
        : {
            mode: 'split' as const,
            depart: { start: form.departStart, end: form.departEnd },
            return: { start: form.returnStart, end: form.returnEnd },
          };
  const duration =
    form.durationKind === 'range'
      ? {
          kind: 'range' as const,
          minNights: optionalInt(form.minNights),
          maxNights: optionalInt(form.maxNights),
        }
      : form.durationKind === 'exact'
        ? { kind: 'exact' as const, nights: optionalInt(form.exactNights) ?? Number.NaN }
        : { kind: 'any' as const };
  return {
    tripType: form.tripType,
    origin: form.origin,
    destination: form.destination,
    dates,
    duration,
    adults: form.adults,
    cabin: form.cabin,
  };
}

/** Loads an existing search (e.g. from the URL) into the form, keeping defaults for other modes. */
export function queryToForm(query: SearchQuery, today: string = todayLocal()): FormState {
  const form = defaultFormState(today);
  form.tripType = query.tripType;
  form.origin = query.origin;
  form.destination = query.destination;
  form.adults = query.adults;
  form.cabin = query.cabin;
  form.dateMode = query.dates.mode;
  const { dates, duration } = query;
  if (dates.mode === 'fixed') {
    form.departDate = dates.departDate;
    if (dates.returnDate) form.returnDate = dates.returnDate;
  } else if (dates.mode === 'window') {
    form.windowStart = dates.start;
    form.windowEnd = dates.end;
  } else {
    form.departStart = dates.depart.start;
    form.departEnd = dates.depart.end;
    form.returnStart = dates.return.start;
    form.returnEnd = dates.return.end;
  }
  form.durationKind = duration.kind;
  if (duration.kind === 'range') {
    form.minNights = duration.minNights?.toString() ?? '';
    form.maxNights = duration.maxNights?.toString() ?? '';
  } else if (duration.kind === 'exact') {
    form.exactNights = String(duration.nights);
  }
  return form;
}

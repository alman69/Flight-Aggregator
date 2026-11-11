import { type IsoDate, addDays, daysBetween } from '../dates/epochDay';
import type { DateRange, SearchQuery } from '../schemas';
import { type DateCombo, generateCombos } from './generate';

export const SEARCH_LIMITS = {
  /** Longest single date window, in days (inclusive). */
  maxWindowDays: 60,
  /** Most date combinations one search may produce. */
  maxCombinations: 400,
  /** Airlines usually publish fares roughly 330–360 days ahead; beyond this we warn. */
  publishHorizonDays: 330,
} as const;

export type IssueCode =
  | 'same_airport'
  | 'date_in_past'
  | 'missing_return'
  | 'return_not_after_departure'
  | 'reversed_range'
  | 'window_too_large'
  | 'return_before_departure'
  | 'split_requires_round_trip'
  | 'invalid_duration'
  | 'no_combinations'
  | 'too_many_combinations'
  | 'beyond_publish_horizon';

export interface Issue {
  level: 'error' | 'warning';
  code: IssueCode;
  message: string;
  /** Which part of the form the issue is about, when it is about one field. */
  field?: 'route' | 'dates' | 'departWindow' | 'returnWindow' | 'duration';
}

export interface SearchPlan {
  /** False when any issue is an error; `combos` is then empty. */
  ok: boolean;
  issues: Issue[];
  combos: DateCombo[];
  /** Distinct departure dates (matrix rows), ascending. */
  departDates: IsoDate[];
  /** Distinct return dates (matrix columns), ascending. Empty for one-way. */
  returnDates: IsoDate[];
  totalCombinations: number;
}

function spanDays(range: DateRange): number {
  return daysBetween(range.start, range.end) + 1;
}

function checkRange(
  range: DateRange,
  label: string,
  field: Issue['field'],
  issues: Issue[],
): boolean {
  if (range.start > range.end) {
    issues.push({
      level: 'error',
      code: 'reversed_range',
      field,
      message: `${label}: the start date (${range.start}) is after the end date (${range.end}).`,
    });
    return false;
  }
  if (spanDays(range) > SEARCH_LIMITS.maxWindowDays) {
    issues.push({
      level: 'error',
      code: 'window_too_large',
      field,
      message: `${label} spans ${spanDays(range)} days. The limit is ${SEARCH_LIMITS.maxWindowDays} days.`,
    });
    return false;
  }
  return true;
}

function pastIssue(date: IsoDate, today: IsoDate, field: Issue['field']): Issue {
  return {
    level: 'error',
    code: 'date_in_past',
    field,
    message: `Departure ${date} is before today (${today}).`,
  };
}

/** Checks a search for problems that do not depend on generating the combinations. */
export function validateQuery(query: SearchQuery, today: IsoDate): Issue[] {
  const issues: Issue[] = [];
  const { dates, tripType, duration } = query;

  if (query.origin === query.destination) {
    issues.push({
      level: 'error',
      code: 'same_airport',
      field: 'route',
      message: 'Origin and destination are the same.',
    });
  }

  if (
    duration.kind === 'range' &&
    duration.minNights !== undefined &&
    duration.maxNights !== undefined &&
    duration.minNights > duration.maxNights
  ) {
    issues.push({
      level: 'error',
      code: 'invalid_duration',
      field: 'duration',
      message: `Minimum nights (${duration.minNights}) is more than maximum nights (${duration.maxNights}).`,
    });
  }

  let latestDate: IsoDate;
  if (dates.mode === 'fixed') {
    latestDate = dates.returnDate ?? dates.departDate;
    if (dates.departDate < today) issues.push(pastIssue(dates.departDate, today, 'dates'));
    if (tripType === 'round_trip') {
      if (!dates.returnDate) {
        issues.push({
          level: 'error',
          code: 'missing_return',
          field: 'dates',
          message: 'A round trip needs a return date.',
        });
      } else if (dates.returnDate <= dates.departDate) {
        issues.push({
          level: 'error',
          code: 'return_not_after_departure',
          field: 'dates',
          message: 'The return date must be at least one day after departure.',
        });
      }
    }
  } else if (dates.mode === 'window') {
    latestDate = dates.end;
    const label = tripType === 'round_trip' ? 'Travel window' : 'Departure window';
    if (checkRange(dates, label, 'dates', issues) && dates.start < today) {
      issues.push(pastIssue(dates.start, today, 'dates'));
    }
  } else {
    latestDate = dates.return.end;
    if (tripType === 'one_way') {
      issues.push({
        level: 'error',
        code: 'split_requires_round_trip',
        field: 'dates',
        message: 'Separate departure and return windows only apply to round trips.',
      });
    }
    const departOk = checkRange(dates.depart, 'Departure window', 'departWindow', issues);
    const returnOk = checkRange(dates.return, 'Return window', 'returnWindow', issues);
    if (departOk && dates.depart.start < today) {
      issues.push(pastIssue(dates.depart.start, today, 'departWindow'));
    }
    if (departOk && returnOk && dates.return.end <= dates.depart.start) {
      issues.push({
        level: 'error',
        code: 'return_before_departure',
        field: 'returnWindow',
        message: 'The return window ends before the departure window starts.',
      });
    }
  }

  const horizon = addDays(today, SEARCH_LIMITS.publishHorizonDays);
  if (latestDate > horizon) {
    issues.push({
      level: 'warning',
      code: 'beyond_publish_horizon',
      field: 'dates',
      message: `Some dates are more than ${SEARCH_LIMITS.publishHorizonDays} days away (after ${horizon}). Airlines usually haven't published fares that far ahead, so expect little or no price data.`,
    });
  }

  return issues;
}

/** Validates a search and, when valid, lists every date combination it covers. */
export function planSearch(query: SearchQuery, today: IsoDate): SearchPlan {
  const issues = validateQuery(query, today);
  const failed = (): SearchPlan => ({
    ok: false,
    issues,
    combos: [],
    departDates: [],
    returnDates: [],
    totalCombinations: 0,
  });
  if (issues.some((i) => i.level === 'error')) return failed();

  const combos = generateCombos(query);
  if (combos.length === 0) {
    issues.push({
      level: 'error',
      code: 'no_combinations',
      field: 'duration',
      message:
        'No date combinations fit these dates and trip-length limits. Widen the window or relax the number of nights.',
    });
    return failed();
  }
  if (combos.length > SEARCH_LIMITS.maxCombinations) {
    issues.push({
      level: 'error',
      code: 'too_many_combinations',
      field: 'dates',
      message: `This search produces ${combos.length} date combinations. The limit is ${SEARCH_LIMITS.maxCombinations}; narrow the window or limit the number of nights.`,
    });
    return failed();
  }

  const departDates = [...new Set(combos.map((c) => c.departDate))].sort();
  const returnDates = [
    ...new Set(combos.flatMap((c) => (c.returnDate ? [c.returnDate] : []))),
  ].sort();
  return {
    ok: true,
    issues,
    combos,
    departDates,
    returnDates,
    totalCombinations: combos.length,
  };
}

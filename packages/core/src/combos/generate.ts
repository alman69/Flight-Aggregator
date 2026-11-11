import { type IsoDate, daysBetween, fromEpochDay, toEpochDay } from '../dates/epochDay';
import type { Duration, SearchQuery } from '../schemas';

/** One departure/return pair to look up. `returnDate` and `nights` are null for one-way. */
export interface DateCombo {
  key: string;
  departDate: IsoDate;
  returnDate: IsoDate | null;
  nights: number | null;
}

export interface NightsRange {
  min: number;
  /** `Infinity` when there is no upper limit. */
  max: number;
}

export function comboKey(departDate: IsoDate, returnDate: IsoDate | null): string {
  return returnDate ? `${departDate}_${returnDate}` : departDate;
}

function makeCombo(departDate: IsoDate, returnDate: IsoDate | null): DateCombo {
  return {
    key: comboKey(departDate, returnDate),
    departDate,
    returnDate,
    nights: returnDate ? daysBetween(departDate, returnDate) : null,
  };
}

/** Departure and return must be on different days, so the minimum is always at least 1 night. */
export function resolveNights(duration: Duration): NightsRange {
  switch (duration.kind) {
    case 'any':
      return { min: 1, max: Infinity };
    case 'exact':
      return { min: Math.max(1, duration.nights), max: duration.nights };
    case 'range':
      return { min: Math.max(1, duration.minNights ?? 1), max: duration.maxNights ?? Infinity };
  }
}

/**
 * Lists every valid date combination for a search, ordered by departure date and then return date.
 *
 * - fixed:  the single pair given (trip-length filters do not apply).
 * - window: departure and return both inside [start, end] (Mode A).
 * - split:  departure inside the departure window, return inside the return window (Mode B).
 *
 * Expects ranges already checked by `validateQuery`; reversed ranges simply produce no combinations.
 */
export function generateCombos(
  query: Pick<SearchQuery, 'tripType' | 'dates' | 'duration'>,
): DateCombo[] {
  const { dates, tripType } = query;
  const roundTrip = tripType === 'round_trip';
  const combos: DateCombo[] = [];

  if (dates.mode === 'fixed') {
    if (!roundTrip) return [makeCombo(dates.departDate, null)];
    if (!dates.returnDate || daysBetween(dates.departDate, dates.returnDate) < 1) return [];
    return [makeCombo(dates.departDate, dates.returnDate)];
  }

  if (dates.mode === 'window') {
    const start = toEpochDay(dates.start);
    const end = toEpochDay(dates.end);
    if (!roundTrip) {
      for (let dep = start; dep <= end; dep++) combos.push(makeCombo(fromEpochDay(dep), null));
      return combos;
    }
    const { min, max } = resolveNights(query.duration);
    for (let dep = start; dep + min <= end; dep++) {
      const lastReturn = Math.min(dep + max, end);
      for (let ret = dep + min; ret <= lastReturn; ret++) {
        combos.push(makeCombo(fromEpochDay(dep), fromEpochDay(ret)));
      }
    }
    return combos;
  }

  // Separate windows only make sense for round trips; validation reports the one-way case.
  if (!roundTrip) return [];
  const { min, max } = resolveNights(query.duration);
  const depStart = toEpochDay(dates.depart.start);
  const depEnd = toEpochDay(dates.depart.end);
  const retStart = toEpochDay(dates.return.start);
  const retEnd = toEpochDay(dates.return.end);
  for (let dep = depStart; dep <= depEnd; dep++) {
    for (let ret = Math.max(retStart, dep + min); ret <= retEnd; ret++) {
      if (ret - dep > max) break;
      combos.push(makeCombo(fromEpochDay(dep), fromEpochDay(ret)));
    }
  }
  return combos;
}

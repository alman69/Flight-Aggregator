/**
 * Date-only arithmetic.
 *
 * Travel dates are calendar days, not instants, so they are kept as `YYYY-MM-DD`
 * strings and all arithmetic happens on integer "epoch days" (days since
 * 1970-01-01 in UTC). This sidesteps time zones and daylight-saving changes:
 * adding one day always moves to the next calendar date.
 */

/** A calendar date in `YYYY-MM-DD` form. */
export type IsoDate = string;

const MS_PER_DAY = 86_400_000;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const days = lengths[month - 1];
  if (days === undefined) throw new RangeError(`Invalid month ${month}`);
  return days;
}

/** True only for real calendar dates such as `2028-02-29` (not `2027-02-29`). */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

export function toEpochDay(date: IsoDate): number {
  if (!isIsoDate(date)) {
    throw new RangeError(`Invalid date "${date}". Expected a real date in YYYY-MM-DD format.`);
  }
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

export function fromEpochDay(epochDay: number): IsoDate {
  if (!Number.isInteger(epochDay))
    throw new RangeError(`Epoch day must be an integer: ${epochDay}`);
  const d = new Date(epochDay * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromEpochDay(toEpochDay(date) + days);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return toEpochDay(to) - toEpochDay(from);
}

/** Every date from `start` to `end`, inclusive. Empty when `start` is after `end`. */
export function datesInRange(start: IsoDate, end: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = toEpochDay(start), last = toEpochDay(end); d <= last; d++) out.push(fromEpochDay(d));
  return out;
}

/** Today's calendar date in the machine's local time zone. */
export function todayLocal(now: Date = new Date()): IsoDate {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: IsoDate): number {
  return new Date(toEpochDay(date) * MS_PER_DAY).getUTCDay();
}

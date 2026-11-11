import { describe, expect, it } from 'vitest';
import {
  addDays,
  datesInRange,
  daysBetween,
  fromEpochDay,
  isIsoDate,
  isLeapYear,
  toEpochDay,
  todayLocal,
  weekday,
} from './epochDay';

describe('isIsoDate', () => {
  it('accepts real dates, including leap days', () => {
    expect(isIsoDate('2027-11-01')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2000-02-29')).toBe(true);
  });

  it('rejects impossible or malformed dates', () => {
    expect(isIsoDate('2027-02-29')).toBe(false); // 2027 is not a leap year
    expect(isIsoDate('2100-02-29')).toBe(false); // century, not divisible by 400
    expect(isIsoDate('2027-04-31')).toBe(false);
    expect(isIsoDate('2027-13-01')).toBe(false);
    expect(isIsoDate('2027-00-10')).toBe(false);
    expect(isIsoDate('2027-1-5')).toBe(false);
    expect(isIsoDate('11/01/2027')).toBe(false);
    expect(isIsoDate('')).toBe(false);
    expect(isIsoDate(20271101)).toBe(false);
  });
});

describe('leap years', () => {
  it('follows the Gregorian rules', () => {
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(2027)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
  });
});

describe('date arithmetic', () => {
  it('round-trips through epoch days', () => {
    expect(fromEpochDay(toEpochDay('2027-11-01'))).toBe('2027-11-01');
    expect(toEpochDay('1970-01-01')).toBe(0);
  });

  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2027-01-31', 1)).toBe('2027-02-01');
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });

  it('counts nights between dates', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2027-02-28', '2027-03-01')).toBe(1);
    expect(daysBetween('2027-12-30', '2028-01-02')).toBe(3);
    expect(daysBetween('2027-11-10', '2027-11-01')).toBe(-9);
  });

  it('is unaffected by daylight-saving changes', () => {
    // US clocks change on 2027-03-14 and 2027-11-07.
    expect(daysBetween('2027-03-13', '2027-03-15')).toBe(2);
    expect(daysBetween('2027-11-06', '2027-11-08')).toBe(2);
  });

  it('lists inclusive ranges', () => {
    expect(datesInRange('2027-12-30', '2028-01-02')).toEqual([
      '2027-12-30',
      '2027-12-31',
      '2028-01-01',
      '2028-01-02',
    ]);
    expect(datesInRange('2027-01-05', '2027-01-01')).toEqual([]);
  });

  it('throws on invalid input instead of guessing', () => {
    expect(() => toEpochDay('2027-02-30')).toThrow(RangeError);
  });

  it('reads today from local time and weekday from the date', () => {
    expect(todayLocal(new Date(2027, 10, 1, 23, 59))).toBe('2027-11-01');
    expect(weekday('2027-11-01')).toBe(1); // Monday
  });
});

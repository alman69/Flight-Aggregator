import { type IsoDate, weekday } from '@flight/core';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function weekdayShort(date: IsoDate): string {
  return DAYS[weekday(date)]!;
}

/** "Nov 1" */
export function formatDateShort(date: IsoDate): string {
  const [, month, day] = date.split('-').map(Number) as [number, number, number];
  return `${MONTHS[month - 1]} ${day}`;
}

/** "Mon, Nov 1" */
export function formatDate(date: IsoDate): string {
  return `${weekdayShort(date)}, ${formatDateShort(date)}`;
}

/** "Mon, Nov 1, 2027" */
export function formatDateLong(date: IsoDate): string {
  return `${formatDate(date)}, ${date.slice(0, 4)}`;
}

export function nightsLabel(nights: number): string {
  return `${nights} night${nights === 1 ? '' : 's'}`;
}

/** 1230 → "20h 30m" */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function stopsLabel(stops: number): string {
  return stops === 0 ? 'Nonstop' : `${stops} stop${stops === 1 ? '' : 's'}`;
}

import type { FareOffer } from './model';

/** "just now", "5 minutes ago", "3 hours ago", "2 days ago". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 0) return 'in the future';
  if (seconds < 60) return 'just now';
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return plural(minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return plural(hours, 'hour');
  return plural(Math.floor(hours / 24), 'day');
}

export interface FreshnessDescription {
  /** Short label, e.g. "Cached". */
  label: string;
  /** Full sentence for tooltips and the details drawer. */
  detail: string;
  expired: boolean;
}

/**
 * Describes how fresh a fare is without claiming more than its source said.
 * Observation time is only mentioned when the source provided one.
 */
export function describeFreshness(offer: FareOffer, now: Date = new Date()): FreshnessDescription {
  const expired = offer.expiresAt !== null && new Date(offer.expiresAt).getTime() < now.getTime();
  const expiredSuffix = expired ? ' The source marks this fare as expired.' : '';
  switch (offer.status) {
    case 'demo':
      return {
        label: 'Demo',
        detail: 'Demo data, generated to preview the interface. Not a real fare.',
        expired: false,
      };
    case 'manual':
      return {
        label: 'Manual',
        detail: `Entered by you ${relativeTime(offer.observedAt ?? offer.retrievedAt, now)}.`,
        expired: false,
      };
    case 'live':
      return {
        label: 'Live',
        detail: `Live quote retrieved ${relativeTime(offer.retrievedAt, now)}.${expiredSuffix}`,
        expired,
      };
    case 'cached': {
      const window = offer.sourceWindowNote ? ` ${offer.sourceWindowNote}` : '';
      const detail = offer.observedAt
        ? `Cached observation, seen ${relativeTime(offer.observedAt, now)}; retrieved ${relativeTime(offer.retrievedAt, now)}.`
        : `Cached observation, retrieved ${relativeTime(offer.retrievedAt, now)}. The source did not say when it was seen.${window}`;
      return { label: 'Cached', detail: detail + expiredSuffix, expired };
    }
  }
}

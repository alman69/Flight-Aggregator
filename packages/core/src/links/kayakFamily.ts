import type { Cabin } from '../schemas';
import type { LinkRequest } from './types';

const CABIN_SEGMENT: Partial<Record<Cabin, string>> = {
  premium_economy: 'premium',
  business: 'business',
  first: 'first',
};

/**
 * KAYAK and Momondo (same owner) share a path format:
 * `{O}-{D}/{depart}[/{return}][/{cabin}][/{n}adults]`.
 * Route and dates are verified for round trips and one-way; cabin and passenger segments are not, so they are
 * only added when needed and flagged.
 */
export function kayakStylePath(request: LinkRequest): { path: string; notes: string[] } {
  const notes: string[] = [];
  let path = `${request.origin}-${request.destination}/${request.departDate}`;
  if (request.returnDate) path += `/${request.returnDate}`;
  const cabin = CABIN_SEGMENT[request.cabin];
  if (cabin) path += `/${cabin}`;
  if (request.adults > 1) path += `/${request.adults}adults`;
  if (cabin || request.adults > 1) {
    notes.push('Passenger and cabin settings in this link have not been verified.');
  }
  return { path, notes };
}

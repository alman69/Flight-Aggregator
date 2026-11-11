import type { LinkProvider, LinkRequest, ProviderLink } from './types';

export function link(
  provider: Pick<LinkProvider, 'id' | 'name'>,
  url: string,
  kind: ProviderLink['kind'],
  notes: string[] = [],
  requiresHiddenCityWarning = false,
): ProviderLink {
  return {
    providerId: provider.id,
    providerName: provider.name,
    url,
    kind,
    notes,
    requiresHiddenCityWarning,
  };
}

export const UNVERIFIED_ONE_WAY = 'The one-way version of this link has not been verified yet.';

/** Note for providers whose links cannot carry passengers or cabin. */
export function passengerCabinNote(request: LinkRequest, providerName: string): string[] {
  if (request.adults === 1 && request.cabin === 'economy') return [];
  return [`Set passengers and cabin on ${providerName}; this link does not carry them.`];
}

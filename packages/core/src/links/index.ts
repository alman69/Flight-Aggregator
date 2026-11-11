import { googleFlights } from './googleFlights';
import { going, hopper, secretFlying } from './homepageProviders';
import { kayak } from './kayak';
import { momondo } from './momondo';
import { skiplagged } from './skiplagged';
import { skyscanner } from './skyscanner';
import type { LinkProvider, LinkRequest, ProviderLink } from './types';

/** All eight providers, in display order. */
export const LINK_PROVIDERS: readonly LinkProvider[] = [
  googleFlights,
  skyscanner,
  momondo,
  kayak,
  going,
  secretFlying,
  hopper,
  skiplagged,
];

export function buildProviderLinks(request: LinkRequest): ProviderLink[] {
  return LINK_PROVIDERS.map((provider) => provider.buildLink(request));
}

export * from './types';
export { CITY_CODES, isCityCode } from './cityCodes';

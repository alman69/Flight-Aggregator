import type { IsoDate } from '../dates/epochDay';
import type { Cabin } from '../schemas';

export type ProviderId =
  | 'google_flights'
  | 'skyscanner'
  | 'momondo'
  | 'kayak'
  | 'going'
  | 'secret_flying'
  | 'hopper'
  | 'skiplagged';

export interface LinkRequest {
  origin: string;
  destination: string;
  departDate: IsoDate;
  /** Null for one-way. */
  returnDate: IsoDate | null;
  adults: number;
  cabin: Cabin;
}

export interface ProviderLink {
  providerId: ProviderId;
  providerName: string;
  url: string;
  /** `prefilled`: the provider's search opens with this route and dates. `homepage`: no search link exists. */
  kind: 'prefilled' | 'homepage';
  /** Plain-language caveats, e.g. a part of the link format that has not been verified. */
  notes: string[];
  /** Skiplagged: show the hidden-city warning before opening. */
  requiresHiddenCityWarning: boolean;
}

export interface LinkProvider {
  id: ProviderId;
  name: string;
  homepage: string;
  integration: 'prefilled_link' | 'homepage_link';
  /** One line on how this provider is integrated and why. */
  summary: string;
  /** What has actually been checked, and when. */
  verification: string;
  buildLink(request: LinkRequest): ProviderLink;
}

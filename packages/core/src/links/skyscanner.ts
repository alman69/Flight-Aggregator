import type { IsoDate } from '../dates/epochDay';
import type { Cabin } from '../schemas';
import { isCityCode } from './cityCodes';
import { UNVERIFIED_ONE_WAY, link } from './helpers';
import type { LinkProvider } from './types';

/** Skyscanner uses its own IDs for multi-airport cities. Only verified entries belong here. */
const SKYSCANNER_CITY_IDS: Record<string, string> = {
  TYO: 'tyoa', // verified 2026-11-11
};

const CABIN_PARAM: Record<Cabin, string> = {
  economy: 'economy',
  premium_economy: 'premiumeconomy',
  business: 'business',
  first: 'first',
};

function place(code: string): string {
  return SKYSCANNER_CITY_IDS[code] ?? code.toLowerCase();
}

/** 2027-02-01 → 270201 */
function yymmdd(date: IsoDate): string {
  return date.slice(2, 4) + date.slice(5, 7) + date.slice(8, 10);
}

export const skyscanner: LinkProvider = {
  id: 'skyscanner',
  name: 'Skyscanner',
  homepage: 'https://www.skyscanner.com',
  integration: 'prefilled_link',
  summary:
    'Travel API is limited to approved partners with 100k+ monthly traffic. Opens a pre-filled Skyscanner search.',
  verification:
    'Round-trip link opened pre-filled in a browser on 2026-11-11 (BUF→TYO). The one-way check hit a bot-check page, so one-way is unverified.',
  buildLink(request) {
    const notes: string[] = [];
    for (const code of [request.origin, request.destination]) {
      if (isCityCode(code) && !SKYSCANNER_CITY_IDS[code]) {
        notes.push(`Skyscanner may not recognize the city code ${code}; try a specific airport.`);
      }
    }
    if (!request.returnDate) notes.push(UNVERIFIED_ONE_WAY);
    if (request.adults > 1 || request.cabin !== 'economy') {
      notes.push('Passenger and cabin settings in this link have not been verified.');
    }
    const datePath = `${yymmdd(request.departDate)}/${request.returnDate ? `${yymmdd(request.returnDate)}/` : ''}`;
    const params = `adultsv2=${request.adults}&cabinclass=${CABIN_PARAM[request.cabin]}&rtn=${request.returnDate ? 1 : 0}`;
    return link(
      this,
      `https://www.skyscanner.com/transport/flights/${place(request.origin)}/${place(request.destination)}/${datePath}?${params}`,
      'prefilled',
      notes,
    );
  },
};

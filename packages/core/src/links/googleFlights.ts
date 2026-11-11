import { link, passengerCabinNote } from './helpers';
import type { LinkProvider } from './types';

export const googleFlights: LinkProvider = {
  id: 'google_flights',
  name: 'Google Flights',
  homepage: 'https://www.google.com/travel/flights',
  integration: 'prefilled_link',
  summary:
    'No public flight-search API, and automated access is prohibited. Opens Google Flights with the route and dates filled in.',
  verification:
    'Round-trip (BUF→NRT) and one-way (BUF→MCO) links opened pre-filled in a browser on 2026-11-11.',
  buildLink(request) {
    const text = request.returnDate
      ? `Flights to ${request.destination} from ${request.origin} on ${request.departDate} through ${request.returnDate}`
      : `One way flights to ${request.destination} from ${request.origin} on ${request.departDate}`;
    const notes = passengerCabinNote(request, this.name);
    return link(
      this,
      `https://www.google.com/travel/flights?q=${encodeURIComponent(text)}&curr=USD`,
      'prefilled',
      notes,
    );
  },
};

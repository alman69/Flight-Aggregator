import { link, passengerCabinNote } from './helpers';
import type { LinkProvider } from './types';

export const skiplagged: LinkProvider = {
  id: 'skiplagged',
  name: 'Skiplagged',
  homepage: 'https://skiplagged.com',
  integration: 'prefilled_link',
  summary:
    'No API; its terms allow personal viewing only. Opens a pre-filled Skiplagged search, which may include hidden-city fares.',
  verification:
    'Round-trip (BUF→TYO) and one-way (BUF→MCO) links opened pre-filled in a browser on 2026-11-11.',
  buildLink(request) {
    const notes = passengerCabinNote(request, this.name);
    const dates = request.returnDate
      ? `${request.departDate}/${request.returnDate}`
      : request.departDate;
    return link(
      this,
      `https://skiplagged.com/flights/${request.origin}/${request.destination}/${dates}`,
      'prefilled',
      notes,
      true,
    );
  },
};

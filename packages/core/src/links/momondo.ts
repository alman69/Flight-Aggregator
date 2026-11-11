import { link } from './helpers';
import { kayakStylePath } from './kayakFamily';
import type { LinkProvider } from './types';

export const momondo: LinkProvider = {
  id: 'momondo',
  name: 'Momondo',
  homepage: 'https://www.momondo.com',
  integration: 'prefilled_link',
  summary: 'No public API. Opens a pre-filled Momondo search.',
  verification:
    'Round-trip (BUF→TYO) and one-way (BUF→MCO) links opened pre-filled in a browser on 2026-11-11.',
  buildLink(request) {
    const { path, notes } = kayakStylePath(request);
    return link(
      this,
      `https://www.momondo.com/flight-search/${path}?sort=price_a`,
      'prefilled',
      notes,
    );
  },
};

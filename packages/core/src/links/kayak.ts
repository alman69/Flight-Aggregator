import { link } from './helpers';
import { kayakStylePath } from './kayakFamily';
import type { LinkProvider } from './types';

export const kayak: LinkProvider = {
  id: 'kayak',
  name: 'KAYAK',
  homepage: 'https://www.kayak.com',
  integration: 'prefilled_link',
  summary: 'Price data is only available to approved affiliates. Opens a pre-filled KAYAK search.',
  verification:
    'Round-trip (BUF→TYO) and one-way (BUF→MCO) links opened pre-filled in a browser on 2026-11-11.',
  buildLink(request) {
    const { path, notes } = kayakStylePath(request);
    return link(this, `https://www.kayak.com/flights/${path}?sort=price_a`, 'prefilled', notes);
  },
};

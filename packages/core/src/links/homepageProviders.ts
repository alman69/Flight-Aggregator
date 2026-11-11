import { link } from './helpers';
import type { LinkProvider } from './types';

export const going: LinkProvider = {
  id: 'going',
  name: 'Going',
  homepage: 'https://www.going.com',
  integration: 'homepage_link',
  summary:
    'Deal-alert service with no API, feed or search links; deals are shown to members. Opens the homepage.',
  verification: 'No search link format exists to verify.',
  buildLink() {
    return link(this, this.homepage, 'homepage', [
      'Going has no search links. This opens its homepage, where deals are shown to members.',
    ]);
  },
};

export const secretFlying: LinkProvider = {
  id: 'secret_flying',
  name: 'Secret Flying',
  homepage: 'https://www.secretflying.com',
  integration: 'homepage_link',
  summary:
    'Deal listings only. No API or search links, its RSS feed redirects to the homepage, and its terms forbid scraping. Opens the homepage.',
  verification: 'Checked 2026-11-11: /feed/ redirects to the homepage.',
  buildLink() {
    return link(this, this.homepage, 'homepage', [
      'Secret Flying lists deals rather than searching routes. This opens its homepage.',
    ]);
  },
};

export const hopper: LinkProvider = {
  id: 'hopper',
  name: 'Hopper',
  homepage: 'https://www.hopper.com',
  integration: 'homepage_link',
  summary:
    'APIs are for signed business partners only, and no pre-filled search URL is known. Opens the Flights tab of hopper.com.',
  verification:
    'hopper.com opened on 2026-11-11; the Flights-tab URL comes from its own navigation. No search URL format was found.',
  buildLink() {
    return link(this, 'https://www.hopper.com/?activeTab=flights', 'homepage', [
      'Hopper has no known search link. This opens its Flights tab; enter the route and dates there.',
    ]);
  },
};

import { describe, expect, it } from 'vitest';
import { LINK_PROVIDERS, buildProviderLinks } from './index';
import type { LinkRequest } from './types';

const roundTrip: LinkRequest = {
  origin: 'BUF',
  destination: 'TYO',
  departDate: '2027-02-01',
  returnDate: '2027-02-08',
  adults: 1,
  cabin: 'economy',
};
const byId = (request: LinkRequest) =>
  Object.fromEntries(buildProviderLinks(request).map((l) => [l.providerId, l]));

describe('provider links', () => {
  it('covers all eight providers in display order', () => {
    expect(LINK_PROVIDERS.map((p) => p.name)).toEqual([
      'Google Flights',
      'Skyscanner',
      'Momondo',
      'KAYAK',
      'Going',
      'Secret Flying',
      'Hopper',
      'Skiplagged',
    ]);
  });

  it('builds the round-trip formats verified in a browser on 2026-11-11', () => {
    const links = byId(roundTrip);
    expect(links.google_flights!.url).toBe(
      'https://www.google.com/travel/flights?q=Flights%20to%20TYO%20from%20BUF%20on%202027-02-01%20through%202027-02-08&curr=USD',
    );
    expect(links.skyscanner!.url).toBe(
      'https://www.skyscanner.com/transport/flights/buf/tyoa/270201/270208/?adultsv2=1&cabinclass=economy&rtn=1',
    );
    expect(links.kayak!.url).toBe(
      'https://www.kayak.com/flights/BUF-TYO/2027-02-01/2027-02-08?sort=price_a',
    );
    expect(links.momondo!.url).toBe(
      'https://www.momondo.com/flight-search/BUF-TYO/2027-02-01/2027-02-08?sort=price_a',
    );
    expect(links.skiplagged!.url).toBe(
      'https://skiplagged.com/flights/BUF/TYO/2027-02-01/2027-02-08',
    );
  });

  it('marks five providers as pre-filled and three as homepage links', () => {
    const links = buildProviderLinks(roundTrip);
    expect(links.filter((l) => l.kind === 'prefilled').map((l) => l.providerId)).toEqual([
      'google_flights',
      'skyscanner',
      'momondo',
      'kayak',
      'skiplagged',
    ]);
    expect(links.filter((l) => l.kind === 'homepage').map((l) => l.url)).toEqual([
      'https://www.going.com',
      'https://www.secretflying.com',
      'https://www.hopper.com/?activeTab=flights',
    ]);
  });

  it('has no unexplained caveats on a default round trip to an airport', () => {
    const links = byId({ ...roundTrip, destination: 'NRT' });
    for (const id of ['google_flights', 'skyscanner', 'momondo', 'kayak', 'skiplagged']) {
      expect(links[id]!.notes).toEqual([]);
    }
  });

  it('only flags Skiplagged for the hidden-city warning', () => {
    const flagged = buildProviderLinks(roundTrip).filter((l) => l.requiresHiddenCityWarning);
    expect(flagged.map((l) => l.providerId)).toEqual(['skiplagged']);
  });

  it('builds one-way links (verified 2026-11-11 except Skyscanner)', () => {
    const links = byId({ ...roundTrip, returnDate: null });
    expect(links.google_flights!.url).toContain(
      encodeURIComponent('One way flights to TYO from BUF on 2027-02-01'),
    );
    expect(links.skyscanner!.url).toBe(
      'https://www.skyscanner.com/transport/flights/buf/tyoa/270201/?adultsv2=1&cabinclass=economy&rtn=0',
    );
    expect(links.kayak!.url).toBe('https://www.kayak.com/flights/BUF-TYO/2027-02-01?sort=price_a');
    expect(links.momondo!.url).toBe(
      'https://www.momondo.com/flight-search/BUF-TYO/2027-02-01?sort=price_a',
    );
    expect(links.skiplagged!.url).toBe('https://skiplagged.com/flights/BUF/TYO/2027-02-01');
    expect(links.skyscanner!.notes.join(' ')).toMatch(/one-way/i);
    for (const id of ['google_flights', 'kayak', 'momondo', 'skiplagged']) {
      expect(links[id]!.notes).toEqual([]);
    }
  });

  it('adds passengers and cabin where the format allows, and says when it cannot', () => {
    const links = byId({ ...roundTrip, adults: 2, cabin: 'business' });
    expect(links.kayak!.url).toBe(
      'https://www.kayak.com/flights/BUF-TYO/2027-02-01/2027-02-08/business/2adults?sort=price_a',
    );
    expect(links.skyscanner!.url).toContain('adultsv2=2&cabinclass=business');
    expect(links.kayak!.notes.join(' ')).toMatch(/not been verified/);
    expect(links.google_flights!.notes.join(' ')).toMatch(/does not carry/);
    expect(links.skiplagged!.notes.join(' ')).toMatch(/does not carry/);
  });

  it('warns when Skyscanner may not know a city code', () => {
    const links = byId({ ...roundTrip, destination: 'LON' });
    expect(links.skyscanner!.url).toContain('/buf/lon/');
    expect(links.skyscanner!.notes.join(' ')).toMatch(/LON/);
  });

  it('URL-encodes the Google Flights query', () => {
    const url = byId(roundTrip).google_flights!.url;
    expect(url).not.toContain(' ');
    expect(decodeURIComponent(url.split('?q=')[1]!.split('&')[0]!)).toBe(
      'Flights to TYO from BUF on 2027-02-01 through 2027-02-08',
    );
  });
});

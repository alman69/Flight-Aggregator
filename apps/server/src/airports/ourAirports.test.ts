import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { airportsToSeedCsv, extractAirports, parseAirportSeed } from './ourAirports';

const header =
  '"id","ident","type","name","latitude_deg","longitude_deg","elevation_ft","continent","iso_country","iso_region","municipality","scheduled_service","icao_code","iata_code","gps_code","local_code","home_link","wikipedia_link","keywords"';
const row = (type: string, name: string, iata: string, scheduled: string, city = 'Town') =>
  `1,"X","${type}","${name}",42.9,-78.7,0,"NA","US","US-NY","${city}","${scheduled}",,"${iata}",,,,,`;

const countries =
  '"id","code","name","continent","wikipedia_link","keywords"\n1,"US","United States","NA",,';

describe('extractAirports', () => {
  it('keeps only scheduled-service airports with IATA codes', () => {
    const csv = [
      header,
      row('large_airport', 'Buffalo Niagara International Airport', 'BUF', 'yes', 'Buffalo'),
      row('heliport', 'Some Heliport', 'HLP', 'yes'),
      row('small_airport', 'Private Strip', 'PVT', 'no'),
      row('medium_airport', 'No Code', '', 'yes'),
      row('closed', 'Closed Field', 'CLS', 'yes'),
      row('medium_airport', 'Lowercase', 'abc', 'yes'),
    ].join('\n');
    const airports = extractAirports(csv, countries);
    expect(airports).toEqual([
      {
        iata: 'BUF',
        name: 'Buffalo Niagara International Airport',
        city: 'Buffalo',
        countryCode: 'US',
        country: 'United States',
        lat: 42.9,
        lon: -78.7,
        type: 'large_airport',
      },
    ]);
  });

  it('keeps the larger airport when an IATA code repeats', () => {
    const csv = [
      header,
      row('small_airport', 'Small', 'DUP', 'yes'),
      row('large_airport', 'Large', 'DUP', 'yes'),
    ].join('\n');
    expect(extractAirports(csv, countries).map((a) => a.name)).toEqual(['Large']);
  });

  it('round-trips through the seed format', () => {
    const airports = extractAirports(
      [header, row('large_airport', 'A, "quoted" name', 'AAA', 'yes')].join('\n'),
      countries,
    );
    expect(parseAirportSeed(airportsToSeedCsv(airports))).toEqual(airports);
  });
});

describe('committed seed file', () => {
  const seed = parseAirportSeed(
    readFileSync(
      fileURLToPath(new URL('../../../../data/seed/airports.csv', import.meta.url)),
      'utf8',
    ),
  );

  it('contains the Buffalo-area and Tokyo airports', () => {
    const codes = new Set(seed.map((a) => a.iata));
    for (const code of ['BUF', 'ROC', 'YYZ', 'IAG', 'NRT', 'HND']) expect(codes).toContain(code);
    expect(seed.length).toBeGreaterThan(3000);
  });

  it('has valid coordinates and unique codes', () => {
    expect(new Set(seed.map((a) => a.iata)).size).toBe(seed.length);
    expect(seed.every((a) => Math.abs(a.lat) <= 90 && Math.abs(a.lon) <= 180)).toBe(true);
  });
});

import type { Airport, AirportType } from '@flight/core';
import { parseCsvObjects, toCsv } from '../lib/csv';

/** OurAirports open data (public domain, Unlicense): https://github.com/davidmegginson/ourairports-data */
export const OURAIRPORTS_URLS = {
  airports: 'https://davidmegginson.github.io/ourairports-data/airports.csv',
  countries: 'https://davidmegginson.github.io/ourairports-data/countries.csv',
};

const TYPES: readonly AirportType[] = ['large_airport', 'medium_airport', 'small_airport'];
const SEED_HEADER = [
  'iata',
  'name',
  'city',
  'country_code',
  'country',
  'lat',
  'lon',
  'type',
] as const;

/**
 * Keeps airports a traveller can actually book: a 3-letter IATA code and scheduled passenger
 * service. Heliports, seaplane bases and closed airports are dropped. If two rows share an IATA
 * code, the larger airport wins.
 */
export function extractAirports(airportsCsv: string, countriesCsv: string): Airport[] {
  const countries = new Map(parseCsvObjects(countriesCsv).map((c) => [c.code!, c.name!]));
  const byCode = new Map<string, Airport>();
  for (const row of parseCsvObjects(airportsCsv)) {
    const iata = row.iata_code ?? '';
    const type = row.type as AirportType;
    if (!/^[A-Z]{3}$/.test(iata) || row.scheduled_service !== 'yes' || !TYPES.includes(type))
      continue;
    const lat = Number(row.latitude_deg);
    const lon = Number(row.longitude_deg);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const airport: Airport = {
      iata,
      name: row.name ?? iata,
      city: row.municipality || null,
      countryCode: row.iso_country ?? '',
      country: countries.get(row.iso_country ?? '') ?? null,
      lat,
      lon,
      type,
    };
    const existing = byCode.get(iata);
    if (!existing || TYPES.indexOf(type) < TYPES.indexOf(existing.type)) byCode.set(iata, airport);
  }
  return [...byCode.values()].sort((a, b) => a.iata.localeCompare(b.iata));
}

export function airportsToSeedCsv(airports: readonly Airport[]): string {
  return toCsv(
    SEED_HEADER,
    airports.map((a) => [
      a.iata,
      a.name,
      a.city ?? '',
      a.countryCode,
      a.country ?? '',
      a.lat.toFixed(6),
      a.lon.toFixed(6),
      a.type,
    ]),
  );
}

export function parseAirportSeed(csv: string): Airport[] {
  return parseCsvObjects(csv).map((r) => ({
    iata: r.iata!,
    name: r.name!,
    city: r.city || null,
    countryCode: r.country_code!,
    country: r.country || null,
    lat: Number(r.lat),
    lon: Number(r.lon),
    type: r.type as AirportType,
  }));
}

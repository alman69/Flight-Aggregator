import type { Airport } from '@flight/core';
import { openDatabase } from '../db/connection';
import { createAirportsRepo } from '../db/repos/airports';

/** A handful of real airports (from the OurAirports seed) for repository and route tests. */
export const TEST_AIRPORTS: Airport[] = [
  {
    iata: 'BUF',
    name: 'Buffalo Niagara International Airport',
    city: 'Buffalo',
    countryCode: 'US',
    country: 'United States',
    lat: 42.9405,
    lon: -78.7322,
    type: 'large_airport',
  },
  {
    iata: 'ROC',
    name: 'Frederick Douglass Greater Rochester International Airport',
    city: 'Rochester',
    countryCode: 'US',
    country: 'United States',
    lat: 43.1189,
    lon: -77.6724,
    type: 'large_airport',
  },
  {
    iata: 'RST',
    name: 'Rochester International Airport',
    city: 'Rochester',
    countryCode: 'US',
    country: 'United States',
    lat: 43.9083,
    lon: -92.5,
    type: 'medium_airport',
  },
  {
    iata: 'YYZ',
    name: 'Toronto Pearson International Airport',
    city: 'Toronto',
    countryCode: 'CA',
    country: 'Canada',
    lat: 43.6759,
    lon: -79.6294,
    type: 'large_airport',
  },
  {
    iata: 'YTZ',
    name: 'Billy Bishop Toronto City Airport',
    city: 'Toronto',
    countryCode: 'CA',
    country: 'Canada',
    lat: 43.6275,
    lon: -79.3962,
    type: 'medium_airport',
  },
  {
    iata: 'NRT',
    name: 'Narita International Airport',
    city: 'Narita',
    countryCode: 'JP',
    country: 'Japan',
    lat: 35.7686,
    lon: 140.3887,
    type: 'large_airport',
  },
  {
    iata: 'HND',
    name: 'Tokyo Haneda International Airport',
    city: 'Tokyo',
    countryCode: 'JP',
    country: 'Japan',
    lat: 35.5523,
    lon: 139.78,
    type: 'large_airport',
  },
  {
    iata: 'IAG',
    name: 'Niagara Falls International Airport',
    city: 'Niagara Falls',
    countryCode: 'US',
    country: 'United States',
    lat: 43.1073,
    lon: -78.9462,
    type: 'medium_airport',
  },
];

export function testDb() {
  const db = openDatabase(':memory:');
  createAirportsRepo(db).replaceAll(TEST_AIRPORTS);
  return db;
}

export type AirportType = 'large_airport' | 'medium_airport' | 'small_airport';

/** One airport with scheduled service, from OurAirports (public domain). */
export interface Airport {
  iata: string;
  name: string;
  city: string | null;
  countryCode: string;
  country: string | null;
  lat: number;
  lon: number;
  type: AirportType;
}

/** An autocomplete result: a single airport or a metro code covering several. */
export interface AirportSuggestion {
  code: string;
  kind: 'airport' | 'metro';
  name: string;
  city: string | null;
  countryCode: string;
  country: string | null;
  /** For metro codes: the airports it covers. */
  airports: string[];
}

export function describeSuggestion(s: AirportSuggestion): string {
  if (s.kind === 'metro') return `${s.name} · all airports (${s.airports.join(', ')})`;
  const place = [s.city, s.country ?? s.countryCode].filter(Boolean).join(', ');
  return place ? `${s.name} · ${place}` : s.name;
}

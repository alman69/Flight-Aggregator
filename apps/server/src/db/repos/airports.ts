import { type Airport, type AirportSuggestion, type AirportType, METRO_AREAS } from '@flight/core';
import { type Database, transaction } from '../connection';

interface AirportRow {
  iata: string;
  name: string;
  city: string | null;
  country_code: string;
  country: string | null;
  lat: number;
  lon: number;
  type: AirportType;
}

const toAirport = (r: AirportRow): Airport => ({
  iata: r.iata,
  name: r.name,
  city: r.city,
  countryCode: r.country_code,
  country: r.country,
  lat: r.lat,
  lon: r.lon,
  type: r.type,
});

export const airportToSuggestion = (a: Airport): AirportSuggestion => ({
  code: a.iata,
  kind: 'airport',
  name: a.name,
  city: a.city,
  countryCode: a.countryCode,
  country: a.country,
  airports: [],
});

/** Escapes LIKE wildcards in user input. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export function createAirportsRepo(db: Database) {
  const countStmt = db.prepare('SELECT COUNT(*) AS n FROM airports');
  const getStmt = db.prepare('SELECT * FROM airports WHERE iata = ?');
  const insertStmt = db.prepare(
    `INSERT INTO airports (iata, name, city, country_code, country, lat, lon, type)
     VALUES (:iata, :name, :city, :countryCode, :country, :lat, :lon, :type)`,
  );
  // Ranking: exact code, code prefix, city prefix, name prefix, then anywhere in city/name.
  // Larger airports first within each group.
  const searchStmt = db.prepare(`
    SELECT *,
      CASE
        WHEN iata = :code THEN 0
        WHEN iata LIKE :prefix ESCAPE '\\' THEN 1
        WHEN city LIKE :prefix ESCAPE '\\' THEN 2
        WHEN name LIKE :prefix ESCAPE '\\' THEN 3
        ELSE 4
      END AS match_rank,
      CASE type WHEN 'large_airport' THEN 0 WHEN 'medium_airport' THEN 1 ELSE 2 END AS size_rank
    FROM airports
    WHERE iata LIKE :prefix ESCAPE '\\'
       OR city LIKE :contains ESCAPE '\\'
       OR name LIKE :contains ESCAPE '\\'
    ORDER BY match_rank, size_rank, name
    LIMIT :limit
  `);

  function get(code: string): Airport | null {
    const row = getStmt.get(code.toUpperCase()) as AirportRow | undefined;
    return row ? toAirport(row) : null;
  }

  function metroSuggestion(code: string): AirportSuggestion | null {
    const metro = METRO_AREAS[code];
    if (!metro) return null;
    const first = get(metro.airports[0]!);
    return {
      code: metro.code,
      kind: 'metro',
      name: metro.name,
      city: metro.name,
      countryCode: metro.country,
      country: first?.country ?? null,
      airports: [...metro.airports],
    };
  }

  return {
    count(): number {
      return Number((countStmt.get() as { n: number }).n);
    },

    get,

    /** An airport or metro code, as an autocomplete suggestion. */
    lookup(code: string): AirportSuggestion | null {
      const upper = code.trim().toUpperCase();
      const metro = metroSuggestion(upper);
      if (metro) return metro;
      const airport = get(upper);
      return airport ? airportToSuggestion(airport) : null;
    },

    /** Replaces the whole table (used when loading or refreshing the OurAirports seed). */
    replaceAll(airports: readonly Airport[]): void {
      transaction(db, () => {
        db.exec('DELETE FROM airports');
        for (const a of airports) insertStmt.run({ ...a });
      });
    },

    /** Autocomplete by code, city or name. Metro codes (TYO, NYC…) are listed before their airports. */
    search(query: string, limit = 8): AirportSuggestion[] {
      const q = query.trim();
      if (q.length < 2) return [];
      const upper = q.toUpperCase();
      const lower = q.toLowerCase();
      const metros = Object.values(METRO_AREAS)
        .filter((m) => m.code === upper || m.name.toLowerCase().startsWith(lower))
        .map((m) => metroSuggestion(m.code)!)
        .slice(0, 2);
      const rows = searchStmt.all({
        code: upper,
        prefix: `${likeEscape(q)}%`,
        contains: `%${likeEscape(q)}%`,
        limit,
      }) as unknown as AirportRow[];
      // An exact airport-code match beats a metro whose name merely starts with the query.
      const exact = rows[0]?.iata === upper ? [airportToSuggestion(toAirport(rows[0]))] : [];
      const rest = rows
        .filter((r) => r.iata !== upper)
        .map((r) => airportToSuggestion(toAirport(r)));
      return [...exact, ...metros, ...rest].slice(0, limit);
    },
  };
}

export type AirportsRepo = ReturnType<typeof createAirportsRepo>;

/**
 * Schema changes, applied in order and recorded in `schema_migrations`.
 * Never edit a migration that has shipped; add a new one.
 */
export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'airports_and_fare_observations',
    sql: `
      CREATE TABLE airports (
        iata         TEXT PRIMARY KEY,
        name         TEXT NOT NULL,
        city         TEXT,
        country_code TEXT NOT NULL,
        country      TEXT,
        lat          REAL NOT NULL,
        lon          REAL NOT NULL,
        type         TEXT NOT NULL CHECK (type IN ('large_airport', 'medium_airport', 'small_airport'))
      );

      -- Every price the app knows about. Append-only history: rows are never edited.
      CREATE TABLE fare_observations (
        id                  TEXT PRIMARY KEY,
        source              TEXT NOT NULL,                 -- 'manual' now; cached sources later
        provider_id         TEXT,                          -- site a manual price was seen on
        status              TEXT NOT NULL CHECK (status IN ('live', 'cached', 'manual')),
        itinerary_kind      TEXT NOT NULL DEFAULT 'standard' CHECK (itinerary_kind IN ('standard', 'hidden_city')),
        trip_type           TEXT NOT NULL CHECK (trip_type IN ('round_trip', 'one_way')),
        origin_airport      TEXT NOT NULL,
        destination_airport TEXT NOT NULL,
        depart_date         TEXT NOT NULL,
        return_date         TEXT,
        depart_time         TEXT,
        stops_out           INTEGER,                       -- NULL = unknown, never 0
        stops_back          INTEGER,
        duration_minutes    INTEGER,
        layover_minutes     INTEGER,
        airline             TEXT,
        flight_number       TEXT,
        price_minor         INTEGER NOT NULL CHECK (price_minor > 0),
        currency            TEXT NOT NULL,
        price_basis         TEXT NOT NULL CHECK (price_basis IN ('per_adult', 'total')),
        adults              INTEGER NOT NULL CHECK (adults BETWEEN 1 AND 9),
        cabin               TEXT NOT NULL,
        checked_bags        INTEGER,                       -- NULL = baggage unknown
        carry_on            INTEGER,
        booking_url         TEXT,
        note                TEXT,
        retrieved_at        TEXT NOT NULL,
        observed_at         TEXT,                          -- only when the source says when it was seen
        expires_at          TEXT,
        source_window_note  TEXT,
        raw_json            TEXT,
        dedupe_key          TEXT NOT NULL UNIQUE,
        created_at          TEXT NOT NULL
      );
      CREATE INDEX fare_observations_route_dates
        ON fare_observations (origin_airport, destination_airport, depart_date, return_date);
    `,
  },
];

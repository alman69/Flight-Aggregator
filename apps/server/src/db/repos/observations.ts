import { randomUUID } from 'node:crypto';
import {
  type Baggage,
  type Cabin,
  type FareOffer,
  type ManualObservation,
  type TripType,
  dedupeKey,
  manualObservationToOffer,
} from '@flight/core';
import type { Database } from '../connection';

interface ObservationRow {
  id: string;
  source: string;
  provider_id: string | null;
  status: FareOffer['status'];
  itinerary_kind: FareOffer['itineraryKind'];
  trip_type: TripType;
  origin_airport: string;
  destination_airport: string;
  depart_date: string;
  return_date: string | null;
  depart_time: string | null;
  stops_out: number | null;
  stops_back: number | null;
  duration_minutes: number | null;
  layover_minutes: number | null;
  airline: string | null;
  flight_number: string | null;
  price_minor: number;
  currency: string;
  price_basis: FareOffer['priceBasis'];
  adults: number;
  cabin: Cabin | 'unknown';
  checked_bags: number | null;
  carry_on: number | null;
  booking_url: string | null;
  note: string | null;
  retrieved_at: string;
  observed_at: string | null;
  expires_at: string | null;
  source_window_note: string | null;
  raw_json: string | null;
}

/** Rebuilds a FareOffer from a row. The source name is stored in raw_json at insert time. */
function rowToOffer(r: ObservationRow): FareOffer {
  const baggage: Baggage =
    r.checked_bags === null
      ? 'unknown'
      : { checkedBags: r.checked_bags, carryOn: r.carry_on === 1 };
  const raw = r.raw_json
    ? (JSON.parse(r.raw_json) as { sourceName?: string; sourceId?: string })
    : {};
  return {
    id: r.id,
    sourceId: raw.sourceId ?? r.source,
    sourceName: raw.sourceName ?? r.source,
    status: r.status,
    itineraryKind: r.itinerary_kind,
    tripType: r.trip_type,
    originAirport: r.origin_airport,
    destinationAirport: r.destination_airport,
    departDate: r.depart_date,
    returnDate: r.return_date,
    departTime: r.depart_time,
    stopsOut: r.stops_out,
    stopsBack: r.stops_back,
    durationMinutes: r.duration_minutes,
    layoverMinutes: r.layover_minutes,
    airline: r.airline,
    flightNumber: r.flight_number,
    price: { amountMinor: r.price_minor, currency: r.currency },
    priceBasis: r.price_basis,
    adults: r.adults,
    cabin: r.cabin,
    baggage,
    retrievedAt: r.retrieved_at,
    observedAt: r.observed_at,
    expiresAt: r.expires_at,
    sourceWindowNote: r.source_window_note,
    bookingUrl: r.booking_url,
    notes: r.note ? [r.note] : [],
  };
}

export interface ObservationFilter {
  origins: readonly string[];
  destinations: readonly string[];
  tripType: TripType;
  departFrom: string;
  departTo: string;
  cabin: Cabin;
  adults: number;
}

export class DuplicateObservationError extends Error {
  constructor() {
    super('This price was already saved.');
    this.name = 'DuplicateObservationError';
  }
}

export function createObservationsRepo(db: Database) {
  const insertStmt = db.prepare(`
    INSERT INTO fare_observations (
      id, source, provider_id, status, itinerary_kind, trip_type, origin_airport, destination_airport,
      depart_date, return_date, depart_time, stops_out, stops_back, duration_minutes, layover_minutes,
      airline, flight_number, price_minor, currency, price_basis, adults, cabin, checked_bags, carry_on,
      booking_url, note, retrieved_at, observed_at, expires_at, source_window_note, raw_json,
      dedupe_key, created_at
    ) VALUES (
      :id, :source, :providerId, :status, :itineraryKind, :tripType, :origin, :destination,
      :departDate, :returnDate, :departTime, :stopsOut, :stopsBack, :durationMinutes, :layoverMinutes,
      :airline, :flightNumber, :priceMinor, :currency, :priceBasis, :adults, :cabin, :checkedBags, :carryOn,
      :bookingUrl, :note, :retrievedAt, :observedAt, :expiresAt, :sourceWindowNote, :rawJson,
      :dedupeKey, :createdAt
    )`);
  const getStmt = db.prepare('SELECT * FROM fare_observations WHERE id = ?');
  const deleteStmt = db.prepare("DELETE FROM fare_observations WHERE id = ? AND status = 'manual'");
  const recentStmt = db.prepare('SELECT * FROM fare_observations ORDER BY created_at DESC LIMIT ?');

  return {
    /** Saves a price you saw. Identical entries within the same minute are treated as a double submit. */
    insertManual(obs: ManualObservation, now: Date = new Date()): FareOffer {
      const enteredAt = now.toISOString();
      const offer = manualObservationToOffer(obs, { id: randomUUID(), enteredAt });
      try {
        insertStmt.run({
          id: offer.id,
          source: 'manual',
          providerId: obs.providerId,
          status: 'manual',
          itineraryKind: offer.itineraryKind,
          tripType: offer.tripType,
          origin: offer.originAirport,
          destination: offer.destinationAirport,
          departDate: offer.departDate,
          returnDate: offer.returnDate,
          departTime: offer.departTime,
          stopsOut: offer.stopsOut,
          stopsBack: offer.stopsBack,
          durationMinutes: offer.durationMinutes,
          layoverMinutes: offer.layoverMinutes,
          airline: offer.airline,
          flightNumber: offer.flightNumber,
          priceMinor: offer.price.amountMinor,
          currency: offer.price.currency,
          priceBasis: offer.priceBasis,
          adults: offer.adults,
          cabin: offer.cabin,
          checkedBags: offer.baggage === 'unknown' ? null : offer.baggage.checkedBags,
          carryOn: offer.baggage === 'unknown' ? null : offer.baggage.carryOn ? 1 : 0,
          bookingUrl: offer.bookingUrl,
          note: obs.note,
          retrievedAt: offer.retrievedAt,
          observedAt: offer.observedAt,
          expiresAt: null,
          sourceWindowNote: null,
          rawJson: JSON.stringify({
            sourceId: offer.sourceId,
            sourceName: offer.sourceName,
            input: obs,
          }),
          dedupeKey: `${dedupeKey(offer)}|${obs.priceBasis}|${obs.hiddenCity}|${enteredAt.slice(0, 16)}`,
          createdAt: enteredAt,
        });
      } catch (err) {
        if (
          err instanceof Error &&
          /UNIQUE constraint failed: fare_observations\.dedupe_key/.test(err.message)
        ) {
          throw new DuplicateObservationError();
        }
        throw err;
      }
      return offer;
    },

    get(id: string): FareOffer | null {
      const row = getStmt.get(id) as ObservationRow | undefined;
      return row ? rowToOffer(row) : null;
    },

    /** Only manual entries can be deleted. Returns false if nothing matched. */
    deleteManual(id: string): boolean {
      return Number(deleteStmt.run(id).changes) > 0;
    },

    recent(limit = 50): FareOffer[] {
      return (recentStmt.all(limit) as unknown as ObservationRow[]).map(rowToOffer);
    },

    /**
     * Fares for a search: matching airports, trip type and cabin, departing in the date range.
     * Per-adult prices match any passenger count; totals only match the same number of adults.
     */
    findForSearch(filter: ObservationFilter): FareOffer[] {
      const marks = (n: number) => Array(n).fill('?').join(', ');
      const sql = `
        SELECT * FROM fare_observations
        WHERE origin_airport IN (${marks(filter.origins.length)})
          AND destination_airport IN (${marks(filter.destinations.length)})
          AND trip_type = ?
          AND depart_date BETWEEN ? AND ?
          AND cabin = ?
          AND (price_basis = 'per_adult' OR adults = ?)
        ORDER BY price_minor`;
      const rows = db
        .prepare(sql)
        .all(
          ...filter.origins,
          ...filter.destinations,
          filter.tripType,
          filter.departFrom,
          filter.departTo,
          filter.cabin,
          filter.adults,
        ) as unknown as ObservationRow[];
      return rows.map(rowToOffer);
    },
  };
}

export type ObservationsRepo = ReturnType<typeof createObservationsRepo>;

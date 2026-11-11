import { z } from 'zod';
import { IsoDateSchema, IataSchema, CabinSchema, TripTypeSchema } from '../schemas';
import { LINK_PROVIDERS } from '../links/index';
import type { ProviderId } from '../links/types';
import { toMinorUnits } from '../money';
import type { FareOffer } from './model';

export const MANUAL_PROVIDER_IDS = [
  'google_flights',
  'skyscanner',
  'momondo',
  'kayak',
  'going',
  'secret_flying',
  'hopper',
  'skiplagged',
  'other',
] as const satisfies readonly (ProviderId | 'other')[];

export type ManualProviderId = (typeof MANUAL_PROVIDER_IDS)[number];

/** Currencies the manual-entry form offers. Prices are never converted between them. */
export const MANUAL_CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'JPY'] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const stops = z.number().int().min(0).max(5).nullable().default(null);

/** A fare you saw on a provider's site and want to record. */
export const ManualObservationSchema = z
  .object({
    providerId: z.enum(MANUAL_PROVIDER_IDS),
    tripType: TripTypeSchema,
    originAirport: IataSchema,
    destinationAirport: IataSchema,
    departDate: IsoDateSchema,
    returnDate: IsoDateSchema.nullable(),
    /** Price in major units as shown on the site, e.g. 842.50. */
    price: z.number().positive().max(1_000_000),
    currency: z.enum(MANUAL_CURRENCIES),
    priceBasis: z.enum(['per_adult', 'total']),
    adults: z.number().int().min(1).max(9),
    cabin: CabinSchema,
    stopsOut: stops,
    stopsBack: stops,
    durationMinutes: z.number().int().min(30).max(10_080).nullable().default(null),
    airline: optionalText(60),
    baggage: z
      .union([
        z.literal('unknown'),
        z.object({ checkedBags: z.number().int().min(0).max(3), carryOn: z.boolean() }),
      ])
      .default('unknown'),
    hiddenCity: z.boolean().default(false),
    bookingUrl: z
      .string()
      .trim()
      .max(2000)
      .regex(/^https?:\/\//i, 'Must start with http:// or https://')
      .nullish()
      .transform((v) => v ?? null),
    note: optionalText(500),
  })
  .superRefine((value, ctx) => {
    if (value.tripType === 'round_trip') {
      if (!value.returnDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['returnDate'],
          message: 'A round trip needs a return date',
        });
      } else if (value.returnDate <= value.departDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['returnDate'],
          message: 'The return date must be after departure',
        });
      }
    } else {
      if (value.returnDate !== null) {
        ctx.addIssue({
          code: 'custom',
          path: ['returnDate'],
          message: 'A one-way fare has no return date',
        });
      }
      if (value.stopsBack !== null) {
        ctx.addIssue({
          code: 'custom',
          path: ['stopsBack'],
          message: 'A one-way fare has no return flight',
        });
      }
    }
    if (value.originAirport === value.destinationAirport) {
      ctx.addIssue({
        code: 'custom',
        path: ['destinationAirport'],
        message: 'Origin and destination are the same',
      });
    }
  });

export type ManualObservationInput = z.input<typeof ManualObservationSchema>;
export type ManualObservation = z.output<typeof ManualObservationSchema>;

/** Display name for where a manual price was seen. */
export function manualProviderName(providerId: ManualProviderId): string {
  if (providerId === 'other') return 'another site';
  return LINK_PROVIDERS.find((p) => p.id === providerId)?.name ?? providerId;
}

/** Converts a saved manual entry into the shared fare model. */
export function manualObservationToOffer(
  obs: ManualObservation,
  meta: { id: string; enteredAt: string },
): FareOffer {
  return {
    id: meta.id,
    sourceId: `manual:${obs.providerId}`,
    sourceName: `Seen on ${manualProviderName(obs.providerId)} (entered by you)`,
    status: 'manual',
    itineraryKind: obs.hiddenCity ? 'hidden_city' : 'standard',
    tripType: obs.tripType,
    originAirport: obs.originAirport,
    destinationAirport: obs.destinationAirport,
    departDate: obs.departDate,
    returnDate: obs.returnDate,
    departTime: null,
    stopsOut: obs.stopsOut,
    stopsBack: obs.tripType === 'round_trip' ? obs.stopsBack : null,
    durationMinutes: obs.durationMinutes,
    layoverMinutes: null,
    airline: obs.airline,
    flightNumber: null,
    price: { amountMinor: toMinorUnits(obs.price, obs.currency), currency: obs.currency },
    priceBasis: obs.priceBasis,
    adults: obs.adults,
    cabin: obs.cabin,
    baggage: obs.baggage,
    retrievedAt: meta.enteredAt,
    observedAt: meta.enteredAt,
    expiresAt: null,
    sourceWindowNote: null,
    bookingUrl: obs.bookingUrl,
    notes: obs.note ? [obs.note] : [],
  };
}

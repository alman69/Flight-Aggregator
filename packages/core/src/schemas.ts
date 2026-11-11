import { z } from 'zod';
import { isIsoDate } from './dates/epochDay';

export const IsoDateSchema = z
  .string()
  .refine(isIsoDate, { message: 'Expected a real calendar date in YYYY-MM-DD format' });

/** A 3-letter IATA airport or metropolitan-area code, e.g. BUF or TYO. */
export const IataSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Choose an airport from the list or type its 3-letter code');

export const DateRangeSchema = z.object({ start: IsoDateSchema, end: IsoDateSchema });

export const DatesSchema = z.discriminatedUnion('mode', [
  /** Specific dates. */
  z.object({
    mode: z.literal('fixed'),
    departDate: IsoDateSchema,
    returnDate: IsoDateSchema.optional(),
  }),
  /** Mode A: one window, from earliest departure to latest return. */
  z.object({ mode: z.literal('window'), start: IsoDateSchema, end: IsoDateSchema }),
  /** Mode B: separate departure and return windows. */
  z.object({ mode: z.literal('split'), depart: DateRangeSchema, return: DateRangeSchema }),
]);

const Nights = z.number().int().min(1).max(60);

export const DurationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('any') }),
  z.object({
    kind: z.literal('range'),
    minNights: Nights.optional(),
    maxNights: Nights.optional(),
  }),
  z.object({ kind: z.literal('exact'), nights: Nights }),
]);

export const TripTypeSchema = z.enum(['round_trip', 'one_way']);
export const CabinSchema = z.enum(['economy', 'premium_economy', 'business', 'first']);

export const SearchQuerySchema = z.object({
  tripType: TripTypeSchema,
  origin: IataSchema,
  destination: IataSchema,
  dates: DatesSchema,
  duration: DurationSchema.default({ kind: 'any' }),
  adults: z.number().int().min(1).max(9).default(1),
  cabin: CabinSchema.default('economy'),
});

export type DateRange = z.infer<typeof DateRangeSchema>;
export type SearchDates = z.infer<typeof DatesSchema>;
export type Duration = z.infer<typeof DurationSchema>;
export type TripType = z.infer<typeof TripTypeSchema>;
export type Cabin = z.infer<typeof CabinSchema>;
/** A validated, normalized search (defaults applied). */
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
/** What a caller may send before defaults are applied. */
export type SearchQueryInput = z.input<typeof SearchQuerySchema>;

export const CABIN_LABELS: Record<Cabin, string> = {
  economy: 'Economy',
  premium_economy: 'Premium economy',
  business: 'Business',
  first: 'First',
};

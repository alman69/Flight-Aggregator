import type { FareOffer } from './model';

/** Two offers with the same key describe the same fare from the same source. */
export function dedupeKey(offer: FareOffer): string {
  return [
    offer.sourceId,
    offer.originAirport,
    offer.destinationAirport,
    offer.departDate,
    offer.returnDate ?? '',
    offer.airline ?? '',
    offer.flightNumber ?? '',
    offer.departTime ?? '',
    offer.price.amountMinor,
    offer.price.currency,
    offer.cabin,
    offer.adults,
  ].join('|');
}

/** Removes duplicates, keeping the first occurrence. */
export function dedupeOffers(offers: readonly FareOffer[]): FareOffer[] {
  const seen = new Set<string>();
  return offers.filter((offer) => {
    const key = dedupeKey(offer);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

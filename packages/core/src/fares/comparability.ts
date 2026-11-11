import type { FareOffer } from './model';

/**
 * Reasons two fares should not be compared as equivalent. Empty means they are comparable
 * on everything we know about.
 */
export function comparabilityIssues(a: FareOffer, b: FareOffer): string[] {
  const issues: string[] = [];
  if (a.originAirport !== b.originAirport || a.destinationAirport !== b.destinationAirport) {
    issues.push('Different airports');
  }
  if (a.price.currency !== b.price.currency) issues.push('Different currencies');
  if (a.adults !== b.adults || a.priceBasis !== b.priceBasis) {
    issues.push('Priced for different passengers');
  }
  if (a.cabin !== b.cabin) issues.push('Different or unknown cabin');
  if (a.baggage === 'unknown' || b.baggage === 'unknown') {
    issues.push('Baggage allowance unknown');
  } else if (
    a.baggage.checkedBags !== b.baggage.checkedBags ||
    a.baggage.carryOn !== b.baggage.carryOn
  ) {
    issues.push('Different baggage allowance');
  }
  if (a.itineraryKind !== b.itineraryKind) issues.push('Hidden-city and regular itineraries');
  return issues;
}

/** Combined reasons the offers in a group are not directly comparable to the first one. */
export function groupComparabilityIssues(offers: readonly FareOffer[]): string[] {
  const [first, ...rest] = offers;
  if (!first) return [];
  const issues = new Set<string>();
  for (const offer of rest) {
    for (const issue of comparabilityIssues(first, offer)) issues.add(issue);
  }
  return [...issues];
}

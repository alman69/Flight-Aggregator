export type PriceTier = 'low' | 'mid' | 'high';

/**
 * Splits observed prices into thirds for colouring. Only real observed prices are passed in, so
 * empty cells never influence the scale. With fewer than three prices there is no scale.
 */
export function makePriceTier(prices: readonly number[]): (price: number) => PriceTier | null {
  if (prices.length < 3) return () => null;
  const sorted = [...prices].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.floor((sorted.length - 1) * q)]!;
  const lowMax = at(1 / 3);
  const midMax = at(2 / 3);
  return (price) => (price <= lowMax ? 'low' : price <= midMax ? 'mid' : 'high');
}

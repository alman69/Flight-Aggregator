import type { Money } from './fares/model';

/** Number of minor-unit digits for a currency (2 for USD, 0 for JPY). */
export function currencyMinorDigits(currency: string): number {
  return (
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

export function toMinorUnits(amountMajor: number, currency: string): number {
  return Math.round(amountMajor * 10 ** currencyMinorDigits(currency));
}

export function fromMinorUnits(amountMinor: number, currency: string): number {
  return amountMinor / 10 ** currencyMinorDigits(currency);
}

/** "$1,234" for whole amounts, "$1,234.50" otherwise. */
export function formatMoney(money: Money, locale = 'en-US'): string {
  const major = fromMinorUnits(money.amountMinor, money.currency);
  const whole = Number.isInteger(major);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: whole ? 0 : undefined,
    maximumFractionDigits: whole ? 0 : undefined,
  }).format(major);
}

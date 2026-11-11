/**
 * Common IATA metropolitan-area codes that cover several airports.
 * A small hand-maintained list for Milestone 1; Milestone 2 adds full airport data.
 */
export const CITY_CODES: Record<string, string> = {
  TYO: 'Tokyo (all airports)',
  OSA: 'Osaka (all airports)',
  SEL: 'Seoul (all airports)',
  BJS: 'Beijing (all airports)',
  SHA: 'Shanghai (all airports)',
  NYC: 'New York (all airports)',
  WAS: 'Washington (all airports)',
  CHI: 'Chicago (all airports)',
  YTO: 'Toronto (all airports)',
  YMQ: 'Montreal (all airports)',
  LON: 'London (all airports)',
  PAR: 'Paris (all airports)',
  MIL: 'Milan (all airports)',
  ROM: 'Rome (all airports)',
  STO: 'Stockholm (all airports)',
  MOW: 'Moscow (all airports)',
  SAO: 'São Paulo (all airports)',
  RIO: 'Rio de Janeiro (all airports)',
  BUE: 'Buenos Aires (all airports)',
};

export function isCityCode(code: string): boolean {
  return code.toUpperCase() in CITY_CODES;
}

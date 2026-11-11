import { METRO_AREAS, isMetroCode } from '../airports/metros';

/** Metro codes and a short label, e.g. TYO → "Tokyo (all airports)". */
export const CITY_CODES: Record<string, string> = Object.fromEntries(
  Object.values(METRO_AREAS).map((m) => [m.code, `${m.name} (all airports)`]),
);

export const isCityCode = isMetroCode;

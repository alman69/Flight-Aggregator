/**
 * IATA metropolitan-area codes that stand for several airports. Searching TYO covers NRT and HND.
 * Hand-maintained: only well-established codes whose member airports are unambiguous.
 * (SHA is deliberately absent: it is also Shanghai Hongqiao's own airport code.)
 */
export interface MetroArea {
  code: string;
  name: string;
  country: string;
  airports: readonly string[];
}

const list: MetroArea[] = [
  { code: 'TYO', name: 'Tokyo', country: 'JP', airports: ['NRT', 'HND'] },
  { code: 'OSA', name: 'Osaka', country: 'JP', airports: ['KIX', 'ITM', 'UKB'] },
  { code: 'SEL', name: 'Seoul', country: 'KR', airports: ['ICN', 'GMP'] },
  { code: 'BJS', name: 'Beijing', country: 'CN', airports: ['PEK', 'PKX'] },
  { code: 'NYC', name: 'New York', country: 'US', airports: ['JFK', 'LGA', 'EWR'] },
  { code: 'WAS', name: 'Washington', country: 'US', airports: ['IAD', 'DCA', 'BWI'] },
  { code: 'CHI', name: 'Chicago', country: 'US', airports: ['ORD', 'MDW'] },
  { code: 'YTO', name: 'Toronto', country: 'CA', airports: ['YYZ', 'YTZ'] },
  { code: 'YMQ', name: 'Montreal', country: 'CA', airports: ['YUL'] },
  {
    code: 'LON',
    name: 'London',
    country: 'GB',
    airports: ['LHR', 'LGW', 'STN', 'LTN', 'LCY', 'SEN'],
  },
  { code: 'PAR', name: 'Paris', country: 'FR', airports: ['CDG', 'ORY', 'BVA'] },
  { code: 'MIL', name: 'Milan', country: 'IT', airports: ['MXP', 'LIN', 'BGY'] },
  { code: 'ROM', name: 'Rome', country: 'IT', airports: ['FCO', 'CIA'] },
  { code: 'STO', name: 'Stockholm', country: 'SE', airports: ['ARN', 'BMA', 'NYO'] },
  { code: 'MOW', name: 'Moscow', country: 'RU', airports: ['SVO', 'DME', 'VKO'] },
  { code: 'SAO', name: 'São Paulo', country: 'BR', airports: ['GRU', 'CGH', 'VCP'] },
  { code: 'RIO', name: 'Rio de Janeiro', country: 'BR', airports: ['GIG', 'SDU'] },
  { code: 'BUE', name: 'Buenos Aires', country: 'AR', airports: ['EZE', 'AEP'] },
];

export const METRO_AREAS: Readonly<Record<string, MetroArea>> = Object.fromEntries(
  list.map((m) => [m.code, m]),
);

export function isMetroCode(code: string): boolean {
  return code.toUpperCase() in METRO_AREAS;
}

/** The code itself plus, for a metro code, every airport it covers. */
export function expandAirportCode(code: string): string[] {
  const upper = code.toUpperCase();
  const metro = METRO_AREAS[upper];
  return metro ? [upper, ...metro.airports] : [upper];
}

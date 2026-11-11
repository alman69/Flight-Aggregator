import { type SearchQuery, SearchQuerySchema } from '@flight/core';
import { useCallback, useEffect, useState } from 'react';

/**
 * The whole search lives in the URL, so a search can be bookmarked, reloaded or shared with
 * yourself. Readable keys: ?trip=rt&from=BUF&to=TYO&mode=window&start=…&end=…&dur=range&min=3&max=5
 */
export interface UrlState {
  query: SearchQuery | null;
  /** `?demo=1` shows generated sample prices under a permanent banner. */
  demo: boolean;
}

export function queryToParams(query: SearchQuery, demo = false): URLSearchParams {
  const p = new URLSearchParams();
  p.set('trip', query.tripType === 'round_trip' ? 'rt' : 'ow');
  p.set('from', query.origin);
  p.set('to', query.destination);
  const { dates, duration } = query;
  p.set('mode', dates.mode);
  if (dates.mode === 'fixed') {
    p.set('dep', dates.departDate);
    if (dates.returnDate) p.set('ret', dates.returnDate);
  } else if (dates.mode === 'window') {
    p.set('start', dates.start);
    p.set('end', dates.end);
  } else {
    p.set('ds', dates.depart.start);
    p.set('de', dates.depart.end);
    p.set('rs', dates.return.start);
    p.set('re', dates.return.end);
  }
  p.set('dur', duration.kind);
  if (duration.kind === 'range') {
    if (duration.minNights !== undefined) p.set('min', String(duration.minNights));
    if (duration.maxNights !== undefined) p.set('max', String(duration.maxNights));
  } else if (duration.kind === 'exact') {
    p.set('n', String(duration.nights));
  }
  p.set('adults', String(query.adults));
  p.set('cabin', query.cabin);
  if (demo) p.set('demo', '1');
  return p;
}

const num = (value: string | null) => (value === null || value === '' ? undefined : Number(value));

/** Reads a search from URL parameters. Anything invalid yields `query: null` rather than a guess. */
export function paramsToState(p: URLSearchParams): UrlState {
  const demo = p.get('demo') === '1';
  const mode = p.get('mode');
  const dates =
    mode === 'fixed'
      ? { mode, departDate: p.get('dep'), returnDate: p.get('ret') ?? undefined }
      : mode === 'window'
        ? { mode, start: p.get('start'), end: p.get('end') }
        : mode === 'split'
          ? {
              mode,
              depart: { start: p.get('ds'), end: p.get('de') },
              return: { start: p.get('rs'), end: p.get('re') },
            }
          : undefined;
  const dur = p.get('dur') ?? 'any';
  const duration =
    dur === 'range'
      ? { kind: dur, minNights: num(p.get('min')), maxNights: num(p.get('max')) }
      : dur === 'exact'
        ? { kind: dur, nights: num(p.get('n')) }
        : { kind: dur };
  const parsed = SearchQuerySchema.safeParse({
    tripType: p.get('trip') === 'ow' ? 'one_way' : 'round_trip',
    origin: p.get('from'),
    destination: p.get('to'),
    dates,
    duration,
    adults: num(p.get('adults')),
    cabin: p.get('cabin') ?? undefined,
  });
  return { query: parsed.success ? parsed.data : null, demo };
}

function readLocation(): UrlState {
  return paramsToState(new URLSearchParams(window.location.search));
}

/** URL-backed search state with browser back/forward support. */
export function useUrlState(): [UrlState, (next: UrlState) => void] {
  const [state, setState] = useState<UrlState>(readLocation);

  useEffect(() => {
    const onPop = () => setState(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const update = useCallback((next: UrlState) => {
    const params = next.query
      ? queryToParams(next.query, next.demo)
      : new URLSearchParams(next.demo ? { demo: '1' } : {});
    const search = params.toString();
    window.history.pushState(null, '', search ? `?${search}` : window.location.pathname);
    setState(next);
  }, []);

  return [state, update];
}

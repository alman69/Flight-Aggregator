import { describe, expect, it } from 'vitest';
import { buildCells, coverageHeadline, summarizeCoverage } from './coverage';
import { combo, offer } from './test/fixtures';

const combos = [
  combo('2027-01-01', '2027-01-03'),
  combo('2027-01-01', '2027-01-04'),
  combo('2027-01-02', '2027-01-04'),
  combo('2027-01-02', '2027-01-05'),
];

describe('buildCells', () => {
  it('attaches offers to their exact date pair and picks the lowest', () => {
    const cells = buildCells(
      combos,
      [
        offer({
          departDate: '2027-01-01',
          returnDate: '2027-01-03',
          price: { amountMinor: 90000, currency: 'USD' },
        }),
        offer({
          departDate: '2027-01-01',
          returnDate: '2027-01-03',
          price: { amountMinor: 70000, currency: 'USD' },
        }),
      ],
      { currency: 'USD' },
    );
    expect(cells[0]!.status).toBe('observed');
    expect(cells[0]!.offers).toHaveLength(2);
    expect(cells[0]!.lowest!.price.amountMinor).toBe(70000);
  });

  it('never moves a price to a neighbouring date and ignores dates outside the search', () => {
    const cells = buildCells(
      combos,
      [offer({ departDate: '2027-01-01', returnDate: '2027-01-09' })],
      { currency: 'USD' },
    );
    expect(cells.every((c) => c.status === 'not_queried' && c.offers.length === 0)).toBe(true);
  });

  it('marks cells without prices as not_queried by default, never as $0', () => {
    const cells = buildCells(combos, [], { currency: 'USD' });
    expect(cells.map((c) => c.status)).toEqual(Array(4).fill('not_queried'));
    expect(cells.every((c) => c.lowest === null)).toBe(true);
  });

  it('applies per-cell overrides for failures and empty answers', () => {
    const cells = buildCells(combos, [], {
      currency: 'USD',
      defaultStatus: 'no_observation',
      overrides: new Map([
        [combos[1]!.key, { status: 'query_failed', failureReason: 'Rate limited' }],
      ]),
    });
    expect(cells.map((c) => c.status)).toEqual([
      'no_observation',
      'query_failed',
      'no_observation',
      'no_observation',
    ]);
    expect(cells[1]!.failureReason).toBe('Rate limited');
  });

  it('keeps offers in other currencies but never picks them as the lowest', () => {
    const cells = buildCells(
      combos,
      [
        offer({
          departDate: '2027-01-01',
          returnDate: '2027-01-03',
          price: { amountMinor: 100, currency: 'CAD' },
        }),
      ],
      { currency: 'USD' },
    );
    expect(cells[0]!.status).toBe('observed');
    expect(cells[0]!.lowest).toBeNull();
  });

  it('works for one-way combinations', () => {
    const cells = buildCells(
      [combo('2027-01-01'), combo('2027-01-02')],
      [offer({ tripType: 'one_way', departDate: '2027-01-02', returnDate: null })],
      { currency: 'USD' },
    );
    expect(cells.map((c) => c.status)).toEqual(['not_queried', 'observed']);
  });
});

describe('summarizeCoverage', () => {
  it('counts each state and each source', () => {
    const cells = buildCells(
      combos,
      [
        offer({ departDate: '2027-01-01', returnDate: '2027-01-03', status: 'cached' }),
        offer({ departDate: '2027-01-01', returnDate: '2027-01-03', status: 'manual' }),
        offer({ departDate: '2027-01-01', returnDate: '2027-01-04', status: 'manual' }),
      ],
      {
        currency: 'USD',
        defaultStatus: 'no_observation',
        overrides: new Map([[combos[3]!.key, { status: 'query_failed' as const }]]),
      },
    );
    const summary = summarizeCoverage(cells);
    expect(summary).toMatchObject({
      total: 4,
      observed: 2,
      noObservation: 1,
      failed: 1,
      notQueried: 0,
      loading: 0,
    });
    expect(summary.observedByStatus).toEqual({ live: 0, cached: 1, manual: 2, demo: 0 });
    expect(coverageHeadline(summary)).toBe('2 of 4 date combinations have observed fares');
  });

  it('reads naturally with no data', () => {
    const summary = summarizeCoverage(buildCells(combos, [], { currency: 'USD' }));
    expect(coverageHeadline(summary)).toBe('0 of 4 date combinations have observed fares');
  });
});

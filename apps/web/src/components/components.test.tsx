import {
  type FareOffer,
  type PlannedCombo,
  SearchQuerySchema,
  applyFilters,
  buildCells,
  buildProviderLinks,
  generateCombos,
} from '@flight/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithQuery, stubApi } from '../test/render';
import { ComboDrawer } from './ComboDrawer';
import { PriceMatrix } from './PriceMatrix';
import { RankedList } from './RankedList';
import { SearchForm } from './SearchForm';

const query = SearchQuerySchema.parse({
  tripType: 'round_trip',
  origin: 'BUF',
  destination: 'TYO',
  dates: { mode: 'window', start: '2027-01-01', end: '2027-01-04' },
});
const combos: PlannedCombo[] = generateCombos(query).map((c) => ({
  ...c,
  links: buildProviderLinks({ ...query, departDate: c.departDate, returnDate: c.returnDate }),
}));
const departDates = [...new Set(combos.map((c) => c.departDate))];
const returnDates = [...new Set(combos.map((c) => c.returnDate!))].sort();

function offer(key: string, dollars: number): FareOffer {
  const [departDate, returnDate] = key.split('_') as [string, string];
  return {
    id: key,
    sourceId: 'test',
    sourceName: 'Test',
    status: 'cached',
    itineraryKind: 'standard',
    tripType: 'round_trip',
    originAirport: 'BUF',
    destinationAirport: 'NRT',
    departDate,
    returnDate,
    departTime: null,
    stopsOut: null,
    stopsBack: null,
    durationMinutes: null,
    layoverMinutes: null,
    airline: null,
    flightNumber: null,
    price: { amountMinor: dollars * 100, currency: 'USD' },
    priceBasis: 'per_adult',
    adults: 1,
    cabin: 'economy',
    baggage: 'unknown',
    retrievedAt: new Date().toISOString(),
    observedAt: null,
    expiresAt: null,
    sourceWindowNote: null,
    bookingUrl: null,
    notes: [],
  };
}

const noData = applyFilters(buildCells(combos, [], { currency: 'USD' }), {}, 'USD').cells;
const someData = applyFilters(
  buildCells(combos, [offer('2027-01-01_2027-01-03', 700), offer('2027-01-02_2027-01-04', 650)], {
    currency: 'USD',
    defaultStatus: 'no_observation',
  }),
  {},
  'USD',
).cells;

describe('PriceMatrix', () => {
  it('renders one button per combination and never shows a price when there is no data', () => {
    render(
      <PriceMatrix
        cells={noData}
        departDates={departDates}
        returnDates={returnDates}
        lowestKey={null}
        selectedKey={null}
        onSelect={() => {}}
      />,
    );
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('button')).toHaveLength(6); // C(4,2)
    expect(table.textContent).not.toMatch(/\$/);
    expect(within(table).getAllByRole('button')[0]).toHaveAccessibleName(/not searched for prices/);
  });

  it('marks the lowest observed fare and leaves empty cells as dashes', () => {
    render(
      <PriceMatrix
        cells={someData}
        departDates={departDates}
        returnDates={returnDates}
        lowestKey="2027-01-02_2027-01-04"
        selectedKey={null}
        onSelect={() => {}}
      />,
    );
    const lowest = screen.getByRole('button', { name: /lowest observed fare \$650/ });
    expect(lowest).toHaveTextContent('Lowest observed');
    const empty = screen.getAllByRole('button', {
      name: /no fare observed\. This does not mean no flights exist/,
    });
    expect(empty).toHaveLength(4);
    for (const cell of empty) expect(cell).toHaveTextContent('—');
    expect(screen.getByRole('table').textContent).not.toMatch(/\$0\b/);
  });

  it('opens a cell on click and moves focus with the arrow keys', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <PriceMatrix
        cells={noData}
        departDates={departDates}
        returnDates={returnDates}
        lowestKey={null}
        selectedKey={null}
        onSelect={onSelect}
      />,
    );
    const first = screen.getAllByRole('button')[0]!;
    await user.click(first);
    expect(onSelect).toHaveBeenCalledWith('2027-01-01_2027-01-02');
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toHaveAccessibleName(/Jan 3/);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toHaveAccessibleName(/Sat, Jan 2 to Sun, Jan 3/);
  });
});

describe('RankedList', () => {
  it('ranks only combinations with prices and lists the rest separately', () => {
    render(
      <RankedList
        cells={someData}
        sortKey="price"
        onSortChange={() => {}}
        lowestKey="2027-01-02_2027-01-04"
        onSelect={() => {}}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('$650');
    expect(items[1]).toHaveTextContent('$700');
    expect(screen.getByText(/4 date combinations\s+without price data/)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Fastest \(no data\)/ })).toBeDisabled();
  });
});

describe('ComboDrawer', () => {
  it('lists all eight providers and gates Skiplagged behind the hidden-city warning', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithQuery(
      <ComboDrawer
        cell={noData[0]!}
        query={query}
        lowestKey={null}
        demo={false}
        onClose={() => {}}
      />,
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(7);
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('google.com/travel/flights'));
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
    await user.click(screen.getByRole('button', { name: /Skiplagged/ }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent(/Checked bags/);
    expect(open).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: /I understand/ }));
    expect(open).toHaveBeenCalledWith(
      'https://skiplagged.com/flights/BUF/TYO/2027-01-01/2027-01-02',
      '_blank',
      'noopener,noreferrer',
    );
    open.mockRestore();
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('SearchForm', () => {
  it('previews the number of combinations before searching', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    stubApi({});
    renderWithQuery(<SearchForm initialQuery={null} onSearch={onSearch} />);
    await user.type(screen.getByLabelText('To'), 'tyo');
    await user.clear(screen.getByLabelText('Earliest departure'));
    await user.type(screen.getByLabelText('Earliest departure'), '2027-11-01');
    await user.clear(screen.getByLabelText('Latest return'));
    await user.type(screen.getByLabelText('Latest return'), '2027-11-10');
    expect(screen.getByText('45 date combinations')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Min / max' }));
    await user.type(screen.getByLabelText('Minimum nights'), '3');
    await user.type(screen.getByLabelText('Maximum nights'), '5');
    expect(screen.getByText('18 date combinations')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: 'TYO',
        duration: { kind: 'range', minNights: 3, maxNights: 5 },
      }),
    );
  });

  it('does not search when the destination is missing', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    stubApi({});
    renderWithQuery(<SearchForm initialQuery={null} onSearch={onSearch} />);
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByText(/Choose an airport from the list/)).toBeInTheDocument();
  });
});

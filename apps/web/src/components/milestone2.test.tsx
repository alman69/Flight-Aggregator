import {
  type FareOffer,
  type PlannedCombo,
  type SearchResponse,
  SearchQuerySchema,
  buildCells,
  buildProviderLinks,
  generateCombos,
  planSearch,
} from '@flight/core';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithQuery, stubApi } from '../test/render';
import { AirportInput } from './AirportInput';
import { ComboDrawer } from './ComboDrawer';
import { ManualPriceForm } from './ManualPriceForm';
import { Results } from './Results';

afterEach(() => vi.unstubAllGlobals());

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

function manualOffer(patch: Partial<FareOffer> = {}): FareOffer {
  return {
    id: 'obs-1',
    sourceId: 'manual:kayak',
    sourceName: 'Seen on KAYAK (entered by you)',
    status: 'manual',
    itineraryKind: 'standard',
    tripType: 'round_trip',
    originAirport: 'BUF',
    destinationAirport: 'NRT',
    departDate: '2027-01-01',
    returnDate: '2027-01-02',
    departTime: null,
    stopsOut: 1,
    stopsBack: null,
    durationMinutes: null,
    layoverMinutes: null,
    airline: null,
    flightNumber: null,
    price: { amountMinor: 84250, currency: 'USD' },
    priceBasis: 'per_adult',
    adults: 1,
    cabin: 'economy',
    baggage: 'unknown',
    retrievedAt: new Date().toISOString(),
    observedAt: new Date().toISOString(),
    expiresAt: null,
    sourceWindowNote: null,
    bookingUrl: null,
    notes: [],
    ...patch,
  };
}

const suggestions = {
  results: [
    {
      code: 'ROC',
      kind: 'airport',
      name: 'Frederick Douglass Greater Rochester International Airport',
      city: 'Rochester',
      countryCode: 'US',
      country: 'United States',
      airports: [],
    },
    {
      code: 'RST',
      kind: 'airport',
      name: 'Rochester International Airport',
      city: 'Rochester',
      countryCode: 'US',
      country: 'United States',
      airports: [],
    },
  ],
};

function ControlledAirport({ onChange }: { onChange: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <AirportInput
      id="origin"
      label="From"
      value={value}
      placeholder="BUF"
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      onBlur={() => {}}
    />
  );
}

describe('AirportInput', () => {
  it('suggests airports by city name and fills in the code on Enter', async () => {
    const api = stubApi({
      'GET /api/airports?q=': () => suggestions,
      'GET /api/airports/ROC': () => suggestions.results[0],
    });
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithQuery(<ControlledAirport onChange={onChange} />);

    await user.type(screen.getByRole('combobox', { name: 'From' }), 'roch');
    const options = await screen.findAllByRole('option');
    expect(options[0]).toHaveTextContent('ROC');
    expect(options[1]).toHaveTextContent('RST');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('ROC');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(await screen.findByText(/Rochester, United States/)).toBeInTheDocument();
    expect(api.calls.some((c) => c.url.startsWith('/api/airports?q=roch'))).toBe(true);
  });

  it('lets the arrow keys pick another suggestion', async () => {
    stubApi({ 'GET /api/airports?q=': () => suggestions });
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithQuery(<ControlledAirport onChange={onChange} />);
    await user.type(screen.getByRole('combobox', { name: 'From' }), 'roch');
    await screen.findAllByRole('option');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('RST');
  });

  it('says when a typed code is not a known airport', async () => {
    stubApi({});
    const user = userEvent.setup();
    renderWithQuery(<ControlledAirport onChange={() => {}} />);
    await user.type(screen.getByRole('combobox', { name: 'From' }), 'ZZZ');
    expect(await screen.findByText(/Not in the airport list/)).toBeInTheDocument();
  });
});

describe('ManualPriceForm', () => {
  it('saves a price for the exact dates of the combination', async () => {
    const api = stubApi({
      'POST /api/observations': (_u, init) => ({
        status: 201,
        body: { ...manualOffer(), ...JSON.parse(String(init!.body)) },
      }),
    });
    const onDone = vi.fn();
    const user = userEvent.setup();
    renderWithQuery(<ManualPriceForm combo={combos[0]!} query={query} onDone={onDone} />);

    await user.selectOptions(screen.getByLabelText('Where did you see it?'), 'kayak');
    // Choosing a provider pre-fills the link with that provider's search for these dates.
    expect(screen.getByLabelText('Link to the listing')).toHaveValue(
      'https://www.kayak.com/flights/BUF-TYO/2027-01-01/2027-01-02?sort=price_a',
    );
    await user.type(screen.getByLabelText('Price'), '842.50');
    await user.clear(screen.getByLabelText('To airport'));
    await user.type(screen.getByLabelText('To airport'), 'nrt');
    await user.selectOptions(screen.getByLabelText('Stops, outbound'), '1');
    await user.click(screen.getByRole('button', { name: 'Save price' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const post = api.calls.find((c) => c.method === 'POST')!;
    expect(post.body).toMatchObject({
      providerId: 'kayak',
      tripType: 'round_trip',
      originAirport: 'BUF',
      destinationAirport: 'NRT',
      departDate: '2027-01-01',
      returnDate: '2027-01-02',
      price: 842.5,
      currency: 'USD',
      priceBasis: 'per_adult',
      adults: 1,
      cabin: 'economy',
      stopsOut: 1,
      stopsBack: null,
      durationMinutes: null,
      baggage: 'unknown',
      hiddenCity: false,
    });
  });

  it('explains what is missing and sends nothing', async () => {
    const api = stubApi({});
    const user = userEvent.setup();
    renderWithQuery(<ManualPriceForm combo={combos[0]!} query={query} onDone={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Save price' }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Choose where you saw this price.');
    expect(alert).toHaveTextContent('Enter the price as a number greater than 0.');
    expect(api.calls).toEqual([]);
  });

  it('shows the server message when a save is rejected', async () => {
    stubApi({
      'POST /api/observations': () => ({
        status: 409,
        body: { error: 'duplicate', message: 'This price was already saved.' },
      }),
    });
    const user = userEvent.setup();
    renderWithQuery(<ManualPriceForm combo={combos[0]!} query={query} onDone={() => {}} />);
    await user.selectOptions(screen.getByLabelText('Where did you see it?'), 'google_flights');
    await user.type(screen.getByLabelText('Price'), '900');
    await user.click(screen.getByRole('button', { name: 'Save price' }));
    expect(await screen.findByText('This price was already saved.')).toBeInTheDocument();
  });
});

describe('ComboDrawer with saved prices', () => {
  it('removes a manual price after confirmation', async () => {
    const api = stubApi({ 'DELETE /api/observations/': () => ({ status: 204, body: null }) });
    const user = userEvent.setup();
    const [cell] = buildCells(combos, [manualOffer()], { currency: 'USD' });
    renderWithQuery(
      <ComboDrawer
        cell={cell!}
        query={query}
        lowestKey={cell!.combo.key}
        demo={false}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Lowest observed fare')).toBeInTheDocument();
    expect(screen.getByText(/Entered by you/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(api.calls).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Confirm remove' }));
    await waitFor(() =>
      expect(api.calls).toEqual([
        { method: 'DELETE', url: '/api/observations/obs-1', body: undefined },
      ]),
    );
  });

  it('labels hidden-city fares and never marks them as the lowest', () => {
    stubApi({});
    const hidden = manualOffer({
      id: 'h',
      itineraryKind: 'hidden_city',
      price: { amountMinor: 30000, currency: 'USD' },
    });
    const [cell] = buildCells(combos, [hidden, manualOffer()], { currency: 'USD' });
    renderWithQuery(
      <ComboDrawer
        cell={cell!}
        query={query}
        lowestKey={cell!.combo.key}
        demo={false}
        onClose={() => {}}
      />,
    );
    const cards = screen.getAllByRole('article');
    expect(within(cards[0]!).getByText('Hidden city')).toBeInTheDocument();
    expect(within(cards[0]!).queryByText('Lowest observed fare')).not.toBeInTheDocument();
    expect(within(cards[1]!).getByText('Lowest observed fare')).toBeInTheDocument();
  });

  it('does not offer manual entry in demo mode', () => {
    stubApi({});
    const [cell] = buildCells(combos, [], { currency: 'USD' });
    renderWithQuery(
      <ComboDrawer cell={cell!} query={query} lowestKey={null} demo onClose={() => {}} />,
    );
    expect(screen.queryByRole('button', { name: /Add a price I saw/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Exit demo mode to record prices/)).toBeInTheDocument();
  });
});

describe('Results', () => {
  it('shows saved prices in the matrix and counts them in the coverage', async () => {
    const plan = planSearch(query, '2026-11-11');
    const response: SearchResponse = {
      ...plan,
      combos,
      query,
      today: '2026-11-11',
      generatedAt: new Date().toISOString(),
      offers: [manualOffer()],
      sources: [
        {
          id: 'manual',
          name: 'Prices you enter',
          kind: 'manual',
          status: 'available',
          description: '',
          offerCount: 1,
        },
        {
          id: 'travelpayouts',
          name: 'Travelpayouts',
          kind: 'cached',
          status: 'not_configured',
          description: '',
          offerCount: 0,
        },
      ],
    };
    stubApi({
      'POST /api/search': () => response,
      'GET /api/providers': () => ({ providers: [], priceSources: [] }),
    });
    renderWithQuery(<Results query={query} demo={false} />);
    expect(await screen.findByTestId('coverage-headline')).toHaveTextContent(
      '1 of 6 date combinations have observed fares',
    );
    expect(screen.getByText('1 manual')).toBeInTheDocument();
    const cell = screen.getByRole('button', {
      name: /Jan 1 to .*Jan 2.*lowest observed fare \$842\.50 \(manual\)/,
    });
    expect(cell).toHaveTextContent('Lowest observed');
    expect(screen.getByText('Lowest observed fare', { selector: 'span' })).toBeInTheDocument();
  });
});

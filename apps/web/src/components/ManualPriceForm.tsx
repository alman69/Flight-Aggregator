import {
  MANUAL_CURRENCIES,
  MANUAL_PROVIDER_IDS,
  type ManualObservationInput,
  type ManualProviderId,
  ManualObservationSchema,
  type PlannedCombo,
  type SearchQuery,
  isMetroCode,
  manualProviderName,
} from '@flight/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { createObservation } from '../api/client';
import { formatDate, nightsLabel } from '../lib/format';
import { inputBase, inputClass } from './Field';

type StopsValue = '' | '0' | '1' | '2' | '3';
type BagsValue = 'unknown' | 'personal' | 'carry_on' | 'checked_1' | 'checked_2';

const BAGGAGE: Record<BagsValue, ManualObservationInput['baggage']> = {
  unknown: 'unknown',
  personal: { checkedBags: 0, carryOn: false },
  carry_on: { checkedBags: 0, carryOn: true },
  checked_1: { checkedBags: 1, carryOn: true },
  checked_2: { checkedBags: 2, carryOn: true },
};

const labelClass = 'block text-xs font-medium text-slate-600 dark:text-slate-400';
const toStops = (v: StopsValue) => (v === '' ? null : Number(v));

function StopsSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: StopsValue;
  onChange: (v: StopsValue) => void;
}) {
  return (
    <label htmlFor={id} className={labelClass}>
      {label}
      <select
        id={id}
        className={`${inputClass} mt-1`}
        value={value}
        onChange={(e) => onChange(e.target.value as StopsValue)}
      >
        <option value="">Not sure</option>
        <option value="0">Nonstop</option>
        <option value="1">1 stop</option>
        <option value="2">2 stops</option>
        <option value="3">3+ stops</option>
      </select>
    </label>
  );
}

/**
 * Records a fare you saw on a provider's site for this exact date combination. Unknown details stay
 * unknown; nothing is filled in on your behalf except the dates, cabin and passengers of the search.
 */
export function ManualPriceForm({
  combo,
  query,
  onDone,
}: {
  combo: PlannedCombo;
  query: SearchQuery;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const linkFor = (id: string) =>
    combo.links.find((l) => l.providerId === id && l.kind === 'prefilled')?.url ?? '';
  // Metro codes (TYO) are fine, but a specific airport is more useful when you know it.
  const [form, setForm] = useState({
    providerId: '' as ManualProviderId | '',
    price: '',
    currency: 'USD' as (typeof MANUAL_CURRENCIES)[number],
    priceBasis: 'per_adult' as 'per_adult' | 'total',
    originAirport: query.origin,
    destinationAirport: query.destination,
    stopsOut: '' as StopsValue,
    stopsBack: '' as StopsValue,
    hours: '',
    minutes: '',
    airline: '',
    bags: 'unknown' as BagsValue,
    hiddenCity: false,
    bookingUrl: '',
    note: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: createObservation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['search'] });
      onDone();
    },
    onError: (err) => setErrors([err.message]),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const hours = form.hours.trim() === '' ? 0 : Number(form.hours);
    const minutes = form.minutes.trim() === '' ? 0 : Number(form.minutes);
    const hasDuration = form.hours.trim() !== '' || form.minutes.trim() !== '';
    const input: ManualObservationInput = {
      providerId: form.providerId as ManualProviderId,
      tripType: query.tripType,
      originAirport: form.originAirport,
      destinationAirport: form.destinationAirport,
      departDate: combo.departDate,
      returnDate: combo.returnDate,
      price: form.price.trim() === '' ? Number.NaN : Number(form.price),
      currency: form.currency,
      priceBasis: form.priceBasis,
      adults: query.adults,
      cabin: query.cabin,
      stopsOut: toStops(form.stopsOut),
      stopsBack: query.tripType === 'round_trip' ? toStops(form.stopsBack) : null,
      durationMinutes: hasDuration ? Math.round(hours * 60 + minutes) : null,
      airline: form.airline,
      baggage: BAGGAGE[form.bags],
      hiddenCity: form.hiddenCity,
      bookingUrl: form.bookingUrl.trim() || null,
      note: form.note,
    };
    const parsed = ManualObservationSchema.safeParse(input);
    if (!parsed.success) {
      const names: Record<string, string> = {
        providerId: 'Where you saw it',
        price: 'Price',
        originAirport: 'From',
        destinationAirport: 'To',
        durationMinutes: 'Travel time',
        bookingUrl: 'Link',
      };
      setErrors(
        parsed.error.issues.map((i) => {
          const field = String(i.path[0] ?? '');
          if (field === 'providerId') return 'Choose where you saw this price.';
          if (field === 'price') return 'Enter the price as a number greater than 0.';
          return `${names[field] ?? field}: ${i.message}`;
        }),
      );
      return;
    }
    setErrors([]);
    save.mutate(input);
  }

  const roundTrip = query.tripType === 'round_trip';
  const travellers = query.adults === 1 ? '1 adult' : `${query.adults} adults`;

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="Add a price I saw"
      className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20"
    >
      <p className="text-xs text-slate-600 dark:text-slate-400">
        For {formatDate(combo.departDate)}
        {combo.returnDate &&
          ` → ${formatDate(combo.returnDate)} (${nightsLabel(combo.nights!)})`} · {travellers}.
        Leave anything you didn't see as “Not sure”.
      </p>

      <label htmlFor="mp-provider" className={labelClass}>
        Where did you see it?
        <select
          id="mp-provider"
          className={`${inputClass} mt-1`}
          value={form.providerId}
          onChange={(e) => {
            const id = e.target.value as ManualProviderId | '';
            setForm((f) => ({
              ...f,
              providerId: id,
              // Pre-fill the link with the search you just opened, unless you've typed your own.
              bookingUrl:
                f.bookingUrl === '' || combo.links.some((l) => l.url === f.bookingUrl)
                  ? linkFor(id)
                  : f.bookingUrl,
            }));
          }}
        >
          <option value="">Choose…</option>
          {MANUAL_PROVIDER_IDS.map((id) => (
            <option key={id} value={id}>
              {id === 'other' ? 'Another site' : manualProviderName(id)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-end gap-2">
        <label htmlFor="mp-price" className={labelClass}>
          Price
          <input
            id="mp-price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className={`${inputBase} mt-1 w-32`}
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
          />
        </label>
        <label htmlFor="mp-currency" className={labelClass}>
          Currency
          <select
            id="mp-currency"
            className={`${inputBase} mt-1 w-24`}
            value={form.currency}
            onChange={(e) => set('currency', e.target.value as typeof form.currency)}
          >
            {MANUAL_CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label htmlFor="mp-basis" className={labelClass}>
          Price is
          <select
            id="mp-basis"
            className={`${inputBase} mt-1 w-44`}
            value={form.priceBasis}
            onChange={(e) => set('priceBasis', e.target.value as typeof form.priceBasis)}
          >
            <option value="per_adult">Per adult</option>
            <option value="total" disabled={query.adults === 1}>
              Total for {travellers}
            </option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label htmlFor="mp-from" className={labelClass}>
          From airport
          <input
            id="mp-from"
            className={`${inputClass} mt-1 font-mono uppercase`}
            maxLength={3}
            value={form.originAirport}
            onChange={(e) => set('originAirport', e.target.value.toUpperCase())}
          />
        </label>
        <label htmlFor="mp-to" className={labelClass}>
          To airport
          <input
            id="mp-to"
            className={`${inputClass} mt-1 font-mono uppercase`}
            maxLength={3}
            value={form.destinationAirport}
            onChange={(e) => set('destinationAirport', e.target.value.toUpperCase())}
          />
        </label>
        {(isMetroCode(form.originAirport) || isMetroCode(form.destinationAirport)) && (
          <p className="col-span-2 text-xs text-slate-500">
            Tip: replace a city code with the actual airport (e.g. TYO → NRT or HND) if you know it.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StopsSelect
          id="mp-stops-out"
          label="Stops, outbound"
          value={form.stopsOut}
          onChange={(v) => set('stopsOut', v)}
        />
        {roundTrip && (
          <StopsSelect
            id="mp-stops-back"
            label="Stops, return"
            value={form.stopsBack}
            onChange={(v) => set('stopsBack', v)}
          />
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <fieldset className={labelClass}>
          <legend>Total travel time{roundTrip ? ' (both ways)' : ''}</legend>
          <div className="mt-1 flex items-center gap-1">
            <input
              aria-label="Hours"
              type="number"
              min={0}
              placeholder="h"
              className={`${inputBase} w-16`}
              value={form.hours}
              onChange={(e) => set('hours', e.target.value)}
            />
            <span>h</span>
            <input
              aria-label="Minutes"
              type="number"
              min={0}
              max={59}
              placeholder="m"
              className={`${inputBase} w-16`}
              value={form.minutes}
              onChange={(e) => set('minutes', e.target.value)}
            />
            <span>m</span>
          </div>
        </fieldset>
        <label htmlFor="mp-airline" className={`${labelClass} min-w-0 flex-1`}>
          Airline
          <input
            id="mp-airline"
            className={`${inputClass} mt-1`}
            placeholder="Optional"
            value={form.airline}
            onChange={(e) => set('airline', e.target.value)}
          />
        </label>
      </div>

      <label htmlFor="mp-bags" className={labelClass}>
        Bags included in this price
        <select
          id="mp-bags"
          className={`${inputClass} mt-1`}
          value={form.bags}
          onChange={(e) => set('bags', e.target.value as BagsValue)}
        >
          <option value="unknown">Not sure</option>
          <option value="personal">Personal item only (basic economy)</option>
          <option value="carry_on">Carry-on, no checked bag</option>
          <option value="checked_1">Carry-on + 1 checked bag</option>
          <option value="checked_2">Carry-on + 2 checked bags</option>
        </select>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.hiddenCity}
          onChange={(e) => set('hiddenCity', e.target.checked)}
        />
        <span>
          This is a <strong>hidden-city</strong> fare
          <span className="block text-xs text-slate-500">
            It will be kept separate and never compared with regular fares.
          </span>
        </span>
      </label>

      <label htmlFor="mp-url" className={labelClass}>
        Link to the listing
        <input
          id="mp-url"
          type="url"
          className={`${inputClass} mt-1`}
          placeholder="https://…"
          value={form.bookingUrl}
          onChange={(e) => set('bookingUrl', e.target.value)}
        />
      </label>

      <label htmlFor="mp-note" className={labelClass}>
        Note
        <input
          id="mp-note"
          className={`${inputClass} mt-1`}
          placeholder="Optional, e.g. “basic economy, no seat choice”"
          maxLength={500}
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
        />
      </label>

      {errors.length > 0 && (
        <ul
          role="alert"
          className="space-y-1 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
        >
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={save.isPending}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : 'Save price'}
        </button>
      </div>
    </form>
  );
}

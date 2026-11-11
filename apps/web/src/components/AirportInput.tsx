import { type AirportSuggestion, describeSuggestion } from '@flight/core';
import { useQuery } from '@tanstack/react-query';
import { type KeyboardEvent, useEffect, useId, useState } from 'react';
import { lookupAirport, searchAirports } from '../api/client';
import { Field, inputClass } from './Field';

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Airport field with autocomplete (WAI-ARIA combobox). Type a code, city or airport name; pick
 * with the mouse or arrow keys + Enter. The form value is always the 3-letter code.
 */
export function AirportInput({
  id,
  label,
  value,
  placeholder,
  error,
  align = 'left',
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  /** Which edge the suggestion list lines up with, so it stays on screen. */
  align?: 'left' | 'right';
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const term = useDebounced(value.trim(), 150);

  const suggestions = useQuery({
    queryKey: ['airports', term.toLowerCase()],
    queryFn: ({ signal }) => searchAirports(term, signal),
    enabled: open && term.length >= 2,
    staleTime: Infinity,
  });
  const items: AirportSuggestion[] = open && term.length >= 2 ? (suggestions.data ?? []) : [];

  const code = value.trim().toUpperCase();
  const known = useQuery({
    queryKey: ['airport', code],
    queryFn: ({ signal }) => lookupAirport(code, signal),
    enabled: /^[A-Z]{3}$/.test(code),
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => setActive(0), [term]);

  function choose(item: AirportSuggestion) {
    onChange(item.code);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && items[active]) {
      e.preventDefault(); // pick the airport instead of submitting the form
      choose(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const hint = /^[A-Z]{3}$/.test(code)
    ? known.data
      ? describeSuggestion(known.data)
      : known.isSuccess
        ? 'Not in the airport list. Check the code.'
        : ' '
    : 'Code, city or airport name';

  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} className="relative min-w-0 flex-1">
      <input
        id={id}
        role="combobox"
        aria-expanded={items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={items.length > 0 ? `${listId}-${active}` : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputClass} text-base`}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          // Delay so a click on a suggestion lands before the list closes.
          setTimeout(() => setOpen(false), 120);
          onBlur();
        }}
      />
      {items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className={`absolute top-[4.25rem] z-30 w-max max-w-[min(24rem,calc(100vw-2rem))] min-w-full ${align === 'right' ? 'right-0' : 'left-0'} max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900`}
        >
          {items.map((item, i) => (
            <li
              key={`${item.kind}-${item.code}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(item)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline gap-3 px-3 py-2 text-sm ${
                i === active ? 'bg-sky-50 dark:bg-sky-950/60' : ''
              }`}
            >
              <span className="w-10 shrink-0 font-mono font-semibold">{item.code}</span>
              <span className="min-w-0">
                <span className="block truncate">
                  {item.kind === 'metro' ? `${item.name} (all airports)` : item.name}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {item.kind === 'metro'
                    ? item.airports.join(', ')
                    : [item.city, item.country ?? item.countryCode].filter(Boolean).join(', ')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

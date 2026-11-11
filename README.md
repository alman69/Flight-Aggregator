# Flight Aggregator

A personal flight-search tool that runs only on your local device. You give it a travel window, and it
lists every valid departure/return date combination. Each combination gets links to eight flight
providers with the dates filled in where the provider allows it. Prices only appear when an
authorized source has actually observed them, and each one is labeled with where it came from.

**Status: Milestone 2.** You get the flexible-date engine, a matrix and a ranked list, links to
eight providers, airport autocomplete, and **prices you record yourself**: open any date, check it
on a provider, and choose "Add a price I saw". Saved prices are stored in a local SQLite file. No
automatic price source is connected yet (cached prices are planned for Milestone 3).

- No paid services, no accounts, no deployment. Both servers listen on `127.0.0.1` only.
- No scraping. Provider sites are only opened when you click a link.
- Prices are never invented. A missing price means none was observed, **not** that there are no
  flights.

## Run it

Requires Node 22.13+ (developed on Node 24) and npm. The database uses Node's built-in
`node:sqlite`, so there is nothing native to compile.

```bash
npm install
```

```bash
npm run dev
```

Open http://127.0.0.1:5173. The API runs on `127.0.0.1:5174`. Set `API_PORT` to change its port.

On first start the server creates `data/app.db` and loads the airport list into it. The database
is gitignored and holds only what you save. To back it up, copy `data/app.db` while the app is
stopped.

To preview the interface with generated sample prices, add `?demo=1` to the URL or use the link in
the footer. A permanent **DEMO DATA – not real fares** banner is shown. Demo prices are generated in
the browser and never stored or sent anywhere.

| Command                   | What it does                                   |
| ------------------------- | ---------------------------------------------- |
| `npm test`                | Runs every unit and component test (Vitest)    |
| `npm run typecheck`       | Type-checks all three packages                 |
| `npm run lint`            | ESLint                                         |
| `npm run format`          | Prettier                                       |
| `npm run build`           | Production build of the web app                |
| `npm run airports:update` | Re-download the OurAirports list and reload it |

## Layout

```
packages/core   Pure TypeScript shared by server and browser: dates, date combinations,
                validation, provider link builders, fare model, coverage, filters, ranking
apps/server     Express API and SQLite storage (see endpoints below)
apps/web        React + Vite + Tailwind interface
data/seed       airports.csv: ~4,000 airports from OurAirports (public domain)
data/app.db     Your local database (created on first run, gitignored)
```

### API

All endpoints are on `127.0.0.1:5174` and make no external requests.

| Endpoint                       | Purpose                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| `GET /api/health`              | Status and airport count                                                   |
| `POST /api/search`             | Date combinations, provider links, and saved prices that match             |
| `POST /api/search/plan`        | Date combinations and links only                                           |
| `GET /api/airports?q=`         | Autocomplete by code, city or airport name (metro codes such as TYO first) |
| `GET /api/airports/:code`      | One airport or metro code                                                  |
| `GET /api/providers`           | How each provider is integrated, and the price sources                     |
| `POST /api/observations`       | Save a price you saw                                                       |
| `GET /api/observations`        | Recently saved prices                                                      |
| `DELETE /api/observations/:id` | Remove one of your saved prices                                            |

## Flexible-date search

| Mode             | You enter                              | Combinations generated                                          |
| ---------------- | -------------------------------------- | --------------------------------------------------------------- |
| Fixed dates      | Departure (and return)                 | That one pair                                                   |
| Flexible window  | Earliest departure, latest return      | Every departure/return pair inside the window                   |
| Separate windows | A departure window and a return window | Every departure in one window × every later return in the other |

Trip length can be **any**, **min/max nights**, or an **exact** number of nights. Departure and
return are always on different days. Example: Nov 1–10 gives **45** combinations, or **18** with
3–5 nights.

The limits are a 60-day window and 400 combinations per search. Dates more than 330 days out
trigger a warning, because airlines usually haven't published fares that far ahead.

## Provider link checklist

Each format was opened by hand in a browser on **2026-11-11**. The link formats are unofficial and
can change.

| Provider       | Link type       | Round trip | One way         | Notes                                                                                        |
| -------------- | --------------- | ---------- | --------------- | -------------------------------------------------------------------------------------------- |
| Google Flights | Dates filled in | ✅ BUF→NRT | ✅ BUF→MCO      | Passengers and cabin are not passed; set them on Google Flights                              |
| Skyscanner     | Dates filled in | ✅ BUF→TYO | ⚠️ Not verified | One-way check hit a bot-check page. `TYO` is mapped to `tyoa`; other city codes may not work |
| Momondo        | Dates filled in | ✅ BUF→TYO | ✅ BUF→MCO      | Cabin and passenger path segments are unverified                                             |
| KAYAK          | Dates filled in | ✅ BUF→TYO | ✅ BUF→MCO      | Cabin and passenger path segments are unverified                                             |
| Going          | Homepage        | —          | —               | No search links; deals are for members                                                       |
| Secret Flying  | Homepage        | —          | —               | No search links; `/feed/` redirects to the homepage                                          |
| Hopper         | Flights tab     | —          | —               | hopper.com opens; no pre-filled search URL is known, so the link opens its Flights tab       |
| Skiplagged     | Dates filled in | ✅ BUF→TYO | ✅ BUF→MCO      | A hidden-city warning is shown before opening                                                |

Any caveat about a link is shown next to it in the app.

## How data is labeled

| Label  | Meaning                                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Demo   | Generated for previews (`?demo=1` only). Never a real fare                                                              |
| Cached | Seen earlier by a cache source (Milestone 3). Shows when it was retrieved, and when it was seen only if the source says |
| Manual | A price you saw and saved yourself. Shows where and when you saw it                                                     |
| Live   | Reserved for a future authorized live source. Nothing produces it yet                                                   |

The empty states are kept separate: **no fare observed**, **not searched**, **search failed**, and
**loading**. None of them means "no flights".

## Saved prices

- A saved price is attached only to its own exact dates. Searching TYO also shows prices saved
  for NRT or HND.
- Unknown details (stops, bags, travel time) stay unknown. They are never filled in as zero.
- Prices marked **per adult** appear in searches for any number of travelers. Prices marked as a
  **total** only appear in searches for the same number of travelers.
- **Hidden-city** fares are stored and labeled, but never picked as the lowest fare and never ranked
  against regular fares.
- In demo mode only demo prices are shown, and saving is turned off, so demo data and real data
  never mix.

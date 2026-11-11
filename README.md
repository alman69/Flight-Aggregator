# Flight Aggregator

A personal flight-search tool that runs only on your Mac. You give it a travel window, and it
lists every valid departure/return date combination. Each combination gets links to eight flight
providers with the dates filled in where the provider allows it. Prices only appear when an
authorized source has actually observed them, and each one is labeled with where it came from.

**Status: Milestone 1.** This milestone covers the flexible-date engine, a matrix and a ranked
list, and provider links. No price source is connected yet, so outside demo mode no prices
appear anywhere.

- No paid services, no accounts, no deployment. Both servers listen on `127.0.0.1` only.
- No scraping. Provider sites are only opened when you click a link.
- Prices are never invented. A missing price means none was observed, **not** that there are no
  flights.

## Run it

Requires Node 20.19+ (developed on Node 24) and npm.

```bash
npm install
```

```bash
npm run dev
```

Open http://127.0.0.1:5173. The API runs on `127.0.0.1:5174`. Set `API_PORT` to change its port.

To preview the interface with generated sample prices, add `?demo=1` to the URL or use the link in
the footer. A permanent **DEMO DATA – not real fares** banner is shown. Demo prices are generated in
the browser and never stored or sent anywhere.

| Command             | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm test`          | Runs every unit and component test (Vitest) |
| `npm run typecheck` | Type-checks all three packages              |
| `npm run lint`      | ESLint                                      |
| `npm run format`    | Prettier                                    |
| `npm run build`     | Production build of the web app             |

## Layout

```
packages/core   Pure TypeScript shared by server and browser: dates, date combinations,
                validation, provider link builders, fare model, coverage, filters, ranking
apps/server     Express API: GET /api/health, POST /api/search/plan
apps/web        React + Vite + Tailwind interface
```

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
| Manual | A price you saw and saved yourself (Milestone 2)                                                                        |
| Live   | Reserved for a future authorized live source. Nothing produces it yet                                                   |

The empty states are kept separate: **no fare observed**, **not searched**, **search failed**, and
**loading**. None of them means "no flights".

/**
 * Rebuilds data/seed/airports.csv from OurAirports and reloads it into the database.
 *
 *   npm run airports:update                                   # downloads the latest files
 *   npm run airports:update -- <airports.csv> <countries.csv> # uses local copies
 *
 * OurAirports data is public domain (Unlicense).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { OURAIRPORTS_URLS, airportsToSeedCsv, extractAirports } from '../airports/ourAirports';
import { config } from '../config';
import { openDatabase } from '../db/connection';
import { createAirportsRepo } from '../db/repos/airports';

async function download(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  return res.text();
}

async function main() {
  const [airportsPath, countriesPath] = process.argv.slice(2);
  const [airportsCsv, countriesCsv] =
    airportsPath && countriesPath
      ? [readFileSync(airportsPath, 'utf8'), readFileSync(countriesPath, 'utf8')]
      : await Promise.all([
          download(OURAIRPORTS_URLS.airports),
          download(OURAIRPORTS_URLS.countries),
        ]);

  const airports = extractAirports(airportsCsv, countriesCsv);
  if (airports.length < 1000) {
    throw new Error(`Only ${airports.length} airports parsed; refusing to overwrite the seed.`);
  }
  mkdirSync(path.dirname(config.airportSeedPath), { recursive: true });
  writeFileSync(config.airportSeedPath, airportsToSeedCsv(airports));
  console.log(`Wrote ${airports.length} airports to ${config.airportSeedPath}`);

  const db = openDatabase(config.dbPath);
  createAirportsRepo(db).replaceAll(airports);
  db.close();
  console.log(`Reloaded airports into ${config.dbPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

import { fileURLToPath } from 'node:url';

const fromRepoRoot = (relative: string) =>
  fileURLToPath(new URL(`../../../${relative}`, import.meta.url));

export const config = {
  /** Loopback only: this API is for this Mac, not the network. */
  host: '127.0.0.1',
  /** API_PORT (not PORT) so tools that set PORT for the web dev server do not move the API. */
  port: Number(process.env.API_PORT ?? 5174),
  /** SQLite database file. Gitignored. */
  dbPath: process.env.DB_PATH ?? fromRepoRoot('data/app.db'),
  /** Trimmed OurAirports extract committed to the repo. */
  airportSeedPath: fromRepoRoot('data/seed/airports.csv'),
};

import { existsSync, readFileSync } from 'node:fs';
import { createApp } from './app';
import { parseAirportSeed } from './airports/ourAirports';
import { config } from './config';
import { openDatabase } from './db/connection';
import { createAirportsRepo } from './db/repos/airports';

const db = openDatabase(config.dbPath);

// Load the committed OurAirports extract the first time the database is created.
const airports = createAirportsRepo(db);
if (airports.count() === 0) {
  if (existsSync(config.airportSeedPath)) {
    const rows = parseAirportSeed(readFileSync(config.airportSeedPath, 'utf8'));
    airports.replaceAll(rows);
    console.log(`Loaded ${rows.length} airports into the database.`);
  } else {
    console.warn('No airport seed found; run `npm run airports:update` to enable autocomplete.');
  }
}

const server = createApp({ db }).listen(config.port, config.host, () => {
  console.log(`Flight Aggregator API listening on http://${config.host}:${config.port}`);
  console.log(`Database: ${config.dbPath}`);
});

// Close the database cleanly when stopped (Ctrl+C or tsx watch restarts).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close();
    db.close();
    process.exit(0);
  });
}

# Seed data

`airports.csv` is a trimmed extract of [OurAirports](https://github.com/davidmegginson/ourairports-data)
open data, released into the public domain under the Unlicense. It keeps only airports with a
3-letter IATA code and scheduled passenger service (about 4,000 rows).

Regenerate it with `npm run airports:update`. The server loads it into SQLite on first start.

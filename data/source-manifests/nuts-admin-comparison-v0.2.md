# NUTS Administrative Comparison Draft 0.2

## Purpose

Replace provisional internal borders with real statistical-region geometry while retaining the approved 101-territory structure.

## Sources

- Eurostat Nuts2json, NUTS 2024 level 2, EPSG:4326, 1:10m
- Eurostat Nuts2json, NUTS 2024 level 3, EPSG:4326, 1:10m
- Eurostat Nuts2json, NUTS 2021 level 2, EPSG:4326, 1:10m, retained for United Kingdom coverage
- Source repository: https://github.com/eurostat/Nuts2json
- Upstream geometry: Eurostat GISCO
- Nuts2json software licence: EUPL 1.2
- Eurostat geographic-data provisions apply to the underlying geometry

## Acquisition

Run `npm run map:fetch-nuts`. Source files are placed in `.cache/map-sources` and are not committed. The generated cache manifest records source URLs, retrieval timestamps, file sizes and SHA-256 checksums.

## Transformation

1. Use NUTS 3 geometry where available.
2. Fall back to NUTS 2 for countries without NUTS 3 coverage.
3. Use NUTS 2021 level 2 for the United Kingdom.
4. Exclude overseas regions outside the approved theatre.
5. Restrict Türkiye to the European theatre.
6. Assign each source region to the nearest approved strategic centre within its country.
7. Dissolve assigned source regions into the approved territory ID.
8. Retain Pass 1 geometry for Belarus, Moldova, Ukraine and Russia pending an equivalent administrative source.

## Output status

- 101 total territories
- 88 administrative-comparison territories
- 13 provisional eastern-theatre territories
- 1,302 source regions mapped
- Political claimant and actual controller remain separate World State attributes

## Limitations

Nearest-centre assignment is a comparison method, not final approval. Every mapping requires manual review. Generalised coastline and source topology artefacts remain documented in the validation report.


# Map Draft 0.1 Source Manifest

## Output

- Standard Campaign territory geometry, draft 0.1
- Standard Campaign SVG review map, draft 0.1
- Land-adjacency candidate graph
- Provisional sea and fixed-link routes
- Automated validation report

## Natural Earth

- Dataset: Natural Earth countries, 1:10 million
- Distribution used: `world-atlas` npm package 2.0.2
- Publisher: Natural Earth community
- Purpose: country coastlines and country-level geometry
- Licence: public domain source data; `world-atlas` package distributed under ISC
- Source: https://www.naturalearthdata.com/
- Transformation: theatre clipping, European-Russia clipping, separation of Crimea as stable disputed-area geometry, centre-weighted provisional internal partitioning and Equal Earth SVG projection

## Strategic-centre coordinates

- Dataset: SimpleMaps-derived world cities
- Distribution used: `world-cities-json` npm package 1.0.1
- Licence: CC BY 4.0
- Source package: https://www.npmjs.com/package/world-cities-json
- Transformation: exact city-name and country-code matching, with documented coordinate fallbacks for eight centres

## Authored data

- Dataset: `data/authored/territories-standard.csv`
- Publisher: Future Conquest project
- Purpose: permanent territory IDs, country assignment, display names, strategic centres and campaign groupings

## Limitations

- Internal divisions are provisional strategic partitions, not approved administrative boundaries.
- Political claims and actual military control are deliberately excluded from geometry.
- European Russia is clipped at 60 degrees east for the campaign frame.
- Crimea is represented as its own permanent geometry so that claimant and controller can vary by World State.
- Detailed NUTS, EuroGlobalMap, TEN-T and GISCO integration remains planned for subsequent boundary and infrastructure passes.


# Research Source Register

This register records sources considered for the campaign map and World State. Inclusion here does not automatically authorise redistribution of source files. Every acquired dataset requires a source manifest before it enters the production pipeline.

## Geographic boundaries

### Natural Earth

- Publisher: Natural Earth community
- Purpose: coastlines, oceans, countries and clean world backdrop
- Coverage: global
- Licence: public domain
- Source: https://www.naturalearthdata.com/
- Intended use: base geography and off-map world context

### Eurostat GISCO NUTS and statistical regions

- Publisher: Eurostat, European Commission
- Purpose: regional boundaries for EU and supported non-EU states
- Current design baseline: NUTS 2024
- Source: https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/territorial-units-statistics
- Notes: NUTS formally applies to EU countries. Eurostat maintains separate statistical-region coding for certain candidate, potential-candidate and EFTA countries.

### EuroGlobalMap

- Publisher: EuroGeographics and European national mapping agencies
- Purpose: administrative boundaries, transport, settlements, hydrography and names
- Scale: approximately 1:1 million
- Source: https://www.mapsforeurope.org/datasets/euro-global-map
- Intended use: cross-checking and filling gaps outside NUTS coverage

### United Nations M49

- Publisher: United Nations Statistics Division
- Purpose: stable country and geographic-region identifiers
- Source: https://unstats.un.org/unsd/methodology/m49/
- Intended use: reference identifiers and scope comparison, not gameplay boundaries

## Transport and strategic infrastructure

### Trans-European Transport Network

- Publisher: European Commission
- Purpose: strategic road, rail, port, airport and urban-node corridors
- Source: https://transport.ec.europa.eu/transport-themes/infrastructure-and-investment/trans-european-transport-network-ten-t_en
- Intended use: identify game-level logistics corridors and chokepoints

### GISCO transport networks

- Publisher: Eurostat, European Commission
- Purpose: European ports and airports
- Source: https://ec.europa.eu/eurostat/web/gisco/geodata/transport-networks
- Intended use: select strategically significant nodes after filtering and manual review

## Population and settlements

### GISCO population grids

- Publisher: Eurostat, European Commission
- Purpose: population distribution and Census 2021 gridded statistics
- Source: https://ec.europa.eu/eurostat/web/gisco/geodata/population-distribution/population-grids
- Intended use: calculate regional population weights, occupation burden and civilian exposure offline

## Terrain and environment

### Copernicus DEM

- Publisher: Copernicus Programme
- Purpose: elevation and terrain classification
- Source: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- Intended use: derive terrain and route modifiers offline

### European Environment Agency biogeographical regions

- Publisher: European Environment Agency
- Purpose: broad environmental regions
- Source: https://www.eea.europa.eu/en/analysis/maps-and-charts/biogeographical-regions-in-europe-2
- Intended use: cross-check broad climate and environmental classes

## Conditional source

### OpenStreetMap

- Publisher: OpenStreetMap contributors
- Purpose: detailed validation of roads, rail, ports, crossings and settlements
- Licence: Open Database Licence 1.0
- Licence guidance: https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ
- Decision: use only when necessary and isolate derived data within a documented source layer. Attribution and share-alike implications must be reviewed before publication.

## Military and World State sources

Public information can inform country-level capability, budgets, alliance relationships and broad regional posture. It must not be presented as exact live deployment data. Operational unit positions will be abstracted and procedurally placed within authored military regions.

Potential sources include official national publications, NATO material, SIPRI, World Bank indicators and reputable conflict datasets. These require a separate World State source review before automation begins.


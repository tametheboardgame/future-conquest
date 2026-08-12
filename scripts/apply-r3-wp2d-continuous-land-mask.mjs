import fs from 'node:fs';

const file = 'src/components/TerrainMapPrototypeImpl.tsx';
let source = fs.readFileSync(file, 'utf8');

const replacements = [
  ["import worldAtlas from 'world-atlas/countries-110m.json';", "import worldLand from 'world-atlas/land-110m.json';", 'World Atlas import'],
  ["const atlas = worldAtlas as unknown as { objects: { countries: unknown } };\nconst terrainLandGeoJSON = topojsonFeature(atlas, atlas.objects.countries) as unknown as GeoJSONSourceSpecification['data'];", "const landAtlas = worldLand as unknown as { objects: { land: unknown } };\nconst terrainLandGeoJSON = topojsonFeature(landAtlas, landAtlas.objects.land) as unknown as GeoJSONSourceSpecification['data'];", 'continuous land mask']
];

for (const [before, after, label] of replacements) {
  if (!source.includes(before)) throw new Error(`WP2D land-mask anchor missing: ${label}`);
  source = source.replace(before, after);
}

fs.writeFileSync(file, source);
console.log('Replaced all-country fill geometry with the continuous World Atlas land mask.');

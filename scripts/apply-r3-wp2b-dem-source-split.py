from pathlib import Path

path = Path('src/components/TerrainMapPrototypeImpl.tsx')
text = path.read_text()

replacements = [
    ("      'r3-wp2b-dem': demSource,", "      'r3-wp2b-terrain-dem': demSource,\n      'r3-wp2b-relief-dem': { ...demSource },\n      'r3-wp2b-hillshade-dem': { ...demSource },"),
    ("      source: 'r3-wp2b-dem',\n      exaggeration: terrainExaggerationForProfile(presentationProfile)", "      source: 'r3-wp2b-terrain-dem',\n      exaggeration: terrainExaggerationForProfile(presentationProfile)"),
    ("        source: 'r3-wp2b-dem',\n        paint: {\n          'color-relief-color'", "        source: 'r3-wp2b-relief-dem',\n        paint: {\n          'color-relief-color'"),
    ("        source: 'r3-wp2b-dem',\n        paint: {\n          'hillshade-exaggeration'", "        source: 'r3-wp2b-hillshade-dem',\n        paint: {\n          'hillshade-exaggeration'")
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Expected DEM source block not found: {old[:60]}')
    text = text.replace(old, new, 1)

path.write_text(text)

Path('tests/r3-wp2b-maplibre-dem-source-contract.test.cjs').write_text("""const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');

test('terrain, color relief and hillshade use independent raster DEM source instances', () => {
  assert.match(source, /'r3-wp2b-terrain-dem': demSource/);
  assert.match(source, /'r3-wp2b-relief-dem': \{ \.\.\.demSource \}/);
  assert.match(source, /'r3-wp2b-hillshade-dem': \{ \.\.\.demSource \}/);
  assert.match(source, /terrain: \{\s*source: 'r3-wp2b-terrain-dem'/);
  assert.match(source, /id: 'r3-wp2b-relief'[\s\S]*?source: 'r3-wp2b-relief-dem'/);
  assert.match(source, /id: 'r3-wp2b-hillshade'[\s\S]*?source: 'r3-wp2b-hillshade-dem'/);
  assert.doesNotMatch(source, /'r3-wp2b-dem'/);
});
""")

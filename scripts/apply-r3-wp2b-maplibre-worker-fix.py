from pathlib import Path

path = Path('src/components/TerrainMapPrototypeImpl.tsx')
text = path.read_text()

old_import = """  Map,
  NavigationControl,
  type GeoJSONSourceSpecification,"""
new_import = """  Map,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSourceSpecification,"""
if old_import not in text:
    raise SystemExit('MapLibre named-import block not found')
text = text.replace(old_import, new_import, 1)

css_import = "import 'maplibre-gl/dist/maplibre-gl.css';\n"
worker_import = "import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';\n"
if worker_import not in text:
    if css_import not in text:
        raise SystemExit('MapLibre CSS import not found')
    text = text.replace(css_import, css_import + worker_import, 1)

anchor = "const terrainGeoJSON = activeGeojson as unknown as Parameters<typeof buildTerrainPoliticalGeoJSON>[0];\n"
worker_setup = "// MapLibre v6 ESM requires Vite's worker pipeline for GeoJSON/vector worker tasks.\nsetWorkerUrl(mapLibreWorkerUrl);\n\n"
if worker_setup not in text:
    if anchor not in text:
        raise SystemExit('Terrain module anchor not found')
    text = text.replace(anchor, worker_setup + anchor, 1)

path.write_text(text)

Path('tests/r3-wp2b-maplibre-worker-contract.test.cjs').write_text("""const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');

test('MapLibre v6 worker is bundled through Vite before terrain map construction', () => {
  assert.match(source, /setWorkerUrl/);
  assert.match(source, /maplibre-gl\/dist\/maplibre-gl-worker\.mjs\?worker&url/);
  const setup = source.indexOf('setWorkerUrl(mapLibreWorkerUrl)');
  const construction = source.indexOf('new Map({');
  assert.ok(setup >= 0 && construction > setup, 'worker URL must be configured before Map construction');
});
""")

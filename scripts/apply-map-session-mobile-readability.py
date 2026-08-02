from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


map_path = Path('src/components/MapView.tsx')
map_source = map_path.read_text()
map_source = replace_once(
    map_source,
    "import { useMemo, useRef, useState } from 'react';",
    "import { useEffect, useMemo, useRef, useState } from 'react';",
    'MapView React import'
)
map_source = replace_once(
    map_source,
    "const DEFAULT_MAP_LAYERS: MapLayers = {\n  countries: true,\n  territories: true,\n  orderPrompts: true,\n  friendlyUnits: true,\n  enemyUnits: true,\n  operations: true\n};\n\nconst THEATRE_LABELS",
    "const DEFAULT_MAP_LAYERS: MapLayers = {\n  countries: true,\n  territories: true,\n  orderPrompts: true,\n  friendlyUnits: true,\n  enemyUnits: true,\n  operations: true\n};\n\nlet retainedMapView: MapViewBox = FULL_THEATRE_VIEW;\nlet retainedMapLayers: MapLayers = DEFAULT_MAP_LAYERS;\n\nconst responsiveOverlayBoost = () => {\n  if (typeof window === 'undefined') return 1;\n  if (window.matchMedia('(max-width: 540px)').matches) return 2.7;\n  if (window.matchMedia('(max-width: 900px)').matches) return 1.5;\n  return 1;\n};\n\nconst THEATRE_LABELS",
    'MapView retained session state'
)
map_source = replace_once(
    map_source,
    "  const [view, setView] = useState<MapViewBox>(FULL_THEATRE_VIEW);\n  const [panning, setPanning] = useState(false);\n  const [layers, setLayers] = useState<MapLayers>(DEFAULT_MAP_LAYERS);",
    "  const [view, setView] = useState<MapViewBox>(() => retainedMapView);\n  const [panning, setPanning] = useState(false);\n  const [layers, setLayers] = useState<MapLayers>(() => retainedMapLayers);\n  const [overlayBoost, setOverlayBoost] = useState(responsiveOverlayBoost);",
    'MapView state initialisers'
)
map_source = replace_once(
    map_source,
    "  viewRef.current = view;\n\n  const groupsByTerritory",
    "  viewRef.current = view;\n\n  useEffect(() => {\n    retainedMapView = view;\n  }, [view]);\n\n  useEffect(() => {\n    retainedMapLayers = layers;\n  }, [layers]);\n\n  useEffect(() => {\n    const refreshOverlayBoost = () => setOverlayBoost(responsiveOverlayBoost());\n    window.addEventListener('resize', refreshOverlayBoost);\n    return () => window.removeEventListener('resize', refreshOverlayBoost);\n  }, []);\n\n  const groupsByTerritory",
    'MapView session effects'
)
map_source = replace_once(
    map_source,
    "  const overlayScale = view.width / MAP_WIDTH;",
    "  const overlayScale = view.width / MAP_WIDTH * overlayBoost;",
    'MapView responsive overlay scale'
)
map_path.write_text(map_source)

nav_path = Path('src/components/CommandNavigation.tsx')
nav_source = nav_path.read_text()
nav_source = replace_once(
    nav_source,
    "          onClick={() => onChange(item.id)}",
    "          onClick={() => onChange(active === item.id && item.id !== 'map' ? 'map' : item.id)}",
    'active navigation toggle'
)
nav_path.write_text(nav_source)

css_path = Path('src/mobile-map-corrections.css')
css_source = css_path.read_text().rstrip() + "\n\n" + '''/* Mobile overlays use a larger screen-space scale and text size. */
@media (max-width: 540px) {
  .europe-map .territory-centre-label {
    font-size: 16px;
    stroke-width: 4px;
  }

  .europe-map .territory-name-label {
    font-size: 13px;
    stroke-width: 3.5px;
  }

  .europe-map .order-label {
    font-size: 14px;
    stroke-width: 4px;
  }

  .europe-map .map-label .isolated-label {
    font-size: 11px;
    stroke-width: 3px;
  }

  .europe-map .future-theatre-labels .country-name-label {
    font-size: 12px;
    stroke-width: 4px;
  }

  .europe-map .future-theatre-labels .country-name-label.compact {
    font-size: 10px;
  }

  .europe-map .task-group-marker text {
    font-size: 11px;
  }

  .europe-map .enemy-marker text,
  .europe-map .operation-marker text {
    font-size: 10px;
  }
}
'''
css_path.write_text(css_source)

platform_test_path = Path('tests/europe-map-platform.test.cjs')
platform_test = platform_test_path.read_text()
platform_test = replace_once(
    platform_test,
    "  assert.match(source, /const overlayScale = view\\.width \\/ MAP_WIDTH/);",
    "  assert.match(source, /const overlayScale = view\\.width \\/ MAP_WIDTH \\* overlayBoost/);",
    'existing overlay regression'
)
platform_test_path.write_text(platform_test)

Path('tests/map-session-mobile-readability.test.cjs').write_text('''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('the command map retains its viewport and layer state between command views', () => {
  const source = read('src/components/MapView.tsx');
  assert.match(source, /let retainedMapView: MapViewBox = FULL_THEATRE_VIEW/);
  assert.match(source, /let retainedMapLayers: MapLayers = DEFAULT_MAP_LAYERS/);
  assert.match(source, /useState<MapViewBox>\\(\\(\\) => retainedMapView\\)/);
  assert.match(source, /retainedMapView = view/);
  assert.match(source, /retainedMapLayers = layers/);
});

test('mobile map overlays receive a responsive readability boost', () => {
  const source = read('src/components/MapView.tsx');
  const css = read('src/mobile-map-corrections.css');
  assert.match(source, /max-width: 540px/);
  assert.match(source, /return 2\\.7/);
  assert.match(source, /view\\.width \\/ MAP_WIDTH \\* overlayBoost/);
  assert.match(css, /\\.territory-centre-label[\\s\\S]*font-size:\\s*16px/);
  assert.match(css, /\\.territory-name-label[\\s\\S]*font-size:\\s*13px/);
  assert.match(css, /\\.task-group-marker text[\\s\\S]*font-size:\\s*11px/);
});

test('reselecting the active specialist menu returns to the command map', () => {
  const source = read('src/components/CommandNavigation.tsx');
  assert.match(source, /active === item\\.id && item\\.id !== 'map' \\? 'map' : item\\.id/);
});
''')

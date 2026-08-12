from pathlib import Path

path = Path('src/components/TerrainMapPrototypeImpl.tsx')
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    if old not in text:
        raise SystemExit('Expected style block not found')
    text = text.replace(old, new, 1)


replace_once(
"""          'fill-opacity': [
            'case',
            ['boolean', ['get', 'selected'], false], 0.18,
            ['boolean', ['get', 'targeted'], false], 0.17,
            ['interpolate', ['linear'], ['zoom'], 4, 0.07, 5.5, 0.09, 7, 0.12, 9, 0.13]
          ]""",
"""          'fill-opacity': [
            'interpolate', ['linear'], ['zoom'],
            4, ['case',
              ['boolean', ['get', 'selected'], false], 0.18,
              ['boolean', ['get', 'targeted'], false], 0.17,
              0.07
            ],
            5.5, ['case',
              ['boolean', ['get', 'selected'], false], 0.18,
              ['boolean', ['get', 'targeted'], false], 0.17,
              0.09
            ],
            7, ['case',
              ['boolean', ['get', 'selected'], false], 0.18,
              ['boolean', ['get', 'targeted'], false], 0.17,
              0.12
            ],
            9, ['case',
              ['boolean', ['get', 'selected'], false], 0.18,
              ['boolean', ['get', 'targeted'], false], 0.17,
              0.13
            ]
          ]"""
)

replace_once(
"""          'line-opacity': [
            'case',
            ['boolean', ['get', 'selected_supply_path'], false], 0.92,
            ['boolean', ['get', 'bottleneck'], false], 0.82,
            ['==', ['get', 'status'], 'destroyed'], 0.58,
            ['==', ['get', 'status'], 'blocked'], 0.62,
            ['==', ['get', 'status'], 'damaged'], 0.55,
            ['interpolate', ['linear'], ['zoom'], 5, 0.1, 5.8, 0.25, 7, 0.44, 9, 0.58]
          ]""",
"""          'line-opacity': [
            'interpolate', ['linear'], ['zoom'],
            5, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 0.92,
              ['boolean', ['get', 'bottleneck'], false], 0.82,
              ['==', ['get', 'status'], 'destroyed'], 0.58,
              ['==', ['get', 'status'], 'blocked'], 0.62,
              ['==', ['get', 'status'], 'damaged'], 0.55,
              0.1
            ],
            5.8, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 0.92,
              ['boolean', ['get', 'bottleneck'], false], 0.82,
              ['==', ['get', 'status'], 'destroyed'], 0.58,
              ['==', ['get', 'status'], 'blocked'], 0.62,
              ['==', ['get', 'status'], 'damaged'], 0.55,
              0.25
            ],
            7, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 0.92,
              ['boolean', ['get', 'bottleneck'], false], 0.82,
              ['==', ['get', 'status'], 'destroyed'], 0.58,
              ['==', ['get', 'status'], 'blocked'], 0.62,
              ['==', ['get', 'status'], 'damaged'], 0.55,
              0.44
            ],
            9, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 0.92,
              ['boolean', ['get', 'bottleneck'], false], 0.82,
              ['==', ['get', 'status'], 'destroyed'], 0.58,
              ['==', ['get', 'status'], 'blocked'], 0.62,
              ['==', ['get', 'status'], 'damaged'], 0.55,
              0.58
            ]
          ]"""
)

replace_once(
"""          'line-width': [
            'case',
            ['boolean', ['get', 'selected_supply_path'], false], 3.2,
            ['boolean', ['get', 'bottleneck'], false], 2.4,
            ['==', ['get', 'status'], 'destroyed'], 1.4,
            ['==', ['get', 'status'], 'blocked'], 1.8,
            ['==', ['get', 'status'], 'damaged'], 1.6,
            ['interpolate', ['linear'], ['zoom'], 5, 0.75, 6, 1.05, 8, 1.45, 10, 1.7]
          ]""",
"""          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            5, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 3.2,
              ['boolean', ['get', 'bottleneck'], false], 2.4,
              ['==', ['get', 'status'], 'destroyed'], 1.4,
              ['==', ['get', 'status'], 'blocked'], 1.8,
              ['==', ['get', 'status'], 'damaged'], 1.6,
              0.75
            ],
            6, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 3.2,
              ['boolean', ['get', 'bottleneck'], false], 2.4,
              ['==', ['get', 'status'], 'destroyed'], 1.4,
              ['==', ['get', 'status'], 'blocked'], 1.8,
              ['==', ['get', 'status'], 'damaged'], 1.6,
              1.05
            ],
            8, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 3.2,
              ['boolean', ['get', 'bottleneck'], false], 2.4,
              ['==', ['get', 'status'], 'destroyed'], 1.4,
              ['==', ['get', 'status'], 'blocked'], 1.8,
              ['==', ['get', 'status'], 'damaged'], 1.6,
              1.45
            ],
            10, ['case',
              ['boolean', ['get', 'selected_supply_path'], false], 3.2,
              ['boolean', ['get', 'bottleneck'], false], 2.4,
              ['==', ['get', 'status'], 'destroyed'], 1.4,
              ['==', ['get', 'status'], 'blocked'], 1.8,
              ['==', ['get', 'status'], 'damaged'], 1.6,
              1.7
            ]
          ]"""
)

text = text.replace(
    "fallbackRef.current('WebGL2 terrain rendering is unavailable; using the stable SVG command map.');",
    "fallbackRef.current('WebGL terrain rendering is unavailable; using the stable SVG command map.');",
    1
)
path.write_text(text)

Path('tests/r3-wp2b-maplibre-expression-contract.test.cjs').write_text("""const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/TerrainMapPrototypeImpl.tsx', 'utf8');

function layerBlock(id, nextId) {
  const start = source.indexOf(`id: '${id}'`);
  assert.notEqual(start, -1, `missing ${id}`);
  const end = nextId ? source.indexOf(`id: '${nextId}'`, start) : source.length;
  assert.notEqual(end, -1, `missing layer after ${id}`);
  return source.slice(start, end);
}

test('territory zoom opacity uses a top-level interpolate', () => {
  const layer = layerBlock('campaign-territories-fill', 'campaign-territory-state-wash');
  assert.match(layer, /'fill-opacity': \\[\\s*'interpolate', \\['linear'\\], \\['zoom'\\]/);
  assert.doesNotMatch(layer, /'fill-opacity': \\[\\s*'case'[\\s\\S]*\\['zoom'\\]/);
});

test('strategic route zoom opacity and width use top-level interpolate', () => {
  const layer = layerBlock('campaign-strategic-routes', 'campaign-control-borders');
  assert.match(layer, /'line-opacity': \\[\\s*'interpolate', \\['linear'\\], \\['zoom'\\]/);
  assert.match(layer, /'line-width': \\[\\s*'interpolate', \\['linear'\\], \\['zoom'\\]/);
  assert.doesNotMatch(layer, /'line-opacity': \\[\\s*'case'[\\s\\S]*\\['zoom'\\]/);
  assert.doesNotMatch(layer, /'line-width': \\[\\s*'case'[\\s\\S]*\\['zoom'\\]/);
});

test('terrain capability diagnostic reflects WebGL fallback support', () => {
  assert.match(source, /canvas\\.getContext\\('webgl2'\\) \\|\\| canvas\\.getContext\\('webgl'\\)/);
  assert.match(source, /WebGL terrain rendering is unavailable/);
});
""")

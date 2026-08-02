from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return source.replace(old, new, 1)


map_path = Path('src/components/MapView.tsx')
source = map_path.read_text(encoding='utf-8')

source = replace_once(
    source,
    "  const zoomPercent = mapZoomPercent(view);\n  const selectedAnchor = state.selectedTerritory ? anchors[state.selectedTerritory] : undefined;",
    "  const zoomPercent = mapZoomPercent(view);\n  const overlayScale = view.width / MAP_WIDTH;\n  const showTheatreLabels = zoomPercent <= 175;\n  const showTerritoryLabels = zoomPercent >= 135;\n  const showTerritoryNames = zoomPercent >= 285;\n  const selectedAnchor = state.selectedTerritory ? anchors[state.selectedTerritory] : undefined;",
    'zoom overlay state'
)

source = replace_once(
    source,
    "      <g className={`future-theatre-labels ${zoomPercent > 230 ? 'faded' : ''}`} aria-hidden=\"true\">\n        {projectedTheatreLabels.map(label => <text key={label.code} x={label.x} y={label.y}><title>{label.name}</title>{label.code}</text>)}\n      </g>",
    "      {showTheatreLabels && <g className=\"future-theatre-labels\" aria-hidden=\"true\">\n        {projectedTheatreLabels.map(label => <g key={label.code} transform={`translate(${label.x} ${label.y}) scale(${overlayScale})`}>\n          <text x=\"0\" y=\"0\"><title>{label.name}</title>{label.code}</text>\n        </g>)}\n      </g>}",
    'theatre labels'
)

source = replace_once(
    source,
    "          const offset = (index - (operation.participantGroupIds.length - 1) / 2) * 4;",
    "          const offset = (index - (operation.participantGroupIds.length - 1) / 2) * 4 * overlayScale;",
    'operation route spacing'
)

old_labels = """        {activePaths.map(({ id }) => {
          const anchor = anchors[id];
          const territory = state.territories[id];
          if (!anchor || !territory) return null;
          const [x, y] = anchor;
          const reachable = adjacentTargets.has(id);
          const action = territory.controller === 'enemy' ? 'ATTACK' : 'MOVE';
          const operation = Object.values(state.operations).find(activeOperation => activeOperation.target === id);
          return <g key={`${id}-label`} className="map-label" onClick={() => selectTerritory(id)}>
            {reachable && <text x={x} y={y - 25} className={`order-label ${territory.controller}`}>{action}</text>}
            {operation && <g className="operation-marker" transform={`translate(${x - 25} ${y - 31})`}><rect x="-15" y="-8" width="30" height="16" rx="3" /><text x="0" y="4">{operation.participantGroupIds.length}×</text></g>}
            <circle cx={x} cy={y - 8} r="3" />
            <text x={x} y={y + 8}>{TERRITORIES[id].centre}</text>
            {!territory.supplied && territory.controller === 'player' && <text className="isolated-label" x={x} y={y + 23}>ISOLATED</text>}
          </g>;
        })}"""

new_labels = """        {showTerritoryLabels && activePaths.map(({ id }) => {
          const anchor = anchors[id];
          const territory = state.territories[id];
          if (!anchor || !territory) return null;
          const [x, y] = anchor;
          return <g key={`${id}-hit`} className="territory-hit-area" transform={`translate(${x} ${y}) scale(${overlayScale})`}>
            <circle className="territory-hit-target" cx="0" cy="0" r="18" onClick={() => selectTerritory(id)} />
          </g>;
        })}
        {showTerritoryLabels && activePaths.map(({ id }) => {
          const anchor = anchors[id];
          const territory = state.territories[id];
          if (!anchor || !territory) return null;
          const [x, y] = anchor;
          const reachable = adjacentTargets.has(id);
          const action = territory.controller === 'enemy' ? 'ATTACK' : 'MOVE';
          const operation = Object.values(state.operations).find(activeOperation => activeOperation.target === id);
          const isolatedOffset = showTerritoryNames ? 34 : 23;
          return <g key={`${id}-label`} className={`map-label ${state.selectedTerritory === id ? 'selected-label' : ''}`} transform={`translate(${x} ${y}) scale(${overlayScale})`}>
            {reachable && <text x="0" y="-25" className={`order-label ${territory.controller}`}>{action}</text>}
            {operation && <g className="operation-marker" transform="translate(-25 -31)"><rect x="-15" y="-8" width="30" height="16" rx="3" /><text x="0" y="4">{operation.participantGroupIds.length}×</text></g>}
            <circle cx="0" cy="-8" r="3" />
            <text className="territory-centre-label" x="0" y="8">{TERRITORIES[id].centre}</text>
            {showTerritoryNames && <text className="territory-name-label" x="0" y="21">{TERRITORIES[id].name}</text>}
            {!territory.supplied && territory.controller === 'player' && <text className="isolated-label" x="0" y={isolatedOffset}>ISOLATED</text>}
          </g>;
        })}"""
source = replace_once(source, old_labels, new_labels, 'territory labels and hit areas')

source = replace_once(
    source,
    "          return <g key={`enemy-${territoryId}`} className=\"enemy-marker\" transform={`translate(${x + 24} ${y - 24})`}><path d=\"M0 -10 L10 8 L-10 8 Z\" /><text x=\"0\" y=\"4\">{count}</text></g>;",
    "          return <g key={`enemy-${territoryId}`} className=\"enemy-marker\" transform={`translate(${x + 24 * overlayScale} ${y - 24 * overlayScale}) scale(${overlayScale})`}><path d=\"M0 -10 L10 8 L-10 8 Z\" /><text x=\"0\" y=\"4\">{count}</text></g>;",
    'enemy markers'
)

source = replace_once(
    source,
    "            const dx = -28 + (index % 2) * 29;\n            const dy = 23 + Math.floor(index / 2) * 24;",
    "            const dx = (-28 + (index % 2) * 29) * overlayScale;\n            const dy = (23 + Math.floor(index / 2) * 24) * overlayScale;",
    'task group marker offsets'
)

source = replace_once(
    source,
    "            return <g key={group.id} className={`task-group-marker ${selected ? 'selected' : ''} ${group.status}`} transform={`translate(${x + dx} ${y + dy})`} onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); if (!suppressClick.current) onSelectGroup(group.id); }}>",
    "            return <g key={group.id} className={`task-group-marker ${selected ? 'selected' : ''} ${group.status}`} transform={`translate(${x + dx} ${y + dy}) scale(${overlayScale})`} onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); if (!suppressClick.current) onSelectGroup(group.id); }}>",
    'task group marker scaling'
)

source = replace_once(
    source,
    "          return <g className=\"portal\" filter=\"url(#glow)\"><circle cx={x} cy={y - 8} r=\"12\" /><circle cx={x} cy={y - 8} r=\"5\" /></g>;",
    "          return <g className=\"portal\" transform={`translate(${x} ${y}) scale(${overlayScale})`} filter=\"url(#glow)\"><circle cx=\"0\" cy=\"-8\" r=\"12\" /><circle cx=\"0\" cy=\"-8\" r=\"5\" /></g>;",
    'portal marker scaling'
)

map_path.write_text(source, encoding='utf-8')

css_path = Path('src/europe-map.css')
css = css_path.read_text(encoding='utf-8')
css_addition = """

/* Zoom-level detail and screen-space overlay sizing. */
.europe-map .map-label {
  pointer-events: none;
}

.europe-map .territory-hit-area {
  cursor: pointer;
}

.europe-map .territory-hit-target {
  fill: transparent;
  stroke: transparent;
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
  pointer-events: all;
  cursor: pointer;
}

.europe-map .territory-hit-target:hover {
  fill: rgba(112, 215, 208, .08);
  stroke: rgba(143, 249, 237, .7);
}

.europe-map .territory-centre-label {
  font-size: 12px;
}

.europe-map .territory-name-label {
  fill: #91a8b1;
  font: 500 8px IBM Plex Mono, monospace;
  letter-spacing: .025em;
  text-transform: uppercase;
}

.europe-map .map-label.selected-label .territory-centre-label {
  fill: #ffffff;
}

.europe-map .enemy-marker,
.europe-map .operation-marker,
.europe-map .portal {
  pointer-events: none;
}

.europe-map .operation-route {
  vector-effect: non-scaling-stroke;
}
"""
if 'Zoom-level detail and screen-space overlay sizing.' in css:
    raise RuntimeError('map LOD CSS already present')
css_path.write_text(css.rstrip() + css_addition + '\n', encoding='utf-8')

test_path = Path('tests/europe-map-platform.test.cjs')
tests = test_path.read_text(encoding='utf-8')
test_addition = r'''

test('map overlays retain a stable screen size and reveal detail as the player zooms in', () => {
  const source = read('src/components/MapView.tsx');
  const css = read('src/europe-map.css');

  assert.match(source, /const overlayScale = view\.width \/ MAP_WIDTH/);
  assert.match(source, /showTheatreLabels = zoomPercent <= 175/);
  assert.match(source, /showTerritoryLabels = zoomPercent >= 135/);
  assert.match(source, /showTerritoryNames = zoomPercent >= 285/);
  assert.match(source, /scale\(\$\{overlayScale\}\)/);
  assert.match(source, /24 \* overlayScale/);
  assert.match(source, /territory-name-label/);
  assert.match(source, /territory-hit-target/);
  assert.match(css, /\.europe-map \.map-label\s*\{\s*pointer-events:\s*none/s);
  assert.match(css, /\.europe-map \.territory-hit-target/);
  assert.match(css, /vector-effect:\s*non-scaling-stroke/);
});
'''
if "map overlays retain a stable screen size" in tests:
    raise RuntimeError('map LOD test already present')
test_path.write_text(tests.rstrip() + test_addition + '\n', encoding='utf-8')

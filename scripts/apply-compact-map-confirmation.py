from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    'src/App.tsx',
    "const renderPriorityOrderAction = (placement: 'panel' | 'map') => {",
    "const renderPriorityOrderAction = () => {"
)
replace_once(
    'src/App.tsx',
    "return <div className={`priority-order-action ${placement} ${isAttack ? 'attack' : 'move'}`} aria-label=\"Priority order action\">",
    "return <div className={`priority-order-action panel ${isAttack ? 'attack' : 'move'}`} aria-label=\"Priority order action\">"
)
replace_once(
    'src/App.tsx',
    "{placement === 'panel' && routeOptions.length > 1 && <label className=\"priority-route-select\"><span>Corridor</span>",
    "{routeOptions.length > 1 && <label className=\"priority-route-select\"><span>Corridor</span>"
)
replace_once(
    'src/App.tsx',
    "{renderPriorityOrderAction('panel')}",
    "{renderPriorityOrderAction()}"
)
replace_once(
    'src/App.tsx',
    """            <MapView state={state} onSelect={id => setState(current => selectTerritory(current, id))} onSelectGroup={id => setState(current => selectTaskGroup(current, id))} />
            {renderPriorityOrderAction('map')}""",
    """            <MapView
              state={state}
              onSelect={id => setState(current => selectTerritory(current, id))}
              onSelectGroup={id => setState(current => selectTaskGroup(current, id))}
              operationConfirmation={canAttack && target ? {
                territoryId: target.id,
                label: targetOperation ? 'Join operation?' : 'Confirm operation?',
                onConfirm: () => setState(current => beginOperation(current, chosenRouteId || undefined))
              } : undefined}
            />"""
)

replace_once(
    'src/components/MapView.tsx',
    """interface Props {
  state: GameState;
  onSelect: (id: string) => void;
  onSelectGroup: (id: string) => void;
}""",
    """interface Props {
  state: GameState;
  onSelect: (id: string) => void;
  onSelectGroup: (id: string) => void;
  operationConfirmation?: {
    territoryId: string;
    label: string;
    onConfirm: () => void;
  };
}"""
)
replace_once(
    'src/components/MapView.tsx',
    "export function MapView({ state, onSelect, onSelectGroup }: Props) {",
    "export function MapView({ state, onSelect, onSelectGroup, operationConfirmation }: Props) {"
)
replace_once(
    'src/components/MapView.tsx',
    """  const selectedAnchor = state.selectedTerritory ? anchors[state.selectedTerritory] : undefined;
  const activeLayerCount""",
    """  const selectedAnchor = state.selectedTerritory ? anchors[state.selectedTerritory] : undefined;
  const operationConfirmationAnchor = operationConfirmation ? anchors[operationConfirmation.territoryId] : undefined;
  const activeLayerCount"""
)
replace_once(
    'src/components/MapView.tsx',
    """        {showTerritoryLabels && activePaths.map(({ id }) => {
          const anchor = anchors[id];""",
    """        {operationConfirmation && operationConfirmationAnchor && <g
          className=\"map-operation-confirmation\"
          transform={`translate(${operationConfirmationAnchor[0]} ${operationConfirmationAnchor[1]}) scale(${overlayScale})`}
          role=\"button\"
          tabIndex={0}
          aria-label={operationConfirmation.label}
          onPointerDown={event => event.stopPropagation()}
          onClick={event => {
            event.stopPropagation();
            operationConfirmation.onConfirm();
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              operationConfirmation.onConfirm();
            }
          }}
        >
          <rect x=\"-67\" y=\"-52\" width=\"134\" height=\"32\" rx=\"4\" />
          <text x=\"0\" y=\"-32\">{operationConfirmation.label}</text>
        </g>}

        {showTerritoryLabels && activePaths.map(({ id }) => {
          const anchor = anchors[id];"""
)

css = Path('src/desktop-command-fit.css').read_text()
css = css.replace(""".priority-order-action.map {
  position: absolute;
  z-index: 8;
  left: 18px;
  bottom: 18px;
  display: grid;
  grid-template-columns: minmax(210px, 1fr) auto;
  align-items: stretch;
  gap: 12px;
  width: min(430px, calc(100% - 36px));
  padding: 11px 12px;
  backdrop-filter: blur(10px);
}

""", "")
css = css.replace(""".priority-order-action.map .primary {
  width: auto;
  min-width: 142px;
  padding-inline: 14px;
}

""", "")
css = css.replace("""@media (max-width: 900px) {
  .priority-order-action.map {
    display: none;
  }
}
""", "")
css += r'''

.map-operation-confirmation {
  cursor: pointer;
  filter: drop-shadow(0 7px 10px rgba(0, 0, 0, .5));
  outline: none;
}

.map-operation-confirmation rect {
  fill: rgba(92, 48, 36, .96);
  stroke: #ff9c77;
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.map-operation-confirmation text {
  fill: #fff3ed;
  font: 700 11px IBM Plex Mono, monospace;
  letter-spacing: .035em;
  text-anchor: middle;
  text-transform: uppercase;
  pointer-events: none;
}

.map-operation-confirmation:hover rect,
.map-operation-confirmation:focus-visible rect {
  fill: #8a4935;
  stroke: #ffd0bb;
  stroke-width: 2;
}

@media (max-width: 900px) {
  .map-operation-confirmation {
    display: none;
  }
}
'''
Path('src/desktop-command-fit.css').write_text(css)

Path('tests/desktop-command-fit.test.cjs').write_text(r'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('priority movement and attack controls remain above the detailed command panel', () => {
  const app = read('src/App.tsx');
  assert.match(app, /renderPriorityOrderAction\(\)/);
  assert.match(app, /ATTACK ORDER READY/);
  assert.match(app, /Begin operation/);
  assert.match(app, /Priority operational corridor/);
  assert.match(app, /beginOperation\(current, chosenRouteId/);
  assert.match(app, /issueMove\(current, chosenRouteId/);
});

test('desktop map uses a compact confirmation anchored to the selected attack territory', () => {
  const app = read('src/App.tsx');
  const map = read('src/components/MapView.tsx');
  const css = read('src/desktop-command-fit.css');
  assert.match(app, /operationConfirmation=\{canAttack && target/);
  assert.match(app, /Confirm operation\?/);
  assert.match(map, /operationConfirmationAnchor/);
  assert.match(map, /className="map-operation-confirmation"/);
  assert.match(map, /translate\(\$\{operationConfirmationAnchor\[0\]\}/);
  assert.match(css, /\.map-operation-confirmation\s*\{/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.map-operation-confirmation\s*\{[\s\S]*display:\s*none/);
  assert.doesNotMatch(css, /\.priority-order-action\.map/);
});

test('large desktop viewports fit the command shell and use internal panel scrolling', () => {
  const css = read('src/desktop-command-fit.css');
  assert.match(css, /@media \(min-width: 901px\) and \(min-height: 720px\)/);
  assert.match(css, /body\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.command-app-shell\s*\{[\s\S]*height:\s*100dvh[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.command-workspace\s*\{[\s\S]*flex:\s*1 1 auto[\s\S]*min-height:\s*0/);
  assert.match(css, /\.map-context-panel\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.command-view\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.europe-map-frame\s*\{[\s\S]*height:\s*auto/);
});

test('desktop fit stylesheet loads after every existing interface stylesheet', () => {
  const main = read('src/main.tsx');
  assert.ok(main.indexOf("./desktop-command-fit.css") > main.indexOf("./strategic-response.css"));
  assert.ok(main.indexOf("./desktop-command-fit.css") > main.indexOf("./command-interface.css"));
});
''')

Path('docs/design/phase-08b2-1-command-fit.md').write_text('''# Phase VIII-B2.1 — Desktop command fit\n\nThis interface correction keeps the large-screen command shell inside the browser viewport and moves immediate order controls to the decision point.\n\n## Behaviour\n\n- At desktop widths above 900 px and viewport heights of at least 720 px, the application shell occupies exactly one dynamic viewport height.\n- The map, navigation and command stage flex into the available height.\n- The command context panel and specialist command views scroll internally.\n- Below the height threshold, or on mobile layouts, normal document scrolling remains available.\n- A selected valid move or attack exposes a priority action immediately below the active-formation selector.\n- Valid desktop attack selections also expose a compact **Confirm operation?** control anchored directly above the selected territory.\n- The compact map control is hidden on mobile and never replaces the full right-panel action.\n- Parallel operational corridors can be selected from the priority panel action without scrolling.\n''')

print('Compact map confirmation patch applied.')

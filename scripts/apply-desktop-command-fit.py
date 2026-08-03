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
    """  const startCampaign = () => {
    setState(newGame(undefined, newDifficulty));
    setCurrentView('map');
  };

  const renderSelectedGroupPanel = () => <section className=\"selected-group selected-formation-card\">""",
    """  const startCampaign = () => {
    setState(newGame(undefined, newDifficulty));
    setCurrentView('map');
  };

  const renderPriorityOrderAction = (placement: 'panel' | 'map') => {
    if (!selectedGroup || !target || !targetInfo || selectedOperation || selectedGroup.order || selectedGroup.status === 'recovering') return null;
    const isAttack = targetInfo.kind === 'attack';
    const isMove = targetInfo.kind === 'move';
    if (!isAttack && !isMove) return null;

    const canExecute = isAttack ? canAttack : canMove;
    const actionLabel = isAttack ? (targetOperation ? 'Join operation' : 'Begin operation') : 'Issue movement order';
    const orderLabel = isAttack ? (targetOperation ? 'REINFORCE OPERATION' : 'ATTACK ORDER READY') : 'MOVEMENT ORDER READY';
    const execute = () => setState(current => isAttack
      ? beginOperation(current, chosenRouteId || undefined)
      : issueMove(current, chosenRouteId || undefined));

    return <div className={`priority-order-action ${placement} ${isAttack ? 'attack' : 'move'}`} aria-label=\"Priority order action\">
      <div className=\"priority-order-copy\">
        <p>{orderLabel}</p>
        <strong>{selectedGroup.name} → {target.centre}</strong>
        <span>{chosenRoute?.name ?? 'No operational corridor'}{chosenRouteDays ? ` · ~${chosenRouteDays} day${chosenRouteDays === 1 ? '' : 's'}` : ''}</span>
      </div>
      {placement === 'panel' && routeOptions.length > 1 && <label className=\"priority-route-select\"><span>Corridor</span>
        <select aria-label=\"Priority operational corridor\" value={chosenRouteId} onChange={event => setSelectedRouteId(event.target.value)}>
          {routeOptions.map(route => {
            const days = estimateRouteMovementDays(route, state.routeStates[route.id], selectedGroup);
            return <option key={route.id} value={route.id}>{route.name} · ~{days} day{days === 1 ? '' : 's'}</option>;
          })}
        </select>
      </label>}
      <button type=\"button\" className={isAttack ? 'primary danger-action' : 'primary'} disabled={!canExecute} onClick={execute}>{actionLabel}</button>
    </div>;
  };

  const renderSelectedGroupPanel = () => <section className=\"selected-group selected-formation-card\">"""
)

replace_once(
    'src/App.tsx',
    """              </label>
              <div className=\"quick-links\"><button onClick={() => setCurrentView('forces')}>Manage forces</button><button onClick={() => setCurrentView('operations')}>Review operations</button></div>""",
    """              </label>
              {renderPriorityOrderAction('panel')}
              <div className=\"quick-links\"><button onClick={() => setCurrentView('forces')}>Manage forces</button><button onClick={() => setCurrentView('operations')}>Review operations</button></div>"""
)

replace_once(
    'src/App.tsx',
    """            <MapView state={state} onSelect={id => setState(current => selectTerritory(current, id))} onSelectGroup={id => setState(current => selectTaskGroup(current, id))} />
          </div>""",
    """            <MapView state={state} onSelect={id => setState(current => selectTerritory(current, id))} onSelectGroup={id => setState(current => selectTaskGroup(current, id))} />
            {renderPriorityOrderAction('map')}
          </div>"""
)

replace_once(
    'src/main.tsx',
    """import './strategic-response.css';
import './persistence-feedback';""",
    """import './strategic-response.css';
import './desktop-command-fit.css';
import './persistence-feedback';"""
)

Path('src/desktop-command-fit.css').write_text(r'''/* Desktop viewport fit and priority command actions. */

.map-panel {
  position: relative;
}

.priority-order-action {
  border: 1px solid #3c696d;
  background: linear-gradient(135deg, rgba(15, 55, 58, .98), rgba(8, 28, 36, .98));
  box-shadow: 0 12px 34px rgba(0, 0, 0, .34);
}

.priority-order-action.attack {
  border-color: #b96c55;
  background: linear-gradient(135deg, rgba(88, 48, 38, .98), rgba(32, 28, 31, .98));
}

.priority-order-action.panel {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding: 10px;
}

.priority-order-action.map {
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

.priority-order-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.priority-order-copy p {
  margin: 0;
  color: #8ff9ed;
  font: 600 8px IBM Plex Mono, monospace;
  letter-spacing: .13em;
}

.priority-order-action.attack .priority-order-copy p {
  color: #ffb19b;
}

.priority-order-copy strong {
  overflow: hidden;
  color: #effffc;
  font: 600 17px Barlow Condensed, sans-serif;
  letter-spacing: .02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.priority-order-copy span {
  overflow: hidden;
  color: #91a8b1;
  font: 500 9px IBM Plex Mono, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.priority-route-select {
  display: grid;
  gap: 4px;
  color: #78919c;
  font: 500 8px IBM Plex Mono, monospace;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.priority-route-select select {
  width: 100%;
  min-width: 0;
  border: 1px solid #46626d;
  background: #0d252e;
  color: #dbe8ee;
  padding: 7px 8px;
  font: 500 9px IBM Plex Mono, monospace;
}

.priority-order-action.map .primary {
  width: auto;
  min-width: 142px;
  padding-inline: 14px;
}

@media (min-width: 901px) and (min-height: 720px) {
  html,
  body,
  #root {
    height: 100%;
    min-height: 0;
  }

  body {
    overflow: hidden;
  }

  .command-app-shell {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    min-height: 0;
    max-height: 100dvh;
    padding: 12px 28px 14px;
    overflow: hidden;
  }

  .command-topbar {
    flex: 0 0 58px;
    height: 58px;
    min-height: 58px;
  }

  .command-metrics {
    flex: 0 0 auto;
    min-height: 58px;
    margin: 10px 0;
  }

  .command-metrics > div {
    padding: 8px 13px;
  }

  .command-workspace {
    flex: 1 1 auto;
    align-items: stretch;
    width: 100%;
    height: auto;
    min-height: 0;
  }

  .command-navigation {
    position: static;
    top: auto;
    height: 100%;
    min-height: 0;
  }

  .command-brand {
    min-height: 58px;
  }

  .command-nav-items {
    flex: 1 1 auto;
    grid-template-rows: repeat(6, minmax(54px, 1fr));
    min-height: 0;
  }

  .command-nav-items button {
    min-height: 0;
  }

  .command-nav-footer {
    min-height: 34px;
  }

  .command-stage {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .command-map-workspace {
    align-items: stretch;
    height: 100%;
    min-height: 0;
  }

  .map-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .map-heading {
    min-height: 48px;
  }

  .europe-map-frame {
    height: auto;
    min-height: 0;
  }

  .map-context-panel {
    height: 100%;
    max-height: none;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .command-view {
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }
}

@media (max-width: 900px) {
  .priority-order-action.map {
    display: none;
  }
}
''')

Path('tests/desktop-command-fit.test.cjs').write_text(r'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('priority movement and attack controls appear above the detailed command panel', () => {
  const app = read('src/App.tsx');
  assert.match(app, /renderPriorityOrderAction\('panel'\)/);
  assert.match(app, /ATTACK ORDER READY/);
  assert.match(app, /Begin operation/);
  assert.match(app, /Priority operational corridor/);
  assert.match(app, /beginOperation\(current, chosenRouteId/);
  assert.match(app, /issueMove\(current, chosenRouteId/);
});

test('desktop command map also exposes the selected order as a floating action', () => {
  const app = read('src/App.tsx');
  const css = read('src/desktop-command-fit.css');
  assert.match(app, /renderPriorityOrderAction\('map'\)/);
  assert.match(css, /\.priority-order-action\.map\s*\{[\s\S]*position:\s*absolute/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.priority-order-action\.map\s*\{[\s\S]*display:\s*none/);
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

Path('docs/design/phase-08b2-1-command-fit.md').write_text('''# Phase VIII-B2.1 — Desktop command fit\n\nThis interface correction keeps the large-screen command shell inside the browser viewport and moves immediate order controls to the decision point.\n\n## Behaviour\n\n- At desktop widths above 900 px and viewport heights of at least 720 px, the application shell occupies exactly one dynamic viewport height.\n- The map, navigation and command stage flex into the available height.\n- The command context panel and specialist command views scroll internally.\n- Below the height threshold, or on mobile layouts, normal document scrolling remains available.\n- A selected valid move or attack exposes a priority action immediately below the active-formation selector.\n- Desktop map view also displays a floating duplicate action; the detailed order card remains available lower in the context panel.\n- Parallel operational corridors can be selected from the priority action without scrolling.\n''')

print('Desktop command fit patch applied.')

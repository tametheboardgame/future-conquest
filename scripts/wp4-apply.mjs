import fs from 'node:fs';

function replaceOnce(path, search, replacement) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(search)) throw new Error(`Expected source block not found in ${path}: ${search.slice(0, 140)}`);
  fs.writeFileSync(path, source.replace(search, replacement));
}

replaceOnce(
  'src/game/types.ts',
  `  fortification: number;\n  capturedTurn?: number;\n}`,
  `  fortification: number;\n  defencePreparedUntil?: number;\n  lastEntrenchTurn?: number;\n  capturedTurn?: number;\n}`
);

replaceOnce(
  'src/game/engine.ts',
  `import { occupationRequirement } from './formation-organisation';`,
  `import { occupationRequirement } from './formation-organisation';\nimport { recommendedReinforcementForTerritory } from './defence';`
);

replaceOnce(
  'src/game/engine.ts',
  `export function setGarrison(state: GameState): GameState {\n  if (strategicCollapseDecisionPending(state)) return state;\n  const group = state.taskGroups[state.selectedTaskGroupId];\n  if (!canIssueOperationalOrder(group)) return state;\n  const taskGroups = structuredClone(state.taskGroups);\n  const next = taskGroups[group.id];\n  next.status = next.status === 'garrison' ? 'ready' : 'garrison';\n  const updated = addEvent({ ...state, taskGroups }, \`${'${group.name}'} ${'${next.status === \'garrison\' ? \'assigned to occupation and defensive duties\' : \'released from garrison duty\''}'} in ${'${TERRITORIES[group.location].centre}'}.\`, 'neutral');\n  return next.status === 'garrison' && group.location !== state.portalTerritory\n    ? progressTutorial(updated, 'set-garrison')\n    : updated;\n}`,
  `export function setFormationGarrison(state: GameState, groupId: string, assigned?: boolean): GameState {\n  if (strategicCollapseDecisionPending(state) || state.status !== 'playing') return state;\n  const group = state.taskGroups[groupId];\n  if (!canIssueOperationalOrder(group) || state.territories[group.location]?.controller !== 'player') return state;\n  const shouldAssign = assigned ?? group.status !== 'garrison';\n  if (shouldAssign === (group.status === 'garrison')) return state;\n  const taskGroups = structuredClone(state.taskGroups);\n  taskGroups[group.id].status = shouldAssign ? 'garrison' : 'ready';\n  const updated = addEvent(\n    { ...state, taskGroups },\n    \`${'${group.name}'} ${'${shouldAssign ? \'assigned to occupation and defensive duties\' : \'released from garrison duty\''}'} in ${'${TERRITORIES[group.location].centre}'}.\`,\n    'neutral'\n  );\n  return shouldAssign && group.location !== state.portalTerritory\n    ? progressTutorial(updated, 'set-garrison')\n    : updated;\n}\n\nexport function setGarrison(state: GameState): GameState {\n  return setFormationGarrison(state, state.selectedTaskGroupId);\n}\n\nexport function entrenchTerritory(state: GameState, territoryId: string, groupId = state.selectedTaskGroupId): GameState {\n  if (strategicCollapseDecisionPending(state) || state.status !== 'playing') return state;\n  const territory = state.territories[territoryId];\n  const group = state.taskGroups[groupId];\n  if (\n    !territory\n    || territory.controller !== 'player'\n    || !group\n    || group.location !== territoryId\n    || group.status !== 'garrison'\n    || group.order\n    || group.supply < 8\n    || territory.lastEntrenchTurn === state.turn\n    || territory.fortification >= 45\n  ) return state;\n  const territories = structuredClone(state.territories);\n  const taskGroups = structuredClone(state.taskGroups);\n  territories[territoryId].fortification = clamp(territories[territoryId].fortification + 6, 0, 45);\n  territories[territoryId].lastEntrenchTurn = state.turn;\n  taskGroups[groupId].supply = clamp(taskGroups[groupId].supply - 6, 0, 100);\n  return addEvent(\n    { ...state, territories, taskGroups },\n    \`${'${group.name}'} improved field defences around ${'${TERRITORIES[territoryId].centre}'}. Fortification is now ${'${Math.round(territories[territoryId].fortification)}'}/45.\`,\n    'neutral'\n  );\n}\n\nexport function prepareTerritoryDefence(state: GameState, territoryId: string): GameState {\n  if (strategicCollapseDecisionPending(state) || state.status !== 'playing') return state;\n  const territory = state.territories[territoryId];\n  if (!territory || territory.controller !== 'player' || (territory.defencePreparedUntil ?? 0) >= state.turn + 2) return state;\n  const participants = Object.values(state.taskGroups).filter(group => (\n    group.location === territoryId\n    && group.personnel > 0\n    && !group.order\n    && (group.status === 'ready' || group.status === 'garrison')\n    && group.supply >= 5\n  ));\n  if (!participants.length) return state;\n  const territories = structuredClone(state.territories);\n  const taskGroups = structuredClone(state.taskGroups);\n  territories[territoryId].defencePreparedUntil = state.turn + 2;\n  for (const group of participants) taskGroups[group.id].supply = clamp(taskGroups[group.id].supply - 4, 0, 100);\n  return addEvent(\n    { ...state, territories, taskGroups },\n    \`${'${TERRITORIES[territoryId].centre}'} placed on prepared defence through day ${'${state.turn + 2}'}. ${'${participants.length}'} local formation${'${participants.length === 1 ? \'\' : \'s\''}'} dispersed, rehearsed fallback positions and committed carried stocks.\`,\n    'warning'\n  );\n}\n\nexport function reinforceTerritory(state: GameState, territoryId: string): GameState {\n  if (strategicCollapseDecisionPending(state) || state.status !== 'playing') return state;\n  const candidate = recommendedReinforcementForTerritory(state, territoryId);\n  if (!candidate) return state;\n  const route = chooseOperationalRoute(state.routeStates, candidate.location, territoryId, candidate);\n  if (!route) return state;\n  const taskGroups = structuredClone(state.taskGroups);\n  taskGroups[candidate.id].status = 'moving';\n  taskGroups[candidate.id].order = { type: 'move', target: territoryId, progress: 0, days: 0, routeId: route.id };\n  return progressTutorial(addEvent(\n    { ...state, taskGroups, selectedTaskGroupId: candidate.id, selectedTerritory: territoryId, targetTerritory: null },\n    \`${'${candidate.name}'} ordered to reinforce ${'${TERRITORIES[territoryId].centre}'} via ${'${route.name}'}.\`,\n    'warning'\n  ), 'issue-move');\n}`
);

replaceOnce(
  'src/game/engine.ts',
  `function resolveCounterattack(state: GameState, forced = false): GameState {`,
  `export function counterattackDefencePower(state: GameState, territoryId: string): number {\n  const defenders = Object.values(state.taskGroups).filter(group => group.location === territoryId && group.personnel > 0);\n  const preparedBonus = (state.territories[territoryId]?.defencePreparedUntil ?? 0) >= state.turn ? 3.5 : 0;\n  return defenders.reduce((sum, group) => sum + group.personnel / 1000 * 4 + deployableArmour(group) / 1000 * 1.5 + (group.status === 'garrison' ? 2.5 : 0), 0)\n    + (state.territories[territoryId]?.fortification ?? 0) / 7\n    + 1.5\n    + preparedBonus;\n}\n\nfunction resolveCounterattack(state: GameState, forced = false): GameState {`
);

replaceOnce(
  'src/game/engine.ts',
  `  frontier.sort((a, b) => {\n    const defence = (id: string) => Object.values(state.taskGroups).filter(group => group.location === id).reduce((sum, group) => sum + group.personnel + deployableArmour(group) * 0.25, 0) + state.territories[id].fortification * 80;\n    return defence(a) - defence(b);\n  });`,
  `  frontier.sort((a, b) => counterattackDefencePower(state, a) - counterattackDefencePower(state, b));`
);

replaceOnce(
  'src/game/engine.ts',
  `  const defenderPower = defenders.reduce((sum, group) => sum + group.personnel / 1000 * 4 + deployableArmour(group) / 1000 * 1.5 + (group.status === 'garrison' && group.personnel > 0 ? 2.5 : 0), 0) + state.territories[target].fortification / 7 + 1.5;`,
  `  const defenderPower = counterattackDefencePower(state, target);`
);

replaceOnce(
  'src/App.tsx',
  `import { LogisticsCommand } from './components/LogisticsCommand';`,
  `import { LogisticsCommand } from './components/LogisticsCommand';\nimport { DefencePanel } from './components/DefencePanel';`
);

replaceOnce(
  'src/App.tsx',
  `      </dl>\n      <p className="network-section-heading">STRATEGIC INFRASTRUCTURE</p>`,
  `      </dl>\n      {state.territories[selected.id].controller === 'player' && <DefencePanel state={state} territoryId={selected.id} onChange={setState} />}\n      <p className="network-section-heading">STRATEGIC INFRASTRUCTURE</p>`
);

replaceOnce(
  'src/App.tsx',
  `      <div><p className="eyebrow">PHASE VIII-D / OPERATIONAL CLARITY AND ONBOARDING</p><h1>FUTURE CONQUEST</h1></div>`,
  `      <div><p className="eyebrow">PLAYTEST 1 / WP4 · DEFENCE AND THREAT CLARITY</p><h1>FUTURE CONQUEST</h1></div>`
);

replaceOnce(
  'src/App.tsx',
  `    {threatenedTerritories.length > 0 && <section className="enemy-threat-strip" aria-live="assertive">\n      <strong>ENEMY ACTION DETECTED · REVIEW THREATENED AND RECENTLY CONTESTED TERRITORIES</strong>\n      <div className="enemy-threat-list">{threatenedTerritories.map(threat => <button type="button" key={threat.territoryId} className={threat.stage} onClick={() => openThreatOnMap(threat.territoryId)}>\n        <span><b>{TERRITORIES[threat.territoryId].centre}</b><small>{threat.formationCount} formation{threat.formationCount === 1 ? '' : 's'} · {threat.stage.replace('-', ' ')}</small></span>\n        <strong>{threat.stage === 'recent-combat' ? 'AFTER ACTION' : threat.stage === 'under-attack' ? 'NOW' : \`DAY ${'${threat.executeTurn}'}\`}</strong>\n      </button>)}</div>\n    </section>}`,
  `    {threatenedTerritories.length > 0 && (() => {\n      const threat = threatenedTerritories[0];\n      const timing = threat.stage === 'recent-combat'\n        ? 'after action'\n        : threat.stage === 'under-attack'\n          ? 'engaged now'\n          : \`estimated Day ${'${threat.executeTurn}'}\`;\n      return <section className={\`enemy-action-alert ${'${threat.stage}'}\`} aria-live="assertive">\n        <span className="enemy-action-symbol" aria-hidden="true">⚠</span>\n        <div className="enemy-action-copy">\n          <strong>{threat.stage === 'recent-combat' ? 'COUNTERATTACK RESOLVED' : 'COUNTERATTACK DETECTED'}</strong>\n          <span>{TERRITORIES[threat.territoryId].centre} · {threat.formationCount} formation{threat.formationCount === 1 ? '' : 's'} · {timing}</span>\n          {threatenedTerritories.length > 1 && <small>+{threatenedTerritories.length - 1} additional threatened position{threatenedTerritories.length === 2 ? '' : 's'}</small>}\n        </div>\n        <button type="button" onClick={() => openThreatOnMap(threat.territoryId)}>Review</button>\n      </section>;\n    })()}`
);

replaceOnce(
  'src/components/MapView.tsx',
  `        <marker id="operationArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" /></marker><marker id="enemyMovementArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker>`,
  `        <marker id="operationArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" /></marker><marker id="enemyMovementArrow" markerWidth="5" markerHeight="5" refX="4.4" refY="2.5" orient="auto"><path className="enemy-movement-arrowhead" d="M0,0 L5,2.5 L0,5 Z" /></marker>`
);

replaceOnce(
  'src/components/MapView.tsx',
  `        {layers.enemyUnits && enemyMovementOrders.map(order => {\n          const origin = order.origin ? anchors[order.origin] : undefined;\n          const target = anchors[order.target];\n          if (!origin || !target) return null;\n          return <line key={\`enemy-move-${'${order.id}'}\`} className="enemy-concentration-route" x1={origin[0]} y1={origin[1]} x2={target[0]} y2={target[1]}><title>{order.summary}</title></line>;\n        })}`,
  `        {layers.enemyUnits && enemyMovementOrders.map(order => {\n          const origin = order.origin ? anchors[order.origin] : undefined;\n          const target = anchors[order.target];\n          if (!origin || !target) return null;\n          const formationCount = 1 + (order.supportFormationIds?.length ?? 0);\n          const operationWidth = 1.25 + Math.min(1.75, Math.max(0, formationCount - 1) * 0.45);\n          const timing = order.status === 'completed' ? 'recently resolved' : order.executeTurn ? \`expected day ${'${order.executeTurn}'}\` : 'movement detected';\n          return <line\n            key={\`enemy-move-${'${order.id}'}\`}\n            className={\`enemy-concentration-route ${'${order.type}'} ${'${order.status}'}\`}\n            x1={origin[0]} y1={origin[1]} x2={target[0]} y2={target[1]}\n            style={{ strokeWidth: operationWidth }}\n            vectorEffect="non-scaling-stroke"\n            markerEnd="url(#enemyMovementArrow)"\n            onClick={event => { event.stopPropagation(); selectTerritory(order.target); }}\n          ><title>{order.summary} · {formationCount} formation{formationCount === 1 ? '' : 's'} · {timing}</title></line>;\n        })}`
);

replaceOnce(
  'src/main.tsx',
  `import './logistics-priorities.css';`,
  `import './logistics-priorities.css';\nimport './defence.css';`
);

console.log('WP4 defence and threat integration applied.');

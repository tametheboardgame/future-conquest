from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:160]!r}")
    file.write_text(text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str) -> None:
    file = Path(path)
    text = file.read_text()
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{path}: regex expected one match, found {count}: {pattern[:160]!r}")
    file.write_text(updated)


# Supply labels exported for interface use.
replace_once(
    'src/game/supply-network.ts',
    "const round1 = (value: number) => Math.round(value * 10) / 10;\n",
    "const round1 = (value: number) => Math.round(value * 10) / 10;\n\nexport const SUPPLY_CONDITION_LABELS: Record<SupplyCondition, string> = {\n  sustained: 'Sustained',\n  strained: 'Strained',\n  undersupplied: 'Undersupplied',\n  critical: 'Critical',\n  'cut-off': 'Cut off'\n};\n"
)

# Engine integration and save migration.
replace_once(
    'src/game/engine.ts',
    "import { createRouteStates } from './strategic-network';\n",
    "import { createRouteStates } from './strategic-network';\nimport { createEmptyLogisticsState, refreshSupplyNetwork } from './supply-network';\n"
)
replace_once(
    'src/game/engine.ts',
    "const SAVE_KEY = 'future-conquest-slice-v0.7';\nconst LEGACY_V6_SAVE_KEY = 'future-conquest-slice-v0.6';",
    "const SAVE_KEY = 'future-conquest-slice-v0.8';\nconst LEGACY_V7_SAVE_KEY = 'future-conquest-slice-v0.7';\nconst LEGACY_V6_SAVE_KEY = 'future-conquest-slice-v0.6';"
)
regex_once(
    'src/game/engine.ts',
    r"function suppliedTerritories\(state: GameState\): Set<string> \{.*?\n\}\n\nfunction refreshSupply\(state: GameState\): GameState \{.*?\n\}\n",
    "function refreshSupply(state: GameState): GameState {\n  return refreshSupplyNetwork(state);\n}\n"
)
replace_once('src/game/engine.ts', '    version: 7,\n', '    version: 8,\n')
replace_once(
    'src/game/engine.ts',
    "    routeStates: createRouteStates(),\n    supply: 100,",
    "    routeStates: createRouteStates(),\n    logistics: createEmptyLogisticsState(1),\n    supply: 100,"
)
replace_once(
    'src/game/engine.ts',
    "    routeStates: structuredClone(state.routeStates),\n    events: [...state.events]",
    "    routeStates: structuredClone(state.routeStates),\n    logistics: structuredClone(state.logistics),\n    events: [...state.events]"
)

regex_once(
    'src/game/engine.ts',
    r"  next = refreshSupply\(next\);\n  for \(const group of Object\.values\(next\.taskGroups\)\) \{.*?\n  \}\n\n  const administered =",
    """  next = refreshSupply(next);
  const stressedGroups: string[] = [];
  for (const group of Object.values(next.taskGroups)) {
    const allocation = next.logistics.formationAllocations[group.id];
    const condition = allocation?.condition ?? 'cut-off';
    const deliveryRatio = (allocation?.ratio ?? 0) / 100;
    const stockChange = condition === 'sustained'
      ? 7
      : condition === 'strained'
        ? 1
        : condition === 'undersupplied'
          ? -7
          : condition === 'critical'
            ? -13
            : -19;
    group.supply = clamp(group.supply + stockChange, 0, 100);
    group.morale = clamp(
      group.morale + (
        (condition === 'sustained' || condition === 'strained') && group.status !== 'attacking'
          ? 1
          : condition === 'critical'
            ? -2
            : condition === 'cut-off'
              ? -4
              : 0
      ),
      5,
      100
    );
    if (condition === 'undersupplied' || condition === 'critical' || condition === 'cut-off') stressedGroups.push(group.name);
    if (condition === 'cut-off' && group.supply < 20) {
      const attrition = Math.max(2, Math.round(group.personnel * 0.0025));
      group.personnel = Math.max(0, group.personnel - attrition);
      next = addEvent(next, `${group.name} is cut off in ${TERRITORIES[group.location].centre}; ${attrition} personnel lost to attrition and desertion.`, 'danger');
    }
    if (group.status === 'recovering' && deliveryRatio >= 0.65) group.status = 'ready';
    const repair = deliveryRatio >= 0.4
      ? Math.min(group.damagedArmour, Math.max(1, Math.round((deliveryRatio * 10 + TERRITORIES[group.location].supply * 2.5) * difficultyRules[next.difficulty].recovery)))
      : 0;
    group.damagedArmour -= repair;
    group.functionalArmour += repair;
  }

  if (next.logistics.bottleneckRouteIds.length) {
    const names = next.logistics.bottleneckRouteIds.slice(0, 3).map(id => STRATEGIC_ROUTE_BY_ID[id]?.name ?? id).join(', ');
    next = addEvent(next, `Supply throughput is constrained by ${names}. Network delivery is ${next.logistics.networkEfficiency}% of demand.`, next.logistics.networkEfficiency < 55 ? 'danger' : 'warning');
  } else if (stressedGroups.length) {
    next = addEvent(next, `${stressedGroups.join(', ')} received less than their daily logistics demand.`, 'warning');
  }

  const administered ="""
)
replace_once(
    'src/game/engine.ts',
    "    const candidates = Object.values(next.taskGroups).filter(group => next.territories[group.location].supplied && group.personnel < group.maxPersonnel);",
    "    const candidates = Object.values(next.taskGroups).filter(group => (next.logistics.formationAllocations[group.id]?.ratio ?? 0) >= 65 && group.personnel < group.maxPersonnel);"
)

replace_once(
    'src/game/engine.ts',
    "type NetworkField = 'routeStates';\n\ntype LegacyV6GameState = Omit<GameState, 'version'> & { version: 6 };\ntype LegacyV5GameState = Omit<GameState, 'version' | NetworkField> & { version: 5 };\ntype LegacyV4GameState = Omit<GameState, 'version' | StrategicField | NetworkField> & { version: 4 };\ntype LegacyV3GameState = Omit<GameState, 'version' | StrategicField | NetworkField> & { version: 3 };\ntype LegacyGameState = Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField> & {",
    "type NetworkField = 'routeStates';\ntype LogisticsField = 'logistics';\n\ntype LegacyV7GameState = Omit<GameState, 'version' | LogisticsField> & { version: 7 };\ntype LegacyV6GameState = Omit<GameState, 'version' | LogisticsField> & { version: 6 };\ntype LegacyV5GameState = Omit<GameState, 'version' | NetworkField | LogisticsField> & { version: 5 };\ntype LegacyV4GameState = Omit<GameState, 'version' | StrategicField | NetworkField | LogisticsField> & { version: 4 };\ntype LegacyV3GameState = Omit<GameState, 'version' | StrategicField | NetworkField | LogisticsField> & { version: 3 };\ntype LegacyGameState = Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField | LogisticsField> & {"
)

regex_once(
    'src/game/engine.ts',
    r"export function loadGame\(\): GameState \| null \{.*?\n\}\n\nexport const __testOnly",
    """export function loadGame(): GameState | null {
  const current = localStorage.getItem(SAVE_KEY);
  if (current) {
    const parsed = JSON.parse(current) as Partial<GameState>;
    if (
      parsed.version === 8
      && parsed.taskGroups
      && parsed.enemyFormations
      && parsed.operations
      && parsed.mobilisations
      && parsed.enemyOrders
      && parsed.intelligenceReports
      && parsed.routeStates
    ) return upgradeStrategicState(parsed as GameState);
  }

  const v7 = localStorage.getItem(LEGACY_V7_SAVE_KEY);
  if (v7) {
    const parsed = JSON.parse(v7) as Partial<LegacyV7GameState>;
    if (
      parsed.version === 7
      && parsed.taskGroups
      && parsed.enemyFormations
      && parsed.operations
      && parsed.mobilisations
      && parsed.enemyOrders
      && parsed.intelligenceReports
      && parsed.routeStates
    ) return upgradeStrategicState(parsed as LegacyV7GameState);
  }

  const v6 = localStorage.getItem(LEGACY_V6_SAVE_KEY);
  if (v6) {
    const parsed = JSON.parse(v6) as Partial<LegacyV6GameState>;
    if (
      parsed.version === 6
      && parsed.taskGroups
      && parsed.enemyFormations
      && parsed.operations
      && parsed.mobilisations
      && parsed.enemyOrders
      && parsed.intelligenceReports
      && parsed.routeStates
    ) return upgradeStrategicState(parsed as LegacyV6GameState);
  }

  const v5 = localStorage.getItem(LEGACY_V5_SAVE_KEY);
  if (v5) {
    const parsed = JSON.parse(v5) as Partial<LegacyV5GameState>;
    if (
      parsed.version === 5
      && parsed.taskGroups
      && parsed.enemyFormations
      && parsed.operations
      && parsed.mobilisations
      && parsed.enemyOrders
      && parsed.intelligenceReports
    ) return upgradeStrategicState(parsed as LegacyV5GameState);
  }

  const v4 = localStorage.getItem(LEGACY_V4_SAVE_KEY);
  if (v4) {
    const parsed = JSON.parse(v4) as Partial<LegacyV4GameState>;
    if (parsed.version === 4 && parsed.taskGroups && parsed.enemyFormations && parsed.operations) return upgradeStrategicState(parsed as LegacyV4GameState);
  }

  const prior = localStorage.getItem(LEGACY_V3_SAVE_KEY);
  if (prior) {
    const parsed = JSON.parse(prior) as Partial<LegacyV3GameState>;
    if (parsed.version === 3 && parsed.taskGroups && parsed.enemyFormations && parsed.operations) return upgradeStrategicState({ ...(parsed as LegacyV3GameState), version: 4 } as LegacyV4GameState);
  }

  const legacy = localStorage.getItem(LEGACY_V2_SAVE_KEY);
  if (!legacy) return null;
  const parsed = JSON.parse(legacy) as Partial<LegacyGameState>;
  if (parsed.version !== 2 || !parsed.taskGroups || !parsed.enemyFormations) return null;
  return migrateLegacyGame(parsed as LegacyGameState);
}

export const __testOnly"""
)
replace_once(
    'src/game/engine.ts',
    "  resolveOperations,\n  pruneOperations,",
    "  resolveOperations,\n  resolveOccupationAndLogistics,\n  pruneOperations,"
)

# Upgrade pipeline now derives version 8 logistics on every load.
replace_once(
    'src/game/strategic-response.ts',
    "import { normaliseTaskGroupOrderRoutes } from './route-movement';\n",
    "import { normaliseTaskGroupOrderRoutes } from './route-movement';\nimport { refreshSupplyNetwork } from './supply-network';\n"
)
replace_once(
    'src/game/strategic-response.ts',
    "  | 'intelligenceReports'\n  | 'routeStates';",
    "  | 'intelligenceReports'\n  | 'routeStates'\n  | 'logistics';"
)
replace_once(
    'src/game/strategic-response.ts',
    "  routeStates?: GameState['routeStates'];\n};",
    "  routeStates?: GameState['routeStates'];\n  logistics?: GameState['logistics'];\n};"
)
regex_once(
    'src/game/strategic-response.ts',
    r"  return \{\n    \.\.\.state,\n    version: 7,.*?\n  \} as GameState;",
    """  const upgraded = {
    ...state,
    version: 8,
    taskGroups,
    routeStates,
    escalationStage: state.escalationStage ?? defaults.escalationStage,
    mobilisationPool: typeof state.mobilisationPool === 'number' && Number.isFinite(state.mobilisationPool)
      ? Math.max(0, state.mobilisationPool)
      : defaults.mobilisationPool,
    mobilisations: Array.isArray(state.mobilisations) ? state.mobilisations : defaults.mobilisations,
    enemyOrders: Array.isArray(state.enemyOrders) ? state.enemyOrders : defaults.enemyOrders,
    intelligenceReports: Array.isArray(state.intelligenceReports) && state.intelligenceReports.length
      ? state.intelligenceReports
      : defaults.intelligenceReports
  } as GameState;
  return refreshSupplyNetwork(upgraded);"""
)

# Persistence controller version 8 and v7 fallback.
persistence = Path('src/game/persistence.ts')
text = persistence.read_text()
text = text.replace("export const CURRENT_SAVE_KEY = 'future-conquest-slice-v0.7';", "export const CURRENT_SAVE_KEY = 'future-conquest-slice-v0.8';")
text = text.replace("export const SAVE_METADATA_KEY = 'future-conquest-slice-v0.7-metadata';", "export const SAVE_METADATA_KEY = 'future-conquest-slice-v0.8-metadata';\nexport const LEGACY_V7_SAVE_KEY = 'future-conquest-slice-v0.7';")
text = text.replace('saveVersion: 7;', 'saveVersion: 8;')
text = text.replace("source: 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2'", "source: 'v8' | 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2'")
text = text.replace("type NetworkField = 'routeStates';\n\ntype LegacyV6State = Omit<GameState, 'version'> & { version: 6 };", "type NetworkField = 'routeStates';\ntype LogisticsField = 'logistics';\n\ntype LegacyV7State = Omit<GameState, 'version' | LogisticsField> & { version: 7 };\ntype LegacyV6State = Omit<GameState, 'version' | LogisticsField> & { version: 6 };")
text = text.replace("Omit<GameState, 'version' | NetworkField>", "Omit<GameState, 'version' | NetworkField | LogisticsField>")
text = text.replace("Omit<GameState, 'version' | StrategicField | NetworkField>", "Omit<GameState, 'version' | StrategicField | NetworkField | LogisticsField>")
text = text.replace("Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField>", "Omit<GameState, 'version' | 'operations' | StrategicField | NetworkField | LogisticsField>")
text = text.replace("function isV7State(value: unknown): value is GameState {\n  return hasCoreCampaignState(value)\n    && value.version === 7\n    && hasStrategicCollections(value)\n    && isRecord(value.routeStates);\n}\n", "function isV8State(value: unknown): value is GameState {\n  return hasCoreCampaignState(value)\n    && value.version === 8\n    && hasStrategicCollections(value)\n    && isRecord(value.routeStates)\n    && isRecord(value.logistics);\n}\n\nfunction isV7State(value: unknown): value is LegacyV7State {\n  return hasCoreCampaignState(value)\n    && value.version === 7\n    && hasStrategicCollections(value)\n    && isRecord(value.routeStates);\n}\n")
text = text.replace('    saveVersion: 7,', '    saveVersion: 8,')
text = text.replace('    && value.saveVersion === 7', '    && value.saveVersion === 8')
text = text.replace("function inspectRaw(storage: StorageReader, raw: string, source: 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2')", "function inspectRaw(storage: StorageReader, raw: string, source: 'v8' | 'v7' | 'v6' | 'v5' | 'v4' | 'v3' | 'v2')")
text = text.replace("    if (source === 'v7' && isV7State(parsed)) {\n      return { ok: true, state: upgradeStrategicState(parsed), metadata: readMetadata(storage, parsed), source };\n    }", "    if (source === 'v8' && isV8State(parsed)) {\n      return { ok: true, state: upgradeStrategicState(parsed), metadata: readMetadata(storage, parsed), source };\n    }\n    if (source === 'v7' && isV7State(parsed)) {\n      const state = upgradeStrategicState(parsed);\n      return { ok: true, state, metadata: createSaveMetadata(state, null), source };\n    }")
text = text.replace("  if (current) return inspectRaw(storage, current, 'v7');\n\n  const v6", "  if (current) return inspectRaw(storage, current, 'v8');\n\n  const v7 = readRaw(storage, LEGACY_V7_SAVE_KEY);\n  if (typeof v7 !== 'string' && v7 !== null) return v7;\n  if (v7) return inspectRaw(storage, v7, 'v7');\n\n  const v6")
text = text.replace('    if (!isV7State(parsed))', '    if (!isV8State(parsed))')
persistence.write_text(text)

# Main application: metrics, allocation detail, warnings and phase marker.
replace_once(
    'src/App.tsx',
    "import { estimateRouteMovementDays } from './game/route-movement';\n",
    "import { estimateRouteMovementDays } from './game/route-movement';\nimport { SUPPLY_CONDITION_LABELS } from './game/supply-network';\n"
)
replace_once(
    'src/App.tsx',
    "  const selectedGroup = state.taskGroups[state.selectedTaskGroupId] ?? groups[0] ?? null;\n",
    "  const selectedGroup = state.taskGroups[state.selectedTaskGroupId] ?? groups[0] ?? null;\n  const selectedGroupSupply = selectedGroup ? state.logistics.formationAllocations[selectedGroup.id] : undefined;\n"
)
replace_once(
    'src/App.tsx',
    "  const selected = state.selectedTerritory ? TERRITORIES[state.selectedTerritory] : null;\n",
    "  const selected = state.selectedTerritory ? TERRITORIES[state.selectedTerritory] : null;\n  const selectedTerritorySupply = selected ? state.logistics.territoryAllocations[selected.id] : undefined;\n"
)
replace_once(
    'src/App.tsx',
    "  const supplyDisruptions = territoryDefinitions.filter(territory => {\n    const territoryState = state.territories[territory.id];\n    return territoryState.controller === 'player' && !territoryState.supplied;\n  });\n",
    "  const supplyDisruptions = territoryDefinitions.filter(territory => {\n    const territoryState = state.territories[territory.id];\n    return territoryState.controller === 'player' && !territoryState.supplied;\n  });\n  const stressedFormations = groups.filter(group => {\n    const condition = state.logistics.formationAllocations[group.id]?.condition;\n    return condition === 'undersupplied' || condition === 'critical' || condition === 'cut-off';\n  });\n  const bottleneckRoutes = state.logistics.bottleneckRouteIds.flatMap(id => STRATEGIC_ROUTE_BY_ID[id] ? [STRATEGIC_ROUTE_BY_ID[id]] : []);\n"
)
replace_once(
    'src/App.tsx',
    "        <div><dt>Local supply</dt><dd>{Math.round(selectedGroup.supply)}%</dd></div>\n        <div><dt>Status</dt><dd>{selectedGroup.status}</dd></div>",
    "        <div><dt>Local supply stock</dt><dd>{Math.round(selectedGroup.supply)}%</dd></div>\n        <div><dt>Delivered throughput</dt><dd>{selectedGroupSupply ? `${selectedGroupSupply.delivered} / ${selectedGroupSupply.demand}` : '—'}</dd></div>\n        <div><dt>Logistics condition</dt><dd><span className={`supply-condition ${selectedGroupSupply?.condition ?? 'cut-off'}`}>{SUPPLY_CONDITION_LABELS[selectedGroupSupply?.condition ?? 'cut-off']}</span></dd></div>\n        <div><dt>Status</dt><dd>{selectedGroup.status}</dd></div>"
)
replace_once(
    'src/App.tsx',
    "        <div><dt>Supply route</dt><dd>{state.territories[selected.id].supplied ? 'connected' : 'isolated'}</dd></div>\n        <div><dt>Fortification</dt>",
    "        <div><dt>Supply route</dt><dd>{state.territories[selected.id].supplied ? 'connected' : 'isolated'}</dd></div>\n        <div><dt>Delivered throughput</dt><dd>{selectedTerritorySupply ? `${selectedTerritorySupply.delivered} / ${selectedTerritorySupply.demand}` : '—'}</dd></div>\n        <div><dt>Logistics condition</dt><dd>{selectedTerritorySupply ? SUPPLY_CONDITION_LABELS[selectedTerritorySupply.condition] : 'No allocation'}</dd></div>\n        <div><dt>Fortification</dt>"
)
replace_once('src/App.tsx', 'PHASE VIII-B2 / ROUTE MOVEMENT', 'PHASE VIII-B3 / SUPPLY THROUGHPUT')
replace_once(
    'src/App.tsx',
    "      <div><span>Network supply</span><strong>{state.supply}%</strong></div>",
    "      <div className={`network-supply-metric ${state.supply < 55 ? 'critical' : state.supply < 80 ? 'strained' : ''}`} title={`${state.logistics.totalDelivered} of ${state.logistics.totalDemand} supply points delivered`}><span>Network supply</span><strong>{state.logistics.networkEfficiency}%</strong></div>"
)
replace_once(
    'src/App.tsx',
    "                <div><dt>Supply route</dt><dd>{territoryState.supplied ? 'Connected' : 'Isolated'}</dd></div>\n                <div><dt>Fortification</dt>",
    "                <div><dt>Supply route</dt><dd>{territoryState.supplied ? 'Connected' : 'Isolated'}</dd></div>\n                <div><dt>Throughput</dt><dd>{state.logistics.territoryAllocations[territory.id] ? `${state.logistics.territoryAllocations[territory.id].delivered}/${state.logistics.territoryAllocations[territory.id].demand}` : '0/0'}</dd></div>\n                <div><dt>Fortification</dt>"
)

logistics_panel = """            <section className="view-panel logistics-network-panel">
              <div className="view-panel-heading"><p className="panel-label">LOGISTICS NETWORK</p><strong>{state.logistics.networkEfficiency}%</strong></div>
              <div className="logistics-summary-grid">
                <div><span>Source capacity</span><strong>{state.logistics.sourceUsed}/{state.logistics.sourceCapacity}</strong></div>
                <div><span>Total demand</span><strong>{state.logistics.totalDemand}</strong></div>
                <div><span>Delivered</span><strong>{state.logistics.totalDelivered}</strong></div>
                <div><span>Bottlenecks</span><strong>{bottleneckRoutes.length}</strong></div>
              </div>
              {bottleneckRoutes.length ? <div className="logistics-list">{bottleneckRoutes.map(route => {
                const flow = state.logistics.routeFlows[route.id];
                return <button key={route.id} onClick={() => openTerritoryOnMap(route.toTerritoryId)}><span><strong>{route.name}</strong><small>{flow.used}/{flow.capacity} throughput · {flow.condition}</small></span><b>{Math.round(flow.utilisation)}%</b></button>;
              })}</div> : <p className="empty-state">The controlled network currently has no saturated strategic corridor.</p>}
            </section>
"""
replace_once(
    'src/App.tsx',
    "            <section className=\"view-panel warning-panel\">",
    logistics_panel + "            <section className=\"view-panel warning-panel\">"
)
replace_once(
    'src/App.tsx',
    "              <div className=\"view-panel-heading\"><p className=\"panel-label\">SUPPLY WARNINGS</p><strong>{supplyDisruptions.length}</strong></div>\n              {supplyDisruptions.length ? <div className=\"intelligence-list\">{supplyDisruptions.map(territory => <button key={territory.id} onClick={() => openTerritoryOnMap(territory.id)}><span><strong>{territory.name}</strong><small>Controlled but isolated</small></span><b>RECONNECT</b></button>)}</div> : <p className=\"empty-state\">All controlled territories are connected to the supply network.</p>}",
    "              <div className=\"view-panel-heading\"><p className=\"panel-label\">SUPPLY WARNINGS</p><strong>{supplyDisruptions.length + stressedFormations.length}</strong></div>\n              {(supplyDisruptions.length || stressedFormations.length) ? <div className=\"intelligence-list\">\n                {stressedFormations.map(group => { const allocation = state.logistics.formationAllocations[group.id]; return <button key={group.id} onClick={() => openGroupOnMap(group.id)}><span><strong>{group.name}</strong><small>{TERRITORIES[group.location].centre} · {allocation ? SUPPLY_CONDITION_LABELS[allocation.condition] : 'Cut off'}</small></span><b>{allocation?.ratio ?? 0}%</b></button>; })}\n                {supplyDisruptions.map(territory => <button key={territory.id} onClick={() => openTerritoryOnMap(territory.id)}><span><strong>{territory.name}</strong><small>Controlled but isolated</small></span><b>RECONNECT</b></button>)}\n              </div> : <p className=\"empty-state\">All formations and controlled territories are receiving adequate throughput.</p>}"
)
replace_once(
    'src/App.tsx',
    "                <div><dt>Supply disruptions</dt><dd>{isolated}</dd></div>",
    "                <div><dt>Supply disruptions</dt><dd>{isolated}</dd></div>\n                <div><dt>Network throughput</dt><dd>{state.logistics.totalDelivered} / {state.logistics.totalDemand}</dd></div>\n                <div><dt>Route bottlenecks</dt><dd>{bottleneckRoutes.length}</dd></div>"
)

# Map supply layer and selected formation path.
replace_once('src/components/MapView.tsx', '  routes: boolean;\n  cities: boolean;', '  routes: boolean;\n  supply: boolean;\n  cities: boolean;')
replace_once(
    'src/components/MapView.tsx',
    "  { id: 'routes', label: 'Strategic routes' },\n  { id: 'cities', label: 'Cities and hubs' },",
    "  { id: 'routes', label: 'Strategic routes' },\n  { id: 'supply', label: 'Supply network' },\n  { id: 'cities', label: 'Cities and hubs' },"
)
replace_once('src/components/MapView.tsx', '  routes: true,\n  cities: true,', '  routes: true,\n  supply: true,\n  cities: true,')
replace_once(
    'src/components/MapView.tsx',
    "  const showStrategicNodeNames = zoomPercent >= 285;\n",
    "  const showStrategicNodeNames = zoomPercent >= 285;\n  const selectedSupplyRouteIds = new Set(state.logistics.formationAllocations[state.selectedTaskGroupId]?.path.routeIds ?? []);\n"
)
replace_once(
    'src/components/MapView.tsx',
    "        {showStrategicNodes && <g className=\"strategic-node-layer\" aria-hidden=\"true\">",
    """        {layers.supply && zoomPercent >= 120 && <g className="supply-route-layer" aria-hidden="true">
          {projectedStrategicRoutes.map(route => {
            const flow = state.logistics.routeFlows[route.id];
            if (!flow || flow.used <= 0) return null;
            const selectedPath = selectedSupplyRouteIds.has(route.id);
            return <line
              key={`supply-${route.id}`}
              className={`supply-route-flow ${flow.condition} ${selectedPath ? 'selected-path' : ''}`}
              x1={route.x1}
              y1={route.y1}
              x2={route.x2}
              y2={route.y2}
            ><title>{route.name} · {flow.used}/{flow.capacity} supply throughput</title></line>;
          })}
        </g>}

        {showStrategicNodes && <g className="strategic-node-layer" aria-hidden="true">"""
)

# Last-loaded supply styles.
replace_once(
    'src/main.tsx',
    "import './desktop-command-fit.css';\nimport './persistence-feedback';",
    "import './desktop-command-fit.css';\nimport './supply-network.css';\nimport './persistence-feedback';"
)

Path('docs/design/phase-08b3-supply-throughput.md').write_text('''# Phase VIII-B3 — Supply Throughput and Logistics\n\nVersion 8 turns supply connectivity into a finite daily network allocation.\n\n## Model\n\n- The portal is the expeditionary supply source.\n- Controlled, secured territory can relay supply. Unsecured captures cannot relay it.\n- Route supply capacity is modified by status, physical condition, capacity modifier and endpoint infrastructure.\n- Territory relay capacity is derived from local supply value, strategic nodes and occupation quality.\n- Formation demand is derived from personnel, deployable armour and current status. Combat and movement require more throughput than static duty.\n- Territorial administration also consumes throughput.\n- A deterministic weighted allocation distributes finite capacity across all simultaneous demands and can use parallel routes.\n\n## Conditions\n\nFormation and territory allocations are classified as Sustained, Strained, Undersupplied, Critical or Cut off. Delivered throughput changes local supply stocks, morale, recovery, armour repair and attrition.\n\n## Interface\n\n- Network Supply reports delivered demand rather than simple connectivity.\n- The map includes an independent Supply network layer and highlights the selected formation's primary path.\n- Selected formation and territory panels expose demand, delivery and condition.\n- Intelligence exposes source utilisation, total demand, delivery, saturated corridors and stressed formations.\n\n## Persistence\n\nCampaign saves advance to version 8. Version 7 and all earlier supported campaigns migrate by recalculating logistics from their current map, formations and route states.\n\n## Scope boundary\n\nB3 does not yet generate route damage, enemy interdiction, engineering orders, repair projects, manual logistics priorities or convoy units. Those belong to VIII-B4.\n''')

print('Phase VIII-B3 integration patch applied.')

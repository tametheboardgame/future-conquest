import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const branchWorkflow = `name: Current engine balance simulation

on:
  pull_request:
    paths:
      - 'src/game/**'
      - 'scripts/simulate-current-engine-balance.mjs'
      - 'scripts/trace-current-engine-balance.mjs'
      - 'tests/current-engine-balance-harness.test.cjs'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/current-engine-balance.yml'
  workflow_dispatch:
    inputs:
      runs_per_start:
        description: 'Seed variants per portal start, difficulty and doctrine'
        required: true
        default: '20'
      max_turns:
        description: 'Maximum campaign day before timeout'
        required: true
        default: '120'
      seed_offset:
        description: 'Deterministic seed block offset'
        required: true
        default: '1'

permissions:
  contents: read

jobs:
  balance:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      FC_BALANCE_RUNS_PER_START: \${{ inputs.runs_per_start || '4' }}
      FC_BALANCE_MAX_TURNS: \${{ inputs.max_turns || '120' }}
      FC_BALANCE_SEED_OFFSET: \${{ inputs.seed_offset || '1' }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run regression suite
        run: npm test

      - name: Run current-engine balance simulation
        run: npm run simulate:current-balance

      - name: Trace representative stalled campaigns
        run: node scripts/trace-current-engine-balance.mjs

      - name: Publish balance summary
        if: always()
        run: |
          if [ -f balance-output/current-engine-balance.md ]; then
            cat balance-output/current-engine-balance.md >> \"$GITHUB_STEP_SUMMARY\"
          fi
          if [ -f balance-output/current-engine-traces.md ]; then
            printf '\\n---\\n\\n' >> \"$GITHUB_STEP_SUMMARY\"
            cat balance-output/current-engine-traces.md >> \"$GITHUB_STEP_SUMMARY\"
          fi

      - name: Upload balance report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: current-engine-balance-report
          path: balance-output/
          if-no-files-found: warn
`;

const replaceExact = (text, before, after, label) => {
  if (!text.includes(before)) throw new Error(`Missing block: ${label}`);
  return text.replace(before, after);
};
const replaceRegex = (text, regex, after, label) => {
  if (!regex.test(text)) throw new Error(`Missing regex block: ${label}`);
  return text.replace(regex, after);
};

let supply = readFileSync('src/game/supply-network.ts', 'utf8');
supply = replaceExact(supply,
  "import { STRATEGIC_NODES, STRATEGIC_ROUTES } from './strategic-network-data';\n",
  "import { STRATEGIC_NODES, STRATEGIC_ROUTES } from './strategic-network-data';\nimport { territorySupplySourceCapacity } from './territory-resources';\n",
  'supply resource import');
supply = replaceExact(supply,
`interface CandidatePath {
  routeIds: string[];
  territoryIds: string[];
  cost: number;
}`,
`interface CandidatePath {
  sourceTerritoryId: string;
  routeIds: string[];
  territoryIds: string[];
  cost: number;
}`,
  'candidate path source');
supply = replaceExact(supply,
`export function supplyConditionForRatio(ratio: number): SupplyCondition {
  if (ratio >= 0.9) return 'sustained';
  if (ratio >= 0.65) return 'strained';
  if (ratio >= 0.4) return 'undersupplied';
  if (ratio >= 0.15) return 'critical';
  return 'cut-off';
}`,
`export function supplyConditionForRatio(ratio: number): SupplyCondition {
  if (ratio >= 0.9) return 'sustained';
  if (ratio >= 0.65) return 'strained';
  if (ratio >= 0.4) return 'undersupplied';
  if (ratio >= 0.15) return 'critical';
  return 'cut-off';
}

export function estimatedFormationStockDays(group: TaskGroup): number {
  return round1(clamp(group.supply, 0, 100) / 17);
}`,
  'stock days helper');
supply = replaceRegex(supply,
/export function portalSupplyCapacity\(state: GameState\): number \{[\s\S]*?\n\}\n\nfunction accessibleTerritory/,
`function accessibleTerritory`,
  'remove portal source');
supply = replaceRegex(supply,
/function findCandidatePath\([\s\S]*?\n\}\n\nfunction createRequests/,
`function findCandidatePath(
  state: GameState,
  targetTerritoryId: string,
  routeRemaining: Record<string, number>,
  routeCapacity: Record<string, number>,
  territoryRemaining: Record<string, number>,
  sourceRemaining: Record<string, number>
): CandidatePath | null {
  if ((sourceRemaining[targetTerritoryId] ?? 0) >= 1) {
    return { sourceTerritoryId: targetTerritoryId, routeIds: [], territoryIds: [], cost: 0 };
  }
  if (!accessibleTerritory(state, targetTerritoryId)) return null;

  const sourceIds = Object.keys(sourceRemaining).filter(id => (
    (sourceRemaining[id] ?? 0) >= 1 && accessibleTerritory(state, id)
  ));
  if (!sourceIds.length) return null;

  const distances = new Map<string, number>();
  const sourceFor = new Map<string, string>();
  for (const sourceId of sourceIds) {
    distances.set(sourceId, 0);
    sourceFor.set(sourceId, sourceId);
  }
  const previous = new Map<string, { territoryId: string; routeId: string }>();
  const unvisited = new Set(Object.keys(state.territories).filter(id => accessibleTerritory(state, id)));

  while (unvisited.size) {
    let current: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;
    for (const territoryId of unvisited) {
      const distance = distances.get(territoryId) ?? Number.POSITIVE_INFINITY;
      if (distance < currentDistance) {
        current = territoryId;
        currentDistance = distance;
      }
    }
    if (!current || !Number.isFinite(currentDistance)) break;
    unvisited.delete(current);
    if (current === targetTerritoryId) break;

    for (const route of STRATEGIC_ROUTES) {
      if (route.fromTerritoryId !== current && route.toTerritoryId !== current) continue;
      if ((routeRemaining[route.id] ?? 0) < 1) continue;
      const next = routeOtherEnd(route.id, current);
      if (!next || !unvisited.has(next) || !accessibleTerritory(state, next) || (territoryRemaining[next] ?? 0) < 1) continue;
      const capacity = Math.max(1, routeCapacity[route.id] ?? 1);
      const utilisation = 1 - (routeRemaining[route.id] ?? 0) / capacity;
      const territoryCapacity = Math.max(1, effectiveTerritoryThroughput(state, next));
      const territoryUtilisation = 1 - (territoryRemaining[next] ?? 0) / territoryCapacity;
      const cost = currentDistance + 1 + utilisation * 4 + territoryUtilisation * 2 + 8 / capacity;
      if (cost < (distances.get(next) ?? Number.POSITIVE_INFINITY)) {
        distances.set(next, cost);
        previous.set(next, { territoryId: current, routeId: route.id });
        sourceFor.set(next, sourceFor.get(current) ?? current);
      }
    }
  }

  const sourceTerritoryId = sourceFor.get(targetTerritoryId);
  if (!sourceTerritoryId) return null;
  const routeIds: string[] = [];
  const territoryIds: string[] = [];
  let cursor = targetTerritoryId;
  while (cursor !== sourceTerritoryId) {
    const step = previous.get(cursor);
    if (!step) return null;
    routeIds.unshift(step.routeId);
    territoryIds.unshift(cursor);
    cursor = step.territoryId;
  }
  return { sourceTerritoryId, routeIds, territoryIds, cost: distances.get(targetTerritoryId) ?? 0 };
}

function createRequests`,
  'multi-source pathfinder');
supply = replaceRegex(supply,
/function primaryPath\(request: SupplyRequest\): string\[\] \{[\s\S]*?\n\}/,
`function primaryPath(request: SupplyRequest): { sourceTerritoryId: string; routeIds: string[] } {
  let selected = '';
  let count = -1;
  for (const [signature, uses] of request.pathCounts) {
    if (uses > count || (uses === count && signature < selected)) {
      selected = signature;
      count = uses;
    }
  }
  if (!selected) return { sourceTerritoryId: request.targetTerritoryId, routeIds: [] };
  const separator = selected.indexOf('::');
  if (separator < 0) return { sourceTerritoryId: request.targetTerritoryId, routeIds: selected.split('|').filter(Boolean) };
  return {
    sourceTerritoryId: selected.slice(0, separator) || request.targetTerritoryId,
    routeIds: selected.slice(separator + 2).split('|').filter(Boolean)
  };
}`,
  'primary multi-source path');
supply = replaceExact(supply,
`  const territoryRemaining = Object.fromEntries(Object.keys(state.territories).map(id => [id, effectiveTerritoryThroughput(state, id)]));
  const sourceCapacity = portalSupplyCapacity(state);
  let sourceRemaining = sourceCapacity;
  const unavailable = new Set<string>();

  while (sourceRemaining >= 1) {`,
`  const territoryRemaining = Object.fromEntries(Object.keys(state.territories).map(id => [id, effectiveTerritoryThroughput(state, id)]));
  const sourceCapacityByTerritory = Object.fromEntries(Object.keys(state.territories).map(id => [id, territorySupplySourceCapacity(state, id)]));
  const sourceRemaining = { ...sourceCapacityByTerritory };
  const sourceCapacity = Object.values(sourceCapacityByTerritory).reduce((sum, capacity) => sum + capacity, 0);
  const unavailable = new Set<string>();

  while (Object.values(sourceRemaining).some(remaining => remaining >= 1)) {`,
  'distributed source capacity');
supply = replaceExact(supply,
`      const path = findCandidatePath(state, request.targetTerritoryId, routeRemaining, routeCapacity, territoryRemaining);`,
`      const path = findCandidatePath(state, request.targetTerritoryId, routeRemaining, routeCapacity, territoryRemaining, sourceRemaining);`,
  'source-aware path call');
supply = replaceExact(supply,
`      request.delivered += 1;
      sourceRemaining -= 1;`,
`      request.delivered += 1;
      sourceRemaining[path.sourceTerritoryId] = Math.max(0, (sourceRemaining[path.sourceTerritoryId] ?? 0) - 1);`,
  'source decrement');
supply = replaceExact(supply,
`      const signature = path.routeIds.join('|');`,
`      const signature = \`${'${path.sourceTerritoryId}'}::${'${path.routeIds.join(\'|\')}'}\`;`,
  'source path signature');
supply = replaceExact(supply,
`    const routeIds = [...new Set(territoryRequests.flatMap(primaryPath))];`,
`    const routeIds = [...new Set(territoryRequests.flatMap(request => primaryPath(request).routeIds))];`,
  'territory primary routes');
supply = replaceExact(supply,
`    const routeIds = request ? primaryPath(request) : [];
    const path: SupplyPath = {
      sourceTerritoryId: state.portalTerritory,
      targetTerritoryId: group.location,
      routeIds
    };`,
`    const primary = request ? primaryPath(request) : { sourceTerritoryId: group.location, routeIds: [] };
    const path: SupplyPath = {
      sourceTerritoryId: primary.sourceTerritoryId,
      targetTerritoryId: group.location,
      routeIds: primary.routeIds
    };`,
  'formation source path');
supply = replaceExact(supply,
`    sourceUsed: sourceCapacity - sourceRemaining,`,
`    sourceUsed: Object.entries(sourceCapacityByTerritory).reduce((sum, [id, capacity]) => sum + capacity - (sourceRemaining[id] ?? 0), 0),`,
  'aggregate source use');
writeFileSync('src/game/supply-network.ts', supply);

let engine = readFileSync('src/game/engine.ts', 'utf8');
engine = replaceExact(engine,
  "import { createOperationalAwarenessState, createTutorialState, progressTutorial } from './operational-clarity';\n",
  "import { createOperationalAwarenessState, createTutorialState, progressTutorial } from './operational-clarity';\nimport { territoryMedicalCapability, territoryRepairCapability } from './territory-resources';\n",
  'engine resource import');
engine = replaceExact(engine,
`    const stockChange = condition === 'sustained'
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
      next = addEvent(next, \`${'${group.name}'} is cut off in ${'${TERRITORIES[group.location].centre}'}; ${'${attrition}'} personnel lost to attrition and desertion.\`, 'danger');
    }
    if (group.status === 'recovering' && deliveryRatio >= 0.65) group.status = 'ready';
    const repair = deliveryRatio >= 0.4
      ? Math.min(group.damagedArmour, Math.max(1, Math.round((deliveryRatio * 10 + TERRITORIES[group.location].supply * 2.5) * difficultyRules[next.difficulty].recovery)))
      : 0;`,
`    const stockChange = condition === 'sustained'
      ? 4
      : condition === 'strained'
        ? 1
        : condition === 'undersupplied'
          ? -5
          : condition === 'critical'
            ? -11
            : -17;
    group.supply = clamp(group.supply + stockChange, 0, 100);
    const stockMorale = group.supply <= 0
      ? -4
      : group.supply < 20
        ? -2
        : group.supply < 40
          ? -1
          : 0;
    group.morale = clamp(
      group.morale + ((condition === 'sustained' || condition === 'strained') && group.status !== 'attacking' ? 1 : stockMorale),
      5,
      100
    );
    if (condition === 'undersupplied' || condition === 'critical' || condition === 'cut-off') stressedGroups.push(group.name);
    if (condition === 'cut-off' && group.supply <= 0) {
      const attrition = Math.max(2, Math.round(group.personnel * 0.0025));
      group.personnel = Math.max(0, group.personnel - attrition);
      next = addEvent(next, \`${'${group.name}'} has exhausted carried stocks in ${'${TERRITORIES[group.location].centre}'}; ${'${attrition}'} personnel lost to attrition and desertion.\`, 'danger');
    }
    if (group.status === 'recovering' && (deliveryRatio >= 0.65 || group.supply >= 65)) group.status = 'ready';
    const repairCapability = territoryRepairCapability(next, group.location);
    const repair = deliveryRatio >= 0.4
      ? Math.min(group.damagedArmour, Math.max(1, Math.round((deliveryRatio * 9 + TERRITORIES[group.location].supply * 1.5) * repairCapability * difficultyRules[next.difficulty].recovery)))
      : 0;`,
  'carried stock consequences');
engine = replaceExact(engine,
`    next = addEvent(next, \`${'${stressedGroups.join(\', \')}'} are isolated from adequate supply and received less than their daily logistics demand.\`, 'warning');`,
`    next = addEvent(next, \`${'${stressedGroups.join(\', \')}'} received less than their daily logistics requirement and are drawing on carried stocks or local sources.\`, 'warning');`,
  'supply warning language');
engine = replaceExact(engine,
`  const administered = Object.values(next.territories).filter(territory => territory.occupation === 'administered').length;
  const recovery = Math.min(next.woundedPool, Math.round((18 + administered * 7 + next.supply * 0.22) * difficultyRules[next.difficulty].recovery));`,
`  const administered = Object.values(next.territories).filter(territory => territory.occupation === 'administered').length;
  const medicalCapacity = Object.keys(next.territories).reduce((sum, id) => sum + territoryMedicalCapability(next, id), 0);
  const recovery = Math.min(next.woundedPool, Math.round((12 + administered * 4 + medicalCapacity * 2.2 + next.supply * 0.12) * difficultyRules[next.difficulty].recovery));`,
  'territorial medical recovery');
engine = replaceExact(engine,
`  else if (personnel < 1200 || next.territories[next.portalTerritory].controller !== 'player' || next.enemyStrategy.operationalCrisisTurns >= crisisLimitForDifficulty(next.difficulty)) next = addEvent({ ...next, status: 'defeat' }, next.enemyStrategy.operationalCrisisTurns >= crisisLimitForDifficulty(next.difficulty) ? 'The expedition has remained in operational crisis too long. Command cohesion and portal access can no longer be sustained.' : 'The expedition has lost operational cohesion or access to the portal.', 'danger');`,
`  else if (personnel < 1200 || next.enemyStrategy.operationalCrisisTurns >= crisisLimitForDifficulty(next.difficulty)) next = addEvent(
    { ...next, status: 'defeat' },
    next.enemyStrategy.operationalCrisisTurns >= crisisLimitForDifficulty(next.difficulty)
      ? 'The expedition has remained in operational crisis too long. Command cohesion can no longer be sustained.'
      : 'The expedition has fallen below the minimum force needed to continue organised operations.',
    'danger'
  );`,
  'remove portal defeat');
writeFileSync('src/game/engine.ts', engine);

let strategy = readFileSync('src/game/enemy-strategy.ts', 'utf8');
strategy = replaceExact(strategy,
  "import { STRATEGIC_ROUTES } from './strategic-network-data';\n",
  "import { STRATEGIC_ROUTES } from './strategic-network-data';\nimport { territorySupplySourceCapacity } from './territory-resources';\n",
  'enemy resource import');
strategy = replaceExact(strategy,
`  const portalBonus = route.fromTerritoryId === state.portalTerritory || route.toTerritoryId === state.portalTerritory ? 34 : 0;`,
`  const sourceBonus = Math.max(
    territorySupplySourceCapacity(state, route.fromTerritoryId),
    territorySupplySourceCapacity(state, route.toTerritoryId)
  ) * 0.45;`,
  'route source bonus');
strategy = strategy.replace(/\+ portalBonus/g, '+ sourceBonus');
strategy = replaceExact(strategy,
`    + (territoryId === state.portalTerritory ? 36 : 0)`,
`    + territorySupplySourceCapacity(state, territoryId) * 0.55`,
  'focus source value');
strategy = strategy.replaceAll(
  `const portalFrontline = TERRITORIES[state.portalTerritory].neighbours.some(id => state.territories[id]?.controller === 'enemy');`,
  `const criticalSourceFrontline = frontlinePlayerTerritories(state).some(id => territorySupplySourceCapacity(state, id) >= 28);`
);
strategy = strategy.replaceAll('portalFrontline', 'criticalSourceFrontline');
strategy = strategy.replace(
  `'Operational crisis declared: the portal, supply network and remaining formations are under simultaneous pressure.'`,
  `'Operational crisis declared: key supply areas, the logistics network and remaining formations are under simultaneous pressure.'`
);
writeFileSync('src/game/enemy-strategy.ts', strategy);

let clarity = readFileSync('src/game/operational-clarity.ts', 'utf8');
clarity = replaceExact(clarity,
`      detail: \`${'${TERRITORIES[group.location].centre}'}: ${'${allocation?.delivered ?? 0}'}/${'${allocation?.demand ?? 0}'} daily throughput delivered.\`,`,
`      detail: \`${'${TERRITORIES[group.location].centre}'}: ${'${allocation?.delivered ?? 0}'}/${'${allocation?.demand ?? 0}'} daily throughput delivered; carried stock ${'${Math.round(group.supply)}'}%.\`,`,
  'diagnostic carried stock');
clarity = replaceExact(clarity,
`      severity: territoryId === state.portalTerritory ? 'critical' : 'danger',
      title: \`${'${TERRITORIES[territoryId].centre}'} is disconnected\`,
      detail: 'No traversable route currently connects this controlled territory to the portal supply network.',`,
`      severity: 'danger',
      title: \`${'${TERRITORIES[territoryId].centre}'} is disconnected from the wider network\`,
      detail: 'No traversable route currently connects this territory to another controlled supply area. Local sources and carried formation stocks may continue to sustain forces temporarily.',`,
  'distributed network diagnostic');
clarity = replaceExact(clarity,
`      title: 'Portal source capacity is nearly exhausted',
      detail: \`${'${state.logistics.sourceUsed}'}/${'${state.logistics.sourceCapacity}'} source throughput is committed.\``,
`      title: 'Territorial source capacity is nearly exhausted',
      detail: \`${'${state.logistics.sourceUsed}'}/${'${state.logistics.sourceCapacity}'} locally generated source throughput is committed across controlled territory.\``,
  'source capacity diagnostic');
writeFileSync('src/game/operational-clarity.ts', clarity);

writeFileSync('.github/workflows/current-engine-balance.yml', branchWorkflow);
rmSync(fileURLToPath(import.meta.url));

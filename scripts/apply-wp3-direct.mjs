import { readFile, writeFile } from 'node:fs/promises';

const territoryResources = `import { TERRITORIES } from './data';
import { STRATEGIC_NODES, STRATEGIC_ROUTES } from './strategic-network-data';
import type { Controller, GameEvent, GameState } from './types';

export type ResourceRating = 1 | 2 | 3 | 4 | 5;

export interface TerritoryResourceProfile {
  food: ResourceRating;
  industry: ResourceRating;
  energy: ResourceRating;
  transport: ResourceRating;
  medical: ResourceRating;
  militaryStores: ResourceRating;
}

export interface TerritoryStockpile {
  food: number;
  industry: number;
  energy: number;
  transport: number;
  medical: number;
  militaryStores: number;
}

export interface TerritoryResourceState {
  stocks: TerritoryStockpile;
  hubLevel: number;
  lastController: Controller;
}

type ResourceCarrier = GameState & {
  territoryResources?: Record<string, TerritoryResourceState>;
  territoryResourceTurn?: number;
};

// Strategic abstractions for the current 15-territory playable slice.
// Ratings are relative campaign values, not literal contemporary economic statistics.
export const TERRITORY_RESOURCES: Record<string, TerritoryResourceProfile> = {
  'GB-04': { food: 4, industry: 5, energy: 3, transport: 5, medical: 5, militaryStores: 4 },
  'FR-01': { food: 5, industry: 2, energy: 3, transport: 3, medical: 3, militaryStores: 2 },
  'FR-02': { food: 4, industry: 4, energy: 3, transport: 5, medical: 5, militaryStores: 4 },
  'FR-03': { food: 4, industry: 4, energy: 3, transport: 4, medical: 3, militaryStores: 3 },
  'FR-05': { food: 4, industry: 4, energy: 4, transport: 3, medical: 4, militaryStores: 3 },
  'BE-01': { food: 3, industry: 4, energy: 3, transport: 5, medical: 5, militaryStores: 3 },
  'BE-02': { food: 3, industry: 4, energy: 3, transport: 3, medical: 3, militaryStores: 2 },
  'NL-01': { food: 4, industry: 4, energy: 4, transport: 5, medical: 4, militaryStores: 3 },
  'LU-01': { food: 2, industry: 3, energy: 3, transport: 4, medical: 3, militaryStores: 1 },
  'DE-02': { food: 3, industry: 5, energy: 5, transport: 5, medical: 4, militaryStores: 4 },
  'DE-03': { food: 4, industry: 5, energy: 4, transport: 5, medical: 4, militaryStores: 4 },
  'DE-05': { food: 3, industry: 5, energy: 4, transport: 4, medical: 4, militaryStores: 4 },
  'CH-01': { food: 3, industry: 4, energy: 5, transport: 4, medical: 5, militaryStores: 2 },
  'CH-02': { food: 2, industry: 2, energy: 4, transport: 2, medical: 3, militaryStores: 1 },
  'AT-01': { food: 3, industry: 3, energy: 4, transport: 3, medical: 3, militaryStores: 2 }
};

const occupationSourceFactor: Record<string, number> = {
  enemy: 0,
  unsecured: 0.24,
  contested: 0.62,
  controlled: 1,
  administered: 1.16
};

const STOCK_KEYS = ['food', 'industry', 'energy', 'transport', 'medical', 'militaryStores'] as const;
type StockKey = typeof STOCK_KEYS[number];

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

function initialStock(profile: TerritoryResourceProfile, key: StockKey, controller: Controller): number {
  const rating = profile[key];
  const base = key === 'militaryStores' ? 9 : key === 'industry' ? 11 : 12;
  return rating * base * (controller === 'player' ? 1 : 0.8);
}

function defaultResourceState(state: GameState, territoryId: string): TerritoryResourceState {
  const profile = TERRITORY_RESOURCES[territoryId];
  const controller = state.territories[territoryId]?.controller ?? 'enemy';
  const stocks = Object.fromEntries(STOCK_KEYS.map(key => [key, initialStock(profile, key, controller)])) as unknown as TerritoryStockpile;
  return { stocks, hubLevel: 0, lastController: controller };
}

function normaliseStock(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(round1(value), 0, 250) : fallback;
}

export function normaliseTerritoryResources(state: GameState, value: unknown): Record<string, TerritoryResourceState> {
  const raw = value && typeof value === 'object' ? value as Record<string, Partial<TerritoryResourceState>> : {};
  const result: Record<string, TerritoryResourceState> = {};
  for (const territoryId of Object.keys(state.territories)) {
    const fallback = defaultResourceState(state, territoryId);
    const candidate = raw[territoryId];
    const rawStocks = candidate?.stocks && typeof candidate.stocks === 'object' ? candidate.stocks as Partial<TerritoryStockpile> : {};
    result[territoryId] = {
      stocks: {
        food: normaliseStock(rawStocks.food, fallback.stocks.food),
        industry: normaliseStock(rawStocks.industry, fallback.stocks.industry),
        energy: normaliseStock(rawStocks.energy, fallback.stocks.energy),
        transport: normaliseStock(rawStocks.transport, fallback.stocks.transport),
        medical: normaliseStock(rawStocks.medical, fallback.stocks.medical),
        militaryStores: normaliseStock(rawStocks.militaryStores, fallback.stocks.militaryStores)
      },
      hubLevel: typeof candidate?.hubLevel === 'number' && Number.isFinite(candidate.hubLevel) ? clamp(Math.floor(candidate.hubLevel), 0, 3) : 0,
      lastController: candidate?.lastController === 'player' || candidate?.lastController === 'enemy' ? candidate.lastController : fallback.lastController
    };
  }
  return result;
}

function ensureTerritoryResources(state: GameState): ResourceCarrier {
  const carrier = state as ResourceCarrier;
  carrier.territoryResources = normaliseTerritoryResources(state, carrier.territoryResources);
  if (typeof carrier.territoryResourceTurn !== 'number' || !Number.isFinite(carrier.territoryResourceTurn)) {
    carrier.territoryResourceTurn = state.turn;
  }
  return carrier;
}

function stockCapacity(profile: TerritoryResourceProfile, key: StockKey, hubLevel: number): number {
  return profile[key] * (key === 'militaryStores' ? 24 : 28) + hubLevel * 12;
}

function localProduction(profile: TerritoryResourceProfile, key: StockKey, factor: number, hubLevel: number): number {
  const rates: Record<StockKey, number> = {
    food: 0.8,
    industry: 0.45,
    energy: 0.55,
    transport: 0.35,
    medical: 0.35,
    militaryStores: 0.25
  };
  return profile[key] * rates[key] * factor * (1 + hubLevel * 0.08);
}

function localFormationDelivery(state: GameState, territoryId: string): number {
  return Object.values(state.taskGroups).reduce((sum, group) => {
    if (group.location !== territoryId || group.personnel <= 0) return sum;
    const allocation = state.logistics?.formationAllocations?.[group.id];
    if (!allocation || allocation.path.sourceTerritoryId !== territoryId) return sum;
    return sum + allocation.delivered;
  }, 0);
}

function resolveResourceTurn(state: GameState): void {
  const carrier = ensureTerritoryResources(state);
  if ((carrier.territoryResourceTurn ?? state.turn) >= state.turn) return;
  const resources = carrier.territoryResources!;
  for (const [territoryId, territory] of Object.entries(state.territories)) {
    const profile = TERRITORY_RESOURCES[territoryId];
    const resource = resources[territoryId];
    if (!profile || !resource) continue;

    if (resource.lastController !== territory.controller) {
      const retention = territory.controller === 'player' ? 0.7 : 0.55;
      for (const key of STOCK_KEYS) resource.stocks[key] = round1(resource.stocks[key] * retention);
      resource.lastController = territory.controller;
    }

    if (territory.controller !== 'player') continue;
    const occupationFactor = occupationSourceFactor[territory.occupation] ?? 0;
    for (const key of STOCK_KEYS) {
      resource.stocks[key] = round1(Math.min(
        stockCapacity(profile, key, resource.hubLevel),
        resource.stocks[key] + localProduction(profile, key, occupationFactor, resource.hubLevel)
      ));
    }

    const localDelivered = localFormationDelivery(state, territoryId);
    if (localDelivered > 0) {
      resource.stocks.food = round1(Math.max(0, resource.stocks.food - localDelivered * 0.45));
      resource.stocks.militaryStores = round1(Math.max(0, resource.stocks.militaryStores - localDelivered * 0.35));
      resource.stocks.medical = round1(Math.max(0, resource.stocks.medical - localDelivered * 0.12));
      resource.stocks.energy = round1(Math.max(0, resource.stocks.energy - localDelivered * 0.08));
    }
  }
  carrier.territoryResourceTurn = state.turn;
}

export function getTerritoryResourceState(state: GameState, territoryId: string): TerritoryResourceState {
  resolveResourceTurn(state);
  const carrier = ensureTerritoryResources(state);
  return carrier.territoryResources![territoryId] ?? defaultResourceState(state, territoryId);
}

export function territorySupplySourceCapacity(state: GameState, territoryId: string): number {
  resolveResourceTurn(state);
  const territory = state.territories[territoryId];
  const profile = TERRITORY_RESOURCES[territoryId];
  const definition = TERRITORIES[territoryId];
  if (!territory || !profile || !definition || territory.controller !== 'player') return 0;

  const resource = getTerritoryResourceState(state, territoryId);
  const base = profile.food * 5
    + profile.industry * 2
    + profile.energy * 2
    + profile.transport * 3
    + profile.militaryStores * 2
    + definition.supply * 2;
  const reserve = resource.stocks.food * 0.16 + resource.stocks.energy * 0.08 + resource.stocks.militaryStores * 0.18;
  const occupation = occupationSourceFactor[territory.occupation] ?? 0;
  const governance = 0.72 + territory.legitimacy * 0.003;
  const resistance = Math.max(0.55, 1 - territory.resistance * 0.0045);
  const hub = 1 + resource.hubLevel * 0.18;
  return Math.max(0, Math.floor((base + reserve) * occupation * governance * resistance * hub));
}

export function territoryRepairCapability(state: GameState, territoryId: string): number {
  const territory = state.territories[territoryId];
  const profile = TERRITORY_RESOURCES[territoryId];
  if (!territory || !profile || territory.controller !== 'player') return 0;
  const occupation = occupationSourceFactor[territory.occupation] ?? 0;
  const resource = getTerritoryResourceState(state, territoryId);
  const industryReserve = clamp(resource.stocks.industry / Math.max(1, stockCapacity(profile, 'industry', resource.hubLevel)), 0.25, 1);
  return Math.max(0.35, (0.5 + profile.industry * 0.12 + profile.energy * 0.06) * Math.max(0.45, occupation) * industryReserve);
}

export function territoryMedicalCapability(state: GameState, territoryId: string): number {
  const territory = state.territories[territoryId];
  const profile = TERRITORY_RESOURCES[territoryId];
  if (!territory || !profile || territory.controller !== 'player') return 0;
  const occupation = occupationSourceFactor[territory.occupation] ?? 0;
  const resource = getTerritoryResourceState(state, territoryId);
  const reserve = clamp(resource.stocks.medical / Math.max(1, stockCapacity(profile, 'medical', resource.hubLevel)), 0.2, 1);
  return profile.medical * Math.max(0.35, occupation) * reserve;
}

export interface LogisticsHubUpgradeQuote {
  eligible: boolean;
  reason: string;
  nextLevel: number;
  industry: number;
  transport: number;
  energy: number;
  affordable: boolean;
}

export function logisticsHubUpgradeQuote(state: GameState, territoryId: string): LogisticsHubUpgradeQuote {
  const territory = state.territories[territoryId];
  const profile = TERRITORY_RESOURCES[territoryId];
  const resource = getTerritoryResourceState(state, territoryId);
  const nextLevel = Math.min(3, resource.hubLevel + 1);
  const scale = 1 + resource.hubLevel * 0.65;
  const industry = Math.ceil(18 * scale);
  const transport = Math.ceil(14 * scale);
  const energy = Math.ceil(9 * scale);
  const connectedRoutes = STRATEGIC_ROUTES.filter(route => route.fromTerritoryId === territoryId || route.toTerritoryId === territoryId).length;
  const nodes = STRATEGIC_NODES.filter(node => node.territoryId === territoryId);

  let reason = 'Eligible strategic location';
  let eligible = true;
  if (!territory || territory.controller !== 'player') { eligible = false; reason = 'Territory is not controlled'; }
  else if (territory.occupation === 'unsecured') { eligible = false; reason = 'Occupation must be stabilised first'; }
  else if (resource.hubLevel >= 3) { eligible = false; reason = 'Hub is already at maximum level'; }
  else if (!profile || profile.industry < 3 || profile.transport < 3) { eligible = false; reason = 'Insufficient local industry or transport base'; }
  else if (connectedRoutes < 2 && nodes.length < 2 && !nodes.some(node => node.type === 'port' || node.type === 'rail-hub' || node.type === 'logistics')) {
    eligible = false; reason = 'Location lacks sufficient strategic-network value';
  }
  const affordable = resource.stocks.industry >= industry && resource.stocks.transport >= transport && resource.stocks.energy >= energy;
  return { eligible, reason, nextLevel, industry, transport, energy, affordable };
}

function appendEvent(state: GameState, text: string, tone: GameEvent['tone']): GameState {
  const event: GameEvent = { id: (state.events[0]?.id ?? 0) + 1, turn: state.turn, text, tone };
  return { ...state, events: [event, ...state.events].slice(0, 100) };
}

export function upgradeLogisticsHub(state: GameState, territoryId: string): GameState {
  resolveResourceTurn(state);
  const quote = logisticsHubUpgradeQuote(state, territoryId);
  if (!quote.eligible || !quote.affordable) return state;
  const carrier = ensureTerritoryResources(state);
  const territoryResources = structuredClone(carrier.territoryResources!);
  const resource = territoryResources[territoryId];
  resource.stocks.industry = round1(resource.stocks.industry - quote.industry);
  resource.stocks.transport = round1(resource.stocks.transport - quote.transport);
  resource.stocks.energy = round1(resource.stocks.energy - quote.energy);
  resource.hubLevel = quote.nextLevel;
  const next = { ...state, territoryResources, territoryResourceTurn: state.turn } as GameState;
  return appendEvent(next, \
    \`Logistics hub at \${TERRITORIES[territoryId].centre} upgraded to level \${quote.nextLevel}. Local reserves now provide greater supply resilience and source capacity.\`,
    'good'
  );
}
`;

await writeFile('src/game/territory-resources.ts', territoryResources);

const appPath = 'src/App.tsx';
let app = await readFile(appPath, 'utf8');
const importAnchor = "import { occupationRequirement } from './game/formation-organisation';\n";
if (!app.includes("logisticsHubUpgradeQuote")) {
  app = app.replace(importAnchor, importAnchor + "import { getTerritoryResourceState, logisticsHubUpgradeQuote, TERRITORY_RESOURCES, upgradeLogisticsHub } from './game/territory-resources';\n");
}
const derivedAnchor = "  const selectedTerritorySupply = selected ? state.logistics.territoryAllocations[selected.id] : undefined;\n";
if (!app.includes('selectedTerritoryResources')) {
  app = app.replace(derivedAnchor, derivedAnchor + "  const selectedTerritoryResources = selected ? getTerritoryResourceState(state, selected.id) : undefined;\n  const selectedTerritoryProfile = selected ? TERRITORY_RESOURCES[selected.id] : undefined;\n  const selectedHubQuote = selected ? logisticsHubUpgradeQuote(state, selected.id) : undefined;\n");
}
const panelAnchor = "        <div><dt>Route connections</dt><dd>{selectedOpenRouteCount} / {selectedNetworkRoutes.length} open</dd></div>\n";
if (!app.includes('<dt>Logistics hub</dt>')) {
  app = app.replace(panelAnchor, panelAnchor + `        {selectedTerritoryProfile && selectedTerritoryResources && <>
          <div><dt>Logistics hub</dt><dd>Level {selectedTerritoryResources.hubLevel} / 3</dd></div>
          <div><dt>Food</dt><dd>{selectedTerritoryProfile.food}/5 · {Math.round(selectedTerritoryResources.stocks.food)} reserve</dd></div>
          <div><dt>Industry</dt><dd>{selectedTerritoryProfile.industry}/5 · {Math.round(selectedTerritoryResources.stocks.industry)} reserve</dd></div>
          <div><dt>Energy</dt><dd>{selectedTerritoryProfile.energy}/5 · {Math.round(selectedTerritoryResources.stocks.energy)} reserve</dd></div>
          <div><dt>Transport</dt><dd>{selectedTerritoryProfile.transport}/5 · {Math.round(selectedTerritoryResources.stocks.transport)} reserve</dd></div>
          <div><dt>Medical</dt><dd>{selectedTerritoryProfile.medical}/5 · {Math.round(selectedTerritoryResources.stocks.medical)} reserve</dd></div>
          <div><dt>Military Stores</dt><dd>{selectedTerritoryProfile.militaryStores}/5 · {Math.round(selectedTerritoryResources.stocks.militaryStores)} reserve</dd></div>
        </>}
`);
}
const defenceAnchor = "      {state.territories[selected.id].controller === 'player' && <DefencePanel state={state} territoryId={selected.id} onChange={setState} />}\n";
if (!app.includes('Upgrade logistics hub')) {
  app = app.replace(defenceAnchor, `      {state.territories[selected.id].controller === 'player' && selectedHubQuote && <section className="hub-upgrade-control">
        <p className="network-section-heading">LOGISTICS HUB</p>
        <p>{selectedHubQuote.eligible ? \`Upgrade to level \${selectedHubQuote.nextLevel}: \${selectedHubQuote.industry} Industry, \${selectedHubQuote.transport} Transport, \${selectedHubQuote.energy} Energy.\` : selectedHubQuote.reason}</p>
        <button type="button" disabled={!selectedHubQuote.eligible || !selectedHubQuote.affordable} onClick={() => setState(current => upgradeLogisticsHub(current, selected.id))}>{selectedTerritoryResources?.hubLevel ? 'Upgrade logistics hub' : 'Construct logistics hub'}</button>
      </section>}
` + defenceAnchor);
}
await writeFile(appPath, app);

const test = `const test = require('node:test');
const assert = require('node:assert/strict');

const { newGame } = require('../.test-dist/engine.js');
const { refreshSupplyNetwork } = require('../.test-dist/supply-network.js');
const {
  TERRITORY_RESOURCES,
  getTerritoryResourceState,
  logisticsHubUpgradeQuote,
  normaliseTerritoryResources,
  territorySupplySourceCapacity,
  upgradeLogisticsHub
} = require('../.test-dist/territory-resources.js');

function controlledBrussels() {
  const state = structuredClone(newGame(8126, 'standard'));
  state.territories['BE-01'].controller = 'player';
  state.territories['BE-01'].occupation = 'administered';
  state.territories['BE-01'].legitimacy = 80;
  state.territories['BE-01'].resistance = 5;
  state.territories['BE-01'].supplied = false;
  for (const group of Object.values(state.taskGroups)) {
    group.location = 'BE-01';
    group.status = 'ready';
    group.order = undefined;
  }
  for (const routeState of Object.values(state.routeStates)) {
    routeState.status = 'blocked';
    routeState.capacityModifier = 0;
  }
  getTerritoryResourceState(state, 'BE-01');
  return refreshSupplyNetwork(state);
}

test('WP3 exposes all six territory resource dimensions and persistent reserves', () => {
  const state = newGame(8126, 'standard');
  const resource = getTerritoryResourceState(state, 'BE-01');
  assert.deepEqual(Object.keys(TERRITORY_RESOURCES['BE-01']).sort(), ['energy', 'food', 'industry', 'medical', 'militaryStores', 'transport'].sort());
  assert.ok(resource.stocks.food > 0);
  assert.ok(resource.stocks.industry > 0);
  const normalised = normaliseTerritoryResources(state, {});
  assert.equal(Object.keys(normalised).length, Object.keys(state.territories).length);
});

test('disconnected formations draw finite local reserves instead of failing instantly', () => {
  let state = controlledBrussels();
  const before = getTerritoryResourceState(state, 'BE-01').stocks.food;
  const delivered = Object.values(state.logistics.formationAllocations).reduce((sum, allocation) => sum + allocation.delivered, 0);
  assert.ok(delivered > 0, 'local stocks should sustain some disconnected delivery');
  state = { ...state, turn: state.turn + 1 };
  state = refreshSupplyNetwork(state);
  const after = getTerritoryResourceState(state, 'BE-01').stocks.food;
  assert.ok(after < before, 'local food reserve should be consumed when isolated formations are supplied locally');
});

test('logistics hubs consume local resources and increase persistent source capacity', () => {
  let state = controlledBrussels();
  const resource = getTerritoryResourceState(state, 'BE-01');
  resource.stocks.industry = 120;
  resource.stocks.transport = 120;
  resource.stocks.energy = 120;
  const quote = logisticsHubUpgradeQuote(state, 'BE-01');
  assert.equal(quote.eligible, true);
  assert.equal(quote.affordable, true);
  const beforeCapacity = territorySupplySourceCapacity(state, 'BE-01');
  const beforeIndustry = resource.stocks.industry;
  state = upgradeLogisticsHub(state, 'BE-01');
  const upgraded = getTerritoryResourceState(state, 'BE-01');
  assert.equal(upgraded.hubLevel, 1);
  assert.ok(upgraded.stocks.industry < beforeIndustry);
  assert.ok(territorySupplySourceCapacity(state, 'BE-01') > beforeCapacity);
});

test('hub survives territorial loss while reserves are captured and player benefit disappears', () => {
  let state = controlledBrussels();
  const resource = getTerritoryResourceState(state, 'BE-01');
  resource.stocks.industry = 120;
  resource.stocks.transport = 120;
  resource.stocks.energy = 120;
  state = upgradeLogisticsHub(state, 'BE-01');
  const before = getTerritoryResourceState(state, 'BE-01').stocks.food;
  state.territories['BE-01'].controller = 'enemy';
  state.territories['BE-01'].occupation = 'enemy';
  state.turn += 1;
  refreshSupplyNetwork(state);
  const lost = getTerritoryResourceState(state, 'BE-01');
  assert.equal(lost.hubLevel, 1);
  assert.ok(lost.stocks.food < before);
  assert.equal(territorySupplySourceCapacity(state, 'BE-01'), 0);
});
`;
await writeFile('tests/r2-wp3-territory-logistics.test.cjs', test);

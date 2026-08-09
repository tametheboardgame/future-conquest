import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/game/territory-resources.ts';
let source = await readFile(path, 'utf8');

source = source.replace(
`function ensureTerritoryResources(state: GameState): ResourceCarrier {
  const carrier = state as ResourceCarrier;
  carrier.territoryResources = normaliseTerritoryResources(state, carrier.territoryResources);
  if (typeof carrier.territoryResourceTurn !== 'number' || !Number.isFinite(carrier.territoryResourceTurn)) {
    carrier.territoryResourceTurn = state.turn;
  }
  return carrier;
}
`,
`function ensureTerritoryResources(state: GameState): ResourceCarrier {
  const carrier = state as ResourceCarrier;
  carrier.territoryResources = normaliseTerritoryResources(state, carrier.territoryResources);
  if (typeof carrier.territoryResourceTurn !== 'number' || !Number.isFinite(carrier.territoryResourceTurn)) {
    carrier.territoryResourceTurn = state.turn;
  }
  return carrier;
}

function reconcileController(state: GameState, territoryId: string, resource: TerritoryResourceState): void {
  const controller = state.territories[territoryId]?.controller;
  if (!controller || resource.lastController === controller) return;
  const retention = controller === 'player' ? 0.7 : 0.55;
  for (const key of STOCK_KEYS) resource.stocks[key] = round1(resource.stocks[key] * retention);
  resource.lastController = controller;
}
`);

source = source.replace(
`    if (resource.lastController !== territory.controller) {
      const retention = territory.controller === 'player' ? 0.7 : 0.55;
      for (const key of STOCK_KEYS) resource.stocks[key] = round1(resource.stocks[key] * retention);
      resource.lastController = territory.controller;
    }

    if (territory.controller !== 'player') continue;`,
`    reconcileController(state, territoryId, resource);
    if (territory.controller !== 'player') continue;`);

source = source.replace(
`export function getTerritoryResourceState(state: GameState, territoryId: string): TerritoryResourceState {
  resolveResourceTurn(state);
  const carrier = ensureTerritoryResources(state);
  return carrier.territoryResources![territoryId] ?? defaultResourceState(state, territoryId);
}`,
`export function getTerritoryResourceState(state: GameState, territoryId: string): TerritoryResourceState {
  resolveResourceTurn(state);
  const carrier = ensureTerritoryResources(state);
  const resource = carrier.territoryResources![territoryId] ?? defaultResourceState(state, territoryId);
  reconcileController(state, territoryId, resource);
  return resource;
}`);

source = source.replace(
`  const resource = getTerritoryResourceState(state, territoryId);
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
  return Math.max(0, Math.floor((base + reserve) * occupation * governance * resistance * hub));`,
`  const resource = getTerritoryResourceState(state, territoryId);
  const base = profile.food * 5
    + profile.industry * 2
    + profile.energy * 2
    + profile.transport * 3
    + profile.militaryStores * 2
    + definition.supply * 2;
  const occupation = occupationSourceFactor[territory.occupation] ?? 0;
  const governance = 0.72 + territory.legitimacy * 0.003;
  const resistance = Math.max(0.55, 1 - territory.resistance * 0.0045);
  const reserveAvailable = resource.stocks.food + resource.stocks.militaryStores;
  const reserveReadiness = reserveAvailable > 1 ? 1 : 0.12;
  const hub = 1 + resource.hubLevel * 0.15;
  return Math.max(0, Math.floor(base * occupation * governance * resistance * reserveReadiness * hub));`);

await writeFile(path, source);

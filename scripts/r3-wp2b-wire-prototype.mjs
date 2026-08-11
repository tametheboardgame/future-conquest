import fs from 'node:fs';

const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');

const importNeedle = "import { MapView } from './components/MapView';";
const importReplacement = `${importNeedle}\nimport { TerrainMapPrototype } from './components/TerrainMapPrototype';`;
if (!app.includes(importNeedle)) throw new Error('MapView import anchor not found');
if (!app.includes("TerrainMapPrototype")) app = app.replace(importNeedle, importReplacement);

const stateNeedle = "  const [navigationContext, setNavigationContext] = useState<ResolvedContextualTarget | null>(null);";
const stateReplacement = `${stateNeedle}\n  const terrainPrototypeRequested = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('terrain') === '1';\n  const [terrainPrototypeFailed, setTerrainPrototypeFailed] = useState(false);`;
if (!app.includes(stateNeedle)) throw new Error('App state anchor not found');
if (!app.includes('terrainPrototypeRequested')) app = app.replace(stateNeedle, stateReplacement);

const mapNeedle = `            <MapView
              state={state}
              onSelect={openTerritoryOnMap}
              onSelectGroup={openGroupOnMap}
              operationConfirmation={canAttack && target ? {
                territoryId: target.id,
                label: targetOperation ? 'Join operation?' : 'Confirm operation?',
                onConfirm: () => setState(current => beginOperation(current, chosenRouteId || undefined))
              } : undefined}
            />`;

const mapReplacement = `            {terrainPrototypeRequested && !terrainPrototypeFailed ? <TerrainMapPrototype
              state={state}
              onSelect={openTerritoryOnMap}
              onFallback={(reason) => {
                console.warn(\`R3 terrain prototype fallback: \${reason}\`);
                setTerrainPrototypeFailed(true);
              }}
            /> : <MapView
              state={state}
              onSelect={openTerritoryOnMap}
              onSelectGroup={openGroupOnMap}
              operationConfirmation={canAttack && target ? {
                territoryId: target.id,
                label: targetOperation ? 'Join operation?' : 'Confirm operation?',
                onConfirm: () => setState(current => beginOperation(current, chosenRouteId || undefined))
              } : undefined}
            />}`;

if (!app.includes(mapNeedle)) throw new Error('MapView render anchor not found');
if (!app.includes('terrainPrototypeRequested && !terrainPrototypeFailed ? <TerrainMapPrototype')) {
  app = app.replace(mapNeedle, mapReplacement);
}

fs.writeFileSync(appPath, app);
console.log('Wired hidden R3-WP2B MapLibre terrain prototype into App.tsx');

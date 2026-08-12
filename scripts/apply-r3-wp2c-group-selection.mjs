import fs from 'node:fs';

const replaceOnce = (source, from, to, label) => {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  return source.replace(from, to);
};

const rendererPath = 'src/components/TerrainMapPrototypeImpl.tsx';
let renderer = fs.readFileSync(rendererPath, 'utf8');
renderer = replaceOnce(
  renderer,
  `export interface TerrainMapPrototypeProps {\n  state: GameState;\n  onSelect: (territoryId: string) => void;\n  onFallback: (reason: string) => void;\n`,
  `export interface TerrainMapPrototypeProps {\n  state: GameState;\n  onSelect: (territoryId: string) => void;\n  onSelectGroup?: (groupId: string) => void;\n  onFallback: (reason: string) => void;\n`,
  'terrain props group callback'
);
renderer = replaceOnce(
  renderer,
  `  state,\n  onSelect,\n  onFallback,\n`,
  `  state,\n  onSelect,\n  onSelectGroup,\n  onFallback,\n`,
  'renderer destructuring'
);
renderer = replaceOnce(
  renderer,
  `  const selectRef = useRef(onSelect);\n  const fallbackRef = useRef(onFallback);\n`,
  `  const selectRef = useRef(onSelect);\n  const selectGroupRef = useRef(onSelectGroup);\n  const fallbackRef = useRef(onFallback);\n`,
  'group callback ref'
);
renderer = replaceOnce(
  renderer,
  `  selectRef.current = onSelect;\n  fallbackRef.current = onFallback;\n`,
  `  selectRef.current = onSelect;\n  selectGroupRef.current = onSelectGroup;\n  fallbackRef.current = onFallback;\n`,
  'group callback refresh'
);
renderer = replaceOnce(
  renderer,
  `    operationalMarkersRef.current = buildTerrainOperationalMarkers(map, state, {\n      onSelectTerritory: territoryId => selectRef.current(territoryId)\n    });\n`,
  `    operationalMarkersRef.current = buildTerrainOperationalMarkers(map, state, {\n      onSelectTerritory: territoryId => selectRef.current(territoryId),\n      onSelectGroup: groupId => selectGroupRef.current?.(groupId)\n    });\n`,
  'operational marker callbacks'
);
fs.writeFileSync(rendererPath, renderer);

const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');
app = replaceOnce(
  app,
  `              <TerrainMapPrototype\n                state={state}\n                onSelect={openTerritoryOnMap}\n                onFallback={(reason) => {\n`,
  `              <TerrainMapPrototype\n                state={state}\n                onSelect={openTerritoryOnMap}\n                onSelectGroup={openGroupOnMap}\n                onFallback={(reason) => {\n`,
  'App terrain group selection prop'
);
fs.writeFileSync(appPath, app);

const testPath = 'tests/r3-wp2c-terrain-overlay-parity.test.cjs';
let test = fs.readFileSync(testPath, 'utf8');
test += `\n\ntest('WP2C friendly terrain counters preserve formation selection semantics', () => {\n  const app = fs.readFileSync('src/App.tsx', 'utf8');\n  assert.match(app, /onSelectGroup=\\{openGroupOnMap\\}/);\n  assert.match(renderer, /onSelectGroup\\?: \\(groupId: string\\) => void/);\n  assert.match(renderer, /selectGroupRef\\.current\\?\\.\\(groupId\\)/);\n  assert.match(markers, /callbacks\\.onSelectGroup\\(group\\.id\\)/);\n});\n`;
fs.writeFileSync(testPath, test);

const workflowPath = '.github/workflows/r3-wp2c-overlay-runtime-probe.yml';
let workflow = fs.readFileSync(workflowPath, 'utf8');
workflow = replaceOnce(
  workflow,
  `          if (!overlayState.overlayLod) throw new Error('Terrain operational overlay LOD was not initialised.');\n\n          await page.locator('.r3-terrain-prototype-canvas').screenshot({ path: '/tmp/r3-wp2c-overlay.png' });\n`,
  `          if (!overlayState.overlayLod) throw new Error('Terrain operational overlay LOD was not initialised.');\n\n          const secondGroup = page.locator('.r3-terrain-task-group-marker[data-group-id="TG-2"]');\n          await secondGroup.click();\n          await page.locator('.r3-terrain-task-group-marker[data-group-id="TG-2"].selected').waitFor({ state: 'visible', timeout: 5000 });\n          console.log('WP2C formation counter selection verified for TG-2.');\n\n          await page.locator('.r3-terrain-prototype-canvas').screenshot({ path: '/tmp/r3-wp2c-overlay.png' });\n`,
  'Chromium group selection check'
);
fs.writeFileSync(workflowPath, workflow);

console.log('Applied WP2C formation selection parity patch.');

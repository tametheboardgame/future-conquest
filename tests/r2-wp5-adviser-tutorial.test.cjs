const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { newGame } = require('../.test-dist/engine.js');
const { TERRITORIES } = require('../.test-dist/data.js');
const { getAdviserWarnings, moveTutorial } = require('../.test-dist/operational-clarity.js');
const { assignEngineeringSupport, normaliseEngineeringProjects, resolveEngineeringProjects, startEngineeringProject, withdrawEngineeringSupport } = require('../.test-dist/engineering-projects.js');
const { refreshSupplyNetwork } = require('../.test-dist/supply-network.js');

test('WP5 adviser detects every approved strategic warning without mutating campaign state', () => {
  const state = newGame(5501, 'standard', true);
  const territoryId = state.portalTerritory;
  const group = Object.values(state.taskGroups)[0];
  group.location = territoryId; group.status = 'garrison'; group.personnel = 500; group.supply = 4;
  state.territories[territoryId].supplied = false;
  state.enemyOrders = [{ id:'wp5-threat', turn:state.turn, type:'counterattack', origin:TERRITORIES[territoryId].neighbours[0], target:territoryId, executeTurn:state.turn, status:'executing', priority:100, summary:'attack' }];
  // Make the territory undefended after retaining a separate low-garrison example.
  const lowTerritory = TERRITORIES[territoryId].neighbours[0];
  state.territories[lowTerritory].controller = 'player'; state.territories[lowTerritory].occupation = 'controlled';
  group.location = lowTerritory;
  for (const other of Object.values(state.taskGroups)) {
    if (other.id !== group.id && other.location === territoryId) other.location = lowTerritory;
  }
  const routeId = Object.keys(state.logistics.routeFlows)[0];
  state.logistics.routeFlows[routeId] = { ...state.logistics.routeFlows[routeId], used:100, capacity:50, utilisation:200, condition:'overloaded' };
  state.logistics.bottleneckRouteIds = [routeId];
  state.engineeringProjects.push({ id:'wp5-project', routeId, kind:'repair', assignedTaskGroupId:group.id, createdTurn:state.turn, startingCondition:20, targetCondition:100, progress:0, allocation:25, supplySpent:0, status:'active', returnStatus:'ready', workCompleted:0, workRequired:10, materialCost:10, materialSpent:0 });
  const withdrawn = withdrawEngineeringSupport(state, 'wp5-project');
  state.engineeringProjects = withdrawn.engineeringProjects; state.events = withdrawn.events;
  state.operations['wp5-operation'] = { id:'wp5-operation', target:territoryId, participantGroupIds:[group.id], origins:{[group.id]:lowTerritory}, progress:0, days:3, enemyFormationIds:[], enemyPower:20 };
  const snapshot = structuredClone(state);
  const warnings = getAdviserWarnings(state, 'Full Guidance');
  assert.deepEqual(new Set(warnings.map(w => w.category)), new Set(['undefended-threat','isolation','low-garrison','exhausted-stocks','overloaded-route','engineering-support-loss','suicidal-assault']));
  assert.deepEqual(state, snapshot, 'advice must not alter or restrict otherwise legal campaign actions');
});

test('WP5 suicidal-assault advice compares engine-scale combat power', () => {
  const state = newGame(5510, 'standard', false);
  const group = Object.values(state.taskGroups)[0];
  const target = TERRITORIES[group.location].neighbours[0];
  const operation = { id:'scale-operation', target, participantGroupIds:[group.id], origins:{[group.id]:group.location}, progress:0, days:1, enemyFormationIds:[], enemyPower:80 };
  state.operations[operation.id] = operation;
  assert.ok(getAdviserWarnings(state, 'Full Guidance').some(warning => warning.category === 'suicidal-assault'));
  operation.enemyPower = 5;
  assert.ok(!getAdviserWarnings(state, 'Full Guidance').some(warning => warning.category === 'suicidal-assault'));
});

test('WP5 suicidal-assault advice never exposes exact hidden combat power', () => {
  const state = newGame(5518, 'standard', false);
  const group = Object.values(state.taskGroups)[0];
  const target = TERRITORIES[group.location].neighbours[0];
  const hiddenEnemyPower = 83.7;
  state.operations['hidden-power-operation'] = { id:'hidden-power-operation', target, participantGroupIds:[group.id], origins:{[group.id]:group.location}, progress:0, days:1, enemyFormationIds:[], enemyPower:hiddenEnemyPower };

  for (const report of [
    undefined,
    { id:'stale-contact', turn:state.turn - 5, title:'Stale contact', detail:'Old report', territoryId:target, estimatedMin:1200, estimatedMax:2800, confidence:'low' },
    { id:'confirmed-contact', turn:state.turn, title:'Recent contact', detail:'Current report', territoryId:target, estimatedMin:4200, estimatedMax:6100, confidence:'high' }
  ]) {
    state.intelligenceReports = report ? [report] : [];
    const warning = getAdviserWarnings(state, 'Full Guidance').find(candidate => candidate.category === 'suicidal-assault');
    assert.ok(warning, 'internally outmatched assaults must still trigger across intelligence states');
    assert.doesNotMatch(`${warning.title} ${warning.detail}`, /83(?:\.7|\.70|\.700)?/, 'exact simulation enemy power must remain hidden');
    assert.doesNotMatch(warning.detail, /enemy combat power\s*\(/i, 'advice must not present exact combat-power figures');
  }
});

test('WP5 threatened-territory advice follows counterattack defender eligibility', () => {
  const state = newGame(5519, 'standard', false);
  const target = state.portalTerritory;
  const origin = TERRITORIES[target].neighbours[0];
  const defender = Object.values(state.taskGroups)[0];
  for (const group of Object.values(state.taskGroups)) group.location = origin;
  defender.location = target;
  defender.personnel = 1000;
  state.enemyOrders = [{ id:'eligibility-threat', turn:state.turn, type:'counterattack', origin, target, executeTurn:state.turn, status:'executing', priority:100, summary:'attack' }];

  for (const status of ['ready', 'engineering']) {
    defender.status = status;
    assert.ok(!getAdviserWarnings(state, 'Full Guidance').some(warning => warning.category === 'undefended-threat'), `${status} formations participate in counterattack defence`);
  }

  defender.personnel = 0;
  assert.ok(getAdviserWarnings(state, 'Full Guidance').some(warning => warning.category === 'undefended-threat'), 'a territory without a combat-capable local formation is genuinely undefended');
});

test('WP5 adviser orders severe warnings first while preserving every visible warning', () => {
  const state = newGame(5511, 'standard', false);
  const group = Object.values(state.taskGroups)[0];
  group.status = 'garrison'; group.personnel = 500; group.supply = 5;
  const warnings = getAdviserWarnings(state, 'Full Guidance');
  assert.equal(warnings[0].category, 'exhausted-stocks');
  assert.equal(warnings[0].severity, 'critical');
  assert.ok(warnings.some(warning => warning.category === 'low-garrison'));
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /adviserWarnings\.map\(/, 'the presentation must expose every applicable warning');
});

test('WP5 engineering warning distinguishes civil-only work from withdrawn military support', () => {
  const state = newGame(5512, 'standard', false);
  const group = Object.values(state.taskGroups)[0];
  const routeId = Object.keys(state.routeStates)[0];
  const project = { id:'support-history', routeId, kind:'repair', createdTurn:state.turn, startingCondition:20, targetCondition:100, progress:0, allocation:0, supplySpent:0, status:'active', returnStatus:'ready', workCompleted:0, workRequired:10, materialCost:10, materialSpent:0 };
  state.engineeringProjects.push(project);
  assert.ok(!getAdviserWarnings(state, 'Full Guidance').some(warning => warning.category === 'engineering-support-loss'));
  project.assignedTaskGroupId = group.id; project.allocation = 25;
  const withdrawn = withdrawEngineeringSupport(state, project.id);
  assert.ok(getAdviserWarnings(withdrawn, 'Full Guidance').some(warning => warning.category === 'engineering-support-loss'));
});

test('WP5 adviser excludes resolved counterattacks while retaining active threat stages', () => {
  const state = newGame(5513, 'standard', false);
  const target = state.portalTerritory;
  const origin = TERRITORIES[target].neighbours[0];
  for (const group of Object.values(state.taskGroups)) {
    if (group.location === target) group.location = origin;
  }
  state.enemyOrders = [{ id:'resolved-threat', turn:state.turn, type:'counterattack', origin, target, executeTurn:state.turn, status:'completed', priority:100, summary:'resolved attack' }];
  assert.ok(!getAdviserWarnings(state, 'Full Guidance').some(warning => warning.category === 'undefended-threat'));

  for (const [status, executeTurn] of [['planned', state.turn + 2], ['executing', state.turn]]) {
    state.enemyOrders[0] = { ...state.enemyOrders[0], id:`active-${status}`, status, executeTurn };
    assert.ok(getAdviserWarnings(state, 'Full Guidance').some(warning => warning.category === 'undefended-threat'), `${status} counterattack remains an active threat`);
  }
});

test('WP5 engineering withdrawal history belongs only to the withdrawn project identity', () => {
  const state = newGame(5514, 'standard', false);
  const group = Object.values(state.taskGroups)[0];
  const routeId = Object.keys(state.routeStates)[0];
  const original = { id:'withdrawn-project', routeId, kind:'repair', assignedTaskGroupId:group.id, createdTurn:state.turn, startingCondition:20, targetCondition:100, progress:0, allocation:25, supplySpent:0, status:'active', returnStatus:'ready', workCompleted:0, workRequired:10, materialCost:10, materialSpent:0 };
  state.engineeringProjects.push(original);
  const withdrawn = withdrawEngineeringSupport(state, original.id);
  assert.ok(getAdviserWarnings(withdrawn, 'Full Guidance').some(warning => warning.id === `engineering-${original.id}`));

  const replacement = { ...withdrawn.engineeringProjects[0], id:'same-turn-civil-replacement', assignedTaskGroupId:undefined, allocation:0, engineeringSupportLost:false };
  withdrawn.engineeringProjects = [replacement];
  assert.ok(!getAdviserWarnings(withdrawn, 'Full Guidance').some(warning => warning.category === 'engineering-support-loss'), 'same-route, same-turn replacement must not inherit withdrawal history');
});

test('WP5 engineering adviser records automatic support loss against the affected project', () => {
  const supportedState = () => {
    let state = newGame(5515, 'standard', false);
    state.portalTerritory = 'BE-01';
    for (const id of ['BE-01', 'NL-01']) {
      state.territories[id].controller = 'player';
      state.territories[id].occupation = 'administered';
      state.territories[id].supplied = true;
      state.territories[id].resistance = 10;
    }
    state.taskGroups['TG-1'].location = 'BE-01';
    state.taskGroups['TG-1'].status = 'ready';
    state.taskGroups['TG-1'].order = undefined;
    state.routeStates['R-BRUSSELS-AMSTERDAM'].condition = 55;
    state = refreshSupplyNetwork(state);
    return startEngineeringProject(state, 'R-BRUSSELS-AMSTERDAM', 'TG-1', 25);
  };

  for (const loss of ['missing', 'destroyed']) {
    const state = supportedState();
    const projectId = state.engineeringProjects[0].id;
    if (loss === 'missing') delete state.taskGroups['TG-1'];
    else state.taskGroups['TG-1'].personnel = 0;
    const resolved = resolveEngineeringProjects(state);
    const lossEvent = resolved.events.find(event => event.text.includes('lost its assigned military engineering support'));
    assert.equal(lossEvent?.engineeringProjectId, projectId, `${loss} formation loss must retain project identity`);
    assert.ok(getAdviserWarnings(resolved, 'Full Guidance').some(warning => warning.id === `engineering-${projectId}`));

    resolved.engineeringProjects = [{ ...resolved.engineeringProjects[0], id:`replacement-${loss}`, assignedTaskGroupId:undefined, allocation:0, engineeringSupportLost:false }];
    assert.ok(!getAdviserWarnings(resolved, 'Full Guidance').some(warning => warning.category === 'engineering-support-loss'), 'replacement civil project must not inherit automatic loss');
  }
});

test('WP5 engineering support-loss advice survives event-log eviction and clears only on restoration', () => {
  const state = newGame(5516, 'standard', false);
  const group = state.taskGroups['TG-1'];
  const routeId = 'R-BRUSSELS-AMSTERDAM';
  state.portalTerritory = 'BE-01';
  for (const id of ['BE-01', 'NL-01']) {
    state.territories[id].controller = 'player'; state.territories[id].occupation = 'administered'; state.territories[id].supplied = true; state.territories[id].resistance = 10;
  }
  group.location = 'BE-01'; group.status = 'ready'; group.order = undefined;
  const project = { id:'durable-manual-loss', routeId, kind:'repair', assignedTaskGroupId:group.id, createdTurn:state.turn, startingCondition:20, targetCondition:100, progress:0, allocation:25, engineeringSupportLost:false, supplySpent:0, status:'active', returnStatus:'ready', workCompleted:0, workRequired:10, materialCost:10, materialSpent:0 };
  state.engineeringProjects.push(project);
  const withdrawn = withdrawEngineeringSupport(state, project.id);
  withdrawn.events = Array.from({ length: 101 }, (_, index) => ({ id:`newer-engineering-${index}`, turn:state.turn, text:`Newer engineering event ${index}`, tone:'neutral', engineeringProjectId:`other-${index}` })).slice(0, 100);
  assert.ok(getAdviserWarnings(withdrawn, 'Full Guidance').some(warning => warning.id === `engineering-${project.id}`), 'manual loss must outlive the capped event history');

  const restored = assignEngineeringSupport(withdrawn, project.id, group.id, 25);
  assert.equal(restored.engineeringProjects[0].engineeringSupportLost, false);
  assert.ok(!getAdviserWarnings(restored, 'Full Guidance').some(warning => warning.id === `engineering-${project.id}`), 'genuine reassignment clears support loss');
});

test('WP5 automatic engineering support loss survives event-log eviction', () => {
  const state = newGame(5517, 'standard', false);
  const group = state.taskGroups['TG-1'];
  const routeId = 'R-BRUSSELS-AMSTERDAM';
  state.portalTerritory = 'BE-01';
  for (const id of ['BE-01', 'NL-01']) {
    state.territories[id].controller = 'player'; state.territories[id].occupation = 'administered'; state.territories[id].supplied = true; state.territories[id].resistance = 10;
  }
  state.engineeringProjects.push({ id:'durable-automatic-loss', routeId, kind:'repair', assignedTaskGroupId:group.id, createdTurn:state.turn, startingCondition:20, targetCondition:100, progress:0, allocation:25, engineeringSupportLost:false, supplySpent:0, status:'active', returnStatus:'ready', workCompleted:0, workRequired:10, materialCost:10, materialSpent:0 });
  delete state.taskGroups[group.id];
  const resolved = resolveEngineeringProjects(state);
  resolved.events = Array.from({ length: 101 }, (_, index) => ({ id:`newer-automatic-${index}`, turn:state.turn, text:`Newer engineering event ${index}`, tone:'neutral', engineeringProjectId:`other-${index}` })).slice(0, 100);
  assert.ok(getAdviserWarnings(resolved, 'Full Guidance').some(warning => warning.id === 'engineering-durable-automatic-loss'));
});

test('WP5 older engineering projects without durable support-loss state normalise safely', () => {
  const legacyProject = { id:'legacy-civil-project', routeId:'legacy-route', kind:'repair', createdTurn:1, startingCondition:20, targetCondition:100, progress:0, allocation:0, supplySpent:0, status:'active', returnStatus:'ready', workCompleted:0, workRequired:10, materialCost:10, materialSpent:0 };
  const [normalised] = normaliseEngineeringProjects([legacyProject]);
  assert.equal(normalised.engineeringSupportLost, false);
});

test('WP5 adviser consumes live session Assistance settings without storage reloads', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const startup = fs.readFileSync('src/components/StartupExperience.tsx', 'utf8');
  assert.match(app, /useLiveGlobalSettings\(\)/);
  assert.doesNotMatch(app, /loadGlobalSettings/);
  assert.match(startup, /GlobalSettingsContext\.Provider value=\{settings\}/);
  assert.match(startup, /setSettings\(saved\)/, 'session state must update even if persistence fails');
});

test('WP5 Assistance levels apply predictable severity thresholds', () => {
  const state = newGame(5502, 'standard', false);
  const group = Object.values(state.taskGroups)[0]; group.status = 'garrison'; group.personnel = 500;
  const full = getAdviserWarnings(state, 'Full Guidance');
  assert.ok(full.some(w => w.severity === 'warning'));
  assert.ok(getAdviserWarnings(state, 'Recommended').every(w => ['danger','critical'].includes(w.severity)));
  assert.ok(getAdviserWarnings(state, 'Critical Only').every(w => w.severity === 'critical'));
  assert.deepEqual(getAdviserWarnings(state, 'Off'), []);
});

test('WP5 tutorial Back and Forward are bounded and wrong actions do not desynchronise it', () => {
  const state = newGame(5503, 'standard', true);
  assert.equal(moveTutorial(state, -1).tutorial.step, 0);
  const forward = moveTutorial(state, 1);
  assert.equal(forward.tutorial.step, 1);
  assert.equal(moveTutorial(forward, -1).tutorial.step, 0);
  assert.equal(state.tutorial.step, 0);
});

test('WP5 tutorial teaches map framing and remains horizontally contained', () => {
  const clarity = fs.readFileSync('src/game/operational-clarity.ts', 'utf8');
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');
  const css = fs.readFileSync('src/operational-clarity.css', 'utf8');
  for (const concept of ['Europe', 'Campaign', 'Selected', 'Zoom', 'pan']) assert.match(clarity, new RegExp(concept, 'i'));
  assert.match(overlay, />Back</); assert.match(overlay, />Forward</);
  assert.match(css, /calc\(100vw - 16px\)/); assert.match(css, /overflow-wrap:anywhere/);
});

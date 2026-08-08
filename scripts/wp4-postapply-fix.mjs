import fs from 'node:fs';

const path = 'src/game/engine.ts';
let source = fs.readFileSync(path, 'utf8');

function replaceWithin(functionMarker, startMarker, endMarker, replacement) {
  const functionStart = source.indexOf(functionMarker);
  if (functionStart < 0) throw new Error(`Function marker not found: ${functionMarker}`);
  const start = source.indexOf(startMarker, functionStart);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Replacement markers not found in ${functionMarker}`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

replaceWithin(
  'export function setFormationGarrison',
  '  const updated = addEvent(',
  '  return shouldAssign &&',
  `  const updated = addEvent(\n    { ...state, taskGroups },\n    group.name + ' ' + (shouldAssign ? 'assigned to occupation and defensive duties' : 'released from garrison duty') + ' in ' + TERRITORIES[group.location].centre + '.',\n    'neutral'\n  );\n`
);

replaceWithin(
  'export function entrenchTerritory',
  '  return addEvent(',
  '\n}\n\nexport function prepareTerritoryDefence',
  `  return addEvent(\n    { ...state, territories, taskGroups },\n    group.name + ' improved field defences around ' + TERRITORIES[territoryId].centre + '. Fortification is now ' + Math.round(territories[territoryId].fortification) + '/45.',\n    'neutral'\n  );`
);

replaceWithin(
  'export function prepareTerritoryDefence',
  '  return addEvent(',
  '\n}\n\nexport function reinforceTerritory',
  `  return addEvent(\n    { ...state, territories, taskGroups },\n    TERRITORIES[territoryId].centre + ' placed on prepared defence through day ' + (state.turn + 2) + '. ' + participants.length + ' local formation' + (participants.length === 1 ? '' : 's') + ' dispersed, rehearsed fallback positions and committed carried stocks.',\n    'warning'\n  );`
);

replaceWithin(
  'export function reinforceTerritory',
  '    `${candidate.name}',
  "    'warning'",
  `    candidate.name + ' ordered to reinforce ' + TERRITORIES[territoryId].centre + ' via ' + route.name + '.',\n`
);

fs.writeFileSync(path, source);
console.log('WP4 generated engine messages normalised.');

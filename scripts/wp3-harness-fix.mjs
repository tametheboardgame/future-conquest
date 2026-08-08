import fs from 'node:fs';

const path = 'src/game/balance-simulation.ts';
let source = fs.readFileSync(path, 'utf8');

const importBefore = `  beginOperation,\n  canIssueOperationalOrder,\n  endTurn,`;
const importAfter = `  beginOperation,\n  canIssueOperationalOrder,\n  continueCampaignAfterCollapse,\n  endTurn,`;
if (!source.includes(importBefore)) throw new Error('Balance engine import block not found.');
source = source.replace(importBefore, importAfter);

const loopBefore = `  while (state.status === 'playing' && state.turn < maxTurns) {\n    state = issueOrders(state, policy, telemetry);`;
const loopAfter = `  while (state.status === 'playing' && state.turn < maxTurns) {\n    if (state.strategicCollapse?.pending) state = continueCampaignAfterCollapse(state);\n    state = issueOrders(state, policy, telemetry);`;
if (!source.includes(loopBefore)) throw new Error('Balance campaign loop not found.');
source = source.replace(loopBefore, loopAfter);

fs.writeFileSync(path, source);

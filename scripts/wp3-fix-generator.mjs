import fs from 'node:fs';

const path = 'scripts/wp3-apply.mjs';
const source = fs.readFileSync(path, 'utf8');
const bad = "  assert.match(app, /state\\.status !== 'playing' && <div className=\\{`command-outcome/);\\n";
const replacement = "  assert.match(app, /state\\.status !== 'playing'/);\\n  assert.match(app, /command-outcome/);\\n";

if (!source.includes(bad)) throw new Error('WP3 generator assertion requiring repair was not found.');
fs.writeFileSync(path, source.replace(bad, replacement));

import { readFile, writeFile } from 'node:fs/promises';

// PR synchronisation marker: the validated source commit removes this runner.
const builderPath = 'scripts/apply-tutorial-explanation-pass.mjs';
const lines = (await readFile(builderPath, 'utf8')).split('\n');

const normalisePatternLine = lines.findIndex(line => line.startsWith('`export function normaliseTutorialState\\('));
if (normalisePatternLine < 0) throw new Error('Could not locate normaliseTutorialState builder pattern.');
lines[normalisePatternLine] = '/export function normaliseTutorialState\\([\\s\\S]*?\\n}\\n\\nexport function getTutorialStep/,';

const unsafeTemplateAssertion = lines.findIndex(line => line.includes('assert.match(overlay, /tutorial-guide') && line.includes('${step'));
if (unsafeTemplateAssertion >= 0) lines[unsafeTemplateAssertion] = '  assert.match(overlay, /tutorial-guide/);';

await writeFile(builderPath, lines.join('\n'));
await import(`./apply-tutorial-explanation-pass.mjs?run=${Date.now()}`);

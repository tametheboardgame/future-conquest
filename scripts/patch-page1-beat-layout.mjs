import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storyFile = path.join(repositoryRoot, 'src', 'game', 'intro-story.ts');
let source = await readFile(storyFile, 'utf8');

const replacements = [
  ["{ id: 'p2-medic', kind: 'dialogue', speaker: 'Medic', text: 'Another suit is down.', delayMs: 5000, x: 52, y: 8, maxWidth: 40 }", "{ id: 'p2-medic', kind: 'dialogue', speaker: 'Medic', text: 'Another suit is down.', delayMs: 5000, x: 60, y: 7, maxWidth: 35 }"],
  ["{ id: 'p2-tech', kind: 'dialogue', speaker: 'Technician', text: 'Strip what still works.', delayMs: 6500, x: 50, y: 67, maxWidth: 43 }", "{ id: 'p2-tech', kind: 'dialogue', speaker: 'Technician', text: 'Strip what still works.', delayMs: 6500, x: 5, y: 72, maxWidth: 42 }"],
  ["{ id: 'p3-caption', kind: 'caption', text: 'What remained searched for an answer.', delayMs: 500, x: 5, y: 6, maxWidth: 54 }", "{ id: 'p3-caption', kind: 'caption', text: 'What remained searched for an answer.', delayMs: 500, x: 48, y: 5, maxWidth: 47 }"],
  ["{ id: 'p3-general-1', kind: 'dialogue', speaker: 'General', text: 'We have found the break.', delayMs: 2500, x: 48, y: 10, maxWidth: 45 }", "{ id: 'p3-general-1', kind: 'dialogue', speaker: 'General', text: 'We have found the break.', delayMs: 2500, x: 4, y: 19, maxWidth: 42 }"],
  ["{ id: 'p3-scientist', kind: 'dialogue', speaker: 'Scientist', text: 'A divergence, perhaps. Not proof.', delayMs: 4400, x: 5, y: 66, maxWidth: 53 }", "{ id: 'p3-scientist', kind: 'dialogue', speaker: 'Scientist', text: 'A divergence, perhaps. Not proof.', delayMs: 4400, x: 54, y: 58, maxWidth: 41 }"],
  ["{ id: 'p3-general-2', kind: 'dialogue', speaker: 'General', text: 'Proof will arrive too late.', delayMs: 6100, x: 51, y: 67, maxWidth: 43 }", "{ id: 'p3-general-2', kind: 'dialogue', speaker: 'General', text: 'Proof will arrive too late.', delayMs: 6100, x: 5, y: 70, maxWidth: 42 }"],
  ["{ id: 'p4-caption-2', kind: 'caption', text: '—a single historical divergence appeared.', delayMs: 2800, x: 4, y: 27, maxWidth: 52 }", "{ id: 'p4-caption-2', kind: 'caption', text: '—a single historical divergence appeared.', delayMs: 2800, x: 4, y: 24, maxWidth: 48 }"],
  ["{ id: 'p4-scientist', kind: 'dialogue', speaker: 'Scientist', text: 'We cannot identify the event.', delayMs: 5000, x: 53, y: 8, maxWidth: 42 }", "{ id: 'p4-scientist', kind: 'dialogue', speaker: 'Scientist', text: 'We cannot identify the event.', delayMs: 5000, x: 58, y: 8, maxWidth: 36 }"],
  ["{ id: 'p5-general-1', kind: 'dialogue', speaker: 'General', text: 'If it can be stopped there, this future may never happen.', delayMs: 3200, x: 44, y: 12, maxWidth: 52 }", "{ id: 'p5-general-1', kind: 'dialogue', speaker: 'General', text: 'If it can be stopped there, this future may never happen.', delayMs: 3200, x: 4, y: 43, maxWidth: 45 }"],
  ["{ id: 'p5-scientist', kind: 'dialogue', speaker: 'Scientist', text: 'Or the intervention becomes the cause.', delayMs: 5700, x: 4, y: 67, maxWidth: 52 }", "{ id: 'p5-scientist', kind: 'dialogue', speaker: 'Scientist', text: 'Or the intervention becomes the cause.', delayMs: 5700, x: 52, y: 57, maxWidth: 43 }"],
  ["{ id: 'p5-general-2', kind: 'dialogue', speaker: 'General', text: 'Then we will carry that risk.', delayMs: 7600, x: 53, y: 69, maxWidth: 42 }", "{ id: 'p5-general-2', kind: 'dialogue', speaker: 'General', text: 'Then we will carry that risk.', delayMs: 7600, x: 5, y: 73, maxWidth: 38 }"],
  ["{ id: 'p6-general-1', kind: 'dialogue', speaker: 'General', text: 'Secure the continent.', delayMs: 4700, x: 70, y: 8, maxWidth: 25 }", "{ id: 'p6-general-1', kind: 'dialogue', speaker: 'General', text: 'Secure the continent.', delayMs: 4700, x: 74, y: 10, maxWidth: 21 }"],
  ["{ id: 'p6-general-2', kind: 'dialogue', speaker: 'General', text: 'Find the catalyst.', delayMs: 6100, x: 73, y: 35, maxWidth: 21 }", "{ id: 'p6-general-2', kind: 'dialogue', speaker: 'General', text: 'Find the catalyst.', delayMs: 6100, x: 74, y: 34, maxWidth: 20 }"],
  ["{ id: 'p6-general-3', kind: 'dialogue', speaker: 'General', text: 'Change what follows.', delayMs: 7500, x: 70, y: 62, maxWidth: 24 }", "{ id: 'p6-general-3', kind: 'dialogue', speaker: 'General', text: 'Change what follows.', delayMs: 7500, x: 73, y: 57, maxWidth: 21 }"],
  ["{ id: 'p6-soldier', kind: 'dialogue', speaker: 'Soldier', text: 'And if they resist?', delayMs: 8800, x: 45, y: 70, maxWidth: 20 }", "{ id: 'p6-soldier', kind: 'dialogue', speaker: 'Soldier', text: 'And if they resist?', delayMs: 8800, x: 36, y: 72, maxWidth: 21 }"],
  ["{ id: 'p6-general-4', kind: 'dialogue', speaker: 'General', text: 'They will.', delayMs: 9800, x: 58, y: 70, maxWidth: 14 }", "{ id: 'p6-general-4', kind: 'dialogue', speaker: 'General', text: 'They will.', delayMs: 9800, x: 58, y: 72, maxWidth: 14 }" ]
];

for (const [before, after] of replacements) {
  if (source.includes(after)) continue;
  if (!source.includes(before)) throw new Error(`Could not locate Page 1 beat layout source: ${before}`);
  source = source.replace(before, after);
}

await writeFile(storyFile, source, 'utf8');
console.log(`Updated ${replacements.length} Page 1 caption and dialogue placements.`);

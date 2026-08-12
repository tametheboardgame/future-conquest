import fs from 'node:fs';

const file = 'src/r3-terrain-prototype.css';
let source = fs.readFileSync(file, 'utf8');
const rule = `\n\n/* WP2D-D: deterministic declutter must override marker-specific display rules. */\n.r3-terrain-prototype [data-declutter="hidden"] {\n  display: none !important;\n}\n`;
if (!source.includes('[data-declutter="hidden"]')) {
  source = source.trimEnd() + rule;
  fs.writeFileSync(file, source);
  console.log('Applied browser-effective WP2D marker declutter visibility.');
} else {
  console.log('WP2D marker declutter visibility already present.');
}

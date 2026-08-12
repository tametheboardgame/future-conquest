import fs from 'node:fs';

const file = 'src/components/TerrainMapPrototypeImpl.tsx';
let source = fs.readFileSync(file, 'utf8');
const before = `        maxBounds: [[west, south], [east, north]],
        keyboard: true,`;
const after = `        maxBounds: [[west, south], [east, north]],
        renderWorldCopies: false,
        keyboard: true,`;
if (!source.includes(before)) throw new Error('MapLibre world-wrap anchor missing.');
source = source.replace(before, after);
fs.writeFileSync(file, source);
console.log('Disabled MapLibre world copies for the Europe-only terrain theatre.');

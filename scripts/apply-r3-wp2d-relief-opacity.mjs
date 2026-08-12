import fs from 'node:fs';
const file = 'src/components/TerrainMapPrototypeImpl.tsx';
let source = fs.readFileSync(file, 'utf8');
const before = "          'color-relief-opacity': compact ? 0.9 : 0.96";
const after = "          'color-relief-opacity': 0";
if (!source.includes(before)) throw new Error('Relief opacity anchor missing.');
source = source.replace(before, after);
fs.writeFileSync(file, source);

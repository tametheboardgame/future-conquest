import fs from 'node:fs';

const file = 'src/components/TerrainMapPrototypeImpl.tsx';
let source = fs.readFileSync(file, 'utf8');
const before = `          'fill-color': '#6c805b',
          'fill-opacity': compact ? 0.29 : 0.34`;
const after = `          'fill-color': '#6c805b',
          'fill-opacity': [
            'interpolate', ['linear'], ['zoom'],
            3.6, 0,
            4.72, 0,
            4.8, compact ? 0.29 : 0.34
          ]`;
if (!source.includes(before)) throw new Error('Theatre land-wash LOD anchor missing.');
source = source.replace(before, after);
fs.writeFileSync(file, source);
console.log('Suppressed filled global land wash at Theatre scale only.');

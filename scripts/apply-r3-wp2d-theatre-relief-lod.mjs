import fs from 'node:fs';

const file = 'src/components/TerrainMapPrototypeImpl.tsx';
let source = fs.readFileSync(file, 'utf8');

const before = `      {
        id: 'r3-wp2b-hillshade',
        type: 'hillshade',
        source: 'r3-wp2b-hillshade-dem',
        paint: {`;
const after = `      {
        id: 'r3-wp2b-hillshade',
        type: 'hillshade',
        source: 'r3-wp2b-hillshade-dem',
        minzoom: 4.8,
        paint: {`;

if (!source.includes(before)) throw new Error('Theatre hillshade LOD anchor missing.');
source = source.replace(before, after);
fs.writeFileSync(file, source);
console.log('Applied Theatre-scale hillshade LOD cutoff.');

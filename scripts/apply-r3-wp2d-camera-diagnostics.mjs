import fs from 'node:fs';

const file = 'src/components/TerrainMapPrototypeImpl.tsx';
let source = fs.readFileSync(file, 'utf8');

const before = `        const zoom = map.getZoom();
        host.dataset.overlayLod = zoom < 4.8 ? 'theatre' : zoom < 6.4 ? 'campaign' : 'local';`;
const after = `        const zoom = map.getZoom();
        host.dataset.overlayZoom = zoom.toFixed(2);
        host.dataset.overlayLod = zoom < 4.8 ? 'theatre' : zoom < 6.4 ? 'campaign' : 'local';`;

if (!source.includes(before)) throw new Error('WP2D camera diagnostic anchor missing.');
source = source.replace(before, after);
fs.writeFileSync(file, source);
console.log('Applied derived WP2D camera zoom metadata.');

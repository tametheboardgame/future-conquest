import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.env.PROJECT_ROOT||'.');
const source=JSON.parse(fs.readFileSync(path.join(root,'data/generated/maps/territories-standard-admin-comparison-v0.3.geojson'),'utf8'));
const ids=new Set(['GB-04','FR-01','FR-02','FR-03','FR-05','BE-01','BE-02','NL-01','LU-01','DE-02','DE-03','DE-05','CH-01','CH-02','AT-01']);
const output={type:'FeatureCollection',features:source.features.filter(feature=>ids.has(feature.properties.territory_id))};
if(output.features.length!==ids.size)throw new Error(`Expected ${ids.size} territories, found ${output.features.length}`);
const outputDir=path.join(root,'src/assets');
fs.mkdirSync(outputDir,{recursive:true});
fs.writeFileSync(path.join(outputDir,'vertical-slice-map.json'),`${JSON.stringify(output)}\n`);
console.log(`Wrote ${output.features.length} vertical-slice territories.`);

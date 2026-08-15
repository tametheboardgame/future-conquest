import fs from 'node:fs';
import path from 'node:path';
import { emit } from './r3-landmark-extra-builder-lib.mjs';

const OUT='public/miniatures/wp3-8a';
const parisMaterials={base_dark:[.12,.15,.16,1],base_mid:[.29,.31,.30,1],iron:[.18,.16,.13,1],iron_light:[.34,.30,.24,1],deck:[.48,.39,.27,1],stone:[.76,.71,.61,1],stone_dark:[.47,.43,.36,1],gold:[.72,.57,.30,1],green:[.23,.34,.22,1]};
function paris(B){const {box,cyl,cone,sphere,rod,lerp}=B;cyl('base_dark',1.48,.18,[0,0,.09],16);cyl('base_mid',1.37,.10,[0,0,.23],16);cyl('gold',1.29,.035,[0,0,.297],16);cyl('base_dark',1.22,.09,[0,0,.36],16);
  const levels=[{z:.48,x:.72,y:.58},{z:1.45,x:.48,y:.39},{z:2.52,x:.25,y:.205},{z:3.55,x:.105,y:.085}];
  const corners=L=>[[-L.x,-L.y,L.z],[L.x,-L.y,L.z],[-L.x,L.y,L.z],[L.x,L.y,L.z]];
  for(let s=0;s<levels.length-1;s++){const A=corners(levels[s]),D=corners(levels[s+1]);for(let i=0;i<4;i++)rod('iron',A[i],D[i],s===0?.065:.05,8);for(const [i,j] of [[0,1],[2,3],[0,2],[1,3]])for(let q=0;q<5;q++){const t0=q/5,t1=(q+1)/5;rod('iron_light',lerp(A[i],D[i],t0),lerp(A[j],D[j],t1),.018,6);rod('iron_light',lerp(A[j],D[j],t0),lerp(A[i],D[i],t1),.018,6)}}
  for(const [z,x,y] of [[1.45,.55,.46],[2.52,.31,.27],[3.55,.15,.13]]){box('deck',[x*2.25,y*2.25,.10],[0,0,z]);for(const sx of [-1,1])rod('iron',[sx*x,-y,z+.08],[sx*x,y,z+.08],.015,6);for(const sy of [-1,1])rod('iron',[-x,sy*y,z+.08],[x,sy*y,z+.08],.015,6)}
  for(const z of [1.73,2.00,2.28])for(const [i,j] of [[0,1],[2,3],[0,2],[1,3]]){const f=(z-1.45)/(2.52-1.45),A=corners(levels[1]),D=corners(levels[2]);rod('iron_light',lerp(A[i],D[i],f),lerp(A[j],D[j],f),.013,6)}
  rod('iron',[0,0,3.55],[0,0,4.22],.055,8);cyl('deck',.16,.10,[0,0,3.72],12);cyl('iron_light',.085,.48,[0,0,4.12],10);cone('gold',.055,.22,[0,0,4.47],8);
  box('stone',[.62,.34,.70],[-.88,.72,.72]);box('stone',[.18,.40,.70],[-1.10,.72,.72]);box('stone',[.18,.40,.70],[-.66,.72,.72]);box('stone',[.62,.40,.20],[-.88,.72,1.17]);box('stone_dark',[.20,.05,.38],[-.88,.515,.70]);box('gold',[.70,.44,.045],[-.88,.72,1.30]);
  for(const p of [[.92,.67],[1.02,-.55],[-.94,-.52]]){cyl('stone_dark',.022,.14,[p[0],p[1],.49],8);sphere('green',.11,[p[0],p[1],.63],6,10)}box('stone',[.48,.36,.34],[.88,-.18,.56]);box('stone',[.42,.31,.28],[-.72,-.62,.53]);}

const brusselsMaterials={base_dark:[.12,.16,.17,1],base_mid:[.28,.32,.32,1],chrome:[.72,.77,.78,1],chrome_dark:[.34,.39,.40,1],stone:[.69,.63,.51,1],stone_light:[.83,.77,.63,1],roof:[.22,.29,.28,1],gold:[.68,.53,.27,1],green:[.22,.34,.22,1]};
function brussels(B){const {box,cyl,cone,sphere,rod}=B;cyl('base_dark',1.40,.18,[0,0,.09],16);cyl('base_mid',1.29,.10,[0,0,.23],16);cyl('gold',1.21,.035,[0,0,.297],16);cyl('base_dark',1.14,.09,[0,0,.36],16);
  const lo=.88,hi=2.28,s=.59,center=[0,0,1.58],corners=[];for(const z of [lo,hi])for(const x of [-s,s])for(const y of [-s,s])corners.push([x,y,z]);for(const p of [...corners,center])sphere('chrome',.225,p,10,16);
  const idx=(z,x,y)=>(z?4:0)+(x?2:0)+(y?1:0);for(const z of [0,1])for(const x of [0,1])rod('chrome_dark',corners[idx(z,x,0)],corners[idx(z,x,1)],.043,8);for(const z of [0,1])for(const y of [0,1])rod('chrome_dark',corners[idx(z,0,y)],corners[idx(z,1,y)],.043,8);for(const x of [0,1])for(const y of [0,1])rod('chrome_dark',corners[idx(0,x,y)],corners[idx(1,x,y)],.043,8);for(const p of corners)rod('chrome_dark',center,p,.037,8);
  for(const p of [[-.59,-.59,.88],[.59,-.59,.88],[0,.59,.88]])rod('chrome_dark',[p[0]*.72,p[1]*.72,.42],p,.06,8);
  box('stone',[.72,.40,.48],[-.82,.64,.68]);for(const x of [-1.10,-.92,-.74,-.56]){box('stone_light',[.055,.05,.46],[x,.425,.70]);box('stone_light',[.055,.05,.46],[x,.855,.70])}box('roof',[.78,.34,.12],[-.82,.64,.99]);box('stone',[.20,.20,.75],[-.82,.64,1.30]);box('stone_light',[.25,.25,.06],[-.82,.64,1.66]);cone('roof',.17,.50,[-.82,.64,1.94],6);cone('gold',.05,.17,[-.82,.64,2.28],6);
  for(const p of [[.92,.72],[.95,-.62],[-.95,-.58]]){cyl('roof',.022,.14,[p[0],p[1],.49],8);sphere('green',.10,[p[0],p[1],.63],6,10)}}

const parisEvidence=emit('paris-selected.gltf','Paris Selected Miniature',parisMaterials,['iron','iron_light'],paris);
const brusselsEvidence=emit('brussels-selected.gltf','Brussels Selected Miniature',brusselsMaterials,['chrome','chrome_dark'],brussels);
const manifestPath=path.join(OUT,'manifest.json');const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));manifest.assets=manifest.assets.filter(a=>!['paris-selected','brussels-selected'].includes(a.name));manifest.assets.push(parisEvidence,brusselsEvidence);fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(`Built Paris (${parisEvidence.bytes} bytes, ${parisEvidence.faces} faces) and Brussels (${brusselsEvidence.bytes} bytes, ${brusselsEvidence.faces} faces)`);

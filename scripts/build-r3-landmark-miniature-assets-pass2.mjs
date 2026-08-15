import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const OUT='public/miniatures/wp3-8b';
fs.mkdirSync(OUT,{recursive:true});

function builder(materials){
  const G=Object.fromEntries(Object.keys(materials).map(k=>[k,{p:[],i:[]}]));
  const tri=(g,a,b,c)=>g.i.push(a,b,c);
  function box(k,e,p){
    const g=G[k],b=g.p.length/3,[x,y,z]=e.map(v=>v/2),[X,Y,Z]=p;
    const V=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];
    for(const v of V)g.p.push(v[0]+X,v[1]+Y,v[2]+Z);
    for(const f of [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]])tri(g,b+f[0],b+f[1],b+f[2]);
  }
  function cyl(k,r,h,p,n=12,r2=r){
    const g=G[k],b=g.p.length/3,[X,Y,Z]=p;
    for(let s=0;s<2;s++){
      const z=Z+(s?1:-1)*h/2,rr=s?r2:r;
      for(let j=0;j<n;j++){const a=2*Math.PI*j/n;g.p.push(X+rr*Math.cos(a),Y+rr*Math.sin(a),z)}
    }
    const c0=g.p.length/3;g.p.push(X,Y,Z-h/2);
    const c1=g.p.length/3;g.p.push(X,Y,Z+h/2);
    for(let j=0;j<n;j++){const q=(j+1)%n;tri(g,b+j,b+q,b+n+q);tri(g,b+j,b+n+q,b+n+j);tri(g,c0,b+q,b+j);tri(g,c1,b+n+j,b+n+q)}
  }
  const cone=(k,r,h,p,n=8)=>cyl(k,r,h,p,n,0);
  function sphere(k,r,p,lat=8,lon=12){
    const g=G[k],b=g.p.length/3,[X,Y,Z]=p;
    for(let a=0;a<=lat;a++){const v=Math.PI*a/lat;for(let j=0;j<lon;j++){const u=2*Math.PI*j/lon;g.p.push(X+r*Math.sin(v)*Math.cos(u),Y+r*Math.sin(v)*Math.sin(u),Z+r*Math.cos(v))}}
    for(let a=0;a<lat;a++)for(let j=0;j<lon;j++){const q=(j+1)%lon,A=b+a*lon+j,B=b+a*lon+q,C=b+(a+1)*lon+j,D=b+(a+1)*lon+q;tri(g,A,B,D);tri(g,A,D,C)}
  }
  function rod(k,a,b,r=.02,n=6){
    const g=G[k],base=g.p.length/3;let vx=b[0]-a[0],vy=b[1]-a[1],vz=b[2]-a[2];
    const L=Math.hypot(vx,vy,vz);vx/=L;vy/=L;vz/=L;
    let ux=-vy,uy=vx,uz=0;if(Math.hypot(ux,uy,uz)<.01){ux=0;uy=-vz;uz=vy}
    const uL=Math.hypot(ux,uy,uz);ux/=uL;uy/=uL;uz/=uL;
    const wx=vy*uz-vz*uy,wy=vz*ux-vx*uz,wz=vx*uy-vy*ux;
    for(const P of [a,b])for(let j=0;j<n;j++){const q=2*Math.PI*j/n,c=Math.cos(q)*r,s=Math.sin(q)*r;g.p.push(P[0]+ux*c+wx*s,P[1]+uy*c+wy*s,P[2]+uz*c+wz*s)}
    const c0=g.p.length/3;g.p.push(...a);const c1=g.p.length/3;g.p.push(...b);
    for(let j=0;j<n;j++){const q=(j+1)%n;tri(g,base+j,base+q,base+n+q);tri(g,base+j,base+n+q,base+n+j);tri(g,c0,base+q,base+j);tri(g,c1,base+n+j,base+n+q)}
  }
  return {G,box,cyl,cone,sphere,rod};
}

function emit(filename,nodeName,materials,metallic,build){
  const B=builder(materials);build(B);const {G}=B;
  const chunks=[],views=[],accessors=[],prims=[];let off=0;
  const align=()=>{while(off%4){chunks.push(Buffer.from([0]));off++}};
  for(const [k,g] of Object.entries(G)){
    if(!g.i.length)continue;align();
    const pb=Buffer.from(new Float32Array(g.p).buffer);
    const pv=views.push({buffer:0,byteOffset:off,byteLength:pb.length,target:34962})-1;chunks.push(pb);off+=pb.length;
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let j=0;j<g.p.length;j+=3)for(let q=0;q<3;q++){min[q]=Math.min(min[q],g.p[j+q]);max[q]=Math.max(max[q],g.p[j+q])}
    const pa=accessors.push({bufferView:pv,componentType:5126,count:g.p.length/3,type:'VEC3',min,max})-1;
    align();const ib=Buffer.from(new Uint32Array(g.i).buffer);
    const iv=views.push({buffer:0,byteOffset:off,byteLength:ib.length,target:34963})-1;chunks.push(ib);off+=ib.length;
    const ia=accessors.push({bufferView:iv,componentType:5125,count:g.i.length,type:'SCALAR'})-1;
    prims.push({attributes:{POSITION:pa},indices:ia,material:Object.keys(materials).indexOf(k)});
  }
  const bin=Buffer.concat(chunks);
  const doc={asset:{version:'2.0',generator:'Future Conquest WP3.8B authored geometry builder'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:nodeName}],meshes:[{name:nodeName,primitives:prims}],materials:Object.entries(materials).map(([name,v])=>({name,pbrMetallicRoughness:{baseColorFactor:v,metallicFactor:metallic.includes(name)?.65:name.includes('gold')?.35:0,roughnessFactor:metallic.includes(name)?.30:.80}})),accessors,bufferViews:views,buffers:[{byteLength:bin.length,uri:`data:application/octet-stream;base64,${bin.toString('base64')}`}]};
  const text=JSON.stringify(doc),out=path.join(OUT,filename);fs.writeFileSync(out,text);
  return {name:filename.replace('.gltf',''),path:`/miniatures/wp3-8b/${filename}`,bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex'),meshes:1,materials:prims.length,faces:Object.values(G).reduce((n,g)=>n+g.i.length/3,0)};
}

const amsterdamMaterials={
  base_dark:[.10,.15,.17,1],base_mid:[.28,.32,.31,1],gold:[.70,.56,.29,1],
  brick_red:[.48,.22,.16,1],brick_brown:[.35,.24,.18,1],brick_cream:[.72,.62,.47,1],
  stone:[.72,.67,.56,1],roof:[.16,.21,.22,1],window:[.12,.22,.25,1],green:[.20,.34,.24,1],water:[.14,.31,.36,1]
};
function steppedGable(B,k,x,y,w,z0,h){
  const {box}=B;
  box(k,[w,.34,h],[x,y,z0+h/2]);
  for(let i=0;i<4;i++){
    const ww=w*(1-i*.16),zz=z0+h+.10+i*.13;
    box(k,[ww,.36,.12],[x,y,zz]);
  }
}
function amsterdam(B){
  const {box,cyl,cone,sphere,rod}=B;
  cyl('base_dark',1.46,.18,[0,0,.09],16);cyl('base_mid',1.35,.10,[0,0,.23],16);cyl('gold',1.27,.035,[0,0,.297],16);cyl('base_dark',1.20,.09,[0,0,.36],16);
  box('water',[2.12,.28,.035],[0,-.76,.43]);box('stone',[2.16,.12,.08],[0,-.55,.46]);
  const houses=[[-.83,'brick_red',.30,1.08],[-.46,'brick_cream',.29,1.24],[-.10,'brick_brown',.31,1.14],[.27,'brick_red',.30,1.32],[.64,'brick_cream',.29,1.12]];
  for(const [x,k,w,h] of houses){
    steppedGable(B,k,x,-.05,w,.46,h);
    for(const z of [.72,.98,1.24])for(const dx of [-.07,.07])box('window',[.07,.025,.13],[x+dx,-.235,z]);
    box('roof',[w*.92,.31,.06],[x,.12,.46+h+.55]);
  }
  box('stone',[.44,.44,1.52],[.88,.31,1.22]);
  for(const z of [.66,.94,1.22,1.50]){box('brick_cream',[.49,.49,.055],[.88,.31,z]);for(const s of [-1,1])box('window',[.08,.025,.15],[.88+s*.12,.075,z+.07]);}
  box('stone',[.50,.50,.22],[.88,.31,2.02]);box('roof',[.38,.38,.30],[.88,.31,2.28]);cyl('gold',.23,.18,[.88,.31,2.52],8,.12);cone('gold',.20,.38,[.88,.31,2.80],8);rod('gold',[.88,.31,2.96],[.88,.31,3.25],.025,8);
  for(const p of [[-1.00,.62],[-.58,.70],[.30,.72],[.62,.68]]){cyl('roof',.022,.16,[p[0],p[1],.51],8);sphere('green',.10,[p[0],p[1],.66],6,10);}
}

const frankfurtMaterials={
  base_dark:[.11,.15,.17,1],base_mid:[.28,.32,.33,1],gold:[.68,.54,.27,1],
  glass:[.23,.43,.49,1],glass_light:[.38,.60,.64,1],steel:[.32,.36,.37,1],
  stone:[.71,.64,.53,1],timber:[.28,.16,.11,1],roof:[.22,.18,.17,1],window:[.10,.19,.22,1],green:[.20,.33,.23,1]
};
function skyscraper(B,x,y,w,d,h,accent=false){
  const {box}=B;
  box(accent?'glass_light':'glass',[w,d,h],[x,y,.45+h/2]);
  for(let z=.64;z<.45+h;z+=.22)box('steel',[w+.025,d+.025,.025],[x,y,z]);
  for(const s of [-1,1])box('steel',[.025,d+.03,h],[x+s*w/2,y,.45+h/2]);
}
function frankfurt(B){
  const {box,cyl,cone,sphere,rod}=B;
  cyl('base_dark',1.46,.18,[0,0,.09],16);cyl('base_mid',1.35,.10,[0,0,.23],16);cyl('gold',1.27,.035,[0,0,.297],16);cyl('base_dark',1.20,.09,[0,0,.36],16);
  skyscraper(B,-.42,-.15,.34,.32,2.85,true);
  cyl('glass_light',.17,2.46,[-.17,-.12,1.68],16);for(const z of [.72,1.05,1.38,1.71,2.04,2.37,2.70])cyl('steel',.185,.035,[-.17,-.12,z],16);rod('steel',[-.17,-.12,2.91],[-.17,-.12,3.32],.025,8);
  skyscraper(B,.20,.06,.30,.28,2.28);skyscraper(B,.50,-.08,.25,.24,1.90);skyscraper(B,.72,.16,.22,.22,1.55);
  for(const x of [-.75,-.45,-.15]){
    box('stone',[.25,.30,.60],[x,.67,.75]);
    for(const z of [.63,.84])for(const dx of [-.06,.06])box('window',[.06,.025,.11],[x+dx,.505,z]);
    for(const z of [.56,.72,.88]){rod('timber',[x-.11,.505,z],[x+.11,.505,z],.012,5);rod('timber',[x-.11,.505,z-.09],[x+.11,.505,z+.09],.010,5);}
    box('roof',[.29,.32,.10],[x,.67,1.10]);cone('roof',.20,.35,[x,.67,1.30],4);
  }
  for(const p of [[.95,.63],[.93,-.62],[-.96,-.62]]){cyl('roof',.022,.14,[p[0],p[1],.49],8);sphere('green',.095,[p[0],p[1],.63],6,10);}
}

const bernMaterials={
  base_dark:[.12,.15,.16,1],base_mid:[.30,.31,.29,1],gold:[.70,.56,.28,1],
  sandstone:[.66,.58,.45,1],sandstone_light:[.80,.72,.56,1],roof:[.23,.30,.27,1],
  copper:[.25,.43,.37,1],clock:[.86,.78,.58,1],clock_dark:[.12,.14,.14,1],window:[.12,.19,.18,1],green:[.23,.34,.22,1]
};
function bern(B){
  const {box,cyl,cone,sphere,rod}=B;
  cyl('base_dark',1.46,.18,[0,0,.09],16);cyl('base_mid',1.35,.10,[0,0,.23],16);cyl('gold',1.27,.035,[0,0,.297],16);cyl('base_dark',1.20,.09,[0,0,.36],16);
  const tx=-.38,ty=-.05;
  box('sandstone',[.46,.46,1.48],[tx,ty,1.20]);
  for(const z of [.64,.92,1.20,1.48])box('sandstone_light',[.50,.50,.05],[tx,ty,z]);
  box('sandstone',[.54,.54,.34],[tx,ty,2.02]);
  cyl('gold',.18,.03,[tx,ty-.285,2.02],24);cyl('clock',.15,.035,[tx,ty-.305,2.02],24);
  rod('clock_dark',[tx,ty-.327,2.02],[tx+.09,ty-.327,2.07],.012,6);rod('clock_dark',[tx,ty-.327,2.02],[tx-.04,ty-.327,2.12],.010,6);
  box('sandstone_light',[.58,.58,.06],[tx,ty,2.24]);cone('roof',.42,.52,[tx,ty,2.53],4);cone('copper',.26,.38,[tx,ty,2.95],4);rod('gold',[tx,ty,3.05],[tx,ty,3.30],.022,8);
  box('sandstone',[1.30,.42,.48],[.47,.50,.70]);box('sandstone_light',[1.36,.46,.06],[.47,.50,.98]);
  box('sandstone',[.42,.48,.66],[.47,.50,.82]);cyl('sandstone_light',.26,.22,[.47,.50,1.20],18);sphere('copper',.30,[.47,.50,1.34],8,16);cone('gold',.05,.18,[.47,.50,1.69],8);
  for(const x of [-.10,.02,.14,.80,.92,1.04]){box('sandstone_light',[.045,.05,.45],[x,.265,.72]);box('window',[.07,.025,.13],[x,.245,.73]);}
  for(const [x,y,w,h] of [[-.95,.48,.30,.38],[-.72,.68,.26,.32],[.86,-.60,.30,.38],[.48,-.66,.34,.34]]){box('sandstone',[w,.30,h],[x,y,.47+h/2]);cone('roof',w*.72,.24,[x,y,.47+h+.12],4);}
  for(const p of [[1.02,.70],[.95,-.72],[-1.03,-.62]]){cyl('roof',.022,.14,[p[0],p[1],.49],8);sphere('green',.095,[p[0],p[1],.63],6,10);}
}

const assets=[
  emit('amsterdam-selected.gltf','Amsterdam Selected Miniature',amsterdamMaterials,[],amsterdam),
  emit('frankfurt-selected.gltf','Frankfurt Selected Miniature',frankfurtMaterials,['glass','glass_light','steel'],frankfurt),
  emit('bern-selected.gltf','Bern Selected Miniature',bernMaterials,['copper'],bern)
];
fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify({schemaVersion:1,assets},null,2)+'\n');
for(const a of assets)console.log(`Built ${a.name} (${a.bytes} bytes, ${a.faces} faces, ${a.materials} material groups)`);

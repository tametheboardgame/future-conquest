import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const OUT='public/miniatures/wp3-8e';
fs.mkdirSync(OUT,{recursive:true});

function builder(materials){
  const G=Object.fromEntries(Object.keys(materials).map(k=>[k,{p:[],i:[]} ]));
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
  function beam(k,a,b,width=.12,depth=.10){
    const g=G[k],base=g.p.length/3;
    let vx=b[0]-a[0],vy=b[1]-a[1],vz=b[2]-a[2];const L=Math.hypot(vx,vy,vz);vx/=L;vy/=L;vz/=L;
    let ux=-vy,uy=vx,uz=0;if(Math.hypot(ux,uy,uz)<.01){ux=1;uy=0;uz=0}
    const uL=Math.hypot(ux,uy,uz);ux/=uL;uy/=uL;uz/=uL;
    const wx=vy*uz-vz*uy,wy=vz*ux-vx*uz,wz=vx*uy-vy*ux;
    const hw=width/2,hd=depth/2;
    for(const P of [a,b])for(const [su,sw] of [[-1,-1],[1,-1],[1,1],[-1,1]])g.p.push(P[0]+su*hw*ux+sw*hd*wx,P[1]+su*hw*uy+sw*hd*wy,P[2]+su*hw*uz+sw*hd*wz);
    for(const f of [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]])tri(g,base+f[0],base+f[1],base+f[2]);
  }
  function prism(k,poly,h,z0){
    const g=G[k],base=g.p.length/3,n=poly.length;
    for(const z of [z0,z0+h])for(const [x,y] of poly)g.p.push(x,y,z);
    for(let j=1;j<n-1;j++){tri(g,base,base+j+1,base+j);tri(g,base+n,base+n+j,base+n+j+1)}
    for(let j=0;j<n;j++){const q=(j+1)%n;tri(g,base+j,base+q,base+n+q);tri(g,base+j,base+n+q,base+n+j)}
  }
  function gableRoof(k,x,y,w,d,z,h){
    const g=G[k],base=g.p.length/3;
    const V=[[-w/2,-d/2,0],[w/2,-d/2,0],[w/2,d/2,0],[-w/2,d/2,0],[0,-d/2,h],[0,d/2,h]];
    for(const [dx,dy,dz] of V)g.p.push(x+dx,y+dy,z+dz);
    for(const f of [[0,1,4],[3,5,2],[0,4,5],[0,5,3],[1,2,5],[1,5,4],[0,3,2],[0,2,1]])tri(g,base+f[0],base+f[1],base+f[2]);
  }
  return {G,box,cyl,cone,sphere,rod,beam,prism,gableRoof};
}

function emit(filename,nodeName,materials,metallic,build){
  const B=builder(materials);build(B);const {G}=B;
  const chunks=[],views=[],accessors=[],prims=[];let off=0;
  const align=()=>{while(off%4){chunks.push(Buffer.from([0]));off++}};
  for(const [k,g] of Object.entries(G)){
    if(!g.i.length)continue;align();
    const pb=Buffer.from(new Float32Array(g.p).buffer);const pv=views.push({buffer:0,byteOffset:off,byteLength:pb.length,target:34962})-1;chunks.push(pb);off+=pb.length;
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let j=0;j<g.p.length;j+=3)for(let q=0;q<3;q++){min[q]=Math.min(min[q],g.p[j+q]);max[q]=Math.max(max[q],g.p[j+q])}
    const pa=accessors.push({bufferView:pv,componentType:5126,count:g.p.length/3,type:'VEC3',min,max})-1;
    align();const ib=Buffer.from(new Uint32Array(g.i).buffer);const iv=views.push({buffer:0,byteOffset:off,byteLength:ib.length,target:34963})-1;chunks.push(ib);off+=ib.length;
    const ia=accessors.push({bufferView:iv,componentType:5125,count:g.i.length,type:'SCALAR'})-1;
    prims.push({attributes:{POSITION:pa},indices:ia,material:Object.keys(materials).indexOf(k)});
  }
  const bin=Buffer.concat(chunks);
  const doc={asset:{version:'2.0',generator:'Future Conquest WP3.8E authored geometry builder'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:nodeName}],meshes:[{name:nodeName,primitives:prims}],materials:Object.entries(materials).map(([name,v])=>({name,pbrMetallicRoughness:{baseColorFactor:v,metallicFactor:metallic.includes(name)?.58:name.includes('gold')?.35:0,roughnessFactor:metallic.includes(name)?.34:.80}})),accessors,bufferViews:views,buffers:[{byteLength:bin.length,uri:`data:application/octet-stream;base64,${bin.toString('base64')}`}]};
  const text=JSON.stringify(doc),out=path.join(OUT,filename);fs.writeFileSync(out,text);
  return {name:filename.replace('.gltf',''),path:`/miniatures/wp3-8e/${filename}`,bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex'),meshes:1,materials:prims.length,faces:Object.values(G).reduce((n,g)=>n+g.i.length/3,0)};
}

function premiumBase(B){
  B.cyl('base_dark',1.46,.18,[0,0,.09],16);B.cyl('base_mid',1.35,.10,[0,0,.23],16);B.cyl('gold',1.27,.035,[0,0,.297],16);B.cyl('base_dark',1.20,.09,[0,0,.36],16);
}

const namurMaterials={base_dark:[.10,.14,.15,1],base_mid:[.30,.31,.29,1],gold:[.70,.55,.27,1],rock:[.35,.32,.27,1],fort:[.60,.55,.45,1],fort_light:[.76,.70,.57,1],roof:[.20,.25,.26,1],cathedral:[.75,.70,.60,1],dome:[.28,.43,.38,1],window:[.10,.16,.18,1],water:[.18,.38,.46,1],town:[.68,.58,.48,1]};
function namur(B){
  const {box,cyl,cone,sphere,rod,prism,gableRoof}=B;premiumBase(B);
  prism('water',[[-1.12,-.72],[.02,-.82],[.20,-.63],[-1.08,-.50]],.025,.405);
  prism('water',[[.10,-.82],[1.12,-.52],[1.06,-.30],[.00,-.60]],.025,.405);
  prism('rock',[[-.98,-.44],[-.62,-.82],[.18,-.86],[.74,-.48],[.82,.10],[.42,.48],[-.22,.56],[-.88,.22]],.26,.42);
  prism('fort',[[-.82,-.35],[-.62,-.63],[-.18,-.55],[.06,-.70],[.42,-.48],[.68,-.18],[.54,.20],[.18,.12],[-.06,.34],[-.54,.26]],.25,.68);
  prism('fort_light',[[-.58,-.27],[-.44,-.45],[-.10,-.40],[.10,-.52],[.40,-.32],[.43,.02],[.16,.05],[-.04,.23],[-.43,.16]],.17,.93);
  box('fort',[.78,.34,.30],[-.12,-.06,1.20]);box('roof',[.84,.40,.06],[-.12,-.06,1.38]);
  for(const p of [[-.72,-.38],[-.46,.22],[.35,-.40],[.51,.02]]){cyl('fort_light',.12,.32,[p[0],p[1],.98],10);cone('roof',.13,.18,[p[0],p[1],1.23],8)}
  for(const x of [-.48,-.20,.08,.34])box('window',[.08,.025,.09],[x,-.245,1.18]);
  const cx=.68,cy=.52;
  box('cathedral',[.66,.48,.36],[cx,cy,.65]);box('fort_light',[.72,.12,.38],[cx,cy-.28,.67]);
  cyl('cathedral',.23,.18,[cx,cy,1.00],16);sphere('dome',.22,[cx,cy,1.12],8,16);cone('dome',.08,.16,[cx,cy,1.34],10);rod('gold',[cx,cy,1.40],[cx,cy,1.53],.012,6);
  for(const dx of [-.27,.27]){box('cathedral',[.14,.14,.40],[cx+dx,cy-.27,.76]);cone('roof',.10,.22,[cx+dx,cy-.27,1.07],8)}
  for(const [x,y,w,h] of [[-.92,.62,.30,.34],[-.58,.72,.34,.40],[-.15,.74,.32,.32],[.20,.70,.30,.36],[.98,.20,.28,.32]]){box('town',[w,.28,h],[x,y,.43+h/2]);gableRoof('roof',x,y,w*1.08,.32,.45+h,.18)}
}

const churMaterials={base_dark:[.10,.14,.15,1],base_mid:[.30,.31,.29,1],gold:[.71,.55,.27,1],hill:[.37,.40,.33,1],stone:[.72,.68,.59,1],stone_dark:[.52,.50,.45,1],plaster:[.78,.70,.58,1],roof:[.22,.27,.28,1],roof_red:[.42,.24,.20,1],window:[.10,.16,.18,1],copper:[.28,.43,.37,1],green:[.20,.32,.21,1]};
function alpineHouse(B,x,y,w,h,roofKey='roof'){
  B.box('plaster',[w,.30,h],[x,y,.43+h/2]);B.gableRoof(roofKey,x,y,w*1.08,.34,.45+h,.20);
  for(const dx of [-.22,.22])for(const z of [.58,.78])B.box('window',[.055,.025,.07],[x+dx*w,y-.163,z]);
}
function chur(B){
  const {box,cyl,cone,sphere,rod,prism,gableRoof}=B;premiumBase(B);
  prism('hill',[[-.92,-.52],[-.35,-.75],[.28,-.66],[.72,-.32],[.55,.18],[-.10,.28],[-.72,.10]],.22,.42);
  prism('stone_dark',[[-.70,-.35],[-.28,-.54],[.28,-.48],[.54,-.22],[.42,.08],[-.12,.18],[-.56,.04]],.12,.64);
  box('stone',[.92,.48,.48],[-.12,-.18,.94]);gableRoof('roof',-.12,-.18,.98,.54,1.18,.28);
  box('stone',[.44,.68,.36],[-.12,.05,.87]);gableRoof('roof_red',-.12,.05,.48,.72,1.05,.22);
  const tx=-.52,ty=-.25;box('stone',[.25,.25,1.08],[tx,ty,1.19]);for(const z of [.82,1.08,1.34])box('stone_dark',[.29,.29,.035],[tx,ty,z]);
  gableRoof('roof',tx,ty,.31,.31,1.73,.28);rod('gold',[tx,ty,1.99],[tx,ty,2.13],.013,6);
  box('plaster',[.64,.30,.34],[.36,.28,.77]);gableRoof('roof_red',.36,.28,.70,.34,.94,.18);
  const sx=.72,sy=-.42;box('stone_dark',[.21,.21,.92],[sx,sy,1.01]);box('stone',[.25,.25,.18],[sx,sy,1.52]);cone('roof',.18,.48,[sx,sy,1.85],4);rod('gold',[sx,sy,2.08],[sx,sy,2.19],.012,6);
  box('stone',[.48,.30,.30],[.68,-.22,.62]);gableRoof('roof_red',.68,-.22,.52,.34,.77,.20);
  alpineHouse(B,-.90,.55,.28,.38);alpineHouse(B,-.58,.69,.30,.46,'roof_red');alpineHouse(B,-.20,.70,.32,.36);alpineHouse(B,.18,.68,.30,.42,'roof_red');alpineHouse(B,.60,.62,.30,.34);alpineHouse(B,.94,.46,.25,.30,'roof_red');
  for(const p of [[-1.02,-.70],[1.00,.22]]){cyl('roof',.020,.12,[p[0],p[1],.48],8);sphere('green',.085,[p[0],p[1],.60],6,10)}
}

const innsbruckMaterials={base_dark:[.10,.14,.15,1],base_mid:[.30,.31,.29,1],gold:[.78,.61,.22,1],concrete:[.72,.73,.70,1],concrete_dark:[.48,.51,.50,1],glass:[.18,.34,.40,1],steel:[.34,.38,.39,1],historic:[.75,.65,.53,1],plaster:[.80,.73,.62,1],roof:[.24,.28,.29,1],roof_red:[.45,.27,.21,1],window:[.10,.16,.18,1],green:[.20,.33,.22,1]};
function tyroleanHouse(B,x,y,w,h,roofKey='roof'){
  B.box('plaster',[w,.30,h],[x,y,.43+h/2]);B.gableRoof(roofKey,x,y,w*1.08,.34,.45+h,.22);
  for(const dx of [-.22,.22])for(const z of [.60,.80])B.box('window',[.050,.025,.065],[x+dx*w,y-.163,z]);
}
function innsbruck(B){
  const {box,cyl,sphere,rod,beam,gableRoof}=B;premiumBase(B);
  const bx=-.48,by=-.16;
  cyl('concrete',.105,1.62,[bx,by,1.25],12,.075);cyl('concrete_dark',.13,.10,[bx,by,.48],12);
  box('glass',[.46,.30,.26],[bx+.05,by,2.02]);box('concrete',[.52,.34,.10],[bx+.05,by,1.87]);
  beam('concrete',[bx-.70,by,2.58],[bx-.24,by,2.36],.18,.16);
  beam('concrete',[bx-.24,by,2.36],[bx+.20,by,2.03],.18,.16);
  beam('concrete',[bx+.20,by,2.03],[.80,by,1.04],.18,.15);
  beam('steel',[bx-.72,by,2.67],[bx+.16,by,2.12],.045,.05);
  beam('steel',[bx+.16,by,2.12],[.84,by,1.11],.045,.05);
  for(const [x,zTop] of [[-.10,1.82],[.30,1.56],[.66,1.18]])rod('steel',[x,by,.43],[x,by,zTop],.022,6);
  box('glass',[.34,.18,.12],[bx+.06,by-.19,2.02]);
  const gx=.62,gy=.56;box('historic',[.76,.30,.48],[gx,gy,.68]);gableRoof('roof_red',gx,gy,.80,.34,.92,.22);
  box('historic',[.26,.08,.30],[gx,gy-.19,.78]);box('gold',[.34,.20,.08],[gx,gy-.25,1.01]);gableRoof('gold',gx,gy-.25,.36,.22,1.05,.12);
  for(const x of [gx-.25,gx,gx+.25])for(const z of [.58,.78])box('window',[.055,.025,.070],[x,gy-.163,z]);
  tyroleanHouse(B,-.92,.62,.28,.36);tyroleanHouse(B,-.58,.72,.30,.42,'roof_red');tyroleanHouse(B,-.18,.72,.30,.34);tyroleanHouse(B,.18,.70,.28,.39,'roof_red');tyroleanHouse(B,1.00,.37,.24,.31);
  for(const p of [[-.98,-.62],[.95,-.56]]){cyl('roof',.020,.13,[p[0],p[1],.48],8);sphere('green',.09,[p[0],p[1],.61],6,10)}
}

const assets=[
  emit('namur-selected.gltf','Namur landmark miniature',namurMaterials,['dome'],namur),
  emit('chur-selected.gltf','Chur landmark miniature',churMaterials,['copper'],chur),
  emit('innsbruck-selected.gltf','Innsbruck landmark miniature',innsbruckMaterials,['glass','steel'],innsbruck)
];
fs.writeFileSync(path.join(OUT,'manifest.json'),`${JSON.stringify({schemaVersion:1,pass:'WP3.8E',assets},null,2)}\n`);
for(const a of assets)console.log(`Built ${a.name} (${a.bytes} bytes, ${a.faces} faces, ${a.materials} material groups)`);

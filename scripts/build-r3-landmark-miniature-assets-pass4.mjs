import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const OUT='public/miniatures/wp3-8d';
fs.mkdirSync(OUT,{recursive:true});

function builder(materials){
  const G=Object.fromEntries(Object.keys(materials).map(k=>[k,{p:[],i:[]}]));
  const tri=(g,a,b,c)=>g.i.push(a,b,c);

  function pushBox(k,e,p,rz=0){
    const g=G[k],b=g.p.length/3,[x,y,z]=e.map(v=>v/2),[X,Y,Z]=p;
    const c=Math.cos(rz),s=Math.sin(rz);
    const V=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];
    for(const [vx,vy,vz] of V){
      const rx=vx*c-vy*s,ry=vx*s+vy*c;
      g.p.push(rx+X,ry+Y,vz+Z);
    }
    for(const f of [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]])tri(g,b+f[0],b+f[1],b+f[2]);
  }

  function cyl(k,r,h,p,n=16,r2=r){
    const g=G[k],b=g.p.length/3,[X,Y,Z]=p;
    for(let side=0;side<2;side++){
      const z=Z+(side?1:-1)*h/2,rr=side?r2:r;
      for(let j=0;j<n;j++){const a=2*Math.PI*j/n;g.p.push(X+rr*Math.cos(a),Y+rr*Math.sin(a),z);}
    }
    const c0=g.p.length/3;g.p.push(X,Y,Z-h/2);
    const c1=g.p.length/3;g.p.push(X,Y,Z+h/2);
    for(let j=0;j<n;j++){
      const q=(j+1)%n;
      tri(g,b+j,b+q,b+n+q);tri(g,b+j,b+n+q,b+n+j);
      tri(g,c0,b+q,b+j);tri(g,c1,b+n+j,b+n+q);
    }
  }

  const cone=(k,r,h,p,n=10)=>cyl(k,r,h,p,n,0);

  function sphere(k,r,p,lat=8,lon=16){
    const g=G[k],b=g.p.length/3,[X,Y,Z]=p;
    for(let a=0;a<=lat;a++){
      const v=Math.PI*a/lat;
      for(let j=0;j<lon;j++){
        const u=2*Math.PI*j/lon;
        g.p.push(X+r*Math.sin(v)*Math.cos(u),Y+r*Math.sin(v)*Math.sin(u),Z+r*Math.cos(v));
      }
    }
    for(let a=0;a<lat;a++)for(let j=0;j<lon;j++){
      const q=(j+1)%lon,A=b+a*lon+j,B=b+a*lon+q,C=b+(a+1)*lon+j,D=b+(a+1)*lon+q;
      tri(g,A,B,D);tri(g,A,D,C);
    }
  }

  function rod(k,a,b,r=.018,n=7){
    const g=G[k],base=g.p.length/3;
    let vx=b[0]-a[0],vy=b[1]-a[1],vz=b[2]-a[2];
    const L=Math.hypot(vx,vy,vz);vx/=L;vy/=L;vz/=L;
    let ux=-vy,uy=vx,uz=0;
    if(Math.hypot(ux,uy,uz)<.01){ux=0;uy=-vz;uz=vy;}
    const uL=Math.hypot(ux,uy,uz);ux/=uL;uy/=uL;uz/=uL;
    const wx=vy*uz-vz*uy,wy=vz*ux-vx*uz,wz=vx*uy-vy*ux;
    for(const P of [a,b])for(let j=0;j<n;j++){
      const q=2*Math.PI*j/n,c=Math.cos(q)*r,s=Math.sin(q)*r;
      g.p.push(P[0]+ux*c+wx*s,P[1]+uy*c+wy*s,P[2]+uz*c+wz*s);
    }
    const c0=g.p.length/3;g.p.push(...a);
    const c1=g.p.length/3;g.p.push(...b);
    for(let j=0;j<n;j++){
      const q=(j+1)%n;
      tri(g,base+j,base+q,base+n+q);tri(g,base+j,base+n+q,base+n+j);
      tri(g,c0,base+q,base+j);tri(g,c1,base+n+j,base+n+q);
    }
  }

  function gableRoof(k,w,d,h,p){
    const g=G[k],b=g.p.length/3,[X,Y,Z]=p;
    const x=w/2,y=d/2,z=h/2;
    const V=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[0,-y,z],[0,y,z]];
    for(const v of V)g.p.push(v[0]+X,v[1]+Y,v[2]+Z);
    for(const f of [[0,1,4],[3,5,2],[0,4,5],[0,5,3],[1,2,5],[1,5,4],[0,3,2],[0,2,1]])tri(g,b+f[0],b+f[1],b+f[2]);
  }

  return {G,box:pushBox,cyl,cone,sphere,rod,gableRoof};
}

function emit(filename,nodeName,materials,metallic,build){
  const B=builder(materials);build(B);const {G}=B;
  const chunks=[],views=[],accessors=[],prims=[];let off=0;
  const align=()=>{while(off%4){chunks.push(Buffer.from([0]));off++;}};
  for(const [k,g] of Object.entries(G)){
    if(!g.i.length)continue;
    align();
    const pb=Buffer.from(new Float32Array(g.p).buffer);
    const pv=views.push({buffer:0,byteOffset:off,byteLength:pb.length,target:34962})-1;chunks.push(pb);off+=pb.length;
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let j=0;j<g.p.length;j+=3)for(let q=0;q<3;q++){min[q]=Math.min(min[q],g.p[j+q]);max[q]=Math.max(max[q],g.p[j+q]);}
    const pa=accessors.push({bufferView:pv,componentType:5126,count:g.p.length/3,type:'VEC3',min,max})-1;
    align();
    const ib=Buffer.from(new Uint32Array(g.i).buffer);
    const iv=views.push({buffer:0,byteOffset:off,byteLength:ib.length,target:34963})-1;chunks.push(ib);off+=ib.length;
    const ia=accessors.push({bufferView:iv,componentType:5125,count:g.i.length,type:'SCALAR'})-1;
    prims.push({attributes:{POSITION:pa},indices:ia,material:Object.keys(materials).indexOf(k)});
  }
  const bin=Buffer.concat(chunks);
  const doc={
    asset:{version:'2.0',generator:'Future Conquest WP3.8D authored geometry builder'},
    scene:0,
    scenes:[{nodes:[0]}],
    nodes:[{mesh:0,name:nodeName}],
    meshes:[{name:nodeName,primitives:prims}],
    materials:Object.entries(materials).map(([name,v])=>({
      name,
      pbrMetallicRoughness:{baseColorFactor:v,metallicFactor:metallic.includes(name)?.58:name.includes('gold')?.28:0,roughnessFactor:metallic.includes(name)?.34:.80}
    })),
    accessors,
    bufferViews:views,
    buffers:[{byteLength:bin.length,uri:`data:application/octet-stream;base64,${bin.toString('base64')}`}]
  };
  const text=JSON.stringify(doc),out=path.join(OUT,filename);fs.writeFileSync(out,text);
  return {
    name:filename.replace('.gltf',''),
    path:`/miniatures/wp3-8d/${filename}`,
    bytes:Buffer.byteLength(text),
    sha256:createHash('sha256').update(text).digest('hex'),
    meshes:1,
    materials:prims.length,
    faces:Object.values(G).reduce((n,g)=>n+g.i.length/3,0)
  };
}

function premiumBase(B){
  B.cyl('base_dark',1.46,.18,[0,0,.09],18);
  B.cyl('base_mid',1.35,.10,[0,0,.23],18);
  B.cyl('gold',1.27,.035,[0,0,.297],18);
  B.cyl('base_dark',1.20,.09,[0,0,.36],18);
}

const dusseldorfMaterials={
  base_dark:[.10,.14,.15,1],base_mid:[.29,.31,.30,1],gold:[.72,.56,.28,1],
  concrete:[.63,.66,.64,1],concrete_dark:[.40,.44,.43,1],glass:[.20,.38,.43,1],
  glass_light:[.39,.60,.64,1],steel:[.34,.37,.38,1],water:[.16,.35,.43,1],brick:[.53,.35,.27,1],accent:[.68,.22,.18,1]
};
function dusseldorf(B){
  const {box,cyl,cone,rod}=B;premiumBase(B);
  box('water',[1.95,.34,.025],[.05,.82,.405],-.05);
  const tx=-.47,ty=-.10;
  cyl('concrete',.115,2.34,[tx,ty,1.62],18,.070);
  cyl('concrete_dark',.15,.12,[tx,ty,.53],18);
  for(const z of [.92,1.24,1.56,1.88,2.20])cyl('concrete_dark',.105,.022,[tx,ty,z],18);
  cyl('steel',.34,.075,[tx,ty,2.69],20);
  cyl('glass',.30,.25,[tx,ty,2.84],22,.28);
  cyl('glass_light',.32,.055,[tx,ty,2.98],22);
  cyl('steel',.27,.09,[tx,ty,3.05],20,.19);
  cyl('concrete_dark',.048,.67,[tx,ty,3.42],12,.026);
  cone('steel',.035,.24,[tx,ty,3.875],10);
  rod('accent',[tx,ty,3.99],[tx,ty,4.12],.012,7);

  const harbour=[
    [.18,.30,.58,.42,.86,-.26,'glass'],
    [.76,.26,.46,.38,1.05,.22,'glass_light'],
    [.43,-.47,.55,.34,.74,.42,'steel'],
    [.94,-.42,.40,.32,.64,-.35,'brick']
  ];
  for(const [x,y,w,d,h,r,m] of harbour){
    box(m,[w,d,h],[x,y,.43+h/2],r);
    box('steel',[w*1.04,d*1.04,.045],[x,y,.46+h],r);
    for(let z=.60;z<.42+h;z+=.18)box('glass_light',[w*.80,.018,.025],[x,y-d*.51,z],r);
  }
  for(const p of [[.18,.30],[.76,.26],[.43,-.47],[.94,-.42]]){
    const [x,y]=p;rod('steel',[x-.18,y-.18,.46],[x+.18,y+.18,1.05],.012,6);rod('steel',[x+.18,y-.18,.46],[x-.18,y+.18,1.05],.012,6);
  }
}

const stuttgartMaterials={
  base_dark:[.10,.14,.15,1],base_mid:[.29,.31,.30,1],gold:[.72,.56,.28,1],
  concrete:[.69,.70,.66,1],concrete_dark:[.43,.45,.43,1],glass:[.22,.38,.40,1],
  limestone:[.76,.72,.62,1],roof:[.24,.29,.29,1],copper:[.31,.44,.38,1],window:[.12,.18,.19,1],green:[.21,.33,.22,1]
};
function stuttgart(B){
  const {box,cyl,cone,sphere,rod}=B;premiumBase(B);
  const tx=-.50,ty=-.16;
  cyl('concrete',.095,2.47,[tx,ty,1.69],18,.045);
  cyl('concrete_dark',.125,.12,[tx,ty,.53],18);
  for(const z of [.90,1.30,1.70,2.10])cyl('concrete_dark',.075,.018,[tx,ty,z],16);
  cyl('concrete_dark',.27,.055,[tx,ty,2.84],20);
  cyl('glass',.235,.20,[tx,ty,2.94],22,.205);
  cyl('concrete',.255,.055,[tx,ty,3.065],20);
  cyl('glass',.18,.12,[tx,ty,3.15],20,.14);
  cyl('concrete_dark',.040,.67,[tx,ty,3.52],12,.024);
  cone('concrete_dark',.030,.22,[tx,ty,3.965],9);

  box('limestone',[1.28,.48,.44],[.42,.34,.67]);
  box('limestone',[.40,.58,.54],[-.04,.32,.72]);
  box('limestone',[.40,.58,.54],[.88,.32,.72]);
  box('roof',[1.34,.52,.055],[.42,.34,.92]);
  box('roof',[.44,.62,.060],[-.04,.32,1.01]);
  box('roof',[.44,.62,.060],[.88,.32,1.01]);
  sphere('copper',.17,[.42,.34,1.07],7,14);
  cyl('limestone',.18,.10,[.42,.34,.99],14);
  cone('copper',.08,.20,[.42,.34,1.25],10);
  for(const x of [-.10,.12,.34,.56,.78,.98]){
    box('window',[.10,.018,.13],[x,.092,.70]);
    rod('limestone',[x-.07,.075,.48],[x-.07,.075,.91],.010,6);
    rod('limestone',[x+.07,.075,.48],[x+.07,.075,.91],.010,6);
  }
  for(const p of [[-1.00,.58],[1.05,-.52],[.90,.82]]){
    cyl('roof',.020,.13,[p[0],p[1],.49],8);sphere('green',.095,[p[0],p[1],.62],6,10);
  }
}

const rennesMaterials={
  base_dark:[.10,.14,.15,1],base_mid:[.29,.31,.30,1],gold:[.72,.56,.28,1],
  stone:[.72,.64,.52,1],stone_light:[.83,.75,.62,1],roof:[.16,.20,.22,1],
  timber:[.25,.14,.10,1],plaster_red:[.60,.34,.28,1],plaster_cream:[.78,.68,.53,1],
  plaster_blue:[.38,.50,.53,1],window:[.10,.16,.18,1],green:[.20,.31,.21,1]
};
function timberHouse(B,x,y,w,h,mat,roofHeight=.28){
  B.box(mat,[w,.34,h],[x,y,.43+h/2]);
  B.gableRoof('roof',w*1.08,.40,roofHeight,[x,y,.43+h+roofHeight/2]);
  for(const z of [.56,.75,.94,1.13]){
    if(z>.40+h)continue;
    B.rod('timber',[x-w*.43,y-.181,z],[x+w*.43,y-.181,z],.011,6);
  }
  for(const dx of [-.34,0,.34]){
    const xx=x+dx*w;
    B.rod('timber',[xx,y-.181,.46],[xx,y-.181,.40+h],.011,6);
  }
  B.rod('timber',[x-w*.43,y-.181,.48],[x+w*.43,y-.181,.40+h],.010,6);
  B.rod('timber',[x+w*.43,y-.181,.48],[x-w*.43,y-.181,.40+h],.010,6);
}
function rennes(B){
  const {box,cyl,cone,sphere,rod,gableRoof}=B;premiumBase(B);
  const px=-.25,py=-.16;
  box('stone',[1.45,.58,.62],[px,py,.75]);
  box('stone_light',[1.53,.64,.075],[px,py,.47]);
  box('roof',[1.50,.62,.10],[px,py,1.10]);
  gableRoof('roof',1.46,.60,.30,[px,py,1.30]);
  for(const x of [px-.61,px+.61]){
    box('stone',[.34,.66,.78],[x,py,.83]);
    gableRoof('roof',.38,.69,.36,[x,py,1.36]);
    cone('gold',.030,.16,[x,py,1.62],8);
  }
  box('stone_light',[.38,.66,.80],[px,py,.84]);
  gableRoof('roof',.42,.70,.40,[px,py,1.40]);
  cyl('stone_light',.095,.16,[px,py,1.62],12);
  sphere('roof',.10,[px,py,1.74],7,14);
  cone('gold',.032,.18,[px,py,1.91],8);
  for(const x of [px-.48,px-.24,px,px+.24,px+.48]){
    for(const z of [.67,.91])box('window',[.11,.020,.15],[x,py-.302,z]);
    rod('stone_light',[x-.07,py-.320,.50],[x-.07,py-.320,1.05],.010,6);
    rod('stone_light',[x+.07,py-.320,.50],[x+.07,py-.320,1.05],.010,6);
  }
  const houses=[
    [-.92,.65,.31,.60,'plaster_red'],[-.56,.72,.34,.70,'plaster_cream'],[-.16,.70,.32,.56,'plaster_blue'],
    [.22,.72,.34,.66,'plaster_red'],[.62,.68,.32,.59,'plaster_cream'],[.96,.57,.28,.54,'plaster_blue']
  ];
  for(const [x,y,w,h,m] of houses)timberHouse(B,x,y,w,h,m);
  for(const p of [[-1.02,-.66],[1.00,-.62]]){cyl('roof',.020,.13,[p[0],p[1],.49],8);sphere('green',.095,[p[0],p[1],.62],6,10);}
}

const assets=[
  emit('dusseldorf-selected.gltf','DusseldorfRheinturmMiniature',dusseldorfMaterials,['glass','glass_light','steel','water'],dusseldorf),
  emit('stuttgart-selected.gltf','StuttgartFernsehturmMiniature',stuttgartMaterials,['glass','copper'],stuttgart),
  emit('rennes-selected.gltf','RennesParliamentMiniature',rennesMaterials,[],rennes)
];

const manifest={schemaVersion:1,pass:'R3-WP3.8D',generator:'Future Conquest WP3.8D authored geometry builder',assets};
fs.writeFileSync(path.join(OUT,'manifest.json'),`${JSON.stringify(manifest,null,2)}\n`);
for(const asset of assets)console.log(`Built ${asset.name} (${asset.bytes} bytes, ${asset.faces} faces, ${asset.materials} material groups)`);

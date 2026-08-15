import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const OUT='public/miniatures/wp3-8c';
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
  const doc={asset:{version:'2.0',generator:'Future Conquest WP3.8C authored geometry builder'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:nodeName}],meshes:[{name:nodeName,primitives:prims}],materials:Object.entries(materials).map(([name,v])=>({name,pbrMetallicRoughness:{baseColorFactor:v,metallicFactor:metallic.includes(name)?.60:name.includes('gold')?.30:0,roughnessFactor:metallic.includes(name)?.32:.80}})),accessors,bufferViews:views,buffers:[{byteLength:bin.length,uri:`data:application/octet-stream;base64,${bin.toString('base64')}`}]};
  const text=JSON.stringify(doc),out=path.join(OUT,filename);fs.writeFileSync(out,text);
  return {name:filename.replace('.gltf',''),path:`/miniatures/wp3-8c/${filename}`,bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex'),meshes:1,materials:prims.length,faces:Object.values(G).reduce((n,g)=>n+g.i.length/3,0)};
}

function premiumBase(B){
  B.cyl('base_dark',1.46,.18,[0,0,.09],16);
  B.cyl('base_mid',1.35,.10,[0,0,.23],16);
  B.cyl('gold',1.27,.035,[0,0,.297],16);
  B.cyl('base_dark',1.20,.09,[0,0,.36],16);
}

const strasbourgMaterials={
  base_dark:[.10,.14,.15,1],base_mid:[.29,.31,.29,1],gold:[.71,.55,.27,1],
  sandstone:[.66,.47,.34,1],sandstone_light:[.80,.65,.48,1],roof:[.18,.22,.23,1],
  timber:[.25,.14,.10,1],plaster:[.72,.65,.54,1],window:[.10,.16,.18,1],green:[.20,.31,.21,1]
};
function halfTimberedHouse(B,x,y,w,h,roofHeight=.24){
  B.box('plaster',[w,.34,h],[x,y,.45+h/2]);
  B.box('roof',[w*1.06,.38,.08],[x,y,.47+h]);
  B.cone('roof',w*.42,roofHeight,[x,y,.53+h+roofHeight/2],4);
  for(const z of [.60,.82,1.04]){
    if(z>.42+h)continue;
    B.rod('timber',[x-w*.42,y-.18,z],[x+w*.42,y-.18,z],.012,5);
  }
  for(const dx of [-.30,0,.30]){
    const xx=x+dx*w;
    B.rod('timber',[xx,y-.18,.48],[xx,y-.18,.42+h],.012,5);
  }
  B.rod('timber',[x-w*.42,y-.18,.50],[x+w*.42,y-.18,.42+h],.011,5);
  B.rod('timber',[x+w*.42,y-.18,.50],[x-w*.42,y-.18,.42+h],.011,5);
}
function strasbourg(B){
  const {box,cyl,cone,sphere,rod}=B;premiumBase(B);
  const fx=-.38,fy=-.12;
  box('sandstone',[.86,.64,1.32],[fx,fy,1.10]);
  box('sandstone_light',[.92,.70,.10],[fx,fy,.56]);
  box('sandstone_light',[.92,.70,.08],[fx,fy,1.18]);
  box('sandstone',[1.12,.54,.82],[fx,fy+.36,.86]);
  for(const x of [fx-.43,fx-.22,fx,fx+.22,fx+.43]){
    box('sandstone_light',[.075,.72,1.18],[x,fy,1.08]);
    cone('sandstone_light',.075,.24,[x,fy-.30,1.83],6);
  }
  sphere('window',.19,[fx,fy-.335,1.20],8,16);
  cyl('sandstone_light',.22,.10,[fx,fy-.35,1.20],20);
  const sx=fx+.18,sy=fy;
  box('sandstone',[.42,.42,.72],[sx,sy,1.86]);
  for(const z of [1.58,1.82,2.05,2.28])cyl('sandstone_light',.25,.045,[sx,sy,z],12);
  for(const dx of [-.17,.17])for(const dy of [-.17,.17]){
    rod('sandstone_light',[sx+dx,sy+dy,1.50],[sx+dx*.35,sy+dy*.35,2.55],.024,6);
    cone('sandstone_light',.075,.30,[sx+dx,sy+dy,2.18],6);
  }
  cone('sandstone',.27,1.22,[sx,sy,2.92],8);
  for(let i=0;i<10;i++){
    const a=2*Math.PI*i/10,r=.22;
    rod('sandstone_light',[sx+r*Math.cos(a),sy+r*Math.sin(a),2.38],[sx+.06*Math.cos(a),sy+.06*Math.sin(a),3.43],.016,5);
  }
  rod('gold',[sx,sy,3.44],[sx,sy,3.70],.018,6);
  const houses=[[-.82,.66,.34,.62],[-.40,.72,.38,.72],[.05,.70,.36,.58],[.47,.67,.34,.68],[.83,.58,.30,.55]];
  for(const [x,y,w,h] of houses)halfTimberedHouse(B,x,y,w,h);
  for(const p of [[-.98,-.72],[.78,-.73],[1.00,.16]]){cyl('roof',.022,.15,[p[0],p[1],.50],8);sphere('green',.10,[p[0],p[1],.64],6,10);}
}

const lyonMaterials={
  base_dark:[.11,.14,.16,1],base_mid:[.30,.31,.30,1],gold:[.71,.56,.28,1],
  limestone:[.79,.75,.65,1],limestone_dark:[.60,.57,.50,1],roof:[.25,.30,.31,1],
  copper:[.28,.43,.38,1],glass:[.25,.43,.49,1],steel:[.34,.37,.38,1],window:[.11,.18,.20,1],green:[.21,.33,.22,1]
};
function basilicaTower(B,x,y,h=1.42){
  B.cyl('limestone',.18,h,[x,y,.48+h/2],12);
  for(const z of [.72,1.04,1.36,1.68])B.cyl('limestone_dark',.195,.035,[x,y,z],12);
  B.cone('roof',.20,.42,[x,y,.50+h+.21],10);
  B.rod('gold',[x,y,.50+h+.40],[x,y,.50+h+.62],.016,6);
}
function lyon(B){
  const {box,cyl,cone,sphere,rod}=B;premiumBase(B);
  box('limestone',[1.18,.66,.78],[-.22,-.08,.86]);
  box('limestone_dark',[1.24,.72,.08],[-.22,-.08,.52]);
  box('limestone',[.88,.52,.42],[-.22,.10,1.42]);
  for(const x of [-.72,.28])for(const y of [-.34,.18])basilicaTower(B,x,y,1.42);
  sphere('copper',.29,[-.22,.02,1.78],8,16);
  cyl('limestone',.31,.16,[-.22,.02,1.62],16);
  cone('copper',.16,.30,[-.22,.02,2.02],10);
  rod('gold',[-.22,.02,2.14],[-.22,.02,2.36],.018,6);
  for(const x of [-.56,-.30,-.04,.22])for(const z of [.72,.96,1.18]){
    cyl('window',.055,.025,[x,-.425,z],12);
    rod('limestone_dark',[x-.07,-.438,z-.09],[x-.07,-.438,z+.09],.010,5);
    rod('limestone_dark',[x+.07,-.438,z-.09],[x+.07,-.438,z+.09],.010,5);
  }
  box('glass',[.30,.28,1.72],[.70,-.05,1.31]);
  for(let z=.62;z<2.10;z+=.18)box('steel',[.32,.30,.025],[.70,-.05,z]);
  for(const dx of [-.13,.13])box('steel',[.025,.30,1.76],[.70+dx,-.05,1.31]);
  cone('steel',.08,.30,[.70,-.05,2.31],6);
  const blocks=[[-.84,.66,.34,.30,.48],[-.45,.72,.38,.34,.58],[-.03,.70,.34,.30,.46],[.35,.70,.36,.30,.54],[.74,.65,.32,.28,.44]];
  for(const [x,y,w,d,h] of blocks){box('limestone_dark',[w,d,h],[x,y,.43+h/2]);box('roof',[w*1.06,d*1.06,.08],[x,y,.47+h]);}
  for(const p of [[-1.00,-.64],[.98,.54],[.98,-.58]]){cyl('roof',.022,.14,[p[0],p[1],.50],8);sphere('green',.095,[p[0],p[1],.63],6,10);}
}

const luxMaterials={
  base_dark:[.10,.14,.15,1],base_mid:[.29,.31,.30,1],gold:[.71,.55,.27,1],
  fort:[.56,.54,.47,1],fort_light:[.72,.69,.59,1],roof:[.21,.27,.27,1],
  bridge:[.73,.67,.56,1],timber:[.27,.18,.13,1],plaster:[.67,.62,.52,1],window:[.11,.18,.19,1],green:[.21,.34,.22,1]
};
function arch(B,k,cx,y,z,r,segments=8){
  let prev=[cx-r,y,z];
  for(let i=1;i<=segments;i++){
    const a=Math.PI-Math.PI*i/segments;
    const next=[cx+r*Math.cos(a),y,z+r*Math.sin(a)];
    B.rod(k,prev,next,.035,6);prev=next;
  }
}
function luxembourg(B){
  const {box,cyl,cone,sphere,rod}=B;premiumBase(B);
  box('fort',[1.34,.52,.54],[-.30,.18,.72]);
  box('fort_light',[1.40,.58,.07],[-.30,.18,1.01]);
  box('fort',[.52,.78,.64],[-.78,-.08,.77]);
  for(const x of [-.90,-.58,.02,.28]){
    cyl('fort',.18,.70,[x,.16,.83],12);
    cyl('fort_light',.20,.055,[x,.16,1.17],12);
    cone('roof',.19,.22,[x,.16,1.31],10);
  }
  for(const x of [-.70,-.42,-.14,.14])for(const z of [.63,.82]){
    box('window',[.08,.025,.10],[x,-.105,z]);
    rod('fort_light',[x-.06,-.12,z-.08],[x+.06,-.12,z+.08],.010,5);
  }
  box('bridge',[1.84,.18,.14],[.02,-.64,1.02]);
  for(const x of [-.78,-.30,.18,.66])box('bridge',[.11,.20,.72],[x,-.64,.72]);
  for(const x of [-.54,-.06,.42])arch(B,'bridge',x,-.64,.48,.22,10);
  for(const x of [-.86,-.62,-.38,-.14,.10,.34,.58,.82])rod('fort_light',[x,-.75,.98],[x,-.75,1.15],.012,5);
  rod('fort_light',[-.92,-.75,1.15],[.92,-.75,1.15],.018,6);
  const houses=[[-.90,.70,.26,.46],[-.58,.73,.28,.55],[-.24,.72,.30,.48],[.12,.70,.28,.58],[.46,.68,.28,.50],[.78,.63,.25,.44]];
  for(const [x,y,w,h] of houses){
    box('plaster',[w,.30,h],[x,y,.43+h/2]);
    cone('roof',w*.44,.25,[x,y,.45+h+.12],4);
    for(const z of [.58,.78])if(z<.42+h)for(const dx of [-.06,.06])box('window',[.055,.022,.09],[x+dx,y-.16,z]);
  }
  for(const p of [[-.98,-.18],[.96,.12],[.96,-.30]]){cyl('roof',.022,.15,[p[0],p[1],.50],8);sphere('green',.10,[p[0],p[1],.64],6,10);}
}

const assets=[
  emit('strasbourg-selected.gltf','WP3.8C Strasbourg authored miniature',strasbourgMaterials,[],strasbourg),
  emit('lyon-selected.gltf','WP3.8C Lyon authored miniature',lyonMaterials,['glass','steel','copper'],lyon),
  emit('luxembourg-selected.gltf','WP3.8C Luxembourg authored miniature',luxMaterials,[],luxembourg)
];
fs.writeFileSync(path.join(OUT,'manifest.json'),`${JSON.stringify({schemaVersion:1,pass:'R3-WP3.8C',assets},null,2)}\n`);
for(const a of assets)console.log(`Built ${a.name} (${a.bytes} bytes, ${a.faces} faces, ${a.materials} material groups)`);

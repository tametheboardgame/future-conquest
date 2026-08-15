import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const OUT='public/miniatures/wp3-8a'; fs.mkdirSync(OUT,{recursive:true});

function builder(materials){
  const G=Object.fromEntries(Object.keys(materials).map(k=>[k,{p:[],i:[]}]))
  const tri=(g,a,b,c)=>g.i.push(a,b,c);
  function box(k,e,p){const g=G[k],b=g.p.length/3,[x,y,z]=e.map(v=>v/2),[X,Y,Z]=p,V=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];for(const v of V)g.p.push(v[0]+X,v[1]+Y,v[2]+Z);for(const f of [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]])tri(g,b+f[0],b+f[1],b+f[2])}
  function cyl(k,r,h,p,n=12,r2=r){const g=G[k],b=g.p.length/3,[X,Y,Z]=p;for(let s=0;s<2;s++){const z=Z+(s?1:-1)*h/2,rr=s?r2:r;for(let j=0;j<n;j++){const a=2*Math.PI*j/n;g.p.push(X+rr*Math.cos(a),Y+rr*Math.sin(a),z)}}const c0=g.p.length/3;g.p.push(X,Y,Z-h/2);const c1=g.p.length/3;g.p.push(X,Y,Z+h/2);for(let j=0;j<n;j++){const q=(j+1)%n;tri(g,b+j,b+q,b+n+q);tri(g,b+j,b+n+q,b+n+j);tri(g,c0,b+q,b+j);tri(g,c1,b+n+j,b+n+q)}}
  const cone=(k,r,h,p,n=8)=>cyl(k,r,h,p,n,0);
  function sphere(k,r,p,lat=8,lon=12){const g=G[k],b=g.p.length/3,[X,Y,Z]=p;for(let a=0;a<=lat;a++){const v=Math.PI*a/lat;for(let j=0;j<lon;j++){const u=2*Math.PI*j/lon;g.p.push(X+r*Math.sin(v)*Math.cos(u),Y+r*Math.sin(v)*Math.sin(u),Z+r*Math.cos(v))}}for(let a=0;a<lat;a++)for(let j=0;j<lon;j++){const q=(j+1)%lon,A=b+a*lon+j,B=b+a*lon+q,C=b+(a+1)*lon+j,D=b+(a+1)*lon+q;tri(g,A,B,D);tri(g,A,D,C)}}
  function rod(k,a,b,r=.02,n=6){const g=G[k],base=g.p.length/3;let vx=b[0]-a[0],vy=b[1]-a[1],vz=b[2]-a[2];const L=Math.hypot(vx,vy,vz);vx/=L;vy/=L;vz/=L;let ux=-vy,uy=vx,uz=0;if(Math.hypot(ux,uy,uz)<.01){ux=0;uy=-vz;uz=vy}const uL=Math.hypot(ux,uy,uz);ux/=uL;uy/=uL;uz/=uL;const wx=vy*uz-vz*uy,wy=vz*ux-vx*uz,wz=vx*uy-vy*ux;for(const P of [a,b])for(let j=0;j<n;j++){const q=2*Math.PI*j/n,c=Math.cos(q)*r,s=Math.sin(q)*r;g.p.push(P[0]+ux*c+wx*s,P[1]+uy*c+wy*s,P[2]+uz*c+wz*s)}const c0=g.p.length/3;g.p.push(...a);const c1=g.p.length/3;g.p.push(...b);for(let j=0;j<n;j++){const q=(j+1)%n;tri(g,base+j,base+q,base+n+q);tri(g,base+j,base+n+q,base+n+j);tri(g,c0,base+q,base+j);tri(g,c1,base+n+j,base+n+q)}}
  const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  return {G,box,cyl,cone,sphere,rod,lerp};
}

function emit(filename,nodeName,materials,metallic,build){
  const B=builder(materials); build(B); const {G}=B;
  const chunks=[],views=[],accessors=[],prims=[];let off=0;const align=()=>{while(off%4){chunks.push(Buffer.from([0]));off++}};
  for(const [k,g] of Object.entries(G)){if(!g.i.length)continue;align();const pb=Buffer.from(new Float32Array(g.p).buffer);const pv=views.push({buffer:0,byteOffset:off,byteLength:pb.length,target:34962})-1;chunks.push(pb);off+=pb.length;let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let j=0;j<g.p.length;j+=3)for(let q=0;q<3;q++){min[q]=Math.min(min[q],g.p[j+q]);max[q]=Math.max(max[q],g.p[j+q])}const pa=accessors.push({bufferView:pv,componentType:5126,count:g.p.length/3,type:'VEC3',min,max})-1;align();const ib=Buffer.from(new Uint32Array(g.i).buffer);const iv=views.push({buffer:0,byteOffset:off,byteLength:ib.length,target:34963})-1;chunks.push(ib);off+=ib.length;const ia=accessors.push({bufferView:iv,componentType:5125,count:g.i.length,type:'SCALAR'})-1;prims.push({attributes:{POSITION:pa},indices:ia,material:Object.keys(materials).indexOf(k)})}
  const bin=Buffer.concat(chunks);const doc={asset:{version:'2.0',generator:'Future Conquest WP3.8A authored geometry builder'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:nodeName}],meshes:[{name:nodeName,primitives:prims}],materials:Object.entries(materials).map(([name,v])=>({name,pbrMetallicRoughness:{baseColorFactor:v,metallicFactor:metallic.includes(name)?.72:name.includes('gold')?.35:0,roughnessFactor:metallic.includes(name)?.32:.78}})),accessors,bufferViews:views,buffers:[{byteLength:bin.length,uri:`data:application/octet-stream;base64,${bin.toString('base64')}`}]};
  const text=JSON.stringify(doc),out=path.join(OUT,filename);fs.writeFileSync(out,text);return {name:filename.replace('.gltf',''),path:`/miniatures/wp3-8a/${filename}`,bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex'),meshes:1,materials:prims.length,faces:Object.values(G).reduce((n,g)=>n+g.i.length/3,0)};
}

export { builder, emit };

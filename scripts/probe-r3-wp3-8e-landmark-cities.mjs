import fs from 'node:fs';
import { chromium } from 'playwright';

const origin=process.env.R3_WP38E_ORIGIN ?? 'http://127.0.0.1:4173';
const outputDir=process.env.R3_WP38E_ARTIFACTS ?? 'artifacts/r3-wp3-8e';
const cities=[
  {
    id:'N-NAMUR',name:'Namur',variant:'namur',position:[4.8718,50.4674],assetId:'wp3.8e-namur-selected',minimumFaces:1250,
    landmarks:['Citadel of Namur','Saint-Aubain Cathedral'],rotation:-8
  },
  {
    id:'N-CHUR',name:'Chur',variant:'chur',position:[9.5309,46.8508],assetId:'wp3.8e-chur-selected',minimumFaces:1150,
    landmarks:['Cathedral of the Assumption / Episcopal Court',"St Martin's Church tower"],rotation:-10
  },
  {
    id:'N-INNSBRUCK',name:'Innsbruck',variant:'innsbruck',position:[11.4041,47.2692],assetId:'wp3.8e-innsbruck-selected',minimumFaces:1200,
    landmarks:['Bergisel Ski Jump','Golden Roof / historic frontage'],rotation:14
  }
];

fs.mkdirSync(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});

async function observe(city,lod){
  return page.evaluate(({id,expectedLod})=>{
    const diagnostic=window.__r3WorldMiniatures;
    const nodes=window.__r3StrategicNodes ?? [];
    if(!diagnostic)throw new Error('world-miniature diagnostic unavailable');
    const object=diagnostic.objects.find(candidate=>candidate.id===id);
    const node=nodes.find(candidate=>candidate.id===id);
    if(!object||!node)throw new Error(`missing city diagnostic ${id}`);
    return {...object,lod:diagnostic.lod,expectedLod,anchorErrorDegrees:Math.hypot(object.position[0]-node.position[0],object.position[1]-node.position[1])};
  },{id:city.id,expectedLod:lod});
}

function validateAuthored(city,observed,lod){
  if(!observed.visible||observed.lod!==lod)throw new Error(`${city.name} is not visible at ${lod} LOD: ${JSON.stringify(observed)}`);
  if(observed.cityVariant!==city.variant)throw new Error(`${city.name} variant mismatch: ${observed.cityVariant}`);
  if(observed.assetStatus!=='ready'||observed.presentationModel!=='authored-gltf')throw new Error(`${city.name} did not use authored glTF at ${lod}: ${JSON.stringify(observed)}`);
  if(observed.assetId!==city.assetId||observed.authoredFaceCount<city.minimumFaces)throw new Error(`${city.name} asset identity/detail contract failed: ${JSON.stringify(observed)}`);
  if(observed.anchorErrorDegrees!==0)throw new Error(`${city.name} geographic anchor changed`);
  if(!Number.isFinite(observed.elevation)||observed.clearance!==22)throw new Error(`${city.name} terrain grounding changed`);
  if(JSON.stringify(observed.landmarks)!==JSON.stringify(city.landmarks))throw new Error(`${city.name} landmark metadata mismatch: ${JSON.stringify(observed.landmarks)}`);
}

try{
  await page.addInitScript(()=>{
    localStorage.setItem('future-conquest:intro-seen:v3','true');
    localStorage.setItem('future-conquest-tutorial-seen-v1','true');
  });
  await page.goto(`${origin}/?terrain=1`,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'BEGIN CAMPAIGN',exact:true}).click();
  await page.locator('.startup-game-shell').waitFor({state:'visible'});
  await page.locator('[data-command-view="map"]').click();
  const host=page.locator('.r3-terrain-prototype');
  await host.waitFor({state:'visible',timeout:45000});
  await page.waitForFunction(()=>document.querySelector('.r3-terrain-prototype')?.getAttribute('data-status')==='ready'&&Boolean(window.__r3WorldMiniatures)&&Boolean(window.__r3TerrainMap),null,{timeout:45000});

  const layerControl=page.locator('details.r3-terrain-layer-control');
  await layerControl.evaluate(element=>{element.open=true;});
  for(const label of ['Friendly formations','Operations, threats and fronts','Ports']){
    const toggle=layerControl.getByLabel(label,{exact:true});
    if(await toggle.isChecked())await toggle.uncheck();
  }
  await layerControl.evaluate(element=>{element.open=false;});
  await page.addStyleTag({content:'[data-r3-marker-id] { visibility: hidden !important; }'});

  const evidence={schemaVersion:1,cities:{}};
  for(const city of cities){
    await page.evaluate(({position,rotation})=>{
      const map=window.__r3TerrainMap;if(!map)throw new Error('terrain map diagnostic unavailable');
      map.jumpTo({center:position,zoom:5.35,pitch:51,bearing:rotation});
    },city);
    await page.waitForFunction(({id,assetId})=>{
      const diagnostic=window.__r3WorldMiniatures;
      const object=diagnostic?.objects.find(candidate=>candidate.id===id);
      return diagnostic?.lod==='campaign'&&object?.assetStatus==='ready'&&object?.assetId===assetId&&object?.presentationModel==='authored-gltf';
    },{id:city.id,assetId:city.assetId},{timeout:20000});
    await page.waitForTimeout(350);
    const campaign=await observe(city,'campaign');validateAuthored(city,campaign,'campaign');
    await host.screenshot({path:`${outputDir}/${city.name.toLowerCase()}-authored-campaign.png`});

    await page.evaluate(({position,rotation})=>{
      const map=window.__r3TerrainMap;if(!map)throw new Error('terrain map diagnostic unavailable');
      map.jumpTo({center:position,zoom:8.1,pitch:50,bearing:rotation-8});
    },city);
    await page.waitForFunction(({id,assetId})=>{
      const diagnostic=window.__r3WorldMiniatures;
      const object=diagnostic?.objects.find(candidate=>candidate.id===id);
      return diagnostic?.lod==='selected'&&object?.assetStatus==='ready'&&object?.assetId===assetId&&object?.presentationModel==='authored-gltf';
    },{id:city.id,assetId:city.assetId},{timeout:20000});
    await page.waitForTimeout(350);
    const selected=await observe(city,'selected');validateAuthored(city,selected,'selected');
    await host.screenshot({path:`${outputDir}/${city.name.toLowerCase()}-authored-selected.png`});
    evidence.cities[city.variant]={campaign,selected};
  }

  const fallbackCity=cities[0];
  await page.evaluate(({position})=>{
    const map=window.__r3TerrainMap;if(!map)throw new Error('terrain map diagnostic unavailable');
    map.jumpTo({center:position,zoom:4.45,pitch:44,bearing:0});
  },fallbackCity);
  await page.waitForFunction(({id})=>{
    const diagnostic=window.__r3WorldMiniatures;
    const object=diagnostic?.objects.find(candidate=>candidate.id===id);
    return diagnostic?.lod==='theatre'&&object?.visible&&object?.presentationModel==='procedural-fallback';
  },{id:fallbackCity.id},{timeout:20000});
  await page.waitForTimeout(300);
  const theatre=await observe(fallbackCity,'theatre');
  if(theatre.cityVariant!=='namur'||theatre.presentationModel!=='procedural-fallback'||theatre.anchorErrorDegrees!==0||theatre.clearance!==22||!Number.isFinite(theatre.elevation)){
    throw new Error(`authored Theatre fallback contract failed: ${JSON.stringify(theatre)}`);
  }
  evidence.theatreFallback=theatre;
  await host.screenshot({path:`${outputDir}/namur-theatre-procedural-fallback.png`});

  fs.writeFileSync(`${outputDir}/evidence.json`,`${JSON.stringify(evidence,null,2)}\n`);
  console.log(JSON.stringify(evidence,null,2));
}finally{
  await browser.close();
}

import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

// Requires the Vite development server: npm run dev, then node scripts/qa-art.mjs.
// All synthetic visibility and armies exist only in this disposable browser harness.
const interactionsOnly = process.argv.includes('--interactions-only');
const gameURL = (process.env.GAME_URL || process.argv.slice(2).find(arg=>!arg.startsWith('--')) || 'http://127.0.0.1:5173').replace(/\/$/, '');
const output = new URL('../.cache/qa-art/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('../.cache/qa-art.html', import.meta.url), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Eightfold original-art QA</title><style>html,body{margin:0;background:#263a35;color:#f0e6ce;font:14px system-ui}#stage{width:1280px;height:820px;position:relative;overflow:hidden}#sheets{display:grid;gap:20px;padding:20px;width:max-content}canvas{display:block}h2{margin:5px 0}#skills-sheet{display:grid;grid-template-columns:repeat(8,128px);gap:12px;background:#213b39;padding:20px;width:max-content}#skills-sheet figure{margin:0;text-align:center}#skills-sheet svg{width:96px;height:96px;display:block;margin:auto}#status{padding:8px}</style><div id="status">Loading original-art harness…</div><div id="stage"></div><div id="sheets"></div><script type="module" src="/.cache/qa-art.ts"></script></html>`);
await writeFile(new URL('../.cache/qa-art.ts', import.meta.url), String.raw`
import Phaser from 'phaser';
import { content } from '../src/content/index.ts';
import { createBattle } from '../src/sim/engine.ts';
import { createRenderer } from '../src/render/index.ts';
import { drawUnit, UNIT_SIZE } from '../src/render/unit-art.ts';
import { drawArchitecture, drawBarrier, ARCHITECTURE_SIZE } from '../src/render/architecture-art.ts';
import { paintTerrain, paintTerrainProp, TERRAIN_PROP_SIZE } from '../src/render/terrain-art.ts';
import { setGraphicsQuality, getGraphicsQuality } from '../src/render/quality.ts';
import { skillArt } from '../src/ui/skill-art.ts';

const roles = ['frontline','ranged','guard','scout','stealth','siege','engineer'];
const effects = ['capacity','reserve','lines','training','damage','armor','vision','capture','engineer','stealth','siege','formations','rally','recon','volley','construction'];
const sheets = document.querySelector('#sheets');
const stage = document.querySelector('#stage');
const status = document.querySelector('#status');
let renderer = null;
let activeState = null;
let activeGame = null;
let activeScene = null;
const interactionEvents = [];
// Phaser 3 does not expose a public global game registry. Track constructors and
// destroy events in this harness, while retaining the unmodified real Game class.
const activeGames = new Set();
const OriginalGame = Phaser.Game;
Phaser.Game = class TrackedGame extends OriginalGame {
  constructor(config) {super(config);activeGame=this;activeGames.add(this);this.events.once('destroy',()=>activeGames.delete(this));}
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function canvas(w,h) { const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d',{willReadFrequently:true});return c; }
function hash(bytes) { let h=2166136261; for(let i=0;i<bytes.length;i++){h^=bytes[i];h=Math.imul(h,16777619);} return (h>>>0).toString(16); }
function pixels(c) { return c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data; }
function sheet(id,title,w,h) {
  const heading=document.createElement('h2'); heading.textContent=title; sheets.append(heading);
  const c=canvas(w,h); c.id=id; const ctx=c.getContext('2d');ctx.fillStyle='#344b43';ctx.fillRect(0,0,w,h);sheets.append(c);return c;
}
function label(ctx,text,x,y) {ctx.fillStyle='#f2e5bf';ctx.font='13px system-ui';ctx.fillText(text,x,y);}
function inspect(size, paint) {
  const margin=80,c=canvas(size+margin*2,size+margin*2),ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.translate(margin,margin);paint(ctx);ctx.setTransform(1,0,0,1,0,0);
  const bytes=ctx.getImageData(0,0,c.width,c.height).data;
  let ink=0,outside=0,edge=0,minX=size,minY=size,maxX=-1,maxY=-1;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
    const alpha=bytes[(y*c.width+x)*4+3];if(alpha<24)continue;
    const xx=x-margin,yy=y-margin;
    if(xx<0||yy<0||xx>=size||yy>=size){outside++;continue;}
    ink++;minX=Math.min(minX,xx);minY=Math.min(minY,yy);maxX=Math.max(maxX,xx);maxY=Math.max(maxY,yy);
    if(xx===0||yy===0||xx===size-1||yy===size-1)edge++;
  }
  const normal=canvas(size,size);normal.getContext('2d').drawImage(c,margin,margin,size,size,0,0,size,size);
  return {image:normal,ink,outside,edge,bounds:[minX,minY,maxX,maxY],hash:hash(pixels(normal))};
}
function recordScan(group,id,r,failures) {
  if(r.ink<40)failures.push({group,id,reason:'empty or near-empty artwork',ink:r.ink});
  // Ignore at most four subpixel antialias samples; larger overflow is real atlas clipping.
  if(r.outside>4)failures.push({group,id,reason:'nontrivial painted pixels outside atlas cell',outside:r.outside,bounds:r.bounds});
  return {id,ink:r.ink,outside:r.outside,edge:r.edge,bounds:r.bounds,hash:r.hash};
}
async function scanAssets() {
  const failures=[],units=[],architecture=[],props=[],skills=[],maps=[];
  const unitSheet=sheet('units-sheet','All 448 original unit frames · seven roles, two sides, four frames per era',8*UNIT_SIZE,8*(7*(UNIT_SIZE+19)+27));
  const uc=unitSheet.getContext('2d');
  for(let era=0;era<8;era++){
    const top=era*(7*(UNIT_SIZE+19)+27);label(uc,'ERA '+(era+1)+' · '+content.eras[era].name,8,top+18);
    for(let role=0;role<7;role++)for(let side=0;side<2;side++){
      const frameHashes=[];
      for(let frame=0;frame<4;frame++){
        const id='e'+(era+1)+'/'+roles[role]+'/'+side+'/'+frame;
        const r=inspect(UNIT_SIZE,c=>drawUnit(c,era,roles[role],side,frame));
        units.push(recordScan('unit',id,r,failures));frameHashes.push(r.hash);
        const x=(side*4+frame)*UNIT_SIZE,y=top+27+role*(UNIT_SIZE+19);uc.drawImage(r.image,x,y);label(uc,roles[role]+' '+side+'/'+frame,x+3,y+UNIT_SIZE+14);
      }
      if(new Set(frameHashes).size<3)failures.push({group:'unit',id:'e'+(era+1)+'/'+roles[role]+'/'+side,reason:'fewer than three distinct animation frame images',unique:new Set(frameHashes).size});
    }
    status.textContent='Scanned unit artwork for era '+(era+1);console.log('[art-qa] '+status.textContent);await sleep(0);
  }
  const archSheet=sheet('architecture-sheet','All 40 original stronghold, outpost, watchtower, gate and barrier paintings',5*ARCHITECTURE_SIZE,8*(ARCHITECTURE_SIZE+26));
  const ac=archSheet.getContext('2d');
  for(let era=0;era<8;era++)for(let kind=0;kind<5;kind++){
    const id='e'+(era+1)+'/'+['main','outpost','watchtower','gate','barrier'][kind];
    const r=inspect(ARCHITECTURE_SIZE,c=>kind===4?drawBarrier(c,era):drawArchitecture(c,era,kind));
    architecture.push(recordScan('architecture',id,r,failures));const x=kind*ARCHITECTURE_SIZE,y=era*(ARCHITECTURE_SIZE+26);ac.drawImage(r.image,x,y);label(ac,id,x+6,y+ARCHITECTURE_SIZE+18);
  }
  const propSheet=sheet('props-sheet','All 64 original terrain props · eight props per era',8*TERRAIN_PROP_SIZE,8*(TERRAIN_PROP_SIZE+25));const pc=propSheet.getContext('2d');
  for(let era=0;era<8;era++)for(let kind=0;kind<8;kind++){
    const id='e'+(era+1)+'/prop-'+kind,r=inspect(TERRAIN_PROP_SIZE,c=>paintTerrainProp(c,era,kind));
    props.push(recordScan('prop',id,r,failures));const x=kind*TERRAIN_PROP_SIZE,y=era*(TERRAIN_PROP_SIZE+25);pc.drawImage(r.image,x,y);label(pc,id,x+5,y+TERRAIN_PROP_SIZE+17);
  }
  const heading=document.createElement('h2');heading.textContent='All 16 original skill medallions · decorative SVG without baked text';sheets.append(heading);
  const skillSheet=document.createElement('div');skillSheet.id='skills-sheet';sheets.append(skillSheet);
  for(const effect of effects){
    const svg=skillArt(effect);svg.setAttribute('width','96');svg.setAttribute('height','96');
    if(svg.getAttribute('aria-hidden')!=='true'||svg.querySelector('text')||svg.textContent.trim())failures.push({group:'skill',id:effect,reason:'SVG must be decorative and contain no baked text'});
    const figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=effect;figure.append(svg,caption);skillSheet.append(figure);
    const source=new XMLSerializer().serializeToString(svg),url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'}));
    const image=new Image();image.src=url;await image.decode();const c=canvas(96,96);c.getContext('2d').drawImage(image,0,0);URL.revokeObjectURL(url);
    const data=pixels(c);let ink=0;for(let i=3;i<data.length;i+=4)if(data[i]>=24)ink++;
    if(ink<40)failures.push({group:'skill',id:effect,reason:'empty skill emblem'});skills.push({id:effect,ink,hash:hash(data),ariaHidden:svg.getAttribute('aria-hidden')});
  }
  if(new Set(skills.map(s=>s.hash)).size!==16)failures.push({group:'skill',reason:'duplicate skill-medallion paintings'});
  const mapSheet=sheet('maps-sheet','All 40 authored mission landscapes · repeat-seed pixel identity checked',5*320,8*220);const mc=mapSheet.getContext('2d');
  for(let n=0;n<content.missions.length;n++){
    const m=content.missions[n],cols=m.map[0].length,rows=m.map.length,w=(cols+rows)*32+240,h=(cols+rows)*16+240;
    const project=(x,y)=>({x:rows*32+120+(x-y)*32,y:100+(x+y)*16});
    const first=canvas(w,h),second=canvas(w,h);
    paintTerrain(first.getContext('2d'),m.map,m.era,m.seed,project,64,32);
    paintTerrain(second.getContext('2d'),m.map,m.era,m.seed,project,64,32);
    const a=pixels(first),b=pixels(second);let mismatch=-1,ink=0;
    for(let i=0;i<a.length;i++){if(a[i]!==b[i]&&mismatch<0)mismatch=i;if(i%4===3&&a[i]>=24)ink++;}
    if(mismatch>=0||ink<1000)failures.push({group:'map',id:m.id,reason:mismatch>=0?'same-seed painting is nondeterministic':'empty landscape',mismatch,ink});
    maps.push({id:m.id,seed:m.seed,width:w,height:h,ink,hash:hash(a),deterministic:mismatch<0});
    const x=n%5*320,y=Math.floor(n/5)*220;mc.drawImage(first,x+3,y+2,314,186);label(mc,m.id+' · '+m.name,x+6,y+207);
    first.width=0;second.width=0;status.textContent='Validated landscape '+m.id;if((n+1)%5===0)console.log('[art-qa] '+status.textContent);await sleep(0);
  }
  return {units,architecture,props,skills,maps,failures};
}
async function openEra(era,count) {
  if(renderer)throw new Error('Destroy the prior renderer first');
  const mission=content.missions.find(m=>m.era===era&&m.index===0),defs=content.eras[era].units;
  const state=createBattle(mission,content,[],[]);state.paused=true;state.time=10;state.tick=100;state.events=[];
  const desired=count||defs.length*2;
  const clearCandidates=[];
  for(let y=2;y<mission.map.length-2;y++)for(let x=2;x<mission.map[0].length-2;x++){
    if('f~#'.includes(mission.map[y][x]))continue;
    if(state.strongholds.some(f=>Math.hypot(f.x-x,f.y-y)<2.6))continue;
    let canopy=false;for(let yy=y-2;yy<=y+2;yy++)for(let xx=x-2;xx<=x+2;xx++)if(mission.map[yy]?.[xx]==='f'&&Math.hypot(xx-x,yy-y)<2)canopy=true;
    if(!canopy)clearCandidates.push({x,y});
  }
  clearCandidates.sort((a,b)=>(a.x-mission.map[0].length*.52)**2+(a.y-mission.map.length*.72)**2-(b.x-mission.map[0].length*.52)**2-(b.y-mission.map.length*.72)**2);
  const clearPositions=[];
  for(const p of clearCandidates)if(clearPositions.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>1.35))clearPositions.push(p);
  if(desired<=30&&clearPositions.length<desired)throw new Error('Insufficient authored clearing for roster screenshot');
  state.units=Array.from({length:desired},(_,i)=>{
    const def=defs[i%defs.length],owner=desired>30?i%2:Math.floor(i/defs.length)%2;
    const dense=desired>30,x=dense?7+(i%20)*.55:clearPositions[i].x,y=dense?7+Math.floor(i/20)*.55:clearPositions[i].y;
    return {id:'art-unit-'+i,owner,defId:def.id,x,y,hp:def.hp,facing:owner?Math.PI:0,orders:[],route:[],cooldown:0,abilityCooldown:0,formation:'line',group:0,slot:i,status:dense?'walk':i%3===0?'attack':i%3===1?'walk':'idle',lastHit:def.stealth?9:-100,stuck:0};
  });
  state.structures=[{id:'art-barrier',owner:0,x:8,y:14,hp:180,maxHp:180,kind:'barrier',built:1},{id:'art-tower',owner:1,x:20,y:10,hp:130,maxHp:130,kind:'tower',built:1}];
  for(const fog of state.fog){fog.visible.fill(true);fog.explored.fill(true);fog.memory={};}
  setGraphicsQuality('high');
  renderer=createRenderer({parent:stage,content,mission,onSelect(selection){interactionEvents.push({type:'select',selection});},onOrder(order){interactionEvents.push({type:'order',order});}});activeState=state;renderer.setState(state);
  const started=performance.now();while(stage.dataset.renderer!=='ready'){if(performance.now()-started>20000)throw new Error('Renderer startup timeout for era '+era);await sleep(30);}
  renderer.setState(state);renderer.focus(mission.map[0].length/2,mission.map.length/2);await sleep(250);
  const actualCanvas=stage.querySelector('canvas');activeScene=activeGame.scene.getScene('battle');
  if(activeGame.canvas!==actualCanvas)throw new Error('Instrumented game does not own the rendered canvas');
  if(activeGame.renderer.type!==Phaser.WEBGL)throw new Error('Expected real Phaser WebGL renderer');
  if(activeScene.presented.size!==desired)throw new Error('Roster presentation mismatch '+activeScene.presented.size+'/'+desired);
  if(actualCanvas.width!==stage.clientWidth||actualCanvas.height!==stage.clientHeight||activeScene.quality!==1)throw new Error('High-quality renderer changed native render resolution');
  return {era:era+1,mission:mission.id,units:desired,presented:activeScene.presented.size,strongholds:activeScene.forts.size,structures:activeScene.structureSprites.size,canvas:{width:actualCanvas.width,height:actualCanvas.height},webgl:true,quality:getGraphicsQuality(),atlasFrames:{units:activeScene.textures.get('soldiers').frameTotal-1,architecture:activeScene.textures.get('strongholds').frameTotal-1,props:activeScene.textures.get('props').frameTotal-1}};
}
async function closeEra() {
  if(renderer){renderer.destroy();renderer=null;}activeState=null;activeScene=null;activeGame=null;
  const start=performance.now();while(stage.querySelector('canvas')){if(performance.now()-start>5000)throw new Error('Renderer canvas leaked after destroy');await sleep(25);}
  if(stage.dataset.renderer)throw new Error('Renderer lifecycle state leaked');
  const active=activeGames.size;if(active)throw new Error('Phaser game instance leaked after destroy: '+active);
  return {canvasCount:stage.querySelectorAll('canvas').length,activePhaserGames:active};
}
function fortPickingTargets() {
  const actualCanvas=stage.querySelector('canvas'),rect=actualCanvas.getBoundingClientRect(),camera=activeScene.cameras.main,topLeft=camera.getWorldPoint(0,0);
  return activeState.strongholds.filter(f=>f.kind==='main').map(fort=>{
    const image=activeScene.forts.get(fort.id).image,ground=activeScene.world(fort);
    const frame=image.frame,source=frame.source.image;
    // One atlas readback, then CPU sampling. Repeated TextureManager pixel reads
    // would force a software-WebGL synchronization for every candidate pixel.
    const rgba=source.getContext('2d').getImageData(frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight).data;
    let chosen=null;
    // Search a solid roof/body patch rather than a thin flag or antenna. The
    // chosen point must lie outside both historical ground-only hit regions.
    for(let y=14;y<140&&!chosen;y+=2)for(let j=0;j<56&&!chosen;j++){
      const x=128+(j%2?1:-1)*Math.ceil(j/2)*4;if(x<12||x>244)continue;
      let opaque=0;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(rgba[((y+dy)*frame.cutWidth+x+dx)*4+3]>96)opaque++;
      if(opaque<30)continue;
      const world={x:image.x+(x-image.displayOriginX)*image.scaleX,y:image.y+(y-image.displayOriginY)*image.scaleY};
      const oldSelectionDistance=Math.hypot(ground.x-world.x,(ground.y-15-world.y)*1.3),oldOrderDistance=Math.hypot(ground.x-world.x,ground.y-world.y);
      const sx=(world.x-topLeft.x)*camera.zoom,sy=(world.y-topLeft.y)*camera.zoom;
      const snapped=camera.getWorldPoint(Math.round(sx),Math.round(sy));
      if(oldSelectionDistance>65&&oldOrderDistance>60&&sx>8&&sy>8&&sx<actualCanvas.width-8&&sy<actualCanvas.height-8&&activeScene.fortHit(fort,snapped))chosen={fortId:fort.id,owner:fort.owner,x:rect.left+Math.round(sx)*rect.width/actualCanvas.width,y:rect.top+Math.round(sy)*rect.height/actualCanvas.height,world:snapped,atlasPixel:{x,y},oldSelectionDistance,oldOrderDistance};
    }
    if(!chosen)throw new Error('No opaque upper-body picking test point for '+fort.id);return chosen;
  });
}
function unitPickingTarget() {
  const actualCanvas=stage.querySelector('canvas'),rect=actualCanvas.getBoundingClientRect(),camera=activeScene.cameras.main,topLeft=camera.getWorldPoint(0,0);
  for(const entry of activeScene.presented.values()){
    if(entry.unit.owner!==0)continue;
    const image=entry.sprite,frame=image.frame,rgba=frame.source.image.getContext('2d').getImageData(frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight).data,ground=activeScene.world(entry);
    for(let y=5;y<42;y++)for(let x=20;x<frame.cutWidth-20;x++){
      if(rgba[(y*frame.cutWidth+x)*4+3]<128)continue;
      const xx=(image.flipX?image.width-1-x:x)-image.displayOriginX,yy=(image.flipY?image.height-1-y:y)-image.displayOriginY;
      const world=image.getWorldTransformMatrix().transformPoint(xx,yy);
      const oldDistance=Math.hypot(ground.x-world.x,ground.y-27-world.y);
      if(oldDistance<=28||activeScene.pickUnit(world,0)?.unit.id!==entry.unit.id)continue;
      const sx=(world.x-topLeft.x)*camera.zoom,sy=(world.y-topLeft.y)*camera.zoom;
      const snapped=camera.getWorldPoint(Math.round(sx),Math.round(sy));
      if(sx>8&&sy>8&&sx<actualCanvas.width-8&&sy<actualCanvas.height-8&&activeScene.pickUnit(snapped,0)?.unit.id===entry.unit.id)return {unitId:entry.unit.id,x:rect.left+Math.round(sx)*rect.width/actualCanvas.width,y:rect.top+Math.round(sy)*rect.height/actualCanvas.height,atlasPixel:{x,y},oldDistance,world:snapped};
    }
  }
  throw new Error('No opaque upper-soldier picking target');
}
function probePickingPoint(point) {
  const c=stage.querySelector('canvas'),r=c.getBoundingClientRect(),world=activeScene.cameras.main.getWorldPoint((point.x-r.left)*c.width/r.width,(point.y-r.top)*c.height/r.height);
  return {world,fortHits:activeState.strongholds.filter(f=>activeScene.fortHit(f,world)).map(f=>f.id),unit:activeScene.pickUnit(world,0)?.unit.id,events:structuredClone(interactionEvents),pointer:{x:activeScene.input.activePointer.x,y:activeScene.input.activePointer.y}};
}
async function benchmark(milliseconds=4500) {
  if(!renderer)throw new Error('No active renderer');
  activeState.paused=false;renderer.setState(activeState);await sleep(500);
  const intervals=[],start=performance.now(),firstFrame=activeGame.loop.frame;let previous=start;
  await new Promise(resolve=>{function frame(now){intervals.push(now-previous);previous=now;if(now-start>=milliseconds)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);});
  const elapsed=performance.now()-start,frames=activeGame.loop.frame-firstFrame;
  intervals.sort((a,b)=>a-b);activeState.paused=true;renderer.setState(activeState);
  return {durationMs:Math.round(elapsed),rafFrames:intervals.length,rafFPS:Number((intervals.length*1000/elapsed).toFixed(2)),phaserFrames:frames,phaserFPS:Number((frames*1000/elapsed).toFixed(2)),medianFrameMs:Number(intervals[Math.floor(intervals.length*.5)].toFixed(2)),p95FrameMs:Number(intervals[Math.floor(intervals.length*.95)].toFixed(2)),units:activeScene.presented.size,canvasWidth:stage.querySelector('canvas').width,canvasHeight:stage.querySelector('canvas').height,quality:activeScene.quality,simulationRunning:false};
}
window.qaArt={scanAssets,openEra,closeEra,benchmark,fortPickingTargets,unitPickingTarget,probePickingPoint,interactionEvents,clearInteractionEvents(){interactionEvents.length=0;}};status.textContent='Original-art harness ready';
`);

async function verifyFortPicking(page) {
  await page.locator('#stage').scrollIntoViewIfNeeded();
  const targets=await page.evaluate(()=>window.qaArt.fortPickingTargets());
  for(const target of targets){
    await page.evaluate(()=>window.qaArt.clearInteractionEvents());
    await page.mouse.click(target.x,target.y,{delay:150});
    try{await page.waitForFunction(id=>window.qaArt.interactionEvents.some(e=>e.type==='select'&&e.selection.stronghold===id),target.fortId,{timeout:3000});}
    catch(error){throw new Error('Upper fort click failed: '+JSON.stringify({target,probe:await page.evaluate(p=>window.qaArt.probePickingPoint(p),target)}),{cause:error});}
    await page.mouse.click(target.x,target.y,{button:'right',delay:150});
    const kind=target.owner===0?'defend':'capture';
    await page.waitForFunction(({id,kind})=>window.qaArt.interactionEvents.some(e=>e.type==='order'&&e.order.target===id&&e.order.kind===kind),{id:target.fortId,kind},{timeout:3000});
    target.leftClickSelects=true;target.rightClickOrder=kind;
  }
  const soldier=await page.evaluate(()=>window.qaArt.unitPickingTarget());
  await page.evaluate(()=>window.qaArt.clearInteractionEvents());
  await page.mouse.click(soldier.x,soldier.y,{delay:150});
  try{await page.waitForFunction(id=>window.qaArt.interactionEvents.some(e=>e.type==='select'&&e.selection.units.includes(id)),soldier.unitId,{timeout:3000});}
  catch(error){throw new Error('Upper soldier click failed: '+JSON.stringify({target:soldier,probe:await page.evaluate(p=>window.qaArt.probePickingPoint(p),soldier)}),{cause:error});}
  soldier.leftClickSelects=true;
  return {forts:targets,soldier};
}

const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath());
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader'] });
const report = { generatedAt: new Date().toISOString(), gameURL, environment: { headless: true, renderer: 'ANGLE SwiftShader software WebGL', hardwareCaveat: 'Container CPU rendering; these measurements are not representative mid-range desktop GPU claims.' }, screenshots: [], scenes: [], errors: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1320, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='log'&&message.text().startsWith('[art-qa]'))console.log(message.text());});
  await page.goto(gameURL+'/.cache/qa-art.html');
  await page.waitForFunction(()=>Boolean(window.qaArt),{},{timeout:30000});
  report.environment.browser = await browser.version();
  if(interactionsOnly){
    for(const era of [0,3,7]){
      const scene=await page.evaluate(era=>window.qaArt.openEra(era),era);
      scene.picking=await verifyFortPicking(page);
      scene.afterDestroy=await page.evaluate(()=>window.qaArt.closeEra());report.scenes.push(scene);
    }
    await context.close();
    await writeFile(new URL('interaction-report.json',output),JSON.stringify(report,null,2));
    assert.deepEqual(report.errors,[]);
    console.log(JSON.stringify({picking:report.scenes.map(s=>({era:s.era,targets:s.picking})),report:new URL('interaction-report.json',output).pathname},null,2));
  }else{
  console.log('Scanning 448 unit frames, 40 architecture paintings, 64 props, 16 skill SVGs and 40 deterministic landscapes…');
  report.assets = await page.evaluate(()=>window.qaArt.scanAssets());
  for(const id of ['units-sheet','architecture-sheet','props-sheet','skills-sheet','maps-sheet']){
    const path=new URL(id+'.png',output);await page.locator('#'+id).screenshot({path:path.pathname,timeout:30000});report.screenshots.push(path.pathname);
  }
  console.log('Asset scan complete; exercising eight Phaser WebGL scene lifecycles…');
  for(let era=0;era<8;era++){
    const scene=await page.evaluate(era=>window.qaArt.openEra(era),era);
    scene.picking=await verifyFortPicking(page);
    const path=new URL('era-'+(era+1)+'-webgl.png',output);await page.locator('#stage').screenshot({path:path.pathname});report.screenshots.push(path.pathname);
    if(era===7)scene.ordinaryRender=await page.evaluate(()=>window.qaArt.benchmark(4500));
    scene.afterDestroy=await page.evaluate(()=>window.qaArt.closeEra());report.scenes.push(scene);
    console.log('Era '+(era+1)+' rendered '+scene.units+' actual-roster soldiers; canvas cleanup verified.');
  }
  console.log('Measuring synthetic 240-unit rendering at native high quality…');
  report.heavyScene=await page.evaluate(()=>window.qaArt.openEra(7,240));
  report.heavyScene.render=await page.evaluate(()=>window.qaArt.benchmark(4500));
  const heavyPath=new URL('240-unit-render-only.png',output);await page.locator('#stage').screenshot({path:heavyPath.pathname});report.screenshots.push(heavyPath.pathname);
  report.heavyScene.afterDestroy=await page.evaluate(()=>window.qaArt.closeEra());
  await context.close();
  report.summary={unitFrames:report.assets.units.length,unitDesigns:report.assets.units.length/4,architecture:report.assets.architecture.length,terrainProps:report.assets.props.length,skillMedallions:report.assets.skills.length,maps:report.assets.maps.length,deterministicMaps:report.assets.maps.filter(m=>m.deterministic).length,webglEras:report.scenes.length,assetFailures:report.assets.failures.length,pageErrors:report.errors.length};
  await writeFile(new URL('report.json',output),JSON.stringify(report,null,2));
  console.log(JSON.stringify({summary:report.summary,ordinary:report.scenes.at(-1).ordinaryRender,heavy:report.heavyScene.render,report:new URL('report.json',output).pathname,failures:report.assets.failures,errors:report.errors},null,2));
  assert.equal(report.assets.units.length,448);assert.equal(report.assets.architecture.length,40);assert.equal(report.assets.props.length,64);assert.equal(report.assets.skills.length,16);assert.equal(report.assets.maps.length,40);assert.equal(report.scenes.length,8);
  assert.deepEqual(report.assets.failures,[],'Artwork must be nonempty, have distinct frames, stay within atlas cells and paint deterministically');assert.deepEqual(report.errors,[],'No browser runtime exceptions');
  }
} catch(error) {
  report.failure=error.stack||String(error);await writeFile(new URL(interactionsOnly?'interaction-report.json':'report.json',output),JSON.stringify(report,null,2));throw error;
} finally { await browser.close(); }

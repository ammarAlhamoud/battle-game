import Phaser from 'phaser';
import type { BattleRenderer, BattleState, RendererOptions, Selection, Vec, Unit, Stronghold, Role } from '../contracts';
import { unitVisible, RULES } from '../sim/engine';
import { getGraphicsQuality, observeGraphicsQuality, type GraphicsQuality } from './quality';
import { paintTerrain, paintTerrainProp, TERRAIN_PROP_SIZE, TERRAIN_PROP_GROUND } from './terrain-art';
import { drawUnit, UNIT_SIZE, UNIT_ORIGIN_Y } from './unit-art';
import { drawArchitecture, drawBarrier, ARCHITECTURE_SIZE } from './architecture-art';
import { drawBattleEffects, effectLifetime, type BattleEffect } from './effects-art';

/** High-resolution original artwork is baked once into current-era GPU atlases. */
const TW = 64, TH = 32, UNIT = UNIT_SIZE, FORT = ARCHITECTURE_SIZE;
const UNIT_SCALE = .78, FORT_SCALE = .78, FORT_GROUND = 184;
const FRIEND = 0x79c9ad, ENEMY = 0xe69583;
const ROLES: Role[] = ['frontline', 'ranged', 'guard', 'scout', 'stealth', 'siege', 'engineer'];
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const rand = (x: number, y: number, seed: number): number => {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * .173) * 43758.5453;
  return n - Math.floor(n);
};

interface Presented { sprite: Phaser.GameObjects.Sprite; x: number; y: number; target: Vec; unit: Unit; facing: number }
interface FortView { image: Phaser.GameObjects.Image; owner: number | null; progress: number }
type Effect = BattleEffect;
interface Fallen { sprite:Phaser.GameObjects.Sprite; birth:number; x:number; y:number; direction:number }

class Battlefield extends Phaser.Scene {
  readonly opts: RendererOptions;
  current: BattleState | null = null;
  selection: Selection = {units:[],stronghold:null};
  ready = false;
  quality = 1;
  qualityMode = getGraphicsQuality();
  widthCells: number;
  heightCells: number;
  offsetX: number;
  presented = new Map<string,Presented>();
  forts = new Map<string,FortView>();
  private paths!: Phaser.GameObjects.Graphics;
  private groundMarks!: Phaser.GameObjects.Graphics;
  private overlays!: Phaser.GameObjects.Graphics;
  private fog!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;
  private dragGraphics!: Phaser.GameObjects.Graphics;
  private atmosphere!: Phaser.GameObjects.Graphics;
  private terrainImage!: Phaser.GameObjects.Image;
  private keys!: Record<string,Phaser.Input.Keyboard.Key>;
  private drag: {x:number;y:number;world:Vec;middle:boolean;camera:Vec} | null = null;
  private pointerWorld: Vec = {x:0,y:0};
  private hover: string | null = null;
  private effects: Effect[] = [];
  private lastEvent = -1;
  private fogTick = -1;
  private fogVisible: boolean[] = [];
  private fogExplored: boolean[] = [];
  private focusPending: Vec | null = null;
  private lastClick = 0;
  private lastClickedUnit = '';
  private props: Phaser.GameObjects.Image[] = [];
  private structureSprites = new Map<string,Phaser.GameObjects.Image>();
  private cameraMoved = false;
  private motionTime = 0;
  private fallen: Fallen[] = [];
  private frameMs = 16.7;
  private slowFor = 0;
  private lastPresentation = 0;
  constructor(opts: RendererOptions) {
    super('battle');this.opts=opts;this.widthCells=opts.mission.map[0].length;this.heightCells=opts.mission.map.length;
    this.offsetX=this.heightCells*TW/2+120;
  }
  world(p: Vec): Vec {return {x:this.offsetX+(p.x-p.y)*TW/2,y:100+(p.x+p.y)*TH/2};}
  cell(p: Vec): Vec {const x=(p.x-this.offsetX)/(TW/2),y=(p.y-100)/(TH/2);return {x:(x+y)/2,y:(y-x)/2};}
  index(p: Vec): number {const x=Math.round(p.x),y=Math.round(p.y);return y<0||x<0||y>=this.heightCells||x>=this.widthCells?-1:y*this.widthCells+x;}
  visible(p: Vec): boolean {return !!this.current?.fog[0].visible[this.index(p)];}
  explored(p: Vec): boolean {return !!this.current?.fog[0].explored[this.index(p)];}
  fortHit(fort:Stronghold,point:Vec):boolean {
    const image=this.forts.get(fort.id)?.image;if(!image||!image.getBounds().contains(point.x,point.y))return false;
    const x=(point.x-image.x)/image.scaleX+image.originX*image.width,y=(point.y-image.y)/image.scaleY+image.originY*image.height;
    return (this.textures.getPixelAlpha(Math.floor(x),Math.floor(y),'strongholds',image.frame.name)??0)>32;
  }
  create(): void {
    this.makeAtlases();this.makeTerrain();
    this.groundMarks=this.add.graphics().setDepth(-10);
    this.paths=this.add.graphics().setDepth(80000);
    this.fog=this.add.graphics().setDepth(90000);
    this.atmosphere=this.add.graphics().setDepth(91000);
    this.overlays=this.add.graphics().setDepth(95000);
    this.fxGraphics=this.add.graphics().setDepth(96000);
    this.dragGraphics=this.add.graphics().setScrollFactor(0).setDepth(100000);
    const camera=this.cameras.main;
    camera.setBackgroundColor(this.opts.mission.era===7?'#1c3038':'#34483c');
    camera.setZoom(.98);camera.setBounds(0,0,(this.widthCells+this.heightCells)*TW/2+240,(this.widthCells+this.heightCells)*TH/2+220);
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,HOME') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.removeCapture(['W','A','S','D','UP','LEFT','DOWN','RIGHT','HOME']);
    this.input.mouse!.disableContextMenu();
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>this.pointerDown(p));
    this.input.on('pointerup',(p:Phaser.Input.Pointer)=>this.pointerUp(p));
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>this.pointerMove(p));
    this.input.on('wheel',(_p:Phaser.Input.Pointer,_o:unknown,_x:number,dy:number)=>{
      const pointer=this.input.activePointer;const before=camera.getWorldPoint(pointer.x,pointer.y);
      camera.setZoom(clamp(camera.zoom*(dy>0?.9:1.1),.48*this.quality,1.9*this.quality));
      const after=camera.getWorldPoint(pointer.x,pointer.y);camera.scrollX+=before.x-after.x;camera.scrollY+=before.y-after.y;
      this.cameraMoved=true;
    });
    this.ready=true;this.resize();this.opts.parent.dataset.renderer='ready';
    const home=this.opts.mission.strongholds.find(s=>s.owner===0&&s.kind==='main');
    this.focus(this.focusPending??home??{x:this.widthCells/2,y:this.heightCells/2});
    if(this.current)this.acceptState(this.current);
  }
  makeAtlases():void {
    const era=this.opts.mission.era;
    const units=document.createElement('canvas');units.width=8*UNIT;units.height=7*UNIT;
    const ctx=units.getContext('2d')!;
    for(let role=0;role<7;role++)for(let side=0;side<2;side++)for(let frame=0;frame<4;frame++) {
      const n=(role*2+side)*4+frame;ctx.save();ctx.translate(n%8*UNIT,Math.floor(n/8)*UNIT);drawUnit(ctx,era,ROLES[role],side,frame);ctx.restore();
    }
    const atlas=this.textures.addCanvas('soldiers',units)!;
    for(let n=0;n<56;n++)atlas.add(n,0,n%8*UNIT,Math.floor(n/8)*UNIT,UNIT,UNIT);
    const forts=document.createElement('canvas');forts.width=5*FORT;forts.height=FORT;const fctx=forts.getContext('2d')!;
    for(let kind=0;kind<5;kind++) {
      fctx.save();fctx.translate(kind*FORT,0);if(kind===4)drawBarrier(fctx,era);else drawArchitecture(fctx,era,kind);fctx.restore();
    }
    const buildings=this.textures.addCanvas('strongholds',forts)!;
    for(let kind=0;kind<5;kind++)buildings.add(kind,0,kind*FORT,0,FORT,FORT);
    this.makePropAtlas();
  }
  makePropAtlas():void {
    const size=TERRAIN_PROP_SIZE;
    const canvas=document.createElement('canvas');canvas.width=8*size;canvas.height=size;
    const ctx=canvas.getContext('2d')!;
    for(let kind=0;kind<8;kind++) {ctx.save();ctx.translate(kind*size,0);paintTerrainProp(ctx,this.opts.mission.era,kind);ctx.restore();}
    const texture=this.textures.addCanvas('props',canvas)!;
    for(let kind=0;kind<8;kind++)texture.add(kind,0,kind*size,0,size,size);
  }
  makeTerrain():void {
    const w=(this.widthCells+this.heightCells)*TW/2+240,h=(this.widthCells+this.heightCells)*TH/2+240;
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    paintTerrain(canvas.getContext('2d')!,this.opts.mission.map,this.opts.mission.era,this.opts.mission.seed,(x,y)=>this.world({x,y}),TW,TH);
    for(let diagonal=0;diagonal<this.widthCells+this.heightCells;diagonal++)for(let y=0;y<this.heightCells;y++) {
      const x=diagonal-y;if(x<0||x>=this.widthCells)continue;
      const tile=this.opts.mission.map[y][x],p=this.world({x,y}),r=rand(x,y,this.opts.mission.seed);
      const prop=tile==='f'?(r<.45?0:r<.82?1:2):tile==='#'?3:tile==='c'?4:tile==='g'?5:null;
      if(prop!==null) {
        const image=this.add.image(p.x,p.y+2,'props',prop).setOrigin(TERRAIN_PROP_GROUND.x/TERRAIN_PROP_SIZE,TERRAIN_PROP_GROUND.y/TERRAIN_PROP_SIZE).setDepth(p.y+2);
        if(tile==='f')image.setScale(.80+r*.23);this.props.push(image);
      }
    }
    this.textures.addCanvas('landscape',canvas);this.terrainImage=this.add.image(0,0,'landscape').setOrigin(0).setDepth(-100);
  }
  focus(p:Vec):void {
    if(!this.ready){this.focusPending=p;return;}const pos=this.world(p);this.cameras.main.centerOn(pos.x,pos.y);this.cameraMoved=true;
  }
  resize():void {
    const width=this.opts.parent.clientWidth,height=this.opts.parent.clientHeight;
    if(!width||!height)return;
    const camera=this.ready?this.cameras.main:null;
    const center=camera?camera.getWorldPoint(camera.width/2,camera.height/2):null;
    this.game.scale.setGameSize(Math.round(width*this.quality),Math.round(height*this.quality));
    if(camera&&center)camera.centerOn(center.x,center.y);
  }
  lowerVisualResolution():void {
    const camera=this.cameras.main,center=camera.getWorldPoint(camera.width/2,camera.height/2),prior=this.quality;
    this.quality=Math.max(.65,this.quality*.8);
    camera.setZoom(camera.zoom*this.quality/prior);this.resize();camera.centerOn(center.x,center.y);this.slowFor=0;
  }
  setGraphicsQuality(mode: GraphicsQuality): void {
    this.qualityMode = mode;
    if (mode !== 'high' || this.quality === 1 || !this.ready) return;
    const camera = this.cameras.main, center = camera.getWorldPoint(camera.width / 2, camera.height / 2), prior = this.quality;
    this.quality = 1; camera.setZoom(camera.zoom / prior); this.resize(); camera.centerOn(center.x, center.y); this.slowFor = 0;
  }
  acceptState(state:BattleState):void {
    this.current=state;if(!this.ready)return;
    const live=new Set<string>();
    for(const unit of state.units) {
      if(!unitVisible(state,unit,0,this.opts.content))continue;
      const def=this.opts.content.eras[this.opts.mission.era].units.find(d=>d.id===unit.defId);if(!def)continue;
      live.add(unit.id);let entry=this.presented.get(unit.id);
      if(!entry) {const p=this.world(unit);const s=this.add.sprite(p.x,p.y,'soldiers',0).setOrigin(.5,UNIT_ORIGIN_Y/UNIT).setScale(UNIT_SCALE);entry={sprite:s,x:unit.x,y:unit.y,target:{x:unit.x,y:unit.y},unit,facing:unit.facing};this.presented.set(unit.id,entry);}
      entry.target={x:unit.x,y:unit.y};entry.unit=unit;
      if(Math.hypot(entry.x-unit.x,entry.y-unit.y)>4){entry.x=unit.x;entry.y=unit.y;}
    }
    for(const [id,p] of this.presented)if(!live.has(id)){
      const died=state.events.some(e=>e.kind==='death'&&e.owner===p.unit.owner&&Math.hypot(e.x-p.target.x,e.y-p.target.y)<.7&&state.tick-e.tick<3);
      if(died&&(p.unit.owner===0||this.visible(p.target))){const q=this.world(p);this.fallen.push({sprite:p.sprite,birth:this.motionTime,x:q.x,y:q.y,direction:p.sprite.flipX?-1:1});}
      else p.sprite.destroy();this.presented.delete(id);
    }
    for(const fort of state.strongholds) {
      if(fort.owner!==0&&!this.explored(fort))continue;
      let f=this.forts.get(fort.id);const p=this.world(fort);
      if(!f) {
        const kind=fort.kind==='main'?0:fort.kind==='outpost'?1:fort.kind==='watchtower'?2:3;
        const image=this.add.image(p.x,p.y,'strongholds',kind).setOrigin(.5,FORT_GROUND/FORT).setScale(FORT_SCALE).setDepth(p.y);
        f={image,owner:this.visible(fort)||fort.owner===0?fort.owner:null,progress:0};this.forts.set(fort.id,f);
      }
      if(this.visible(fort)||fort.owner===0){f.owner=fort.owner;f.progress=fort.progress;}
      f.image.setAlpha(this.visible(fort)||fort.owner===0?1:.7);
    }
    const structures=new Set<string>();
    for(const s of state.structures)if(s.owner===0||this.visible(s)) {
      structures.add(s.id);let image=this.structureSprites.get(s.id);const p=this.world(s);
      if(!image){image=this.add.image(p.x,p.y,'strongholds',s.kind==='tower'?2:4).setOrigin(.5,FORT_GROUND/FORT).setScale(s.kind==='tower'?.64:.68).setDepth(p.y);this.structureSprites.set(s.id,image);}
      image.setAlpha(s.built<1?.4:.95).setTint(s.owner===0?0xccfff0:0xffcab8);
    }
    for(const [id,s] of this.structureSprites)if(!structures.has(id)){s.destroy();this.structureSprites.delete(id);}
    const now=this.time.now;
    for(const e of state.events)if(e.id>this.lastEvent) {
      const hiddenSource=e.kind==='shot'&&e.owner===1&&state.units.some(u=>u.owner===1&&Math.hypot(u.x-e.x,u.y-e.y)<.35&&!unitVisible(state,u,0,this.opts.content));
      const targetAllowed=e.kind!=='shot'||!e.target||this.visible(e.target);
      if(!hiddenSource&&(e.owner===0||this.visible(e))&&targetAllowed) {
        const source=(e.kind==='shot'||e.kind==='ability')?state.units.find(u=>u.owner===e.owner&&Math.hypot(u.x-e.x,u.y-e.y)<.55&&unitVisible(state,u,0,this.opts.content)):undefined;
        const role=source?this.opts.content.eras[this.opts.mission.era].units.find(d=>d.id===source.defId)?.role:undefined;
        const kind=e.kind==='ability'&&['rally','recon','volley'].includes(e.text??'')?e.text!:e.kind;
        this.effects.push({x:e.x,y:e.y,target:e.kind==='shot'?e.target:undefined,kind,birth:now,owner:e.owner,seed:e.id,role});
      }
      this.lastEvent=Math.max(e.id,this.lastEvent);
    }
    const effectLimit=this.frameMs>34?40:100;
    if(this.effects.length>effectLimit)this.effects.splice(0,this.effects.length-effectLimit);
    if(this.fogTick!==state.tick){
      const next=state.fog[0];
      if(this.fogVisible.length!==next.visible.length||next.visible.some((v,i)=>v!==this.fogVisible[i])||next.explored.some((v,i)=>v!==this.fogExplored[i])){
        this.drawFog();this.fogVisible=[...next.visible];this.fogExplored=[...next.explored];
      }
      this.fogTick=state.tick;
    }
  }
  drawFog():void {
    this.fog.clear();if(!this.current)return;
    const fog=this.current.fog[0];
    for(let y=0;y<this.heightCells;y++)for(let x=0;x<this.widthCells;x++) {
      const i=y*this.widthCells+x;if(fog.visible[i])continue;const p=this.world({x,y});
      this.fog.fillStyle(this.opts.mission.era===7?0x172831:0x25372f,fog.explored[i]?.62:.96);
      this.fog.fillPoints([{x:p.x,y:p.y-TH/2-.6},{x:p.x+TW/2+.6,y:p.y},{x:p.x,y:p.y+TH/2+.6},{x:p.x-TW/2-.6,y:p.y}],true);
    }
  }
  pointerDown(p:Phaser.Input.Pointer):void {
    const camera=this.cameras.main;const world=camera.getWorldPoint(p.x,p.y);
    if(p.rightButtonDown()){this.orderAt(this.cell(world),(p.event as MouseEvent).shiftKey);return;}
    this.drag={x:p.x,y:p.y,world,middle:p.middleButtonDown(),camera:{x:camera.scrollX,y:camera.scrollY}};
  }
  pointerMove(p:Phaser.Input.Pointer):void {
    const camera=this.cameras.main;this.pointerWorld=camera.getWorldPoint(p.x,p.y);
    if(this.drag?.middle&&p.isDown) {
      camera.scrollX=this.drag.camera.x-(p.x-this.drag.x)/camera.zoom;camera.scrollY=this.drag.camera.y-(p.y-this.drag.y)/camera.zoom;this.cameraMoved=true;return;
    }
    this.hover=null;let closest=24;
    for(const [id,v] of this.presented) {const wp=this.world({x:v.x,y:v.y});const d=Math.hypot(wp.x-this.pointerWorld.x,wp.y-27-this.pointerWorld.y);if(d<closest){closest=d;this.hover=id;}}
    this.opts.parent.style.cursor=this.drag&&!this.drag.middle?'crosshair':this.hover?'pointer':'default';
  }
  pointerUp(p:Phaser.Input.Pointer):void {
    const drag=this.drag;this.drag=null;this.dragGraphics.clear();if(!drag||drag.middle||p.rightButtonReleased())return;
    const additive=(p.event as MouseEvent).shiftKey;
    const world=this.cameras.main.getWorldPoint(p.x,p.y);
    if(Math.hypot(p.x-drag.x,p.y-drag.y)>7) {
      const selected:string[]=[];
      const x1=Math.min(drag.world.x,world.x),x2=Math.max(drag.world.x,world.x),y1=Math.min(drag.world.y,world.y),y2=Math.max(drag.world.y,world.y);
      for(const [id,v] of this.presented)if(v.unit.owner===0){const q=this.world(v);if(q.x>=x1&&q.x<=x2&&q.y>=y1&&q.y<=y2)selected.push(id);}
      this.opts.onSelect({units:selected,stronghold:null},additive);return;
    }
    let closest=27,picked:Unit|null=null;
    for(const v of this.presented.values())if(v.unit.owner===0) {const q=this.world(v);const d=Math.hypot(q.x-world.x,q.y-27-world.y);if(d<closest){closest=d;picked=v.unit;}}
    if(picked) {
      let units=[picked.id];
      if(this.time.now-this.lastClick<330&&this.lastClickedUnit===picked.id) {
        const role=this.opts.content.eras[this.opts.mission.era].units.find(d=>d.id===picked!.defId)?.role;
        const rect=this.cameras.main.worldView;
        units=[...this.presented.values()].filter(v=>v.unit.owner===0&&rect.contains(v.sprite.x,v.sprite.y)&&this.opts.content.eras[this.opts.mission.era].units.find(d=>d.id===v.unit.defId)?.role===role).map(v=>v.unit.id);
      }
      this.lastClick=this.time.now;this.lastClickedUnit=picked.id;
      this.opts.onSelect({units,stronghold:null},additive);return;
    }
    let fort:Stronghold|null=null;closest=58;
    for(const s of this.current?.strongholds??[])if(s.owner===0||this.explored(s)){const q=this.world(s),d=Math.hypot(q.x-world.x,(q.y-15-world.y)*1.3);if(d<closest||this.fortHit(s,world)){closest=d;fort=s;}}
    this.opts.onSelect({units:[],stronghold:fort?.id??null},additive);
  }
  orderAt(cell:Vec,append:boolean):void {
    if(!this.current)return;const p=this.world(cell);let closest=27,enemy:Unit|null=null;
    for(const v of this.presented.values())if(v.unit.owner===1){const q=this.world(v);const d=Math.hypot(p.x-q.x,p.y-q.y+10);if(d<closest){closest=d;enemy=v.unit;}}
    if(enemy){this.opts.onOrder({kind:'attack',x:enemy.x,y:enemy.y,target:enemy.id},append);return;}
    let fort:Stronghold|null=null;closest=45;
    for(const s of this.current.strongholds)if(s.owner===0||this.visible(s)){const q=this.world(s),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<closest||this.fortHit(s,p)){closest=d;fort=s;}}
    if(fort){this.opts.onOrder({kind:fort.owner===0?'defend':'capture',x:fort.x,y:fort.y,target:fort.id},append);return;}
    const x=clamp(cell.x,0,this.widthCells-1),y=clamp(cell.y,0,this.heightCells-1);this.opts.onOrder({kind:'move',x,y},append);
    this.effects.push({x,y,kind:'order',birth:this.time.now,owner:0,seed:0});
  }
  update(time:number,delta:number):void {
    if(!this.ready)return;
    const elapsed=this.lastPresentation?Math.min(200,time-this.lastPresentation):delta;this.lastPresentation=time;
    this.frameMs=this.frameMs*.96+elapsed*.04;
    this.slowFor=this.frameMs>34?this.slowFor+elapsed:Math.max(0,this.slowFor-elapsed*2);
    if(this.qualityMode==='adaptive'&&this.slowFor>2600&&this.quality>.65)this.lowerVisualResolution();
    const camera=this.cameras.main;
    const active=document.activeElement;const editing=active instanceof HTMLInputElement||active instanceof HTMLTextAreaElement||active instanceof HTMLSelectElement;
    if(!editing) {
      const speed=delta*.56*this.quality/camera.zoom;let dx=0,dy=0;
      const freeKeys=this.selection.units.length===0;
      if((freeKeys&&this.keys.W.isDown)||this.keys.UP.isDown)dy-=speed;if((freeKeys&&this.keys.S.isDown)||this.keys.DOWN.isDown)dy+=speed;
      if((freeKeys&&this.keys.A.isDown)||this.keys.LEFT.isDown)dx-=speed;if((freeKeys&&this.keys.D.isDown)||this.keys.RIGHT.isDown)dx+=speed;
      if(dx||dy){camera.scrollX+=dx;camera.scrollY+=dy;this.cameraMoved=true;}
      if(Phaser.Input.Keyboard.JustDown(this.keys.HOME)){const home=this.opts.mission.strongholds.find(s=>s.owner===0&&s.kind==='main');if(home)this.focus(home);}
    }
    const state=this.current;if(!state)return;
    if(!state.paused)this.motionTime+=Math.min(delta,100);
    this.overlays.clear();this.paths.clear();this.fxGraphics.clear();this.atmosphere.clear();this.groundMarks.clear();
    const selected=new Set(this.selection.units);
    for(const [id,v] of this.presented) {
      const amount=state.paused?1:Math.min(1,delta/70);v.x+=(v.target.x-v.x)*amount;v.y+=(v.target.y-v.y)*amount;
      const p=this.world(v);v.sprite.setPosition(p.x,p.y).setDepth(p.y+6);
      const def=this.opts.content.eras[this.opts.mission.era].units.find(d=>d.id===v.unit.defId)!;
      const animationTime=this.motionTime;
      const frame=v.unit.status==='walk'?(Math.floor(animationTime/140+v.unit.slot)%2)+1:v.unit.status==='attack'?3:0;
      const role=ROLES.indexOf(def.role);v.sprite.setFrame((role*2+v.unit.owner)*4+frame);
      const angle=Math.atan2(Math.sin(v.unit.facing-v.facing),Math.cos(v.unit.facing-v.facing));
      if(!state.paused)v.facing+=angle*Math.min(1,delta/95);
      const direction=Math.cos(v.facing)-Math.sin(v.facing),sign=direction<0?-1:1;v.sprite.setFlipX(direction<0);
      const phase=animationTime/160+v.unit.slot;
      const recoil=v.unit.status==='attack'?Math.pow(clamp(v.unit.cooldown/def.attackTime,0,1),6):0;
      const hurtAge=state.time-v.unit.lastHit;
      const shake=hurtAge<.28?Math.sin(animationTime/19)*2*(1-hurtAge/.28):0;
      const brace=v.unit.status==='defend';
      const breathe=v.unit.status==='idle'?Math.sin(animationTime/620+v.unit.slot)*.012:0;
      v.sprite.setScale(UNIT_SCALE*(brace?1.035:1),UNIT_SCALE*(brace?.94:1+breathe));
      v.sprite.setRotation((v.unit.status==='walk'?Math.sin(phase)*.017:0)-sign*recoil*.075+(brace?sign*.025:0));
      v.sprite.setPosition(p.x-sign*recoil*2.5+shake,p.y+(v.unit.status==='walk'?Math.abs(Math.sin(phase))*.6:0));
      v.sprite.setAlpha(def.stealth&&v.unit.owner===0?.8:1);
      if(state.time-v.unit.lastHit<.18)v.sprite.setTint(0xffcec0);else v.sprite.clearTint();
      if(p.x<camera.worldView.left-65||p.x>camera.worldView.right+65||p.y<camera.worldView.top-10||p.y>camera.worldView.bottom+85){v.sprite.setVisible(false);continue;}v.sprite.setVisible(true);
      if(selected.has(id)) {
        this.overlays.lineStyle(1.5,FRIEND,.95).strokeEllipse(p.x,p.y+1,29,13);
        this.overlays.fillStyle(FRIEND,.12).fillEllipse(p.x,p.y+1,29,13);
        if(v.unit.orders.length)this.drawOrders(v.unit,p);
      }
      const health=v.unit.hp/def.hp;
      if(selected.has(id)||this.hover===id||state.time-v.unit.lastHit<2||health<.25) {
        const width=def.role==='siege'?31:22,y=p.y-(def.role==='siege'?72:65);
        this.overlays.fillStyle(0x193c34,.85).fillRoundedRect(p.x-width/2-1,y-1,width+2,5,2);
        this.overlays.fillStyle(health<.28?ENEMY:v.unit.owner===0?FRIEND:ENEMY,1).fillRoundedRect(p.x-width/2,y,width*clamp(health,0,1),3,1);
      }
    }
    this.fallen=this.fallen.filter(f=>{
      const t=(this.motionTime-f.birth)/650;if(t>=1){f.sprite.destroy();return false;}
      f.sprite.setPosition(f.x+f.direction*t*5,f.y+t*3).setRotation(f.direction*t*1.1).setAlpha((1-t)*.7).setDepth(f.y-1).setScale(UNIT_SCALE,UNIT_SCALE*(1-t*.25));return true;
    });
    for(const memory of Object.values(state.fog[0].memory)) {
      if(this.visible(memory)||state.time-memory.seen>45)continue;
      const p=this.world(memory);this.overlays.lineStyle(1,ENEMY,.3).strokeEllipse(p.x,p.y,17,8);
      this.overlays.lineStyle(1,ENEMY,.22).lineBetween(p.x-3,p.y-12,p.x+3,p.y-12);
    }
    this.drawStrongholds(time);
    this.drawEffects(time);
    if(this.frameMs<34&&this.presented.size<180)this.drawAtmosphere(time);
    if(this.drag&&!this.drag.middle){const p=this.input.activePointer;if(Math.hypot(p.x-this.drag.x,p.y-this.drag.y)>7){this.dragGraphics.clear().fillStyle(FRIEND,.1).fillRect(this.drag.x,this.drag.y,p.x-this.drag.x,p.y-this.drag.y).lineStyle(1,FRIEND,.9).strokeRect(this.drag.x,this.drag.y,p.x-this.drag.x,p.y-this.drag.y);}}
    if(this.cameraMoved){this.opts.parent.dispatchEvent(new CustomEvent('camera-move'));this.cameraMoved=false;}
  }
  drawOrders(unit:Unit,p:Vec):void {
    const orders=unit.orders;const first=orders[0];const color=first.kind==='attack'?ENEMY:FRIEND;
    this.paths.lineStyle(1.3,color,.55);this.paths.beginPath();this.paths.moveTo(p.x,p.y);
    const route=unit.route.length?unit.route:[first];for(const point of route){const q=this.world(point);this.paths.lineTo(q.x,q.y);}this.paths.strokePath();
    let prev=this.world(first);
    for(let n=0;n<orders.length;n++) {
      const order=orders[n],q=this.world(order);const c=order.kind==='attack'?ENEMY:FRIEND;
      if(n>0){const len=Math.hypot(q.x-prev.x,q.y-prev.y);this.paths.lineStyle(1,c,.35);for(let d=0;d<len;d+=13){const a=d/len,b=Math.min(1,(d+6)/len);this.paths.lineBetween(prev.x+(q.x-prev.x)*a,prev.y+(q.y-prev.y)*a,prev.x+(q.x-prev.x)*b,prev.y+(q.y-prev.y)*b);}}
      this.paths.lineStyle(n===0?1.6:1,c,n===0?.9:.5).strokePoints([{x:q.x,y:q.y-6},{x:q.x+10,y:q.y},{x:q.x,y:q.y+6},{x:q.x-10,y:q.y}],true);
      if(n===0)this.paths.fillStyle(c,.5).fillCircle(q.x,q.y,2);prev=q;
    }
  }
  drawStrongholds(time:number):void {
    for(const s of this.current!.strongholds) {
      const view=this.forts.get(s.id);if(!view)continue;const p=this.world(s);const visible=this.visible(s)||s.owner===0;
      if(!visible)continue;
      const color=view.owner===0?FRIEND:view.owner===1?ENEMY:0xd6cf9d;
      const radiusX=RULES.captureRadius*TW/Math.SQRT2,radiusY=RULES.captureRadius*TH/Math.SQRT2;
      const chosen=this.selection.stronghold===s.id;
      this.groundMarks.fillStyle(color,chosen?.055:.012).fillEllipse(p.x,p.y,radiusX*2,radiusY*2);
      this.groundMarks.lineStyle(chosen?1.8:1,color,chosen?.85:.22).strokeEllipse(p.x,p.y,radiusX*2,radiusY*2);
      const flagX=p.x+(s.kind==='main'?60:42),flagY=p.y-(s.kind==='main'?65:48);this.overlays.lineStyle(1.5,0xe0dfbd,.9).lineBetween(flagX,flagY+12,flagX,flagY-25);
      const wave=Math.sin(time/430+s.x)*2;
      this.overlays.fillStyle(color,1).fillPoints([{x:flagX+1,y:flagY-25},{x:flagX+18,y:flagY-23+wave},{x:flagX+16,y:flagY-13+wave},{x:flagX+1,y:flagY-15}],true);
      this.overlays.lineStyle(1,0xf4e9c9,.8).lineBetween(flagX+5,flagY-23,flagX+5,flagY-15);
      this.overlays.fillStyle(0xf4e9c9,.8).fillCircle(flagX+10,flagY-19+wave*.5,1.7);
      this.overlays.fillStyle(0x243e35,.9).fillCircle(flagX,flagY+13,3);
      if(s.capturing!==null&&s.progress>0) {
        const progress=s.progress>1?s.progress/100:s.progress;const c=s.capturing===0?FRIEND:ENEMY;
        this.groundMarks.lineStyle(3,0x182c2b,.8).strokeEllipse(p.x,p.y,radiusX*2,radiusY*2);
        this.groundMarks.lineStyle(3,c,.95).beginPath();
        for(let i=0;i<=80*clamp(progress,0,1);i++){const a=-Math.PI/2+i/80*Math.PI*2;const x=p.x+radiusX*Math.cos(a),y=p.y+radiusY*Math.sin(a);if(i===0)this.groundMarks.moveTo(x,y);else this.groundMarks.lineTo(x,y);}this.groundMarks.strokePath();
      }
      if(s.owner===0&&s.kind==='main'&&this.current!.factions[0].lines.some(l=>l.queue.length>0)) {
        const line=this.current!.factions[0].lines.find(l=>l.queue.length>0)!;const job=line.queue[0];
        const width=42;this.overlays.fillStyle(0x24463d,.9).fillRoundedRect(p.x-21,p.y-125,width,4,2);
        this.overlays.fillStyle(FRIEND,.95).fillRoundedRect(p.x-21,p.y-125,width*clamp(1-job.remaining/job.total,0,1),4,2);
      }
    }
  }
  drawEffects(time:number):void {
    this.effects=this.effects.filter(effect=>time-effect.birth<effectLifetime(effect,this.opts.mission.era));
    drawBattleEffects(this.fxGraphics,this.effects,time,this.opts.mission.era,p=>this.world(p),this.frameMs);
  }
  drawAtmosphere(time:number):void {
    // Sparse environmental animation; its positions are public terrain, never hidden state.
    for(let y=0;y<this.heightCells;y++)for(let x=0;x<this.widthCells;x++) {
      if(this.opts.mission.map[y][x]!=='~'||!this.visible({x,y})||rand(x,y,4)>.13)continue;
      const p=this.world({x,y});const wave=(time/1700+rand(x,y,2))%1;
      this.atmosphere.lineStyle(.8,0xd1e7cb,Math.sin(wave*Math.PI)*.3).strokeEllipse(p.x,p.y,10+wave*25,4+wave*9);
    }
  }
  viewport():Vec[] {
    if(!this.ready)return [];const c=this.cameras.main;
    return [c.getWorldPoint(0,0),c.getWorldPoint(c.width,0),c.getWorldPoint(c.width,c.height),c.getWorldPoint(0,c.height)].map(p=>this.cell(p));
  }
}

export function createRenderer(options:RendererOptions):BattleRenderer {
  const scene=new Battlefield(options);
  const stopObservingQuality=observeGraphicsQuality(mode=>scene.setGraphicsQuality(mode));
  const game=new Phaser.Game({type:Phaser.WEBGL,parent:options.parent,width:options.parent.clientWidth||1100,height:options.parent.clientHeight||650,backgroundColor:'#34483c',antialias:true,transparent:false,powerPreference:'high-performance',render:{roundPixels:false,antialias:true,antialiasGL:false},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[scene],input:{keyboard:true,mouse:true,touch:false},fps:{target:60,forceSetTimeOut:false},audio:{noAudio:true},banner:false});
  const observer=new ResizeObserver(()=>{if(scene.ready)scene.resize();});observer.observe(options.parent);
  let destroyed=false;
  return {
    setState(state){if(!destroyed)scene.acceptState(state);},
    setSelection(selection){scene.selection={units:[...selection.units],stronghold:selection.stronghold};},
    focus(x,y){if(!destroyed)scene.focus({x,y});},
    getViewport(){return destroyed?[]:scene.viewport();},
    destroy(){if(destroyed)return;destroyed=true;stopObservingQuality();observer.disconnect();options.parent.style.cursor='';delete options.parent.dataset.renderer;game.destroy(true);},
  };
}

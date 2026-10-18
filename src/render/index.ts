import Phaser from 'phaser';
import type { BattleRenderer, BattleState, RendererOptions, Selection, Vec, Unit, Stronghold, Role } from '../contracts';
import { unitVisible } from '../sim/engine';

/** Original vector artwork is rasterized once into two GPU atlases. Simulation never runs here. */
const TW = 64, TH = 32, UNIT = 72, FORT = 160;
const FRIEND = 0x58c7b3, ENEMY = 0xe38d75;
const ROLES: Role[] = ['frontline', 'ranged', 'guard', 'scout', 'stealth', 'siege', 'engineer'];
const palette = [
  ['#97a979', '#c8bd8a', '#4c7657', '#334f40'],
  ['#b5b083', '#d9bd86', '#708365', '#455c49'],
  ['#a6b38f', '#d1c8a0', '#60836c', '#3c5a4b'],
  ['#91a687', '#bdb68c', '#4e765e', '#365349'],
  ['#a7ae88', '#d2bd90', '#647c62', '#40564a'],
  ['#969f8b', '#b8b29b', '#61756b', '#3d514b'],
  ['#879a8e', '#b7b9a0', '#526e64', '#354d48'],
  ['#667d80', '#9aa7a1', '#3e6267', '#283f49'],
];
const asNumber = (c: string): number => parseInt(c.slice(1), 16);
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const rand = (x: number, y: number, seed: number): number => {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * .173) * 43758.5453;
  return n - Math.floor(n);
};
type Ctx = CanvasRenderingContext2D;
function path(ctx: Ctx, points: number[][], fill: string, stroke?: string): void {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function line(ctx: Ctx, x: number, y: number, xx: number, yy: number, color: string, width = 2): void {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.beginPath();ctx.moveTo(x, y);ctx.lineTo(xx, yy);ctx.stroke();
}
function isoBlock(ctx: Ctx, x: number, y: number, w: number, d: number, h: number, colors: [string, string, string]): void {
  path(ctx, [[x,y-h],[x+w,y+d-h],[x,y+d*2-h],[x-w,y+d-h]],colors[0]);
  path(ctx, [[x-w,y+d-h],[x,y+d*2-h],[x,y+d*2],[x-w,y+d]],colors[1]);
  path(ctx, [[x,y+d*2-h],[x+w,y+d-h],[x+w,y+d],[x,y+d*2]],colors[2]);
}

function drawSoldier(ctx: Ctx, era: number, role: Role, side: number, frame: number): void {
  const color = side === 0 ? '#6bcbb6' : '#e59b82';
  const dark = side === 0 ? '#264f49' : '#684139';
  const cloth = era < 2 ? '#b3a27b' : era < 4 ? '#d9d7bd' : era < 6 ? '#87998a' : '#b9caca';
  const metal = era === 1 ? '#c6a164' : era < 4 ? '#ccd1bd' : '#b2c1bb';
  const step = frame === 1 ? -2.3 : frame === 2 ? 2.3 : 0;
  const bob = frame === 1 || frame === 2 ? -1 : 0;
  ctx.translate(36, 54); ellipse(ctx,0,2,12,4,'#132e2b48');
  if(role==='scout'&&era>=6) {
    ctx.translate(0,bob-8);line(ctx,-12,-6,12,-6,'#a8c9bc',3);
    if(era===6) {
      for(const x of [-13,13]) {ellipse(ctx,x,-8,9,3,'#b9d8c5');ellipse(ctx,x,-8,5,1.5,'#477469');line(ctx,x,-11,x,-5,dark,1);}
      path(ctx,[[-7,-17],[6,-17],[10,-7],[0,-2],[-10,-7]],color);
      ellipse(ctx,4,-8,3,2,'#e5e8c8');line(ctx,0,-18,0,-25,'#d2dfc3',1);
    } else {
      path(ctx,[[-22,-6],[-5,-20],[17,-17],[23,-7],[6,2],[-11,0]],'#bbd7ca');
      path(ctx,[[1,-17],[17,-17],[23,-7],[6,2]],color);path(ctx,[[-6,-15],[1,-22],[9,-17],[3,-11]],dark);
      line(ctx,-13,-1,-20,4,'#93e5d8',3);line(ctx,7,1,3,6,'#93e5d8',3);line(ctx,9,-13,28,-18,'#d4ead8',3);
    }
    return;
  }
  if(role==='guard'&&era>=5) {
    if(era===7) {
      line(ctx,-8,-5,-12+step,3,dark,7);line(ctx,8,-5,12-step,3,dark,7);
      path(ctx,[[-13,-30],[9,-34],[16,-17],[9,-5],[-10,-5],[-18,-18]],'#c6d9ce');
      path(ctx,[[1,-31],[9,-34],[16,-17],[9,-5],[1,-7]],color);ellipse(ctx,0,-32,7,5,dark);line(ctx,0,-33,6,-34,'#a4f1dc',2);
      path(ctx,[[-23,-30],[-11,-30],[-9,-6],[-23,-9]],'#77b7a6','#b1e9cf');line(ctx,12,-20,24,-25,'#b2decb',5);
    } else {
      isoBlock(ctx,0,-5,21,8,14,['#a5baaa','#4e7565','#749885']);
      for(const x of [-15,14]){ellipse(ctx,x,3,6,6,'#233f36');ellipse(ctx,x,3,3,3,'#9eb79c');}
      path(ctx,[[-16,-13],[-7,-28],[10,-25],[20,-13],[0,-4]],color);path(ctx,[[-5,-24],[8,-22],[13,-15],[-5,-17]],'#34594e');
      line(ctx,5,-27,23,-34,'#b9cbb1',4);line(ctx,-16,-8,-8,-5,'#dddbb7',2);
    }
    return;
  }
  if (role === 'siege') {
    if(era===1) {
      for(const x of [-14,13]){ellipse(ctx,x,3,6,6,'#354a39');ellipse(ctx,x,3,2.5,3.5,'#b4a577');}
      path(ctx,[[-22,-3],[-22,-21],[0,-34],[22,-21],[22,-3],[0,7]],'#9c9162');path(ctx,[[0,-34],[22,-21],[22,-3],[0,7]],'#6d7751');
      line(ctx,-19,-20,0,-31,'#c6b37e',2);line(ctx,0,-31,19,-20,'#c6b37e',2);line(ctx,5,-10,29,-19,'#b3a16d',5);ellipse(ctx,29,-19,4,5,'#b4b89b');
      line(ctx,-12,-13,-3,-8,color,3);line(ctx,-12,-6,-3,-1,color,3);
    } else if(era===7) {
      for(const x of [-14,14]){line(ctx,x,-9,x+step,4,dark,6);line(ctx,x+step,4,x+step+4,4,'#b8dcce',6);}
      isoBlock(ctx,0,-16,19,7,15,['#c9ddd1','#5d8e87','#8fb6a4']);path(ctx,[[-15,-23],[0,-35],[15,-23],[0,-17]],color);
      line(ctx,8,-24,29,-30,'#c8f0df',6);ellipse(ctx,29,-30,4,4,'#94f4dd');line(ctx,-15,-20,-21,-32,'#a8d0bc',3);
      if(frame===3)ellipse(ctx,32,-32,6,4,'#baf5d8');
    } else if (era < 4) {
      const timber = era === 0 ? '#8b7455' : '#8b795e';
      line(ctx,-15,0,14,0,timber,5); line(ctx,-10,-1,-1,-18,timber,4);line(ctx,11,-1,2,-20,timber,4);
      for(const x of [-11,11]) { ellipse(ctx,x,2,5,6,'#283e37');ellipse(ctx,x,2,2.5,3.5,'#ac9b74'); }
      line(ctx,-12,-10,15,-20,timber,4);line(ctx,-10,-10,14,-19,'#d9c9a0',1);
      if(era === 0) ellipse(ctx,12,-21,5,5,'#adb5a0');
      else { line(ctx,-3,-15,11,-27,'#b4a57b',3);line(ctx,-6,-28,17,-21,color,2); }
      path(ctx,[[-7,-10],[0,-22],[7,-11]],color);
    } else {
      ellipse(ctx,0,0,17,7,dark);isoBlock(ctx,0,-6,17,7,9,['#99aaa0','#576e65','#3e5953']);
      if(era < 6) {for(const x of [-12,12]) {ellipse(ctx,x,1,6,7,'#2b403b');ellipse(ctx,x,1,2.5,3.5,'#a9b39e');}}
      else {line(ctx,-12,2,12,2,'#253e3b',6);line(ctx,-12,1,12,1,'#a5b6a9',1);}
      isoBlock(ctx,0,-12,9,4,6,[color,dark,'#4d776d']);line(ctx,3,-16,23,-23,'#d2d4be',5);
      if(era === 7) {ellipse(ctx,0,-17,8,3,'#89e1db');line(ctx,-12,-8,-16,-15,color);}
      if(frame === 3) ellipse(ctx,25,-24,5,3,'#ffe6a3');
    }
    return;
  }
  if(role==='scout'&&era===1) {
    ellipse(ctx,12,-7,13,7,'#8b8060');line(ctx,20,-8,23,-20,'#a49a73',6);
    for(const x of [6,19])line(ctx,x,-3,x+step,4,'#5e6547',3);
    path(ctx,[[-22,-6],[-20,-23],[-4,-19],[-1,-2]],'#b8a675');line(ctx,-2,-8,11,-12,'#bca97c',2);
    ellipse(ctx,-13,1,7,7,dark);ellipse(ctx,-13,1,4,4,'#cab88a');ctx.translate(-10,-10);
  }
  if(role==='scout' && era>1 && era<=5) {
    ellipse(ctx,0,-6,15,8,'#716c57');
    for (const x of [-9,8]) line(ctx,x,-1,x+step,8,'#564e40',3);
    path(ctx,[[9,-7],[13,-20],[19,-18],[18,-8]],'#807863');line(ctx,-14,-6,-21,-10,'#453e32',3);
    ctx.translate(-2,-12);
  }
  ctx.translate(0,bob);
  line(ctx,-3,-7,-5+step,1,'#2d453e',4);line(ctx,3,-7,5-step,1,'#2d453e',4);
  path(ctx,[[-7,-22],[5,-22],[8,-9],[1,-5],[-7,-9]],role==='stealth'?dark:cloth);
  path(ctx,[[-7,-22],[-10,-9],[-5,-6],[-2,-21]],color);
  if(role === 'guard') path(ctx,[[-5,-20],[5,-20],[7,-12],[-6,-10]],metal);
  if(era>5) {line(ctx,-3,-18,4,-18,dark,4);line(ctx,-4,-13,3,-13,color,2);}
  ellipse(ctx,0,-27,5,6,era===7?'#bed8d3':'#d5b995');
  if(role === 'stealth') {path(ctx,[[-7,-28],[-2,-36],[5,-33],[7,-23],[1,-22],[-4,-25]],dark);line(ctx,1,-28,5,-28,color,1.5);}
  else if(era === 0) {path(ctx,[[-5,-29],[-5,-33],[2,-35],[5,-29]],'#554e3d');line(ctx,-5,-28,5,-28,color,2);}
  else if(era === 1) {path(ctx,[[-6,-28],[-4,-34],[4,-34],[6,-27]],'#c6a164');line(ctx,0,-35,5,-39,color,3);}
  else if(era === 2) {path(ctx,[[-6,-28],[-4,-34],[4,-34],[6,-28]],metal);path(ctx,[[-2,-34],[-1,-40],[5,-39],[4,-34]],color);}
  else if(era === 3) {path(ctx,[[-6,-25],[-5,-34],[3,-36],[6,-32],[6,-25]],metal);line(ctx,1,-29,6,-29,dark,1);}
  else if(era === 4) {path(ctx,[[-7,-32],[-6,-36],[1,-31],[7,-35],[6,-29],[-6,-28]],dark);}
  else if(era === 5) {path(ctx,[[-6,-30],[-4,-35],[4,-35],[7,-30]],'#647366');line(ctx,-7,-29,7,-29,dark,2);}
  else {path(ctx,[[-6,-27],[-6,-33],[0,-36],[6,-32],[6,-26]],era===7?'#d9e2d6':'#5e7c70');line(ctx,0,-29,6,-29,era===7?'#69dfdc':dark,2);}
  const attack = frame === 3 ? 6 : 0;
  line(ctx,4,-20,10+attack,-14,cloth,3);line(ctx,-5,-20,-9,-13,cloth,3);
  if(role === 'frontline') {
    if(era<2||era===4) {line(ctx,11+attack,-4,13+attack,-39,'#8a7559',2);path(ctx,[[10+attack,-38],[14+attack,-45],[16+attack,-37]],metal);}
    else if(era<4) {line(ctx,9+attack,-12,21+attack,-29,metal,3);line(ctx,12+attack,-16,18+attack,-12,'#b69a67',2);}
    else {line(ctx,8,-16,23+attack,-22,era===7?'#b2efdf':'#3f534b',4);line(ctx,11,-16,16,-10,dark,3);}
  } else if(role === 'ranged' || role === 'stealth') {
    if(role==='stealth'&&era<3){line(ctx,10,-15,18+attack,-28,metal,3);line(ctx,-9,-14,-17,-20,'#c7c3a0',2);}
    else if(era===0) {line(ctx,9,-18,16+attack,-31,'#dacfa8',1.5);line(ctx,16+attack,-31,23+attack,-22,'#dacfa8',1.5);ellipse(ctx,22+attack,-23,2,3,'#c6c7aa');}
    else if(era===2) {line(ctx,6,-18,28+attack,-33,'#bda66f',2);path(ctx,[[26+attack,-35],[33+attack,-38],[29+attack,-31]],metal);}
    else if(era<4) {ctx.strokeStyle='#b5a06e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(12+attack,-21,12,-1.4,1.4);ctx.stroke();line(ctx,14+attack,-33,14+attack,-9,'#dbd8ba',1);line(ctx,7,-20,28+attack,-22,'#dfd5b3',1.5);}
    else {line(ctx,6,-18,26+attack,-22,era===7?'#b4e9de':'#485a50',4);line(ctx,13,-18,16,-12,dark,3);if(frame===3)path(ctx,[[27+attack,-26],[35+attack,-24],[28+attack,-20]],'#f1d398');}
  } else if(role === 'guard') {
    if(era<6) {path(ctx,[[-15,-25],[-6,-29],[0,-24],[-1,-10],[-8,-6],[-15,-13]],era===0?'#a29370':color,dark);line(ctx,-9,-25,-7,-10,'#dbd9b9',1);}
    else {path(ctx,[[-16,-29],[-4,-29],[-2,-9],[-14,-8]],'#7cae9e','#b9d5c2');line(ctx,-13,-25,-7,-25,dark,3);}
    line(ctx,10,-14,16+attack,-32,metal,3);
  } else if(role === 'engineer') {
    isoBlock(ctx,-7,-15,5,3,9,['#b5a374','#746747','#8e7d55']);line(ctx,10,-13,16+attack,-27,'#b8c5ad',3);
    line(ctx,12+attack,-26,20+attack,-26,'#b8c5ad',4);line(ctx,3,-18,6,-11,color,2);
  } else if(role === 'scout') {line(ctx,10,-15,20+attack,-25,metal,2);path(ctx,[[-8,-22],[-17,-12],[-10,-7],[-4,-17]],color);}
}

function drawFort(ctx: Ctx, era: number, kind: number): void {
  ctx.translate(80,99);ellipse(ctx,0,5,61,21,'#18392f30');
  const stone: [string,string,string] = era===7 ? ['#a0b6b1','#4d7377','#658e8d'] : era<2 ? ['#cabc91','#8f8b65','#aca67b'] : era<5 ? ['#d2cfaf','#8b9a87','#afbaa1'] : ['#b0bbb0','#647f75','#8d9f91'];
  if(kind===2) {
    isoBlock(ctx,0,-3,18,8,45,stone);isoBlock(ctx,0,-47,24,10,8,stone);
    for(const x of [-17,-6,6,17])line(ctx,x,-45,x,-53,stone[1],5);
    if(era<2)path(ctx,[[-29,-51],[0,-72],[29,-51],[0,-39]],'#877e56');
    if(era>5) {line(ctx,0,-55,0,-81,'#c8d2bf',2);line(ctx,-13,-70,13,-70,'#b9cebf',2);ellipse(ctx,0,-80,3,3,'#7cddd0');}
    return;
  }
  if(kind===3) {
    isoBlock(ctx,-32,-5,17,8,37,stone);isoBlock(ctx,32,-5,17,8,37,stone);
    isoBlock(ctx,0,-25,33,9,13,stone);line(ctx,-13,-16,-13,12,'#5b7260',3);line(ctx,13,-16,13,12,'#5b7260',3);
    return;
  }
  if(kind===1)ctx.scale(.76,.76);
  if(era===0) {
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const x=Math.cos(a)*48,y=Math.sin(a)*18;line(ctx,x,y,x,y-15,'#80744e',4);}
    isoBlock(ctx,-12,-7,26,12,15,['#a59e70','#8a805b','#9b9165']);
    path(ctx,[[-47,-18],[-12,-53],[24,-18],[-11,-1]],'#cfc39b');
    path(ctx,[[-12,-53],[24,-18],[-11,-1]],'#a59a6f');line(ctx,-12,-52,-12,-24,'#80724f',1);
    path(ctx,[[-17,-10],[-8,-15],[-7,7],[-18,2]],'#4b5340');
    path(ctx,[[15,-9],[33,-38],[51,-9],[33,0]],'#b4ac80');
    line(ctx,18,5,25,-3,'#e6d4a5',3);line(ctx,18,-3,25,5,'#e6d4a5',3);ellipse(ctx,22,1,4,3,'#e7aa6f');
  } else if(era===1) {
    isoBlock(ctx,0,-4,49,23,14,stone);isoBlock(ctx,0,-18,37,18,18,stone);isoBlock(ctx,0,-34,24,11,17,stone);
    isoBlock(ctx,0,-50,12,6,10,['#e1c398','#a49c72','#c7b184']);
    for(let i=0;i<5;i++)isoBlock(ctx,-15+i*6,15-i*3,5,2,3,stone);
    line(ctx,-8,-29,-8,-38,'#675f44',3);line(ctx,6,-26,6,-35,'#675f44',3);
  } else if(era===2) {
    isoBlock(ctx,0,-4,51,23,9,stone);isoBlock(ctx,0,-14,41,17,7,stone);
    for(const x of [-29,-15,0,15,29]) {const top=-10-Math.abs(x)*.47,bottom=13-Math.abs(x)*.35;line(ctx,x,top,x,bottom,'#ebdfba',6);line(ctx,x-4,top,x+4,top,'#c6c9aa',2);}
    path(ctx,[[-47,-32],[0,-59],[47,-32],[0,-10]],'#ece2c0');
    path(ctx,[[-47,-32],[0,-59],[0,-39]],'#a2afa1');
    path(ctx,[[0,-59],[47,-32],[0,-10],[0,-21],[35,-36]],'#c1c8ab');
  } else if(era===3) {
    isoBlock(ctx,0,-5,48,23,24,stone);isoBlock(ctx,0,-24,25,13,37,stone);
    for(const [x,y] of [[-37,-9],[37,-9],[0,11]]) {
      isoBlock(ctx,x,y,13,6,34,stone);isoBlock(ctx,x,y-35,16,7,6,stone);
      for(const a of [-10,0,10])line(ctx,x+a,y-34,x+a,y-43,stone[2],5);
    }
    path(ctx,[[-33,-13],[-21,-20],[-21,1],[-33,7]],'#4b6254');line(ctx,0,-52,0,-42,'#455b50',3);
  } else if(era===4) {
    path(ctx,[[-64,-4],[-47,-18],[-45,-32],[-19,-26],[0,-38],[21,-24],[48,-28],[47,-10],[64,5],[40,16],[21,14],[0,27],[-22,14],[-43,15]],'#8e9b7d');
    isoBlock(ctx,0,-13,39,18,20,stone);isoBlock(ctx,0,-34,22,10,14,['#dbd6b8','#94a18b','#b6bea2']);
    path(ctx,[[-28,-46],[0,-63],[28,-46],[0,-32]],'#6d8a7d');
    for(const x of [-33,33]) {ellipse(ctx,x,-1,7,4,'#4e6557');line(ctx,x,-5,x+18,-11,'#405d51',5);}
  } else if(era===5) {
    isoBlock(ctx,-7,-8,40,18,29,['#c6b896','#9a937b','#b4a88b']);
    path(ctx,[[-47,-37],[-7,-60],[33,-37],[-7,-18]],'#718579');
    for(const x of [-26,-10,6,22])line(ctx,x,-20,x,-10,'#4b6d63',4);
    isoBlock(ctx,29,-26,8,4,40,['#c5b999','#8e8d75','#aaa087']);
    ellipse(ctx,29,-65,10,4,'#6a7e7138');ellipse(ctx,32,-74,14,5,'#bbc3ad42');
    isoBlock(ctx,-30,7,16,8,10,stone);
  } else if(era===6) {
    isoBlock(ctx,-9,-3,43,20,24,stone);path(ctx,[[-52,-27],[-9,-49],[34,-27],[-9,-7]],'#a4b5a4');
    isoBlock(ctx,14,-28,15,8,25,['#d0d5bd','#668b7c','#99b5a2']);line(ctx,15,-48,15,-79,'#d8dfc5',2);
    line(ctx,-1,-66,30,-66,'#93bbaa',2);ellipse(ctx,15,-77,4,3,'#77d7bd');
    path(ctx,[[-40,-7],[-20,-17],[-20,6],[-40,16]],'#365a50');
    for(const x of [-33,-23,-13])line(ctx,x,-23,x+6,-26,'#d5d9bb',2);
    ellipse(ctx,35,8,15,7,'#5e7d6c');line(ctx,30,4,48,-6,'#b5c9af',4);
  } else {
    path(ctx,[[-62,0],[-39,-23],[3,-36],[49,-13],[62,10],[14,29],[-30,19]],'#486c70');
    path(ctx,[[-53,-6],[-28,-32],[0,-53],[36,-34],[51,-7],[0,14]],'#b3c9bd');
    path(ctx,[[0,-53],[36,-34],[51,-7],[0,14]],'#739e98');
    path(ctx,[[-22,-27],[0,-43],[22,-27],[0,-15]],'#76dace');
    line(ctx,-39,-2,-15,11,'#8cefe0',2);line(ctx,15,10,38,-1,'#8cefe0',2);
    for(const x of [-45,45]) {isoBlock(ctx,x,-7,7,3,28,['#c8ded1','#527f7e','#8cb4a7']);ellipse(ctx,x,-34,4,3,'#83f1da');}
    line(ctx,0,-46,0,-75,'#c2dcce',2);ellipse(ctx,0,-74,4,4,'#88f0df');
  }
}

interface Presented { sprite: Phaser.GameObjects.Sprite; x: number; y: number; target: Vec; unit: Unit }
interface FortView { image: Phaser.GameObjects.Image; owner: number | null; progress: number }
interface Effect { x: number; y: number; target?: Vec; kind: string; birth: number; owner: number; seed: number }

class Battlefield extends Phaser.Scene {
  readonly opts: RendererOptions;
  current: BattleState | null = null;
  selection: Selection = {units:[],stronghold:null};
  ready = false;
  widthCells: number;
  heightCells: number;
  offsetX: number;
  presented = new Map<string,Presented>();
  forts = new Map<string,FortView>();
  private paths!: Phaser.GameObjects.Graphics;
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
  private focusPending: Vec | null = null;
  private lastClick = 0;
  private lastClickedUnit = '';
  private props: Phaser.GameObjects.Image[] = [];
  private structureSprites = new Map<string,Phaser.GameObjects.Image>();
  private cameraMoved = false;
  constructor(opts: RendererOptions) {
    super('battle');this.opts=opts;this.widthCells=opts.mission.map[0].length;this.heightCells=opts.mission.map.length;
    this.offsetX=this.heightCells*TW/2+120;
  }
  world(p: Vec): Vec {return {x:this.offsetX+(p.x-p.y)*TW/2,y:100+(p.x+p.y)*TH/2};}
  cell(p: Vec): Vec {const x=(p.x-this.offsetX)/(TW/2),y=(p.y-100)/(TH/2);return {x:(x+y)/2,y:(y-x)/2};}
  index(p: Vec): number {const x=Math.round(p.x),y=Math.round(p.y);return y<0||x<0||y>=this.heightCells||x>=this.widthCells?-1:y*this.widthCells+x;}
  visible(p: Vec): boolean {return !!this.current?.fog[0].visible[this.index(p)];}
  explored(p: Vec): boolean {return !!this.current?.fog[0].explored[this.index(p)];}
  create(): void {
    this.makeAtlases();this.makeTerrain();
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
      camera.setZoom(clamp(camera.zoom*(dy>0?.9:1.1),.48,1.9));
      const after=camera.getWorldPoint(pointer.x,pointer.y);camera.scrollX+=before.x-after.x;camera.scrollY+=before.y-after.y;
      this.cameraMoved=true;
    });
    this.ready=true;this.opts.parent.dataset.renderer='ready';
    const home=this.opts.mission.strongholds.find(s=>s.owner===0&&s.kind==='main');
    this.focus(this.focusPending??home??{x:this.widthCells/2,y:this.heightCells/2});
    if(this.current)this.acceptState(this.current);
  }
  makeAtlases():void {
    const units=document.createElement('canvas');units.width=16*UNIT;units.height=28*UNIT;
    const uctx=units.getContext('2d')!;
    for(let era=0;era<8;era++)for(let role=0;role<7;role++)for(let side=0;side<2;side++)for(let frame=0;frame<4;frame++) {
      const n=((era*7+role)*2+side)*4+frame;const x=n%16*UNIT,y=Math.floor(n/16)*UNIT;
      uctx.save();uctx.translate(x,y);drawSoldier(uctx,era,ROLES[role],side,frame);uctx.restore();
    }
    const atlas=this.textures.addCanvas('soldiers',units)!;
    for(let n=0;n<448;n++)atlas.add(n,0,n%16*UNIT,Math.floor(n/16)*UNIT,UNIT,UNIT);
    const forts=document.createElement('canvas');forts.width=8*FORT;forts.height=4*144;const fctx=forts.getContext('2d')!;
    for(let era=0;era<8;era++)for(let kind=0;kind<4;kind++) {
      fctx.save();fctx.translate(era*FORT,kind*144);drawFort(fctx,era,kind);fctx.restore();
    }
    const fatlas=this.textures.addCanvas('strongholds',forts)!;
    for(let era=0;era<8;era++)for(let kind=0;kind<4;kind++)fatlas.add(era*4+kind,0,era*FORT,kind*144,FORT,144);
    this.makePropAtlas();
  }
  makePropAtlas():void {
    const canvas=document.createElement('canvas');canvas.width=8*128;canvas.height=128;const ctx=canvas.getContext('2d')!;
    const colors=palette[this.opts.mission.era];
    for(let kind=0;kind<8;kind++) {
      ctx.save();ctx.translate(kind*128+64,94);
      if(kind<3) {
        const h=kind===0?48:kind===1?63:39;ellipse(ctx,1,1,20,7,'#27463238');
        line(ctx,0,0,0,-h+13,'#6e7654',5);
        if(kind===1) {for(let k=0;k<3;k++)path(ctx,[[-24+k*4,-19-k*12],[0,-h-k*3],[25-k*4,-19-k*12],[0,-9-k*12]],k%2?colors[3]:colors[2]);}
        else {ellipse(ctx,-9,-h+17,17,17,colors[3]);ellipse(ctx,9,-h+13,21,19,colors[2]);ellipse(ctx,-2,-h+3,21,18,kind===2?'#8a9670':colors[2]);ellipse(ctx,-6,-h,13,12,kind===2?'#a4aa7e':'#799262');}
      } else if(kind===3) {
        ellipse(ctx,0,3,24,9,'#304c3a30');path(ctx,[[-25,0],[-17,-18],[-3,-28],[18,-22],[28,-6],[8,7]],'#9ba88c');path(ctx,[[-3,-28],[18,-22],[28,-6],[8,7],[3,-9]],'#788d79');path(ctx,[[-25,0],[-17,-18],[-3,-28],[3,-9]],'#bdc3a0');
      } else if(kind===4) {
        for(let i=0;i<4;i++)isoBlock(ctx,-21+i*14,-3,9,4,13,['#bac1a0','#7c9278','#9eac89']);
      } else if(kind===5) {
        for(const x of [-24,24]) {line(ctx,x,0,x,-31,'#a2a67b',6);path(ctx,[[x-7,-29],[x,-37],[x+7,-29]],'#d6cfac');}line(ctx,-23,-23,23,-23,'#b5b68c',5);line(ctx,-23,-8,23,-8,'#83936f',4);
      } else if(kind===6) {
        isoBlock(ctx,0,-3,23,9,13,['#b9bda2','#68816d','#8ba088']);for(const x of [-12,0,12])line(ctx,x,-8,x,-19,'#cdd0ad',3);
      } else {isoBlock(ctx,0,-4,12,6,31,['#c6d0bc','#688b7d','#94b2a0']);line(ctx,0,-35,0,-57,'#c8ddc4',2);line(ctx,-15,-47,15,-47,'#a1c5b2',2);ellipse(ctx,0,-56,4,3,'#89dcba');}
      ctx.restore();
    }
    const texture=this.textures.addCanvas('props',canvas)!;for(let i=0;i<8;i++)texture.add(i,0,i*128,0,128,128);
  }
  makeTerrain():void {
    const w=(this.widthCells+this.heightCells)*TW/2+240,h=(this.widthCells+this.heightCells)*TH/2+240;
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d')!;
    const colors=palette[this.opts.mission.era];
    const shade=(color:string,a:number):string=>{const n=asNumber(color);return `rgb(${clamp((n>>16)+a,0,255)},${clamp(((n>>8)&255)+a,0,255)},${clamp((n&255)+a,0,255)})`;};
    // Depth-first diagonal traversal preserves the edges of raised terrain.
    for(let diagonal=0;diagonal<this.widthCells+this.heightCells;diagonal++)for(let y=0;y<this.heightCells;y++) {
      const x=diagonal-y;if(x<0||x>=this.widthCells)continue;const tile=this.opts.mission.map[y][x],p=this.world({x,y}),r=rand(x,y,this.opts.mission.seed);
      const fill=tile==='~'?(this.opts.mission.era===7?'#487b87':'#719b96'):tile==='^'?colors[1]:tile==='#'?'#788d7b':shade(colors[0],Math.floor(r*12)-6);
      ctx.save();ctx.translate(p.x,p.y);
      path(ctx,[[0,-TH/2],[TW/2,0],[0,TH/2],[-TW/2,0]],fill);
      if(y===this.heightCells-1||x===this.widthCells-1) {
        path(ctx,[[-TW/2,0],[0,TH/2],[0,TH/2+15],[-TW/2,15]],shade(colors[3],3));
        path(ctx,[[TW/2,0],[0,TH/2],[0,TH/2+15],[TW/2,15]],colors[3]);
      }
      if(tile==='~') {
        for(let k=0;k<3;k++) {const xx=-17+r*11+k*10, yy=-3+(k%2)*5;line(ctx,xx,yy,xx+9,yy-3,'#b2d2bd70',1);}
      } else if(tile==='=') {
        path(ctx,[[0,-17],[34,0],[0,17],[-34,0]],'#b2a57f');
        for(let k=-2;k<=2;k++)line(ctx,-23+k*5,-2-k*2.5,5+k*5,12-k*2.5,'#786f53',1);
        line(ctx,-30,-3,0,-18,'#d1c59e',2);line(ctx,0,18,30,3,'#d1c59e',2);
      } else if(tile==='^') {
        path(ctx,[[-28,0],[-9,-16],[8,-21],[30,-3],[10,10],[-9,10]],shade(colors[1],7));
        path(ctx,[[8,-21],[30,-3],[10,10],[2,-1]],shade(colors[1],-11));
        line(ctx,-13,2,-3,-5,'#eee3b267',1);
      } else {
        for(let k=0;k<4;k++) {const a=rand(x+k*3,y-k,this.opts.mission.seed);const xx=(a-.5)*40,yy=(rand(x+k,y+k,22)-.5)*15;line(ctx,xx,yy,xx+3,yy-2,`${colors[3]}30`,1);}
        if(r>.84) {ellipse(ctx,-10,3,1.3,.8,'#e6d9a6');ellipse(ctx,7,-3,1,.7,'#d2d4ac');}
      }
      ctx.restore();
      let prop:number|null=null;
      if(tile==='f')prop=r<.45?0:r<.82?1:2;
      if(tile==='#')prop=3;if(tile==='c')prop=4;if(tile==='g')prop=5;
      if(prop!==null) {
        const img=this.add.image(p.x,p.y+2,'props',prop).setOrigin(.5,94/128).setDepth(p.y+2);
        if(tile==='f')img.setScale(.82+r*.27);this.props.push(img);
      }
    }
    this.textures.addCanvas('landscape',canvas);this.terrainImage=this.add.image(0,0,'landscape').setOrigin(0).setDepth(-100);
  }
  focus(p:Vec):void {
    if(!this.ready){this.focusPending=p;return;}const pos=this.world(p);this.cameras.main.centerOn(pos.x,pos.y);this.cameraMoved=true;
  }
  acceptState(state:BattleState):void {
    this.current=state;if(!this.ready)return;
    const live=new Set<string>();
    for(const unit of state.units) {
      if(!unitVisible(state,unit,0,this.opts.content))continue;
      const def=this.opts.content.eras[this.opts.mission.era].units.find(d=>d.id===unit.defId);if(!def)continue;
      live.add(unit.id);let entry=this.presented.get(unit.id);
      if(!entry) {const p=this.world(unit);const s=this.add.sprite(p.x,p.y,'soldiers',0).setOrigin(.5,54/UNIT);entry={sprite:s,x:unit.x,y:unit.y,target:{x:unit.x,y:unit.y},unit};this.presented.set(unit.id,entry);}
      entry.target={x:unit.x,y:unit.y};entry.unit=unit;
      if(Math.hypot(entry.x-unit.x,entry.y-unit.y)>4){entry.x=unit.x;entry.y=unit.y;}
    }
    for(const [id,p] of this.presented)if(!live.has(id)){p.sprite.destroy();this.presented.delete(id);}
    for(const fort of state.strongholds) {
      if(fort.owner!==0&&!this.explored(fort))continue;
      let f=this.forts.get(fort.id);const p=this.world(fort);
      if(!f) {
        const kind=fort.kind==='main'?0:fort.kind==='outpost'?1:fort.kind==='watchtower'?2:3;
        const image=this.add.image(p.x,p.y,'strongholds',this.opts.mission.era*4+kind).setOrigin(.5,99/144).setDepth(p.y);
        f={image,owner:this.visible(fort)||fort.owner===0?fort.owner:null,progress:0};this.forts.set(fort.id,f);
      }
      if(this.visible(fort)||fort.owner===0){f.owner=fort.owner;f.progress=fort.progress;}
      f.image.setAlpha(this.visible(fort)||fort.owner===0?1:.7);
    }
    const structures=new Set<string>();
    for(const s of state.structures)if(s.owner===0||this.visible(s)) {
      structures.add(s.id);let image=this.structureSprites.get(s.id);const p=this.world(s);
      if(!image){image=this.add.image(p.x,p.y,'props',s.kind==='tower'?7:6).setOrigin(.5,94/128).setDepth(p.y);this.structureSprites.set(s.id,image);}
      image.setAlpha(s.built<1?.4:.95).setTint(s.owner===0?0xccfff0:0xffcab8);
    }
    for(const [id,s] of this.structureSprites)if(!structures.has(id)){s.destroy();this.structureSprites.delete(id);}
    const now=this.time.now;
    for(const e of state.events)if(e.id>this.lastEvent) {
      const hiddenSource=e.kind==='shot'&&e.owner===1&&state.units.some(u=>u.owner===1&&Math.hypot(u.x-e.x,u.y-e.y)<.35&&!unitVisible(state,u,0,this.opts.content));
      if(!hiddenSource&&(e.owner===0||this.visible(e))&&(!e.target||this.visible(e.target)))this.effects.push({x:e.x,y:e.y,target:e.target,kind:e.kind,birth:now,owner:e.owner,seed:e.id});
      this.lastEvent=Math.max(e.id,this.lastEvent);
    }
    if(this.effects.length>100)this.effects.splice(0,this.effects.length-100);
    if(this.fogTick!==state.tick){this.drawFog();this.fogTick=state.tick;}
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
    for(const [id,v] of this.presented) {const wp=this.world({x:v.x,y:v.y});const d=Math.hypot(wp.x-this.pointerWorld.x,wp.y-14-this.pointerWorld.y);if(d<closest){closest=d;this.hover=id;}}
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
    for(const v of this.presented.values())if(v.unit.owner===0) {const q=this.world(v);const d=Math.hypot(q.x-world.x,q.y-14-world.y);if(d<closest){closest=d;picked=v.unit;}}
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
    for(const s of this.current?.strongholds??[])if(s.owner===0||this.explored(s)){const q=this.world(s),d=Math.hypot(q.x-world.x,(q.y-15-world.y)*1.3);if(d<closest){closest=d;fort=s;}}
    this.opts.onSelect({units:[],stronghold:fort?.id??null},additive);
  }
  orderAt(cell:Vec,append:boolean):void {
    if(!this.current)return;const p=this.world(cell);let closest=27,enemy:Unit|null=null;
    for(const v of this.presented.values())if(v.unit.owner===1){const q=this.world(v);const d=Math.hypot(p.x-q.x,p.y-q.y+10);if(d<closest){closest=d;enemy=v.unit;}}
    if(enemy){this.opts.onOrder({kind:'attack',x:enemy.x,y:enemy.y,target:enemy.id},append);return;}
    let fort:Stronghold|null=null;closest=45;
    for(const s of this.current.strongholds)if(s.owner===0||this.visible(s)){const q=this.world(s),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<closest){closest=d;fort=s;}}
    if(fort){this.opts.onOrder({kind:fort.owner===0?'defend':'capture',x:fort.x,y:fort.y,target:fort.id},append);return;}
    const x=clamp(cell.x,0,this.widthCells-1),y=clamp(cell.y,0,this.heightCells-1);this.opts.onOrder({kind:'move',x,y},append);
    this.effects.push({x,y,kind:'order',birth:this.time.now,owner:0,seed:0});
  }
  update(time:number,delta:number):void {
    if(!this.ready)return;
    const camera=this.cameras.main;
    const active=document.activeElement;const editing=active instanceof HTMLInputElement||active instanceof HTMLTextAreaElement||active instanceof HTMLSelectElement;
    if(!editing) {
      const speed=delta*.56/camera.zoom;let dx=0,dy=0;
      const freeKeys=this.selection.units.length===0;
      if((freeKeys&&this.keys.W.isDown)||this.keys.UP.isDown)dy-=speed;if((freeKeys&&this.keys.S.isDown)||this.keys.DOWN.isDown)dy+=speed;
      if((freeKeys&&this.keys.A.isDown)||this.keys.LEFT.isDown)dx-=speed;if((freeKeys&&this.keys.D.isDown)||this.keys.RIGHT.isDown)dx+=speed;
      if(dx||dy){camera.scrollX+=dx;camera.scrollY+=dy;this.cameraMoved=true;}
      if(Phaser.Input.Keyboard.JustDown(this.keys.HOME)){const home=this.opts.mission.strongholds.find(s=>s.owner===0&&s.kind==='main');if(home)this.focus(home);}
    }
    const state=this.current;if(!state)return;
    this.overlays.clear();this.paths.clear();this.fxGraphics.clear();this.atmosphere.clear();
    const selected=new Set(this.selection.units);
    for(const [id,v] of this.presented) {
      const amount=state.paused?1:Math.min(1,delta/70);v.x+=(v.target.x-v.x)*amount;v.y+=(v.target.y-v.y)*amount;
      const p=this.world(v);v.sprite.setPosition(p.x,p.y).setDepth(p.y+6);
      const def=this.opts.content.eras[this.opts.mission.era].units.find(d=>d.id===v.unit.defId)!;
      const animationTime=state.paused?state.time*1000:time;
      const frame=v.unit.status==='walk'?(Math.floor(animationTime/140+v.unit.slot)%2)+1:v.unit.status==='attack'?3:0;
      const role=ROLES.indexOf(def.role);v.sprite.setFrame(((this.opts.mission.era*7+role)*2+v.unit.owner)*4+frame);
      const direction=Math.cos(v.unit.facing)-Math.sin(v.unit.facing);v.sprite.setFlipX(direction<0);
      v.sprite.setAlpha(def.stealth&&v.unit.owner===0?.8:1);
      if(state.time-v.unit.lastHit<.18)v.sprite.setTint(0xffcec0);else v.sprite.clearTint();
      if(!camera.worldView.contains(p.x,p.y)){v.sprite.setVisible(false);continue;}v.sprite.setVisible(true);
      if(selected.has(id)) {
        this.overlays.lineStyle(1.5,FRIEND,.95).strokeEllipse(p.x,p.y+1,29,13);
        this.overlays.fillStyle(FRIEND,.12).fillEllipse(p.x,p.y+1,29,13);
        if(v.unit.orders.length)this.drawOrders(v.unit,p);
      }
      const health=v.unit.hp/def.hp;
      if(selected.has(id)||this.hover===id||state.time-v.unit.lastHit<2||health<.25) {
        const width=def.role==='siege'?31:22,y=p.y-(def.role==='siege'?32:43);
        this.overlays.fillStyle(0x193c34,.85).fillRoundedRect(p.x-width/2-1,y-1,width+2,5,2);
        this.overlays.fillStyle(health<.28?ENEMY:v.unit.owner===0?FRIEND:ENEMY,1).fillRoundedRect(p.x-width/2,y,width*clamp(health,0,1),3,1);
      }
    }
    for(const memory of Object.values(state.fog[0].memory)) {
      if(this.visible(memory)||state.time-memory.seen>45)continue;
      const p=this.world(memory);this.overlays.lineStyle(1,ENEMY,.3).strokeEllipse(p.x,p.y,17,8);
      this.overlays.lineStyle(1,ENEMY,.22).lineBetween(p.x-3,p.y-12,p.x+3,p.y-12);
    }
    this.drawStrongholds(time);
    this.drawEffects(time);
    this.drawAtmosphere(time);
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
      this.overlays.lineStyle(this.selection.stronghold===s.id?2:1,color,this.selection.stronghold===s.id?.9:.38).strokeEllipse(p.x,p.y+2,s.kind==='main'?116:86,s.kind==='main'?52:38);
      const flagX=p.x+35,flagY=p.y-47;this.overlays.lineStyle(1.5,0xe0dfbd,.9).lineBetween(flagX,flagY+12,flagX,flagY-25);
      const wave=Math.sin(time/430+s.x)*2;
      this.overlays.fillStyle(color,1).fillPoints([{x:flagX+1,y:flagY-25},{x:flagX+18,y:flagY-23+wave},{x:flagX+16,y:flagY-13+wave},{x:flagX+1,y:flagY-15}],true);
      this.overlays.fillStyle(0x243e35,.9).fillCircle(flagX,flagY+13,3);
      if(s.capturing!==null&&s.progress>0) {
        const progress=s.progress>1?s.progress/100:s.progress;const c=s.capturing===0?FRIEND:ENEMY;
        this.overlays.lineStyle(3,0x233d35,.8).strokeEllipse(p.x,p.y+3,102,45);
        this.overlays.lineStyle(3,c,.95).beginPath();
        for(let i=0;i<=40*clamp(progress,0,1);i++){const a=-Math.PI/2+i/40*Math.PI*2;const x=p.x+51*Math.cos(a),y=p.y+3+22.5*Math.sin(a);if(i===0)this.overlays.moveTo(x,y);else this.overlays.lineTo(x,y);}this.overlays.strokePath();
      }
      if(s.owner===0&&s.kind==='main'&&this.current!.factions[0].lines.some(l=>l.queue.length>0)) {
        const line=this.current!.factions[0].lines.find(l=>l.queue.length>0)!;const job=line.queue[0];
        const width=42;this.overlays.fillStyle(0x24463d,.9).fillRoundedRect(p.x-21,p.y-78,width,4,2);
        this.overlays.fillStyle(FRIEND,.95).fillRoundedRect(p.x-21,p.y-78,width*clamp(1-job.remaining/job.total,0,1),4,2);
      }
    }
  }
  drawEffects(time:number):void {
    this.effects=this.effects.filter(e=>time-e.birth<(e.kind==='shot'?450:e.kind==='death'?850:900));
    for(const e of this.effects) {
      const p=this.world(e);const age=(time-e.birth)/900;const color=e.owner===0?FRIEND:ENEMY;const alpha=1-age;
      if(e.kind==='shot'&&e.target) {
        const q=this.world(e.target),t=clamp((time-e.birth)/260,0,1),x=p.x+(q.x-p.x)*t,y=p.y-20+(q.y-p.y)*t-Math.sin(t*Math.PI)*(this.opts.mission.era<4?35:4);
        this.fxGraphics.lineStyle(this.opts.mission.era===7?2:1.5,this.opts.mission.era===7?color:0xf1dfa5,.95).lineBetween(x,y,x-(q.x-p.x)*.08,y-(q.y-p.y)*.08);
        this.fxGraphics.fillStyle(0xffefbc,.9).fillCircle(x,y,2);
      } else if(e.kind==='hit'||e.kind==='death') {
        const n=e.kind==='death'?7:4;
        for(let i=0;i<n;i++){const a=rand(i,e.seed,7)*Math.PI*2,d=(8+rand(i,e.seed,8)*15)*age;this.fxGraphics.fillStyle(i%2?0xe7d5a2:color,alpha*.9).fillCircle(p.x+Math.cos(a)*d,p.y-12+Math.sin(a)*d+age*10,Math.max(.5,2.2*(1-age)));}
        if(e.kind==='death')this.fxGraphics.lineStyle(1,0xd9ceb0,alpha*.5).strokeEllipse(p.x,p.y,age*42,age*20);
      } else {
        this.fxGraphics.lineStyle(e.kind==='capture'?2:1.5,color,alpha*.8).strokeEllipse(p.x,p.y,12+age*(e.kind==='capture'?140:45),6+age*(e.kind==='capture'?65:23));
        if(e.kind==='deploy'||e.kind==='build')this.fxGraphics.lineStyle(1,color,alpha*.4).lineBetween(p.x,p.y,p.x,p.y-40*(1-age));
      }
    }
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
  const game=new Phaser.Game({type:Phaser.WEBGL,parent:options.parent,width:options.parent.clientWidth||1100,height:options.parent.clientHeight||650,backgroundColor:'#34483c',antialias:true,transparent:false,powerPreference:'high-performance',render:{roundPixels:false,antialias:true},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[scene],input:{keyboard:true,mouse:true,touch:false},fps:{target:60,forceSetTimeOut:false},audio:{noAudio:true},banner:false});
  let destroyed=false;
  return {
    setState(state){if(!destroyed)scene.acceptState(state);},
    setSelection(selection){scene.selection={units:[...selection.units],stronghold:selection.stronghold};},
    focus(x,y){if(!destroyed)scene.focus({x,y});},
    getViewport(){return destroyed?[]:scene.viewport();},
    destroy(){if(destroyed)return;destroyed=true;options.parent.style.cursor='';delete options.parent.dataset.renderer;game.destroy(true);},
  };
}

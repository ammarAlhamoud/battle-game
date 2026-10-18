import type { Role } from '../contracts';

/** Original, hand-authored miniature paintings. Rasterized once; no per-frame canvas work. */
export const UNIT_SIZE = 128;
export const UNIT_ORIGIN_Y = 100;
type Ctx = CanvasRenderingContext2D;
type Point = [number, number];
type Paint = string | CanvasGradient;

const INK = '#182329';
const TEAM = [
  { light: '#b9f2da', main: '#56bda8', dark: '#23574f', glow: '#9effe5' },
  { light: '#ffdbb4', main: '#d77d68', dark: '#713d3c', glow: '#ffb99e' },
];
const METAL = ['#eff1dc', '#aebbc0', '#637980', '#33434d'];
const BRONZE = ['#ffe0a1', '#bc995a', '#81602f', '#493f30'];
const WOOD = ['#c5a979', '#8c6945', '#4c3b2d'];
const PALE = ['#f1e3bf', '#c9b891', '#81785d'];
const uniforms = [
  ['#b89b72', '#88704c', '#544b36'], ['#e1cc99', '#b3a270', '#796d4c'],
  ['#e1deca', '#aaa98d', '#646e66'], ['#bec4bc', '#7b8f8e', '#3e555c'],
  ['#ddd0ab', '#8a928a', '#4e6062'], ['#91a48b', '#627561', '#344b45'],
  ['#a8b69a', '#788b72', '#3f544b'], ['#e2e9e4', '#a3b8bc', '#3e5b6b'],
];

function gradient(c: Ctx, x: number, y: number, xx: number, yy: number, colors: readonly string[]): CanvasGradient {
  const g = c.createLinearGradient(x, y, xx, yy);
  colors.forEach((v, i) => g.addColorStop(i / (colors.length - 1), v)); return g;
}
function poly(c: Ctx, p: Point[], fill: Paint, stroke: string | null = INK, width = 1): void {
  c.beginPath(); p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function oval(c: Ctx, x: number, y: number, rx: number, ry: number, fill: Paint, stroke: string | null = null, w = 1): void {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = w; c.stroke(); }
}
function line(c: Ctx, p: Point[], color: Paint, width = 1): void {
  c.beginPath(); p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function curve(c: Ctx, from: Point, control: Point, to: Point, color: Paint, width = 1): void {
  c.beginPath(); c.moveTo(...from); c.quadraticCurveTo(...control, ...to); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function limb(c: Ctx, p: Point[], width: number, colors: readonly string[]): void {
  line(c, p, INK, width + 1.7); line(c, p, gradient(c, p[0][0] - width / 2, 0, p[0][0] + width, 0, colors), width);
  line(c, p.map(([x, y]) => [x - width * .2, y] as Point), colors[0], .7);
}
function rivet(c: Ctx, x: number, y: number, light = '#ead4a2'): void { oval(c, x, y, .75, .75, light); }
function glow(c: Ctx, x: number, y: number, rx: number, ry: number, color: string): void {
  c.save(); const g = c.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); g.addColorStop(0, color); g.addColorStop(1, color + '00');
  oval(c, x, y, rx, ry, g); c.restore();
}
function wheel(c: Ctx, x: number, y: number, radius: number, frame: number, armored = false): void {
  oval(c, x + 1, y + .5, radius, radius * .86, '#17252b', INK, 1.2);
  oval(c, x, y, radius - 1.5, radius * .76, gradient(c, x - radius, y - radius, x + radius, y + radius, armored ? METAL : WOOD), '#263439', 1.2);
  const spokes = armored ? 6 : 8;
  for (let n = 0; n < spokes; n++) { const a = n / spokes * Math.PI * 2 + frame * .24; line(c, [[x, y], [x + Math.cos(a) * (radius - 3), y + Math.sin(a) * radius * .64]], armored ? '#42565c' : '#3f362b', 1.3); }
  oval(c, x, y, 2, 1.8, '#e2cf9d', INK, .7);
}
function box(c: Ctx, x: number, y: number, w: number, d: number, h: number, colors: readonly string[]): void {
  poly(c, [[x-w,y-h],[x,y-h-d],[x+w,y-h],[x,y-h+d]], gradient(c, x-w,y-h-d,x+w,y-h+d,[colors[0],colors[1]]));
  poly(c, [[x-w,y-h],[x,y-h+d],[x,y+d],[x-w,y]], gradient(c,x-w,y-h,x,y,[colors[1],colors[2]]));
  poly(c, [[x,y-h+d],[x+w,y-h],[x+w,y],[x,y+d]], gradient(c,x,y-h,x+w,y,[colors[1],colors[2]]));
}
function clothFolds(c: Ctx, y: number, bottom: number, width: number, dark: string): void {
  for (const x of [-width * .6, -width * .17, width * .35]) line(c, [[x, y], [x + 1.5, bottom]], dark, .8);
}
function flash(c: Ctx, x: number, y: number, space: boolean): void {
  const col = space ? '#b8fff1' : '#fff1bb'; glow(c, x, y, 10, 9, space ? '#8beecf' : '#f8c56d');
  poly(c, [[x-3,y-2],[x+4,y-6],[x+3,y-1],[x+10,y],[x+3,y+2],[x+4,y+6],[x-3,y+3]], col, null);
}

function head(c: Ctx, era: number, role: Role, side: number): void {
  const t = TEAM[side]; const stealth = role === 'stealth';
  // Warm faces, shaded neck and tiny nose make the figures human even at game scale.
  poly(c, [[-3,-53],[4,-53],[4,-47],[-2,-47]], '#9b735b');
  oval(c, .7, -58, 6.1, 7.4, gradient(c,-5,-63,7,-52,['#edcea3','#c39b76','#936b56']), '#3a3c36', .8);
  poly(c, [[5,-60],[8,-56.7],[5,-55.7]], '#c49d79', null);
  line(c, [[2,-59],[5,-59]], '#3b453e', .8); line(c, [[4,-53.8],[6,-53.7]], '#805b4a', .65);
  if (stealth) {
    if (era < 6) {
      poly(c, [[-8,-57],[-8,-65],[-3,-70],[4,-68],[9,-61],[7,-53],[3,-55],[1,-62],[-3,-62],[-3,-53]], gradient(c,-8,-68,8,-53,[t.dark,'#3b5044','#1d342f']));
      line(c,[[-4,-65],[0,-67],[5,-63]], '#8a9b79',.8);
      if (era < 2) for (let n=0;n<7;n++) line(c,[[-8+n*2.5,-65+(n%2)*2],[-12+n*3,-70+(n%3)*2]], '#9aa173',1.3);
    } else {
      poly(c,[[-7,-62],[-3,-68],[5,-67],[8,-61],[6,-52],[-5,-53]],gradient(c,-7,-68,8,-53,['#6b8580','#354c4b','#152f36']));
      line(c,[[-2,-60],[6,-60]],t.glow,1.5);line(c,[[-5,-56],[5,-55]],'#1c3339',2.3);
      if (era === 7) { line(c,[[-7,-63],[-3,-67],[3,-66]],'#a8b7cb',1.2); glow(c,3,-60,6,3,t.main); }
    } return;
  }
  if (era === 0) {
    poly(c,[[-6,-59],[-7,-63],[-3,-68],[3,-68],[6,-63],[6,-61],[2,-63],[-3,-62],[-4,-56]],gradient(c,-6,-68,6,-57,['#6e5941','#302d2b','#1c2826']));
    line(c,[[-6,-62],[6,-62]],t.main,2.2);line(c,[[-6,-63],[4,-63]],t.light,.65);
    if (role === 'guard') for (const x of [-4,0,4]) poly(c,[[x,-67],[x+1,-72],[x+3,-67]],'#e2d4ae');
  } else if (era === 1) {
    poly(c,[[-7,-58],[-7,-63],[-4,-69],[3,-70],[7,-65],[8,-59],[4,-60],[3,-65],[-3,-65],[-4,-57]],gradient(c,-6,-70,8,-57,BRONZE));
    line(c,[[-5,-64],[5,-65]],'#f3d698',1);line(c,[[-7,-57],[-5,-53]],'#967844',2);
    poly(c,[[-1,-69],[1,-76],[5,-74],[5,-69]],t.main);line(c,[[0,-73],[5,-73]],t.light,.8);
  } else if (era === 2) {
    poly(c,[[-7,-59],[-7,-65],[-3,-70],[4,-70],[8,-65],[8,-60],[3,-62],[-3,-62],[-4,-55],[-7,-55]],gradient(c,-6,-69,8,-56,METAL));
    line(c,[[-8,-61],[8,-63]],'#dfc593',1.6);line(c,[[5,-60],[5,-54]],'#8a9a98',2.1);
    poly(c,[[-5,-70],[-4,-75],[0,-79],[7,-76],[9,-72],[6,-70]],gradient(c,-5,-78,8,-69,[t.light,t.main,t.dark]));
    for (let n=0;n<5;n++)line(c,[[-3+n*2,-75],[0+n*1.8,-70]],t.dark,.6);
  } else if (era === 3) {
    poly(c,[[-7,-56],[-8,-65],[-3,-72],[5,-70],[8,-64],[8,-54],[0,-52]],gradient(c,-7,-70,8,-54,METAL));
    poly(c,[[-1,-61],[7,-63],[7,-59],[0,-58]],'#1b343b',null);line(c,[[0,-68],[0,-54]],'#e0e6d7',1);line(c,[[-6,-56],[0,-53],[7,-55]],'#75868c',1);
    if(role==='ranged'||role==='engineer'){poly(c,[[-9,-63],[-7,-68],[2,-71],[8,-66],[10,-63]],gradient(c,-9,-70,10,-63,METAL));}
  } else if (era === 4) {
    if (role === 'frontline' || role === 'guard') {
      poly(c,[[-8,-62],[-5,-69],[3,-73],[7,-67],[8,-62]],gradient(c,-6,-70,9,-61,METAL));
      poly(c,[[-11,-62],[-2,-64],[11,-65],[9,-61],[-8,-59]],gradient(c,-10,-64,10,-59,METAL));
      line(c,[[1,-70],[3,-64]],'#e8e9d4',1.3);
    } else {
      poly(c,[[-10,-64],[-8,-70],[-1,-65],[7,-71],[11,-64],[5,-60],[-6,-60]],gradient(c,-10,-71,10,-59,['#72716a','#3c4647','#172e36']));
      line(c,[[-9,-64],[-1,-64],[7,-68]],'#d8bb81',1.1);
    }
    line(c,[[-4,-57],[-3,-52]],'#6c5545',1.2);line(c,[[0,-54],[5,-54]],'#6b503f',1.4);
  } else if (era === 5) {
    poly(c,[[-7,-62],[-6,-68],[0,-70],[6,-67],[8,-62]],gradient(c,-7,-69,8,-62,['#b1b496','#6b7d69','#354b45']));
    poly(c,[[-9,-62],[7,-64],[11,-62],[4,-59],[-8,-60]],'#344b44');line(c,[[-5,-66],[5,-66]],t.main,2);
    oval(c,2,-65,1.1,1.1,'#ebd7a7');line(c,[[6,-60],[5,-53]],'#454e43',.85);
  } else if (era === 6) {
    poly(c,[[-7,-58],[-8,-64],[-5,-69],[2,-71],[8,-67],[9,-60],[4,-61],[-1,-63],[-4,-57]],gradient(c,-6,-70,9,-57,['#a1b394','#637d65','#334f47']));
    line(c,[[-5,-65],[5,-66]],'#cad0ad',.8);line(c,[[-6,-59],[-2,-53],[5,-53],[7,-59]],'#344a42',.9);
    poly(c,[[1,-64],[7,-64],[7,-60],[1,-59]],'#243f40');line(c,[[2,-62],[6,-62]],t.glow,1);
    oval(c,-5,-59,2.2,3,'#3c5149','#b1bfa1',.7);
  } else {
    poly(c,[[-7,-56],[-8,-63],[-4,-70],[4,-71],[9,-66],[9,-56],[4,-52],[-3,-53]],gradient(c,-7,-69,9,-52,METAL));
    poly(c,[[-4,-63],[1,-65],[9,-63],[8,-58],[1,-57],[-4,-59]],'#183844');
    line(c,[[-3,-61],[2,-62],[8,-60]],t.glow,1.6);line(c,[[0,-68],[5,-69],[8,-65]],'#f3f6e4',1);
    line(c,[[-4,-55],[2,-54],[6,-56]],'#5b7984',1.2);glow(c,4,-61,7,4,t.main);
  }
}

function shield(c: Ctx, era: number, side: number, heavy: boolean): void {
  const t=TEAM[side];c.save();c.translate(-13,-31);c.rotate(-.12);
  if(era===0){
    oval(c,-1,0,10.5,16,gradient(c,-11,-15,9,14,['#c1ab78','#93805a','#514e37']),INK,1.4);
    for(const x of [-7,-1,5])line(c,[[x,-11],[x-2,10]],'#6c6449',.9);
    for(const [x,y] of [[-5,-6],[3,-9],[5,4],[-2,10]])oval(c,x,y,1.5,2,'#665c42');
    line(c,[[-9,-4],[6,5]],t.main,3.2);line(c,[[-4,-14],[0,13]],'#d2c18e',.7);
  }else if((era===1&&heavy)||era===2||era===3){
    const tall=heavy?22:17;const w=heavy?11.5:9;
    poly(c,[[-w,-tall+4],[-3,-tall-2],[w,-tall+1],[w+1,tall-5],[2,tall],[-w,tall-5]],gradient(c,-w,-tall,w,tall,[t.light,t.main,t.dark]),'#303c3a',1.4);
    line(c,[[-w+2,-tall+5],[-3,-tall],[w-2,-tall+3],[w-1,tall-6],[2,tall-2],[-w+2,tall-6],[-w+2,-tall+5]],'#e2c69a',1.1);
    if(era===2){
      poly(c,[[-7,-7],[-2,-4],[0,-12],[3,-4],[8,-5],[4,0],[7,6],[1,4],[-3,10],[-3,2],[-8,0],[-2,-2]],'#eddbac',null);oval(c,0,0,3.2,3,'#b8b8a0','#5a6260',.7);
    } else { line(c,[[-6,-2],[6,-2]],'#e5d8b1',2.5);line(c,[[0,-11],[0,10]],'#e5d8b1',2.6);oval(c,0,-2,2,2,'#baae87'); }
    for(const y of [-tall+7,tall-7]){rivet(c,-w+3,y);rivet(c,w-3,y);}
  }else{
    oval(c,0,0,12,15,gradient(c,-12,-13,11,13,BRONZE),'#4e5141',1.4);
    oval(c,0,0,9.4,12,nullPaint(c),t.main,3);oval(c,0,0,4.2,5,gradient(c,-4,-5,5,5,METAL),'#6e6750',.6);
    for(let n=0;n<8;n++){const a=n*Math.PI/4;rivet(c,Math.cos(a)*10.4,Math.sin(a)*13,'#f4d99e');}
  } c.restore();
}
function nullPaint(c: Ctx): CanvasGradient { const g=c.createLinearGradient(0,0,1,1);g.addColorStop(0,'#ffffff00');g.addColorStop(1,'#ffffff00');return g; }

function spear(c: Ctx, era: number, frame: number, long = false): void {
  c.save();c.translate(13,-29);c.rotate(frame===3?.52:-.07);
  const top=long?-54:-43;
  line(c,[[0,24],[0,top]],'#332d27',3.2);line(c,[[-.4,23],[-.4,top]],'#b19465',1.5);
  poly(c,[[0,top-12],[-3.7,top+1],[0,top+5],[3.7,top+1]],gradient(c,-4,top-8,4,top+3,era===0?['#dbded0','#7a8f8d','#3f545a']:era===1?BRONZE:METAL));
  line(c,[[0,top-10],[0,top+4]],'#f8e9bd',.7);
  for(let n=0;n<4;n++)line(c,[[-1.6,top+5+n*1.5],[1.5,top+6+n*1.5]],'#443e30',.75);
  c.restore();
}
function sword(c: Ctx, era: number, frame: number): void {
  c.save();c.translate(15,-31);c.rotate(frame===3?.72:.21);
  const long=era>=3?32:24;
  if(era===0){
    poly(c,[[-2,-4],[-4,-16],[-1,-24],[2,-21],[4,-13],[2,-4]],gradient(c,-4,-23,4,-4,['#d8ded1','#829794','#435c60']));
    line(c,[[-1,-18],[2,-14],[-1,-10],[2,-6]],'#b4c2b5',.7);line(c,[[0,-3],[0,4]],'#72563c',3.3);
    for(let n=0;n<4;n++)line(c,[[-1.5,-3+n*1.7],[1.5,-2+n*1.7]],'#d0bd8e',.7);
  }else{
    poly(c,[[-1.8,-4],[-2.4,-long],[0,-long-6],[2.8,-long],[2,-4]],gradient(c,-3,-long,3,-5,era===1?BRONZE:METAL));
    line(c,[[0,-long-3],[0,-5]],'#f4eed5',.75);line(c,[[-5,-4],[6,-4]],'#bba16d',2.5);line(c,[[0,-3],[0,4]],'#57483c',3);oval(c,0,5,2,1.8,'#cbb67f');
  }c.restore();
}
function firearm(c: Ctx, era: number, frame: number, sniper: boolean, side: number): void {
  const t=TEAM[side];c.save();c.translate(8,-37);c.rotate(frame===3?-.17:-.26);
  const length=sniper?38:era===4?34:29;const stock=era<6?'#98714e':'#4a6260';
  poly(c,[[-9,-1],[-4,-5],[8,-5],[11,-2],[3,1],[-5,5],[-9,4]],gradient(c,-8,-5,9,5,['#b4aa8a',stock,'#3a4744']));
  line(c,[[4,-4],[length,-4]],'#1b3036',4);line(c,[[5,-5],[length-1,-5]],era===7?'#d4e6e1':'#9aaca7',1.1);
  poly(c,[[4,-2],[9,-2],[8,6],[4,7]],'#344c4e');line(c,[[12,-2],[16,1]],'#d6c9a0',1.2);
  if(era===4){line(c,[[18,-5],[18,-10]],'#727e7c',1.5);line(c,[[19,-6],[22,-8]],'#e6bb79',1);}
  if(era>=5&&sniper){line(c,[[8,-9],[23,-9]],'#1c333c',3.8);oval(c,24,-9,2.2,2,'#77d1c5');line(c,[[11,-8],[11,-5]],'#889c98',1.4);}
  if(era===6){line(c,[[10,-1],[24,-1]],'#455e5b',2.5);for(let n=0;n<5;n++)line(c,[[13+n*2,-4],[13+n*2,-1]],'#9cae9b',.6);}
  if(era===7){poly(c,[[9,-9],[22,-9],[29,-6],[26,-2],[12,-2]],gradient(c,9,-9,26,-2,METAL));line(c,[[11,-6],[25,-6]],t.glow,1.6);oval(c,28,-4,2,3,'#315663',t.main,.8);}
  if(frame===3)flash(c,length+3,-4,era===7);
  c.restore();
}
function bow(c: Ctx, era: number, frame: number, side: number): void {
  c.save();c.translate(18,-36);c.rotate(-.15);const h=era===3?25:19;const bend=frame===3?1:8;
  curve(c,[0,-h],[22,-2],[0,h], '#2a3730',4.3);curve(c,[0,-h],[22,-2],[0,h], era===1?'#d2ad73':'#bb9b68',2.5);
  line(c,[[0,-h],[-bend,0],[0,h]],'#ddd5b4',.9);line(c,[[-bend,0],[26,0]],'#cbb580',1.35);
  poly(c,[[25,-2],[31,0],[25,2]],'#dae5db',null);poly(c,[[-bend+1,-2],[-bend-5,-3],[-bend-1,0],[-bend-5,3],[-bend+1,2]],TEAM[side].light,null);
  line(c,[[10,-3],[10,3]],'#574c3c',2.4);c.restore();
}

function soldier(c: Ctx, era: number, role: Role, side: number, frame: number, mounted = false): void {
  const t=TEAM[side], u=uniforms[era], moving=frame===1||frame===2, stride=frame===1?1:frame===2?-1:0;
  const stealth=role==='stealth', heavy=role==='guard', tech=era>=6;
  const cloth=stealth?[u[1],t.dark,'#223f38']:u; const armor=era===1?BRONZE:METAL;
  c.save();c.translate(0,moving?-1.2:0);
  // Backs and draped cloaks read as a separate material behind articulated limbs.
  if(stealth||role==='scout'||(heavy&&era<5)){
    poly(c,[[-7,-49],[-15,-44],[-18-stride*2,-13],[-8,-16],[0,-11],[10,-16],[8,-46]],gradient(c,-16,-48,10,-12,[t.main,t.dark,'#253d38']));
    clothFolds(c,-40,-17,12,'#1e3731');line(c,[[-12,-42],[-15,-17]],'#a4bba0',.8);
    if(stealth&&era<3)for(let n=0;n<13;n++){const x=-15+(n%6)*4,y=-40+Math.floor(n/6)*10;poly(c,[[x,y],[x-3,y+9],[x+3,y+7]],n%2?'#839063':'#596b49',null);}
    if(stealth&&era===7){line(c,[[-13,-42],[-17,-15],[-9,-17]],'#72bfc1',1);glow(c,-12,-25,5,17,'#68c3b6');}
  }
  if(role==='engineer'){
    box(c,-8,-38,8,4,18,era<5?WOOD:['#b8bda8','#7c8d75','#435a50']);
    line(c,[[-14,-50],[-15,-30]],'#c3b895',2);line(c,[[-18,-49],[-11,-48]],'#879a99',4);line(c,[[-11,-38],[-5,-35]],t.main,2);
    if(era===7){box(c,-10,-40,7,4,17,METAL);line(c,[[-13,-51],[-13,-41]],t.glow,2);glow(c,-13,-45,5,11,t.main);}
  }
  // The knees move independently, with a planted toe and a lifted trailing heel.
  const farHip:Point=[-4,-24], nearHip:Point=[5,-24];
  const farKnee:Point=[-6-stride*3,-12+Math.abs(stride)],farFoot:Point=[-6-stride*5,mounted?-1:-1-stride*2];
  const nearKnee:Point=[6+stride*3,-12-Math.abs(stride)],nearFoot:Point=[7+stride*5,mounted?0:-1+stride*2];
  limb(c,[farHip,farKnee,farFoot],6,[cloth[1],cloth[2],'#263b36']);
  poly(c,[[farFoot[0]-3,farFoot[1]-4],[farFoot[0]+2,farFoot[1]-3],[farFoot[0]+5,farFoot[1]+1],[farFoot[0]-4,farFoot[1]+2]],gradient(c,farFoot[0]-4,-6,farFoot[0]+4,2,['#7d7660','#35423b','#1e3031']));
  limb(c,[nearHip,nearKnee,nearFoot],6.8,cloth);
  if((heavy&&era>0)||era===3||era===7){
    poly(c,[[nearKnee[0]-3,nearKnee[1]-3],[nearKnee[0]+3,nearKnee[1]-3],[nearFoot[0]+3,nearFoot[1]-3],[nearFoot[0]-3,nearFoot[1]-2]],gradient(c,nearKnee[0]-4,-14,nearKnee[0]+4,0,armor));
    oval(c,nearKnee[0],nearKnee[1]-1,3.6,2.8,gradient(c,nearKnee[0]-3,0,nearKnee[0]+3,0,armor),INK,.6);
  }
  poly(c,[[nearFoot[0]-3.5,nearFoot[1]-4],[nearFoot[0]+3,nearFoot[1]-4],[nearFoot[0]+7,nearFoot[1]],[nearFoot[0]+6,nearFoot[1]+2],[nearFoot[0]-4,nearFoot[1]+2]],gradient(c,nearFoot[0]-3,-4,nearFoot[0]+6,3,['#9b9477','#4e5950','#23383a']));
  line(c,[[nearFoot[0]-2,nearFoot[1]+1],[nearFoot[0]+6,nearFoot[1]+1]],'#b6aa86',.6);
  // Tunics and segmented skirts have substantial volume instead of flat triangular silhouettes.
  const shirt=gradient(c,-11,-49,13,-23,cloth);
  poly(c,[[-8,-49],[6,-50],[11,-45],[10,-31],[8,-23],[-9,-22],[-11,-33],[-12,-43]],shirt);
  if(era<5){poly(c,[[-10,-32],[9,-32],[12,-21],[5,-17],[-1,-20],[-9,-18],[-12,-23]],gradient(c,-11,-30,12,-18,cloth));clothFolds(c,-29,-20,11,cloth[2]);}
  if(era===3){
    for(let row=0;row<4;row++)for(let col=0;col<7;col++){
      const x=-9+col*3+(row%2)*1.2,y=-29+row*2.5;
      curve(c,[x-1,y],[x,y+1.7],[x+1,y],'#d2d8c78c',.65);
    }
  }
  if(era===0){
    poly(c,[[-11,-47],[-3,-51],[2,-46],[9,-47],[11,-37],[1,-33],[-10,-36]],gradient(c,-10,-48,11,-34,['#c6b48e','#918063','#5f5d46']));
    for(const [x,y] of [[-5,-44],[3,-43],[-2,-37],[7,-38]])oval(c,x,y,1.4,1.8,'#675e45');
    line(c,[[-8,-45],[7,-33]],'#d3c4a0',2);for(let n=0;n<4;n++)oval(c,-7+n*3,-44+n*2.4,1,1.6,'#e1d9b6');
  }else if(era<4||heavy||era===7){
    poly(c,[[-8,-47],[4,-49],[10,-44],[9,-34],[3,-29],[-8,-31],[-10,-42]],gradient(c,-9,-48,11,-29,armor));
    if(era===2){for(let n=0;n<4;n++){line(c,[[-8,-44+n*3],[4,-43+n*3],[10,-45+n*3]],'#4c6468',1);line(c,[[-7,-43+n*3],[3,-42+n*3]],'#e3e7d4',.7);}line(c,[[-7,-44],[-7,-32]],'#b89b62',1.2);}
    else{line(c,[[-2,-47],[-1,-32]],'#e3e8d5',1);curve(c,[-8,-39],[-1,-36],[8,-40],'#6a8185',.8);}
    if(era===1){for(const x of [-5,4])rivet(c,x,-43,'#f3d893');curve(c,[-7,-35],[-1,-31],[7,-35],'#f0cc8a',1);}
    if(era===7){poly(c,[[-5,-44],[1,-46],[7,-43],[6,-36],[-4,-35]],'#476472');line(c,[[-3,-42],[4,-42]],t.glow,1.8);line(c,[[-8,-32],[6,-33]],t.main,2.4);}
  }else if(era>=5){
    poly(c,[[-8,-46],[5,-47],[9,-42],[9,-31],[-8,-29],[-10,-41]],gradient(c,-10,-45,9,-29,['#8a9a7d','#4e6653','#2d4740']));
    for(const x of [-6,2]){poly(c,[[x,-39],[x+5,-39],[x+5,-33],[x,-33]],'#74876b','#344e43',.55);line(c,[[x+.5,-37],[x+4.5,-37]],'#c0c7a0',.6);}
    line(c,[[-6,-46],[-6,-30]],'#a8ae8c',2);line(c,[[4,-46],[4,-30]],'#a8ae8c',2);
    if(era===6){for(const [x,y] of [[-5,-44],[2,-42],[-8,-32],[7,-36]])poly(c,[[x,y],[x+4,y+1],[x+2,y+3],[x-2,y+2]],'#495e47',null);}
  } else {line(c,[[-7,-47],[5,-25]],'#e1cda7',3.3);line(c,[[6,-46],[-6,-25]],'#736348',2);}
  line(c,[[-9,-28],[9,-29]],'#4b4634',3);poly(c,[[-2,-30],[2,-30],[2,-26],[-2,-26]],'#d6bd81','#484638',.6);
  for(const x of [-8,5])poly(c,[[x,-28],[x+4,-28],[x+4,-23],[x,-23]],gradient(c,x,-28,x+4,-22,['#ad9670','#776044','#4a4333']),INK,.55);
  // Team fabric is visible on both shoulders and the belt, never encoded only by hue.
  poly(c,[[-11,-46],[-6,-48],[-6,-38],[-11,-37]],gradient(c,-11,-46,-6,-37,[t.light,t.main,t.dark]));
  line(c,[[-10,-44],[-7,-44]],'#e3ddbc',.9);line(c,[[-9,-42],[-8,-42]],'#e3ddbc',.8);
  const attacking=frame===3;const rightHand:Point=role==='ranged'||(era>=5&&role==='frontline')?[16+(attacking?3:0),-36]:[14+(attacking?5:0),-30+(attacking?-4:0)];
  const leftHand:Point=role==='ranged'?[7,-37]:[-12-stride*1.5,-32+stride];
  limb(c,[[-9,-44],[-13,-38],leftHand],5.1,cloth);
  oval(c,leftHand[0],leftHand[1],2.8,3,era>=6?'#475d50':'#c6a17a',INK,.6);
  if(role==='guard'&&era<5)shield(c,era,side,true);
  else if(role==='frontline'&&era<4&&era!==0)shield(c,era,side,false);
  // Weapons are drawn between hands: a visible trigger grip, bow string or wrapped shaft.
  if(role==='frontline'){
    if(era<2||era===4)spear(c,era,frame,era===4);
    else if(era<4)sword(c,era,frame);
    else firearm(c,era,frame,false,side);
  }else if(role==='ranged'){
    if(era===0){
      line(c,[[12,-38],[23+(attacking?7:0),-56]],'#d7cbb0',1.2);line(c,[[23+(attacking?7:0),-56],[29+(attacking?5:0),-45]],'#d7cbb0',1.2);oval(c,29+(attacking?5:0),-45,2.7,3,'#777a67',INK,.6);
      poly(c,[[-8,-31],[-15,-31],[-17,-22],[-9,-21]],'#907651');
    }else if(era===1||era===3)bow(c,era,frame,side);
    else if(era===2){
      const xx=attacking?9:0,yy=attacking?-5:0;
      line(c,[[6+xx,-23+yy],[37+xx,-65+yy]],'#3f382b',3);line(c,[[6+xx,-24+yy],[37+xx,-66+yy]],'#c8a46b',1.5);
      poly(c,[[34+xx,-66+yy],[42+xx,-73+yy],[39+xx,-62+yy]],gradient(c,34+xx,-72,42+xx,-62,METAL));
    }
    else firearm(c,era,frame,true,side);
  }else if(role==='guard'){
    if(era===0){line(c,[[14,-31],[23,-53]],'#715d40',4);poly(c,[[18,-55],[24,-60],[29,-56],[29,-48],[21,-48]],gradient(c,18,-59,29,-48,['#b4b7a3','#788576','#424f49']));}
    else if(era===2)spear(c,era,frame,true);else sword(c,era,frame);
  }else if(role==='stealth'){
    if(era<=2){sword(c,era,frame);line(c,[[-12,-31],[-22,-40]],'#98a9a4',2.6);}
    else if(era===3)bow(c,era,frame,side);else firearm(c,era,frame,false,side);
  }else if(role==='engineer'){
    c.save();c.translate(15,-30);c.rotate(attacking?.55:.1);
    line(c,[[0,5],[0,-25]],era<5?'#a88c5e':'#788c8b',3);line(c,[[-1,3],[-1,-24]],'#e1d9b6',.7);
    if(era===0)poly(c,[[-3,-26],[4,-28],[10,-26],[10,-20],[2,-20]],gradient(c,-3,-28,10,-20,METAL));
    else if(era<5)poly(c,[[-7,-27],[7,-27],[9,-20],[-7,-20]],gradient(c,-7,-27,9,-20,era===1?BRONZE:METAL));
    else if(era<7){poly(c,[[-4,-30],[-6,-25],[-3,-19],[3,-19],[6,-25],[4,-30],[2,-24],[-2,-24]],gradient(c,-6,-28,6,-20,METAL));}
    else{poly(c,[[-4,-26],[5,-26],[8,-19],[2,-15],[-4,-17]],gradient(c,-4,-26,8,-15,METAL));line(c,[[5,-24],[8,-22]],t.glow,2);poly(c,[[9,-28],[21,-33],[21,-18],[9,-14]],'#7dddcf22',t.glow,.8);line(c,[[12,-25],[18,-27]],t.light,.7);line(c,[[12,-22],[18,-24]],t.light,.7);}
    c.restore();
  }else{if(era>=4)firearm(c,era,frame,false,side);else sword(c,era,frame);}
  limb(c,[[8,-44],[11+(attacking?3:0),-39],rightHand],5.5,heavy?armor:cloth);
  oval(c,rightHand[0],rightHand[1],2.8,3,era>=6?'#45605a':'#d7b68a',INK,.7);
  if(heavy||era>=6){oval(c,8,-45,5,4,gradient(c,3,-49,12,-42,armor),INK,.7);line(c,[[5,-46],[10,-46]],t.main,2.2);}
  head(c,era,role,side);
  c.restore();
}

function horse(c: Ctx, era: number, side: number, frame: number, chariot = false): void {
  const t=TEAM[side], stride=frame===1?1:frame===2?-1:0;const offset=chariot?20:2;
  c.save();c.translate(offset,0);
  const hide=era===3?['#d5c9ae','#9d8c6c','#574c3c']:['#a88763','#725b45','#3d3931'];
  // Far pair, haunch, powerful shoulder and neck are separate rounded forms.
  limb(c,[[-17,-22],[-20-stride*3,-11],[-18-stride*7,-1]],4.5,[hide[1],hide[2],'#2b302b']);
  limb(c,[[12,-23],[15+stride*4,-12],[14+stride*6,-1]],4,[hide[1],hide[2],'#2b302b']);
  oval(c,-2,-27,25,12,gradient(c,-22,-38,22,-15,hide),INK,1.1);
  oval(c,-17,-25,10,11,gradient(c,-23,-35,-9,-16,hide));
  poly(c,[[10,-30],[13,-45],[20,-53],[28,-51],[27,-42],[23,-36],[24,-24]],gradient(c,12,-51,29,-23,hide));
  poly(c,[[20,-52],[22,-61],[26,-54],[29,-58],[29,-50],[36,-47],[36,-42],[29,-40],[23,-43]],gradient(c,21,-59,36,-40,hide));
  oval(c,28,-49,1,1,'#182c2e');line(c,[[33,-44],[36,-44]],'#d6bb8d',.8);
  poly(c,[[14,-45],[18,-54],[21,-56],[23,-50],[21,-40],[17,-33],[13,-32]],'#302e29');
  line(c,[[-23,-29],[-32,-26],[-34,-15]],'#352f29',5);line(c,[[-24,-29],[-31,-26],[-33,-18]],'#746044',1.5);
  limb(c,[[-16,-21],[-12+stride*4,-11],[-15+stride*7,1]],5.2,hide);
  limb(c,[[15,-23],[9-stride*3,-11],[12-stride*7,1]],4.7,hide);
  for(const x of [-15+stride*7,12-stride*7])poly(c,[[x-2.5,-1],[x+2,-1],[x+4,3],[x-3,3]],'#303930',INK,.7);
  // Saddle cloth, cinch, reins and metal bridle are readable at normal zoom.
  poly(c,[[-17,-34],[6,-36],[10,-23],[2,-17],[-13,-20]],gradient(c,-15,-35,10,-17,[t.light,t.main,t.dark]));
  line(c,[[-14,-32],[-12,-22],[2,-20],[7,-25]],'#dccb9d',1);line(c,[[-5,-35],[-4,-16]],'#4e4232',2.3);
  oval(c,-4,-36,10,3.5,'#68513a','#241f1d',.7);line(c,[[23,-51],[29,-42],[35,-44]],'#b6a37d',1.5);
  curve(c,[28,-44],[15,-39],[-1,-47],'#d6c49b',.8);curve(c,[29,-43],[17,-36],[0,-45],'#3a3830',1);
  if(era===3){poly(c,[[12,-45],[20,-48],[25,-40],[22,-32],[14,-31]],gradient(c,12,-47,25,-32,METAL));line(c,[[15,-42],[23,-42]],'#dce2cf',.8);}
  if(!chariot){c.save();c.translate(-5,-24);c.scale(.7,.7);soldier(c,era,'scout',side,frame,true);c.restore();}
  c.restore();
}
function chariot(c: Ctx, side: number, frame: number): void {
  const t=TEAM[side];horse(c,1,side,frame,true);
  line(c,[[-17,-15],[32,-20]],'#b99461',3);line(c,[[-16,-11],[24,-17]],'#665539',2);
  c.save();c.translate(-23,-21);c.scale(.58,.58);soldier(c,1,'scout',side,frame,true);c.restore();
  poly(c,[[-37,-27],[-23,-33],[-10,-26],[-10,-11],[-22,-5],[-37,-12]],gradient(c,-37,-33,-10,-5,BRONZE));
  poly(c,[[-37,-27],[-23,-21],[-23,-6],[-37,-12]],gradient(c,-37,-27,-23,-7,[t.light,t.main,t.dark]));
  line(c,[[-35,-25],[-25,-20],[-25,-9]],'#efd19b',1.2);for(const y of [-18,-13])rivet(c,-30,y);
  wheel(c,-29,-3,10,frame);wheel(c,-8,-9,8,frame);
}
function drone(c: Ctx, side: number, frame: number): void {
  const t=TEAM[side];c.save();c.translate(0,-25+(frame===1||frame===2?-2:0));
  for(const [x,y] of [[-25,-14],[23,-18],[-23,9],[24,5]]){
    line(c,[[0,-5],[x,y]],'#1b3038',6);line(c,[[-1,-6],[x,y-1]],'#b7c7bc',3);
    oval(c,x,y,13,5,'#d6f2e81a','#9bbeb5',.7);oval(c,x,y,9,2.9,'#84b2a977');
    c.save();c.translate(x,y);c.scale(1,.32);c.rotate(frame*.8);line(c,[[-11,-2],[11,2]],'#304d50',3.2);line(c,[[-2,9],[2,-9]],'#304d50',3.2);c.restore();
    oval(c,x,y,2.5,2.5,'#dbe9dd','#293f47',.8);
  }
  poly(c,[[-11,-13],[-3,-20],[9,-18],[15,-7],[9,3],[-7,6],[-15,-3]],gradient(c,-15,-20,15,6,METAL));
  poly(c,[[0,-18],[9,-18],[15,-7],[9,3],[4,0]],gradient(c,0,-18,15,3,[t.light,t.main,t.dark]));
  oval(c,-1,7,7,5,'#263e47','#9eaaa6',1);oval(c,2,8,3,3,'#91e4d4','#1d4245',1);oval(c,3,7,1,1,'#e8fff1');
  line(c,[[-5,-18],[-6,-30]],'#b9cabc',1);oval(c,-6,-31,1.5,1.5,t.glow);line(c,[[-8,-10],[-3,-12]],'#f2e9c6',1.5);
  if(frame===3){line(c,[[6,5],[21,10]],'#596e6c',3);flash(c,23,11,false);}c.restore();
}
function skimmer(c: Ctx, side: number, frame: number): void {
  const t=TEAM[side];c.save();c.translate(0,-18);
  for(const x of [-25,18]){
    const thrust=(frame===1&&x<0)||(frame===2&&x>0);
    glow(c,x,10,12,thrust?14:9,t.main);oval(c,x,8,10,3,t.glow);
    if(thrust){poly(c,[[x-6,10],[x+6,9],[x+3,18],[x-2,22]],'#a8f9df55',null);line(c,[[x-2,11],[x,18]],'#d6fff1',1.4);}
  }
  poly(c,[[-40,-3],[-25,-18],[8,-22],[39,-10],[29,1],[-5,14],[-26,8]],gradient(c,-30,-20,28,13,METAL));
  poly(c,[[8,-22],[39,-10],[29,1],[-5,14],[-3,3]],gradient(c,3,-22,31,10,[t.light,t.main,t.dark]));
  poly(c,[[-20,-12],[-4,-26],[10,-25],[19,-15],[5,-4],[-11,-2]],gradient(c,-20,-25,18,-3,['#62818c','#203f50','#142b38']));
  line(c,[[-15,-13],[-3,-21],[8,-20]],'#cce4df',1.2);poly(c,[[-37,-2],[-21,1],[-18,7],[-30,5]],'#345966');
  for(const [x,y] of [[-27,5],[18,-2]]){line(c,[[x-7,y],[x+5,y-3]],t.glow,2);glow(c,x,y,10,4,t.main);}
  line(c,[[18,-13],[44,-19]],'#19323f',5);line(c,[[18,-14],[43,-20]],'#d2e9df',2);line(c,[[-27,-14],[-32,-28]],'#9db7bc',1.5);oval(c,-32,-29,2,2,t.glow);
  if(frame===3)flash(c,46,-21,true);c.restore();
}
function carrier(c: Ctx, era: number, side: number, frame: number): void {
  const t=TEAM[side], modern=era===6;
  // Axles, six actual tires, bevelled armor and turret, distinct from the artillery chassis.
  for(const [x,y] of [[-26,-7],[-9,1],[17,-5]])wheel(c,x,y,8,frame,true);
  poly(c,[[-37,-23],[-15,-37],[24,-29],[37,-16],[14,2],[-19,-5],[-37,-13]],gradient(c,-35,-34,30,-2,['#acbba5','#6e8674','#354e48']));
  poly(c,[[-15,-37],[24,-29],[37,-16],[14,-11],[-19,-19]],gradient(c,-14,-36,35,-12,['#bdc7b0','#829986','#506a60']));
  poly(c,[[-37,-23],[-19,-19],[14,-11],[14,2],[-19,-5],[-37,-13]],gradient(c,-35,-23,13,2,[t.main,t.dark,'#263f3c']));
  for(const [x,y] of [[-26,-16],[-10,-12],[5,-8],[23,-18]]){rivet(c,x,y,'#bbc4a4');}
  poly(c,[[-13,-28],[-7,-37],[10,-35],[17,-26],[2,-19]],gradient(c,-11,-37,16,-20,METAL));
  poly(c,[[-7,-37],[10,-35],[11,-30],[-8,-31]],'#2a4650');line(c,[[-6,-35],[7,-34]],'#9dbbb0',1);
  line(c,[[5,-32],[32,-41]],'#223a41',6);line(c,[[6,-34],[32,-43]],'#bbc9b9',2);oval(c,33,-42,2.5,3,'#243d41','#99aea1',.7);
  for(let n=0;n<3;n++){line(c,[[-29+n*5,-23],[-26+n*5,-21]],'#2a443d',1.5);}
  line(c,[[16,-29],[16,-49]],'#bbccc2',1);oval(c,16,-50,1.5,1.5,t.light);
  if(modern){
    // Modern layered side armor and sensor turret contrast with the riveted industrial car.
    for(let n=0;n<4;n++){
      const x=-32+n*10,y=-16+n*2.7;
      poly(c,[[x,y-5],[x+8,y-3],[x+8,y+5],[x,y+3]],gradient(c,x,y-5,x+8,y+5,['#b6c0a6','#6d8874','#3f5c51']),'#263f39',.7);
      line(c,[[x+1,y-3],[x+7,y-1]],'#d5dac0',.7);rivet(c,x+6,y+2,'#919f82');
    }
    poly(c,[[-3,-39],[5,-45],[18,-40],[20,-31],[7,-27],[-3,-31]],gradient(c,-3,-45,20,-27,['#bac8b2','#728b79','#3c5a51']));
    line(c,[[9,-38],[35,-46]],'#19383d',5.5);line(c,[[9,-40],[35,-48]],'#b5c8b7',1.7);
    poly(c,[[4,-42],[9,-44],[12,-42],[8,-39]],'#18373e');oval(c,8,-42,1.2,1.2,t.glow);
    line(c,[[-8,-35],[-10,-50]],'#bccab4',1.3);oval(c,-10,-51,2,1.5,'#293f3d',t.light,.8);
  }
  for(const [x,y] of [[-25,-4],[-7,4],[23,-2]])wheel(c,x,y,8.5,frame,true);
  if(modern){poly(c,[[-25,-17],[-12,-13],[-12,-3],[-25,-7]],'#d6d9c4','#50695d',1);line(c,[[-19,-13],[-19,-6]],t.main,2);}
  else{line(c,[[-28,-27],[-16,-30]],'#d3bd89',2);oval(c,-27,-30,3,2,'#5e6c60');}
  if(frame===3)flash(c,36,-43,false);
}
function aegis(c: Ctx, side: number, frame: number): void {
  const t=TEAM[side], stride=frame===1?1:frame===2?-1:0;
  for(const [x,dir] of [[-11,-1],[12,1]]){
    limb(c,[[x,-33],[x+dir*4+stride*dir*3,-18],[x+stride*dir*5,-3]],8,['#b7c9cd','#66828e','#2e4d5f']);
    poly(c,[[x-5+stride*dir*5,-8],[x+5+stride*dir*5,-9],[x+10+stride*dir*5,-1],[x+7+stride*dir*5,3],[x-7+stride*dir*5,2]],gradient(c,x-7,-9,x+10,3,METAL));
    oval(c,x+dir*4+stride*dir*3,-18,5,4,'#405c68','#c2d3d4',1);line(c,[[x+dir*4-2,-19],[x+dir*4+2,-19]],t.main,1.5);
  }
  poly(c,[[-19,-62],[-7,-69],[13,-68],[24,-55],[20,-35],[8,-27],[-13,-29],[-23,-43]],gradient(c,-23,-68,24,-28,METAL));
  poly(c,[[0,-65],[13,-68],[24,-55],[20,-35],[8,-27],[2,-34]],gradient(c,0,-67,24,-28,[t.light,t.main,t.dark]));
  poly(c,[[-13,-58],[-1,-63],[13,-57],[10,-45],[-9,-44]],gradient(c,-13,-63,13,-44,['#9baeb1','#3e6071','#183845']));
  line(c,[[-8,-55],[7,-55]],t.glow,2);line(c,[[-17,-40],[-8,-35],[0,-36]],'#e2e9dd',1.1);
  oval(c,1,-69,10,7,gradient(c,-9,-76,11,-62,METAL),INK,1);poly(c,[[-5,-71],[7,-72],[11,-69],[7,-66],[-5,-66]],'#163545');line(c,[[-4,-69],[8,-69]],t.glow,1.5);
  limb(c,[[19,-56],[29,-45],[28,-34]],8,METAL);line(c,[[29,-43],[49,-52]],'#213d4c',8);line(c,[[29,-45],[49,-54]],'#b9dbd6',2.5);oval(c,49,-53,3,4,t.glow,INK,1);
  // Transparent energy shield keeps the armored arm and strut visible beneath it.
  limb(c,[[-20,-55],[-27,-44],[-24,-30]],8,METAL);
  poly(c,[[-38,-62],[-22,-67],[-12,-59],[-13,-22],[-28,-16],[-39,-29]],'#76e2c333',t.glow,1.7);
  poly(c,[[-35,-58],[-23,-62],[-17,-57],[-18,-27],[-28,-22],[-35,-31]],'#97d1cd19','#bbe7d5',.7);line(c,[[-29,-55],[-27,-29]],t.light,1.5);
  if(frame===3)flash(c,53,-54,true);
}

function ram(c: Ctx, side: number, frame: number): void {
  const t=TEAM[side];wheel(c,-22,-8,8,frame);wheel(c,18,-15,8,frame);
  box(c,0,-10,33,12,26,WOOD);
  poly(c,[[-35,-36],[-6,-62],[34,-42],[4,-20]],gradient(c,-30,-60,26,-21,['#c5a46e','#927552','#564e3b']));
  poly(c,[[34,-42],[36,-21],[4,-5],[4,-20]],gradient(c,4,-33,35,-6,['#8c7b53','#544e39','#30392f']));
  for(let n=0;n<7;n++)line(c,[[-31+n*4.6,-38-n*.6],[-3+n*4.6,-24-n*.6]],'#e3c896',.65);
  for(const [x,y] of [[-28,-33],[-8,-23],[13,-31]]){line(c,[[x,y],[x,y+13]],'#353b2e',2);rivet(c,x,y+3);}
  line(c,[[3,-27],[42+(frame===3?5:0),-43]],'#303b31',12);line(c,[[3,-30],[42+(frame===3?5:0),-46]],'#b39a6b',6);
  oval(c,43+(frame===3?5:0),-44,6,7,gradient(c,38,-50,49,-38,BRONZE),INK,1);poly(c,[[44,-49],[51,-48],[54,-43],[50,-39],[43,-40]],'#9ea68d');
  for(const y of [-24,-17])line(c,[[-28,y],[-16,y+5]],t.main,2.8);
  wheel(c,-24,0,9,frame);wheel(c,17,-7,9,frame);
}
function stoneSledge(c: Ctx, side: number, frame: number): void {
  const t=TEAM[side];
  // A plausible primitive supply/siege fallback: lashed travois, hide and hauled boulders.
  for(const x of [-20,16]){line(c,[[x-13,-3],[x+20,-16]],'#352f26',6);line(c,[[x-13,-5],[x+20,-18]],'#b29461',3);}
  for(let n=0;n<6;n++)line(c,[[-25+n*7,-7-n*2],[1+n*7,5-n*2]],'#816641',4);
  poly(c,[[-28,-16],[-4,-29],[27,-15],[7,-1]],gradient(c,-25,-29,25,-1,['#c4b08a','#8f7f5c','#5b5e43']));
  poly(c,[[-20,-25],[-24,-35],[-14,-47],[-3,-49],[9,-41],[11,-26],[-3,-19]],gradient(c,-23,-46,13,-20,['#d8d7bc','#9baf9d','#526f68']));
  poly(c,[[-20,-25],[-12,-34],[-3,-31],[-3,-19]],'#6e8779',null);line(c,[[-19,-35],[-12,-42],[-3,-44]],'#e7e4c5',1.1);
  oval(c,16,-23,9,7,gradient(c,8,-30,25,-17,['#bac7ac','#7d9885','#4b6d64']),INK,1);
  for(const y of [-20,-11])line(c,[[-23,y],[8,y+11],[28,y-1]],'#d2c49a',1.2);
  const wind=frame===1?-2:frame===2?2:0;
  line(c,[[-26,-13],[-33,-37]],'#745d3e',3);poly(c,[[-33,-36],[-46+wind,-38],[-44+wind,-23],[-34,-21]],t.main);line(c,[[-44+wind,-34],[-36,-32]],t.light,1);
  line(c,[[25,-18],[45+(frame===3?4:0),-31]],'#bcaa7e',2);line(c,[[25,-13],[45+(frame===3?4:0),-28]],'#bcaa7e',2);
}
function ballista(c: Ctx, era: number, side: number, frame: number): void {
  const t=TEAM[side], fire=frame===3;
  wheel(c,-22,-4,7,frame);wheel(c,18,-10,7,frame);
  line(c,[[-27,-10],[18,-29]],'#4f4634',8);line(c,[[-27,-12],[18,-31]],'#b59863',4);
  limb(c,[[-18,-6],[-8,-39],[13,-13]],5,WOOD);limb(c,[[9,-10],[-1,-43],[-22,-9]],4,WOOD);
  poly(c,[[-7,-32],[24,-47],[32,-42],[0,-24]],gradient(c,-7,-40,29,-25,WOOD));
  line(c,[[-3,-32],[30,-46]],'#e8d3a6',1.8);
  curve(c,[-29,-40],[-2,-47],[18,-66], '#302e29',6);curve(c,[-29,-40],[-2,-47],[18,-66], '#b0905b',3.7);
  line(c,[[-28,-40],[fire?-1:8,fire?-48:-35],[18,-65]],'#eee2ba',1.2);
  line(c,[[fire?9:1,fire?-43:-33],[fire?43:29,fire?-59:-47]],'#d9c29a',2);poly(c,[[fire?41:27,fire?-61:-49],[fire?48:34,fire?-61:-49],[fire?44:30,fire?-55:-43]],'#c8d3c3',null);
  wheel(c,-23,1,8,frame);wheel(c,19,-6,8,frame);
  poly(c,[[-16,-27],[-8,-31],[-7,-22],[-14,-18]],t.main);rivet(c,-10,-27);
  if(era===0){oval(c,21,-46,7,6,gradient(c,15,-52,27,-40,['#c6c9b0','#919b87','#55665b']),INK);}
}
function trebuchet(c: Ctx, side: number, frame: number): void {
  const t=TEAM[side], fire=frame===3;
  for(const [x,y]of[[-25,-4],[17,-12],[-4,5],[35,-4]])wheel(c,x,y,6,frame);
  box(c,3,-5,31,12,7,WOOD);
  for(const x of [-17,9]){limb(c,[[x-8,-5],[x+1,-58],[x+19,-13]],5,WOOD);line(c,[[x-7,-8],[x+12,-37]],'#d7bb84',1.5);}
  line(c,[[-18,-55],[14,-64]],'#31362d',7);line(c,[[-18,-57],[14,-66]],'#c0a06a',3.8);
  const tip:Point=fire?[35,-85]:[31,-34],tail:Point=fire?[-10,-37]:[-22,-80];
  limb(c,[tail,[-2,-58],tip],5.5,WOOD);box(c,tail[0],tail[1]+8,8,5,13,['#b4b19a','#7b7a64','#474d42']);
  line(c,[tip,[tip[0]+(fire?14:-4),tip[1]+(fire?-2:17)]],'#dacead',1.1);oval(c,tip[0]+(fire?14:-4),tip[1]+(fire?-2:17),4.5,3,fire?'#b1b8a0':'#453f30',INK,.6);
  line(c,[[-18,-25],[5,-32]],'#d1b687',2);poly(c,[[-16,-28],[-7,-31],[-7,-17],[-15,-14]],t.main);line(c,[[-14,-25],[-9,-26]],t.light,1);
  for(const [x,y]of[[-5,-56],[8,-19],[-17,-8]])rivet(c,x,y);
}
function cannon(c: Ctx, era: number, side: number, frame: number): void {
  const t=TEAM[side], industrial=era===5, fire=frame===3;
  wheel(c,-19,-9,10,frame,industrial);line(c,[[-28,-7],[9,-21]],'#4d513d',8);line(c,[[-28,-9],[9,-23]],'#a89865',4);
  poly(c,[[-8,-32],[13,-29],[21,-8],[-1,-9],[-15,-19]],gradient(c,-12,-32,20,-9,['#a6ae90','#6c8169','#3c574d']));
  const recoil=fire?-4:0;c.save();c.translate(recoil,0);
  const back:Point=[-9,-29],front:Point=industrial?[36,-57]:[37,-46];
  line(c,[back,front],INK,14);line(c,[back,front],gradient(c,-10,-43,14,-22,industrial?METAL:BRONZE),11);
  line(c,[[back[0]-1,back[1]-3],[front[0]-1,front[1]-3]],industrial?'#cad7ce':'#e8c78b',2);
  for(let n=0;n<3;n++){const x=front[0]-n*11,y=front[1]+n*(industrial?6.5:4);line(c,[[x-3,y-4],[x+2,y+5]],industrial?'#3d5558':'#675234',2);}
  oval(c,front[0],front[1],3.4,6.5,'#273c3d',industrial?'#b5c3b8':'#ddc28b',1.5);oval(c,front[0],front[1],1.7,4.3,'#10292e');
  if(fire)flash(c,front[0]+5,front[1]-3,false);c.restore();
  wheel(c,-5,1,12,frame,industrial);wheel(c,21,-11,10,frame,industrial);
  poly(c,[[-24,-18],[-16,-21],[-16,-13],[-24,-10]],t.main);line(c,[[-22,-17],[-18,-18]],t.light,1);
  if(industrial){poly(c,[[-15,-34],[7,-43],[12,-25],[-9,-17]],gradient(c,-15,-43,12,-17,METAL));line(c,[[-10,-31],[4,-36]],t.main,2);for(const [x,y]of[[-11,-31],[5,-36],[-5,-22]])rivet(c,x,y);}
}
function rockets(c: Ctx, side: number, frame: number): void {
  const t=TEAM[side];for(const[x,y]of[[-25,-8],[-5,-1],[22,-9]])wheel(c,x,y,7,frame,true);
  box(c,0,-11,35,13,13,['#a4b497','#68836a','#354e46']);
  poly(c,[[13,-25],[21,-43],[36,-35],[38,-17],[21,-7]],gradient(c,14,-42,38,-8,['#a7b79f','#698571','#354f47']));
  poly(c,[[24,-38],[33,-34],[34,-26],[21,-30]],'#28434a','#a3b9a4',.8);line(c,[[23,-35],[31,-32]],'#71968a',1);
  box(c,-9,-28,19,9,13,['#abb9a2','#526d5d','#2d473e']);
  c.save();c.translate(-5,-34);c.rotate(-.52);
  for(let row=0;row<2;row++)for(let col=0;col<4;col++){
    const x=-19+col*8,y=-13+row*8;
    poly(c,[[x,y],[x+7,y],[x+7,y+27],[x,y+27]],gradient(c,x,y,x+7,y,['#c9d0ae','#738b74','#364f48']));
    oval(c,x+3.5,y,3.3,2.6,'#1b3538','#b5c3a6',.7);oval(c,x+3.5,y,.9,1.2,'#b5a67d');
  }c.restore();
  poly(c,[[-30,-22],[-18,-17],[-18,-8],[-30,-13]],t.main);line(c,[[-28,-19],[-21,-16]],t.light,1);
  for(const[x,y]of[[-25,-1],[-5,6],[24,-2]])wheel(c,x,y,7.5,frame,true);
  line(c,[[15,-41],[14,-59]],'#adbdad',1);oval(c,14,-60,1.5,1.5,t.glow);
  if(frame===3){line(c,[[-10,-54],[5,-76]],'#f3e4bc',3);poly(c,[[3,-75],[8,-81],[8,-72]],'#ebd9ac');glow(c,-11,-52,12,10,'#ecbd76');}
}
function walker(c: Ctx, side: number, frame: number): void {
  const t=TEAM[side], stride=frame===1?1:frame===2?-1:0;
  for(const [x,y,s]of[[-23,-23,-1],[21,-28,1],[-8,-17,1],[25,-12,-1]]){
    const knee:Point=[x+s*8+stride*s*3,y+11],foot:Point=[x+s*8-stride*s*4,y+26];
    limb(c,[[x*.6,y-13],knee,foot],6,['#cbd9d2','#74909a','#314d61']);
    oval(c,knee[0],knee[1],4,4,'#284654','#abc5c3',1);oval(c,knee[0],knee[1],1.5,1.5,t.main);
    poly(c,[[foot[0]-6,foot[1]-3],[foot[0]+5,foot[1]-5],[foot[0]+10,foot[1]+1],[foot[0]+1,foot[1]+4],[foot[0]-7,foot[1]+2]],gradient(c,foot[0]-6,foot[1]-5,foot[0]+10,foot[1]+4,METAL));
  }
  box(c,0,-30,28,13,24,METAL);poly(c,[[-28,-54],[0,-70],[28,-54],[16,-43],[-14,-40]],gradient(c,-28,-70,28,-40,['#e3ece0','#a6bfc2','#527381']));
  poly(c,[[0,-70],[28,-54],[16,-43],[0,-49]],gradient(c,0,-70,28,-43,[t.light,t.main,t.dark]));
  poly(c,[[-14,-60],[-3,-66],[8,-59],[3,-52],[-11,-52]],'#284e5b');line(c,[[-10,-58],[3,-59]],t.glow,1.7);
  for(const x of [-20,17]){box(c,x,-46,7,4,12,['#b9cdcd','#577d8a','#284657']);line(c,[[x-2,-56],[x+2,-58]],t.glow,1.5);}
  // Twin long plasma rails, coolant rings and a central charged bore.
  line(c,[[8,-58],[42,-76]],'#173746',13);line(c,[[8,-61],[42,-79]],'#c6dfdc',4.4);line(c,[[10,-54],[44,-72]],'#819eab',4.5);
  for(let n=0;n<4;n++)line(c,[[18+n*6,-66-n*3],[23+n*6,-58-n*3]],t.main,2.1);
  oval(c,44,-76,5,7,'#214b58','#badbd4',1);oval(c,44,-76,2.5,4,t.glow);glow(c,44,-76,9,12,t.main);
  line(c,[[-22,-58],[-29,-78]],'#a2bec3',2);oval(c,-29,-80,3,2,t.glow);line(c,[[-14,-34],[-1,-29]],t.main,2);
  if(frame===3)flash(c,51,-80,true);
}

/** Frames: rest, left stride, right stride, attack. The ground point is (64, 100). */
export function drawUnit(c: Ctx, era: number, role: Role, side: number, frame: number): void {
  c.save();c.translate(64,UNIT_ORIGIN_Y);c.lineJoin='round';c.lineCap='round';
  era=Math.max(0,Math.min(7,era));side=side===0?0:1;frame=Math.max(0,Math.min(3,frame));
  const vehicle=role==='siege'||(role==='scout'&&era>0)||(role==='guard'&&era>=5);
  // Soft contact shadow is baked into the sprite, with a darker grounded center.
  const shadow=c.createRadialGradient(0,1,2,0,1,vehicle?38:21);shadow.addColorStop(0,'#071a204d');shadow.addColorStop(.55,'#071a2026');shadow.addColorStop(1,'#071a2000');
  oval(c,0,2,vehicle?40:22,vehicle?11:7,shadow);
  if(role==='siege'){
    if(era===0)stoneSledge(c,side,frame);else if(era===1)ram(c,side,frame);else if(era===2)ballista(c,2,side,frame);
    else if(era===3)trebuchet(c,side,frame);else if(era<6)cannon(c,era,side,frame);else if(era===6)rockets(c,side,frame);else walker(c,side,frame);
  }else if(role==='guard'&&era>=5){if(era===7)aegis(c,side,frame);else carrier(c,era,side,frame);}
  else if(role==='scout'&&era>0){if(era===1)chariot(c,side,frame);else if(era<6)horse(c,era,side,frame);else if(era===6)drone(c,side,frame);else skimmer(c,side,frame);}
  else soldier(c,era,role,side,frame);
  c.restore();
}

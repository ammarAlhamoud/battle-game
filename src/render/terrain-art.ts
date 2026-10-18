/**
 * Original, deterministic environment illustration. The map is painted once;
 * tall scenery is a separate atlas so soldiers can pass behind tree crowns.
 * No simulation information is used by either painter.
 */
type Ctx = CanvasRenderingContext2D;
type Point = { x: number; y: number };
export const TERRAIN_PROP_SIZE = 160;
export const TERRAIN_PROP_GROUND = { x: 80, y: 126 };

interface EnvironmentPalette {
  ground: string; light: string; dry: string; shade: string; earth: string;
  water: string; deepWater: string; foam: string; rock: string; rockLight: string;
  rockShade: string; bark: string; leaf: string; leafLight: string; leafShade: string;
  accent: string;
}

/** Each historical theatre has a distinct material and atmosphere. */
export const environmentPalettes: readonly EnvironmentPalette[] = [
  { ground:'#76875c',light:'#b0b17a',dry:'#b4a078',shade:'#43573d',earth:'#746348',water:'#46746f',deepWater:'#244b51',foam:'#b9d7bd',rock:'#7e8170',rockLight:'#b9b7a0',rockShade:'#4e594f',bark:'#63503a',leaf:'#577e45',leafLight:'#9eae5d',leafShade:'#2c4a36',accent:'#c9b17e' },
  { ground:'#a39760',light:'#c3b781',dry:'#d0ad76',shade:'#69764b',earth:'#8d6c47',water:'#478b86',deepWater:'#285d67',foam:'#d5e0bc',rock:'#ad9872',rockLight:'#d7c5a2',rockShade:'#776c53',bark:'#6f5539',leaf:'#6c8050',leafLight:'#b6b16d',leafShade:'#3d593f',accent:'#d9b275' },
  { ground:'#899368',light:'#b9bd8c',dry:'#b7a778',shade:'#526b49',earth:'#827455',water:'#4c8782',deepWater:'#2d5861',foam:'#cbddd0',rock:'#9c9b83',rockLight:'#d8d0b0',rockShade:'#686f60',bark:'#6d6049',leaf:'#6f8656',leafLight:'#b0b881',leafShade:'#3d5944',accent:'#d8c99a' },
  { ground:'#728467',light:'#a4af80',dry:'#a59b72',shade:'#3e5a48',earth:'#6c654a',water:'#446f73',deepWater:'#263f50',foam:'#b5d0c6',rock:'#879184',rockLight:'#bec0a5',rockShade:'#535e57',bark:'#66553f',leaf:'#4c7352',leafLight:'#8fa76b',leafShade:'#284937',accent:'#c7b881' },
  { ground:'#8a9266',light:'#bdbe87',dry:'#b8a17c',shade:'#576d4c',earth:'#837251',water:'#507e7b',deepWater:'#2b535e',foam:'#c5d9c9',rock:'#999d87',rockLight:'#c9c9ac',rockShade:'#666f61',bark:'#725b43',leaf:'#607f50',leafLight:'#a8b373',leafShade:'#354e3a',accent:'#d8bd86' },
  { ground:'#7b8069',light:'#acaf8e',dry:'#a49c81',shade:'#4e6251',earth:'#726856',water:'#4f7472',deepWater:'#304c52',foam:'#b7d0c3',rock:'#8b938b',rockLight:'#c0c3af',rockShade:'#57615c',bark:'#5d5244',leaf:'#566e55',leafLight:'#96a279',leafShade:'#354b3b',accent:'#bb9b6d' },
  { ground:'#748571',light:'#a7b18b',dry:'#a4a18a',shade:'#415d4e',earth:'#74715b',water:'#4b7d7b',deepWater:'#28515d',foam:'#b5d6c6',rock:'#87988e',rockLight:'#bdc8b4',rockShade:'#52685d',bark:'#645a49',leaf:'#50775a',leafLight:'#94ac78',leafShade:'#2d4e3e',accent:'#c5c6a0' },
  { ground:'#556e76',light:'#8a9a9b',dry:'#7f8e90',shade:'#304b59',earth:'#4b5c67',water:'#347087',deepWater:'#172e49',foam:'#89d7dd',rock:'#6c8492',rockLight:'#b4c7cc',rockShade:'#354e63',bark:'#344e60',leaf:'#447a7e',leafLight:'#8ac9bd',leafShade:'#234853',accent:'#85dfd8' },
];

const TAU = Math.PI * 2;
function random(x:number,y:number,seed:number):number {
  const n=Math.sin(x*127.1+y*311.7+seed*.173)*43758.5453;
  return n-Math.floor(n);
}
function shade(color:string,amount:number):string {
  const value=parseInt(color.slice(1),16),clamp=(n:number)=>Math.max(0,Math.min(255,Math.round(n)));
  return `rgb(${clamp((value>>16)+amount)},${clamp(((value>>8)&255)+amount)},${clamp((value&255)+amount)})`;
}
function polygon(ctx:Ctx,points:number[][],fill?:string|CanvasGradient,stroke?:string,width=1):void {
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function ellipse(ctx:Ctx,x:number,y:number,rx:number,ry:number,fill:string|CanvasGradient,angle=0):void {
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,TAU);ctx.fillStyle=fill;ctx.fill();
}
function line(ctx:Ctx,x:number,y:number,xx:number,yy:number,color:string,width=1):void {
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();
}
function radial(ctx:Ctx,x:number,y:number,r:number,inner:string,outer:string):CanvasGradient {
  const gradient=ctx.createRadialGradient(x-r*.2,y-r*.2,0,x,y,r);gradient.addColorStop(0,inner);gradient.addColorStop(1,outer);return gradient;
}
function diamond(ctx:Ctx,w:number,h:number):void {polygon(ctx,[[0,-h/2],[w/2,0],[0,h/2],[-w/2,0]]);}
function tileAt(map:string[],x:number,y:number):string|undefined {return map[y]?.[x];}

/** A connected, low-contrast surface, with no visible grid painted over it. */
export function paintTerrain(ctx:Ctx,map:string[],era:number,seed:number,project:(x:number,y:number)=>Point,tileWidth:number,tileHeight:number):void {
  const p=environmentPalettes[Math.max(0,Math.min(7,era))],rows=map.length,cols=map[0]?.length??0;
  const sx=tileWidth/64,sy=tileHeight/32;
  ctx.save();ctx.lineJoin='round';
  for(let diagonal=0;diagonal<cols+rows;diagonal++)for(let y=0;y<rows;y++) {
    const x=diagonal-y;if(x<0||x>=cols)continue;
    const pos=project(x,y),tile=map[y][x],r=random(x,y,seed);
    ctx.save();ctx.translate(pos.x,pos.y);ctx.scale(sx,sy);
    const slope=Math.sin(x*.19+y*.28+seed)*2.4+Math.sin(x*.51-y*.25)*1.8;
    const base=tile==='~'?p.water:tile==='^'?shade(p.dry,-5):tile==='#'?p.rock:tile==='f'?shade(p.ground,-5):shade(p.ground,slope);
    // One-pixel overlap removes subpixel cracks between rasterized neighbours.
    polygon(ctx,[[0,-16.75],[33.5,0],[0,16.75],[-33.5,0]],base);
    // Exposed map edges have a quiet, layered cross-section instead of a floating flat sheet.
    if(y===rows-1) {
      polygon(ctx,[[-32,0],[0,16],[0,31],[-32,15]],p.earth);
      line(ctx,-31,3,0,18,shade(p.earth,15),1.1);line(ctx,-29,10,0,25,shade(p.earth,-12),1);
    }
    if(x===cols-1) {
      polygon(ctx,[[32,0],[0,16],[0,31],[32,15]],shade(p.earth,-18));
      line(ctx,30,4,0,19,shade(p.earth,3),1);line(ctx,29,11,0,26,shade(p.earth,-27),1);
    }
    ctx.save();diamond(ctx,64.2,32.2);ctx.clip();
    // Broad washes are smoothly varying between cells, rather than unrelated tile colours.
    ctx.globalAlpha=.045;
    // Offset each translucent wash so repeated isometric diamonds never become a texture.
    const washX=(random(x,y,seed+63)-.5)*35,washY=(random(x,y,seed+26)-.5)*15;
    ellipse(ctx,washX,washY,39,21,radial(ctx,washX,washY,39,p.light,'#ffffff00'));
    ctx.globalAlpha=1;
    if(tile==='~')paintWater(ctx,map,x,y,era,seed,p);
    else {
      groundGrain(ctx,x,y,seed,p,tile,era);
      if(tile==='f')forestFloor(ctx,x,y,seed,p,era);
      if(tile==='^')hill(ctx,x,y,seed,p,era);
      if(tile==='#')cliffFloor(ctx,x,y,seed,p,era);
      // Islands and riverbanks have sand/mud on the land side of the water.
      for(const [dx,dy,a,b] of [[-1,0,[-32,0],[0,-16]],[0,-1,[0,-16],[32,0]],[1,0,[32,0],[0,16]],[0,1,[0,16],[-32,0]]] as [number,number,number[],number[]][]) {
        if(tileAt(map,x+dx,y+dy)!=='~')continue;
        line(ctx,a[0],a[1],b[0],b[1],`${p.earth}b0`,7);
        line(ctx,a[0]*.96,a[1]*.96,b[0]*.96,b[1]*.96,`${p.dry}9c`,3.5);
        for(let k=0;k<5;k++) {
          const t=(k+.2+random(x+k,y,seed)*.5)/5,xx=a[0]+(b[0]-a[0])*t,yy=a[1]+(b[1]-a[1])*t;
          ellipse(ctx,xx*.9,yy*.9,1.8,1,p.rockLight);
          if(era<7&&r>.4){line(ctx,xx*.8,yy*.8,xx*.8-1,yy*.8-4,p.leafShade,.65);line(ctx,xx*.8,yy*.8,xx*.8+2,yy*.8-3,p.leaf,.65);}
        }
      }
      if(era===7&&tile==='.')lunarDetails(ctx,x,y,seed,p);
    }
    ctx.restore();
    if(tile==='=')bridge(ctx,map,x,y,era,seed,p);
    if(tile==='g')gateFloor(ctx,map,x,y,era,p);
    if(tile==='c')coverFloor(ctx,x,y,seed,p,era);
    ctx.restore();
  }
  ctx.restore();
}

function groundGrain(ctx:Ctx,x:number,y:number,seed:number,p:EnvironmentPalette,tile:string,era:number):void {
  // Seeded irregular ground flecks: all detail is stable across frames and reloads.
  for(let n=0;n<33;n++) {
    const a=random(x*37+n,y*29,seed),b=random(x*13,y*19+n,seed+4),xx=(a-.5)*69,yy=(b-.5)*35;
    const light=n%3===0;ctx.globalAlpha=.12+random(x+n,y,seed+9)*.13;
    ellipse(ctx,xx,yy,.35+random(n+x,y,91)*1.4,.25+random(x,n+y,17)*.55,light?p.light:p.shade);
  }
  ctx.globalAlpha=1;
  if(era===1) {
    // Fine windblown sand and tiny scattered ochre stone.
    for(let n=0;n<4;n++) {
      const xx=(random(x+n,y,13)-.5)*55,yy=(random(x,y+n,23)-.5)*23;
      line(ctx,xx-5,yy+1,xx+5,yy-1,`${p.dry}45`,.6);
    }
  } else if(era!==7&&tile!=='#') {
    for(let n=0;n<7;n++) {
      const xx=(random(x*7+n,y,seed)-.5)*60,yy=(random(x,y*9+n,seed+31)-.5)*29;
      const h=1.5+random(n,y+x,seed)*3.2;
      line(ctx,xx,yy,xx-.8,yy-h,`${p.shade}70`,.6);
      line(ctx,xx,yy,xx+1.6,yy-h*.7,`${p.light}9c`,.6);
    }
    if(random(x,y,seed+77)>.93) {
      const flower=era===3?'#c8c0b7':era===4?'#e2cea0':'#dbd6ad';
      for(let n=0;n<3;n++){const xx=-8+n*3.7,yy=(n%2)*3;line(ctx,xx,yy,xx,yy-3,p.leafShade,.6);ellipse(ctx,xx,yy-3,1,.7,flower);}
    }
  }
  if(era===5&&random(x,y,seed+121)>.89) {
    // Industrial-era material is sparse and readable, not noise across every cell.
    line(ctx,-6,2,7,-3,'#675b49',1.4);line(ctx,-4,3,9,-2,'#a3a08a',.6);
    ellipse(ctx,4,6,3.5,1.4,'#575c5340');
  }
}

function paintWater(ctx:Ctx,map:string[],x:number,y:number,era:number,seed:number,p:EnvironmentPalette):void {
  const edges:[number,number,number[],number[]][]=[[-1,0,[-32,0],[0,-16]],[0,-1,[0,-16],[32,0]],[1,0,[32,0],[0,16]],[0,1,[0,16],[-32,0]]];
  const nearBank=edges.some(([dx,dy])=>{const t=tileAt(map,x+dx,y+dy);return t!==undefined&&t!=='~'&&t!=='=';});
  const wash=ctx.createLinearGradient(-20,-15,24,18);wash.addColorStop(0,nearBank?p.water:p.deepWater);wash.addColorStop(1,p.water);
  polygon(ctx,[[-32,0],[0,-16],[32,0],[0,16]],wash);
  ctx.globalAlpha=.055;
  const washX=(random(x,y,seed+21)-.5)*26,washY=(random(x,y,seed+71)-.5)*10;
  ellipse(ctx,washX,washY,37,13,radial(ctx,washX,washY,37,p.foam,'#ffffff00'));ctx.globalAlpha=1;
  for(let n=0;n<11;n++) {
    const xx=(random(x*11+n,y*7,seed)-.5)*68,yy=(random(x,y*13+n,seed+1)-.5)*33;
    const width=3+random(n+x,y,seed)*11;
    ctx.beginPath();ctx.moveTo(xx,yy);ctx.bezierCurveTo(xx+width*.25,yy-1.1,xx+width*.7,yy+1.1,xx+width,yy-.5);
    ctx.strokeStyle=n%3===0?`${p.foam}7a`:`${p.foam}35`;ctx.lineWidth=n%3===0?.8:.6;ctx.stroke();
  }
  for(const [dx,dy,a,b] of edges) {
    const neighbor=tileAt(map,x+dx,y+dy);if(!neighbor||neighbor==='~'||neighbor==='=')continue;
    line(ctx,a[0],a[1],b[0],b[1],`${p.foam}75`,4.3);
    line(ctx,a[0]*.92,a[1]*.92,b[0]*.92,b[1]*.92,`${p.foam}b0`,.75);
    for(let k=0;k<6;k++) {
      const t=(k+random(x+k,y,seed))/6,xx=a[0]+(b[0]-a[0])*t,yy=a[1]+(b[1]-a[1])*t;
      ellipse(ctx,xx*.88,yy*.88,1.1,.5,`${p.foam}9c`);
    }
  }
  if(era===7) {
    // Cooling pools catch the habitat lights rather than behaving like grassland rivers.
    line(ctx,-17,-3,1,-7,'#7ad5e46e',1.1);line(ctx,2,4,19,0,'#a6eff15e',.9);
    ellipse(ctx,-11,3,2.5,.7,'#70cbf09c');
  }
}

function forestFloor(ctx:Ctx,x:number,y:number,seed:number,p:EnvironmentPalette,era:number):void {
  ellipse(ctx,3,1,31,14,radial(ctx,3,1,31,`${p.leafShade}8c`,`${p.leafShade}00`));
  for(let n=0;n<15;n++) {
    const xx=(random(x+n,y,seed+41)-.5)*58,yy=(random(x,y+n,seed+83)-.5)*26;
    ellipse(ctx,xx,yy,2.5+random(x+n,y,seed)*2,1.2,`${n%3?p.leaf:p.leafLight}65`,-.4);
    if(n%4===0) {
      line(ctx,xx,yy,xx-2.5,yy-5,p.leafShade,.7);
      line(ctx,xx-1.5,yy-2.5,xx-4,yy-2.4,p.leaf,.7);
      line(ctx,xx-1.5,yy-2.5,xx+1,yy-4,p.leafLight,.65);
    }
  }
  if(era===7) {
    for(let n=0;n<3;n++) {
      const xx=(random(x+n,y,seed)-.5)*38,yy=(random(x,y+n,seed)-.5)*15;
      polygon(ctx,[[xx-3,yy],[xx-1,yy-6],[xx+2,yy-8],[xx+4,yy-2],[xx,yy+1]],p.leaf,'#80b9b05c',.5);
    }
  }
}

function hill(ctx:Ctx,x:number,y:number,seed:number,p:EnvironmentPalette,era:number):void {
  // Walkable rolling relief stays lower than the blocking rock ridge silhouette.
  const n=random(x,y,seed),top=-10-n*3;
  const wash=ctx.createLinearGradient(-15,-14,19,11);wash.addColorStop(0,shade(p.light,-4));wash.addColorStop(.5,p.dry);wash.addColorStop(1,shade(p.earth,-2));
  ctx.beginPath();ctx.moveTo(-34,8);ctx.bezierCurveTo(-24,-2,-13,top-4,-2,top);ctx.bezierCurveTo(11,top-7,23,0,35,5);ctx.lineTo(15,19);ctx.lineTo(-13,20);ctx.closePath();ctx.fillStyle=wash;ctx.fill();
  for(let k=0;k<3;k++) {
    ctx.beginPath();ctx.moveTo(-26+k*3,5+k*3);ctx.bezierCurveTo(-9,-8+k*4,8,-6+k*4,26,3+k*3);ctx.strokeStyle=`${p.light}${k===0?'9c':'55'}`;ctx.lineWidth=.75;ctx.stroke();
  }
  for(let k=0;k<4;k++) {
    const xx=5+k*5,yy=3+k*1.5;
    line(ctx,xx,yy,xx+3,yy-2,`${p.rockShade}55`,.8);
  }
  if(era===7) {
    ctx.strokeStyle='#b8d1d35c';ctx.lineWidth=.6;ctx.beginPath();ctx.ellipse(-1,-1,12,5,-.2,.2,3.5);ctx.stroke();
  }
}

function cliffFloor(ctx:Ctx,x:number,y:number,seed:number,p:EnvironmentPalette,era:number):void {
  for(let k=0;k<8;k++) {
    const xx=(random(x+k,y,seed+14)-.5)*53,yy=(random(x,y+k,seed+2)-.5)*23;
    polygon(ctx,[[xx-4,yy],[xx-2,yy-2],[xx+3,yy-1],[xx+5,yy+2],[xx,yy+3]],k%2?p.rock:p.rockShade);
    line(ctx,xx-3,yy,xx+1,yy-1,p.rockLight,.5);
  }
  if(era===7)line(ctx,-20,4,-2,-5,'#93b4c04d',.8);
}

function coverFloor(ctx:Ctx,x:number,y:number,seed:number,p:EnvironmentPalette,era:number):void {
  // Disturbed earth under defensive structures remains visible around the atlas prop.
  ellipse(ctx,0,1,30,10,radial(ctx,0,1,30,`${p.earth}ad`,`${p.earth}00`));
  for(let k=0;k<8;k++) {
    const xx=(random(x+k,y,seed)-.5)*44,yy=(random(x,y+k,seed)-.5)*16;
    line(ctx,xx,yy,xx+2,yy-1,k%2?`${p.dry}ad`:`${p.rockShade}75`,1);
  }
  if(era>=5){line(ctx,-18,5,8,-8,`${p.rockLight}75`,.8);line(ctx,-14,7,13,-6,`${p.rockShade}75`,.8);}
}

function gateFloor(ctx:Ctx,map:string[],x:number,y:number,era:number,p:EnvironmentPalette):void {
  const horizontal=tileAt(map,x-1,y)==='g'||tileAt(map,x+1,y)==='g';
  ctx.save();if(!horizontal)ctx.scale(-1,1);
  polygon(ctx,[[-28,-2],[1,-16],[30,-1],[1,14]],shade(p.earth,15));
  for(let n=0;n<6;n++) {
    const xx=-21+n*8,yy=-1+n*.2;
    polygon(ctx,[[xx-3,yy],[xx+4,yy-3],[xx+9,yy],[xx+2,yy+3]],era<5?shade(p.rock,7+n%2*6):p.rockShade,`${p.rockShade}6b`,.5);
  }
  ctx.restore();
}

function bridge(ctx:Ctx,map:string[],x:number,y:number,era:number,seed:number,p:EnvironmentPalette):void {
  const acrossX=tileAt(map,x-1,y)==='~'||tileAt(map,x+1,y)==='~';
  ctx.save();if(!acrossX)ctx.scale(-1,1);
  // Deck geometry follows the actual crossing. Adjacent deck tiles share a continuous edge.
  const timber=era<2?'#9b7950':era<5?'#8f7955':'#718583';
  const deck=ctx.createLinearGradient(-25,-12,28,13);deck.addColorStop(0,shade(timber,30));deck.addColorStop(1,shade(timber,-10));
  polygon(ctx,[[-33,-1],[0,-17],[33,-1],[0,16]],deck);
  polygon(ctx,[[-33,-1],[0,16],[0,21],[-33,4]],shade(timber,-22));
  polygon(ctx,[[33,-1],[0,16],[0,21],[33,4]],shade(timber,-35));
  for(let k=0;k<9;k++) {
    const t=(k+.5)/9,xx=-31+62*t,yy=-Math.min(t,1-t)*30;
    line(ctx,xx,yy,xx+29,yy+14,shade(timber,-26),.8);
    line(ctx,xx+.9,yy+.5,xx+29.9,yy+14.5,shade(timber,18),.5);
    if(era<5) {
      const rr=random(x+k,y,seed);line(ctx,xx+7,yy+5,xx+15+rr*6,yy+9+rr*3,shade(timber,-10),.5);
      ellipse(ctx,xx+3,yy+2,.65,.45,'#514d43');ellipse(ctx,xx+25,yy+13,.65,.45,'#514d43');
    }
  }
  // Ropes and pegs sit low; units remain readable at a crossing.
  for(const [ax,ay,bx,by] of [[-32,-1,0,-17],[0,16,32,-1]]) {
    const beam=era===7?'#95b6bb':era>=5?'#71847d':'#6b593e';
    line(ctx,ax,ay-2,bx,by-2,shade(timber,20),2);
    for(let n=0;n<3;n++) {
      const t=n/2,xx=ax+(bx-ax)*t,yy=ay+(by-ay)*t;
      line(ctx,xx,yy,xx,yy-8,beam,2);ellipse(ctx,xx-.4,yy-8,1.3,.65,shade(timber,29));
    }
    ctx.beginPath();ctx.moveTo(ax,ay-7);ctx.quadraticCurveTo((ax+bx)/2,(ay+by)/2-3,bx,by-7);
    ctx.strokeStyle=era===7?'#84dbe4':'#c2ae7c';ctx.lineWidth=.9;ctx.stroke();
  }
  if(era===7){line(ctx,-29,-2,-1,-16,'#7ce4df',1.1);line(ctx,1,15,30,0,'#7ce4df',1.1);}
  ctx.restore();
}

function lunarDetails(ctx:Ctx,x:number,y:number,seed:number,p:EnvironmentPalette):void {
  const r=random(x,y,seed+191);
  if(r>.71) {
    const xx=(random(x,y,seed+3)-.5)*26,yy=(random(x,y,seed+9)-.5)*11,rx=3+r*5;
    ellipse(ctx,xx,yy,rx,rx*.43,'#2d485a4d');
    ctx.beginPath();ctx.ellipse(xx,yy,rx,rx*.43,0,Math.PI*.85,Math.PI*1.95);ctx.strokeStyle='#b2c4c65c';ctx.lineWidth=1;ctx.stroke();
    ctx.beginPath();ctx.ellipse(xx,yy+1,rx*.7,rx*.28,0,.1,2.8);ctx.strokeStyle='#3045526b';ctx.lineWidth=.8;ctx.stroke();
  }
  if(r<.08){line(ctx,-15,1,-2,-5,'#2c485675',.8);line(ctx,-2,-5,4,-3,'#2c485675',.8);line(ctx,4,-3,14,-8,'#2c485675',.8);}
}

/** Draw one prop at (80,126) inside a 160px atlas cell. No global transforms leak. */
export function paintTerrainProp(ctx:Ctx,era:number,kind:number,variant=0):void {
  const p=environmentPalettes[Math.max(0,Math.min(7,era))];
  ctx.save();ctx.translate(TERRAIN_PROP_GROUND.x,TERRAIN_PROP_GROUND.y);ctx.lineJoin='round';
  if(kind<=2)tree(ctx,era,kind,variant,p);
  else if(kind===3)rockCluster(ctx,era,variant,p);
  else if(kind===4)cover(ctx,era,p);
  else if(kind===5)gate(ctx,era,p);
  else if(kind===6)barrier(ctx,era,p);
  else watchPost(ctx,era,p);
  ctx.restore();
}

function tree(ctx:Ctx,era:number,kind:number,variant:number,p:EnvironmentPalette):void {
  const seed=era*71+kind*19+variant*113;
  const tall=kind===1,h=tall?87:kind===0?70:57;
  ellipse(ctx,8,4,tall?26:29,9,radial(ctx,8,4,29,'#142c2b79','#142c2b00'));
  if(era===7){alienGrowth(ctx,kind,seed,p);return;}
  // Roots, rough bark, and individually lit branch forks remain visible below the crown.
  polygon(ctx,[[-5,1],[-3,-h*.63],[1,-h*.8],[5,-h*.58],[4,-3],[12,3],[2,1],[-10,4]],p.bark);
  line(ctx,-2,-2,-1,-h*.63,shade(p.bark,23),1.8);
  line(ctx,2,-5,3,-h*.52,shade(p.bark,-24),1.1);
  for(let n=0;n<5;n++){const yy=-10-n*7;line(ctx,-2,yy,1,yy-2,shade(p.bark,-12),.6);}
  const acacia=era===1;
  if(tall&&!acacia&&(era===3||era===5||era===6)) {pine(ctx,h,seed,p);return;}
  const crownY=-h*.73,spread=acacia?36:kind===2?29:32,vertical=acacia?17:kind===2?21:27;
  for(const [xx,yy] of [[-20,crownY+9],[20,crownY+8],[-9,crownY-12],[10,crownY-14]]) {
    line(ctx,0,-h*.46,xx,yy,shade(p.bark,-4),3);line(ctx,0,-h*.46,xx-1,yy-1,shade(p.bark,20),.8);
  }
  // Overlapping organic lobes, using a top-left light source throughout the world.
  const lobes:[number,number,number,number][]=[[-spread*.64,crownY+5,spread*.55,vertical*.8],[spread*.58,crownY+5,spread*.58,vertical*.86],[0,crownY-vertical*.48,spread*.67,vertical*.91],[-spread*.12,crownY+8,spread*.71,vertical*.72]];
  for(let i=0;i<lobes.length;i++) {
    const [xx,yy,rx,ry]=lobes[i];
    ellipse(ctx,xx+2,yy+3,rx+1,ry+1,shade(p.leafShade,-5));
    const gradient=ctx.createRadialGradient(xx-rx*.4,yy-ry*.4,1,xx,yy,rx*1.13);
    gradient.addColorStop(0,shade(p.leafLight,i===2?3:-10));gradient.addColorStop(.48,p.leaf);gradient.addColorStop(1,p.leafShade);
    ellipse(ctx,xx,yy,rx,ry,gradient);
    // Directional leaf groups make the crown look painted, not like a flat circle.
    for(let k=0;k<45;k++) {
      const a=random(k+i*31,seed,12)*TAU,rad=Math.sqrt(random(k,seed+i,16))*.95;
      const lx=xx+Math.cos(a)*rx*rad,ly=yy+Math.sin(a)*ry*rad;
      const light=(-Math.cos(a)-Math.sin(a))*.5;
      ctx.globalAlpha=.22+random(k,seed,8)*.38;
      ellipse(ctx,lx,ly,1.6+random(k,seed,3)*2.8,.9+random(k,seed,9)*1.5,light>0?p.leafLight:p.leafShade,-.55);
    }
    ctx.globalAlpha=1;
  }
  // Tiny sparse edge leaves break the mechanically perfect ellipse silhouette.
  for(let n=0;n<22;n++) {
    const a=n/22*TAU,xx=Math.cos(a)*spread*.94,yy=crownY+Math.sin(a)*vertical;
    ellipse(ctx,xx,yy,1.5+random(n,seed,18)*2.1,1.4,p.leaf,-.4);
  }
  for(let n=0;n<3;n++)fern(ctx,-13+n*12,3+Math.abs(n-1)*2,5+n%2,p);
  if(kind===2&&era===2) {
    for(let n=0;n<9;n++){const xx=(random(n,seed,1)-.5)*43,yy=crownY+(random(n,seed,4)-.5)*22;ellipse(ctx,xx,yy,1,1.4,'#5d5742');}
  }
}

function pine(ctx:Ctx,h:number,seed:number,p:EnvironmentPalette):void {
  // Layered bough clusters follow a conifer silhouette without repeating triangle glyphs.
  for(let layer=0;layer<6;layer++) {
    const yy=-h+layer*10,spread=6+layer*4.6;
    const gradient=ctx.createLinearGradient(-spread,yy-6,spread,yy+13);gradient.addColorStop(0,shade(p.leafLight,-6));gradient.addColorStop(.4,p.leaf);gradient.addColorStop(1,p.leafShade);
    ctx.beginPath();ctx.moveTo(0,yy-9);
    ctx.bezierCurveTo(-spread*.2,yy-2,-spread*.7,yy+4,-spread,yy+9);
    ctx.quadraticCurveTo(-spread*.65,yy+10,-spread*.42,yy+7);
    ctx.quadraticCurveTo(-spread*.52,yy+14,-spread*.23,yy+11);
    ctx.quadraticCurveTo(0,yy+17,spread*.3,yy+11);
    ctx.quadraticCurveTo(spread*.56,yy+14,spread*.5,yy+8);
    ctx.quadraticCurveTo(spread*.8,yy+11,spread,yy+8);
    ctx.bezierCurveTo(spread*.6,yy+1,spread*.3,yy-2,0,yy-9);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
    for(let k=0;k<15;k++) {
      const xx=(random(k+layer*15,seed,11)-.5)*spread*1.6,y=yy+4+random(k,seed+layer,16)*6;
      line(ctx,xx,y,xx-3,y+1.8,k%3===0?`${p.leafLight}ad`:`${p.leafShade}80`,.65);
    }
  }
  fern(ctx,-13,3,6,p);fern(ctx,10,3,4,p);
}

function fern(ctx:Ctx,x:number,y:number,size:number,p:EnvironmentPalette):void {
  for(let n=-2;n<=2;n++) {
    const xx=x+n*size*.5,yy=y-size+Math.abs(n)*1.1;
    line(ctx,x,y,xx,yy,p.leafShade,.75);
    line(ctx,x+n*size*.26,y-size*.45,xx-1,yy+2,p.leaf,.7);
    line(ctx,x+n*size*.25,y-size*.52,xx+1.5,yy+1,p.leafLight,.6);
  }
}

function alienGrowth(ctx:Ctx,kind:number,seed:number,p:EnvironmentPalette):void {
  // Mineral gardens and bioluminescent antenna plants give space its own ecology.
  const crystals=kind===2;
  if(crystals) {
    for(let k=0;k<7;k++) {
      const xx=(k-3)*7,yy=(Math.abs(k-3)%2)*3,h=17+random(k,seed,6)*35;
      polygon(ctx,[[xx-6,yy],[xx-5,yy-h*.65],[xx+1,yy-h],[xx+6,yy-h*.6],[xx+5,yy],[xx,yy+3]],p.leaf);
      polygon(ctx,[[xx+1,yy-h],[xx+6,yy-h*.6],[xx+5,yy],[xx,yy+3],[xx,yy-h*.5]],p.leafShade);
      polygon(ctx,[[xx-5,yy-h*.65],[xx+1,yy-h],[xx,yy-h*.5],[xx-6,yy]],p.leafLight);
      line(ctx,xx-4,yy-h*.62,xx,yy-h+2,'#b4fff05c',1);
      ellipse(ctx,xx,yy,8,3,'#6dd9db15');
    }
    return;
  }
  for(let k=0;k<5;k++) {
    const xx=(k-2)*10,yy=-4+Math.abs(k-2)*2,h=35+random(k,seed,5)*31;
    ctx.beginPath();ctx.moveTo(xx,yy);ctx.bezierCurveTo(xx+8,yy-h*.3,xx-8,yy-h*.6,xx+3,yy-h);ctx.strokeStyle=p.bark;ctx.lineWidth=3;ctx.stroke();
    const gradient=ctx.createRadialGradient(xx-3,yy-h-4,1,xx+2,yy-h,14);gradient.addColorStop(0,p.leafLight);gradient.addColorStop(.6,p.leaf);gradient.addColorStop(1,p.leafShade);
    ellipse(ctx,xx+3,yy-h,14,6,gradient,-.2);
    line(ctx,xx-7,yy-h,xx+9,yy-h-3,'#8ff0dd9c',.7);
    ellipse(ctx,xx+2,yy-h-2,3,1,'#b9f9d8');
  }
  ellipse(ctx,0,3,25,5,'#77d9cd15');
}

function rockCluster(ctx:Ctx,era:number,variant:number,p:EnvironmentPalette):void {
  ellipse(ctx,5,3,37,11,radial(ctx,5,3,37,'#1f303b80','#1f303b00'));
  const rocks:[number,number,number,number][]=[[-22,0,23,29],[12,0,29,43],[32,7,14,19],[-7,10,20,18]];
  for(let n=0;n<rocks.length;n++) {
    const [x,y,w,h]=rocks[n],j=random(n,era,variant+17)*4;
    const left=[x-w,y-3],peak=[x-w*.26,y-h],right=[x+w*.7,y-h*.57],foot=[x+w,y+2];
    const top=ctx.createLinearGradient(x-w,y-h,x+w,y);top.addColorStop(0,p.rockLight);top.addColorStop(.5,p.rock);top.addColorStop(1,shade(p.rock,-8));
    polygon(ctx,[left,[x-w*.85,y-h*.41],[x-w*.63,y-h*.8],peak,[x+w*.23,y-h-j],[x+w*.5,y-h*.87],right,[x+w*.83,y-h*.2],foot,[x+w*.36,y+8],[x,y+10]],top);
    polygon(ctx,[[x,y-h*.6],[x+w*.23,y-h-j],[x+w*.5,y-h*.87],right,[x+w*.83,y-h*.2],foot,[x+w*.36,y+8],[x,y+10],[x-w*.1,y-8]],p.rockShade);
    polygon(ctx,[[x-w*.85,y-h*.41],[x-w*.63,y-h*.8],peak,[x+w*.23,y-h-j],[x,y-h*.6],[x-w*.3,y-h*.47]],shade(p.rockLight,5));
    line(ctx,x-w*.67,y-h*.58,x-w*.24,y-h+1,shade(p.rockLight,15),.9);
    // Horizontal strata, irregular fracture, and chips are readable when zoomed in.
    for(let k=0;k<3;k++) {
      const yy=y-h*.18-k*h*.18;
      line(ctx,x-w*.72+k*2,yy,x-w*.1,yy+2,`${p.rockShade}80`,.7);
      line(ctx,x+2,yy+3,x+w*.7-k*1.5,yy-3,`${p.rockLight}35`,.65);
    }
    ctx.beginPath();ctx.moveTo(x-w*.16,y-h*.65);ctx.lineTo(x-w*.22,y-h*.43);ctx.lineTo(x+1,y-h*.29);ctx.lineTo(x-2,y-h*.1);ctx.strokeStyle=`${p.rockShade}ad`;ctx.lineWidth=.8;ctx.stroke();
    if(era!==7){ellipse(ctx,x-w*.4,y-2,w*.35,2.5,`${p.leaf}9c`);ellipse(ctx,x-w*.6,y-h*.25,3,1.3,`${p.leafLight}75`);}
    else {line(ctx,x-w*.3,y-h*.65,x-w*.1,y-h*.5,'#88c2c56b',1);}
  }
  for(let k=0;k<7;k++){const xx=-36+k*12,yy=9+(k%3)*2;polygon(ctx,[[xx,yy],[xx+2,yy-3],[xx+6,yy-2],[xx+7,yy+1],[xx+3,yy+2]],k%2?p.rock:p.rockShade);}
}

function stone(ctx:Ctx,x:number,y:number,w:number,h:number,p:EnvironmentPalette):void {
  const gradient=ctx.createLinearGradient(x-w,y-h,x+w,y);gradient.addColorStop(0,p.rockLight);gradient.addColorStop(1,p.rock);
  polygon(ctx,[[x-w,y-h*.7],[x-w*.3,y-h],[x+w*.75,y-h*.8],[x+w,y],[x-w*.1,y+2],[x-w,y]],gradient,`${p.rockShade}b0`,.6);
  line(ctx,x-w*.7,y-h*.65,x+w*.6,y-h*.75,shade(p.rockLight,10),.7);
}

function cover(ctx:Ctx,era:number,p:EnvironmentPalette):void {
  ellipse(ctx,2,4,39,9,'#1d342e42');
  if(era<5) {
    // Interlocked dry-stone wall: individual faces, capstones, chips and moss.
    for(let row=0;row<3;row++)for(let k=0;k<5;k++) {
      const x=-28+k*14+(row%2)*5,y=3-row*5-Math.abs(k-2)*1.3;
      stone(ctx,x,y,8.5,7,p);
    }
    for(let k=0;k<5;k++){const x=-28+k*14;stone(ctx,x,-14-Math.abs(k-2)*1.3,9,4,{...p,rock:shade(p.rock,8)});}
    if(era!==1)for(let k=0;k<7;k++)ellipse(ctx,-27+k*9,-3+(k%2)*5,4,1.5,`${p.leaf}80`);
  } else if(era<7) {
    for(let row=0;row<3;row++)for(let k=0;k<5;k++) {
      const x=-29+k*14+(row%2)*5,y=2-row*5;
      const gradient=ctx.createLinearGradient(x-6,y-5,x+5,y+2);gradient.addColorStop(0,'#b9b28e');gradient.addColorStop(1,'#77785f');
      ellipse(ctx,x,y,8,4,gradient,-.1);line(ctx,x-4,y-2,x+3,y-2,'#d3c6a475',.6);
      line(ctx,x+5,y-2,x+5,y+1,'#585e4f75',.6);
    }
    for(const x of [-34,37]){line(ctx,x,1,x,-12,'#655b49',2.2);ellipse(ctx,x,-12,1.8,.7,'#a9a386');}
  } else {
    for(let k=0;k<4;k++) {
      const x=-28+k*18;
      polygon(ctx,[[x-8,1],[x-8,-17],[x,-21],[x+8,-17],[x+8,1],[x,5]],p.rockShade);
      polygon(ctx,[[x-8,-17],[x,-21],[x+8,-17],[x,-13]],p.rockLight);
      polygon(ctx,[[x-8,-17],[x,-13],[x,5],[x-8,1]],p.rock);
      line(ctx,x-5,-8,x-1,-6,'#a6e7d9',1.2);line(ctx,x+2,-5,x+5,-7,'#7fcad4',1.1);
    }
  }
}

function gate(ctx:Ctx,era:number,p:EnvironmentPalette):void {
  ellipse(ctx,4,4,40,9,'#23382d30');
  const modern=era>=5;
  for(const x of [-30,30]) {
    if(era<3) {
      line(ctx,x,0,x,-36,p.bark,6);line(ctx,x-1,-1,x-1,-35,shade(p.bark,30),1.4);
      polygon(ctx,[[x-5,-33],[x,-42],[x+5,-33]],p.dry);
      for(const y of [-10,-26]){line(ctx,x-4,y,x+4,y,shade(p.bark,-18),1.3);}
    } else {
      polygon(ctx,[[x-7,1],[x-7,-30],[x,-34],[x+7,-30],[x+7,1],[x,5]],p.rockShade);
      polygon(ctx,[[x-7,-30],[x,-34],[x+7,-30],[x,-26]],p.rockLight);
      polygon(ctx,[[x-7,-30],[x,-26],[x,5],[x-7,1]],p.rock);
      for(let k=0;k<4;k++){line(ctx,x-6,-3-k*7,x,-1-k*7,shade(p.rockShade,4),.65);line(ctx,x,-1-k*7,x+6,-3-k*7,shade(p.rockLight,-12),.65);}
    }
  }
  if(modern) {
    line(ctx,-27,-27,27,-27,p.rockLight,4);
    for(let k=-3;k<=3;k++){line(ctx,k*7,-27,k*7,-20,k%2?'#e4c38a':'#415550',3.5);}
    for(const x of [-31,31])ellipse(ctx,x,-35,2,2,era===7?'#a8f2e2':'#deb678');
  } else {
    line(ctx,-30,-32,30,-32,p.bark,5);line(ctx,-29,-33,29,-33,shade(p.bark,25),1.1);
    if(era>=3){line(ctx,-27,-27,27,-27,p.rockShade,3);for(let k=-3;k<=3;k++)line(ctx,k*7,-28,k*7,-19,'#6b7161',1.1);}
  }
}

function barrier(ctx:Ctx,era:number,p:EnvironmentPalette):void {
  cover(ctx,era,p);
  if(era<5)for(let k=0;k<4;k++){
    const x=-25+k*16;line(ctx,x,0,x+5,-24,p.bark,3);polygon(ctx,[[x+2,-23],[x+6,-29],[x+7,-22]],shade(p.bark,35));
    line(ctx,x+1,-3,x+5,-22,shade(p.bark,25),.65);
  }
}

function watchPost(ctx:Ctx,era:number,p:EnvironmentPalette):void {
  ellipse(ctx,4,4,24,8,'#1831274a');
  if(era<5) {
    for(const x of [-13,13]){line(ctx,x,2,x,-50,p.bark,5);line(ctx,x-1,1,x-1,-49,shade(p.bark,25),.8);}
    line(ctx,-13,-4,13,-42,shade(p.bark,10),2.5);line(ctx,13,-4,-13,-42,shade(p.bark,-8),2.5);
    polygon(ctx,[[-22,-48],[0,-58],[22,-48],[0,-38]],shade(p.bark,31));
    polygon(ctx,[[-22,-48],[0,-38],[0,-31],[-22,-41]],shade(p.bark,-5));
    polygon(ctx,[[0,-38],[22,-48],[22,-41],[0,-31]],shade(p.bark,-21));
    for(let k=-2;k<=2;k++){const x=k*8;line(ctx,x,-39-Math.abs(x)*.45,x,-56-Math.abs(x)*.45,p.bark,2);}
    polygon(ctx,[[-27,-64],[0,-82],[27,-64],[0,-51]],era===1?'#b69a67':shade(p.leafShade,-6));
    polygon(ctx,[[0,-82],[27,-64],[0,-51]],shade(p.leafShade,-20));
    line(ctx,-27,-64,0,-82,shade(p.dry,14),1);
  } else {
    for(const x of [-13,13]){line(ctx,x,2,x,-54,p.rockShade,4);line(ctx,x,-2,-x,-49,p.rock,1.3);}
    polygon(ctx,[[-23,-50],[0,-62],[23,-50],[0,-39]],p.rockLight);
    polygon(ctx,[[-23,-50],[0,-39],[0,-27],[-23,-38]],p.rock);
    polygon(ctx,[[0,-39],[23,-50],[23,-38],[0,-27]],p.rockShade);
    polygon(ctx,[[-18,-54],[0,-64],[18,-54],[0,-44]],p.rockShade);
    line(ctx,0,-59,0,-89,p.rockLight,2);line(ctx,-13,-76,14,-76,p.rock,1.4);
    ellipse(ctx,0,-89,2.2,2.2,era===7?'#9af8df':'#d7bf8b');
    if(era===7){line(ctx,-19,-48,-3,-40,'#93f0dd',1.3);line(ctx,3,-40,18,-48,'#93f0dd',1.3);}
  }
}

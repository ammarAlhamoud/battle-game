/**
 * Original isometric architecture for all eight ages. These painters run only
 * while the texture atlas is built: material detail has no per-frame cost.
 * World coordinates use a shared perspective so stairs, roofs and masonry align.
 */
export const ARCHITECTURE_SIZE = 256;
type Ctx = CanvasRenderingContext2D;
type Point = [number, number];
type Surface = string | CanvasGradient | [string, string];
interface Material { top: string; light: string; dark: string; edge: string; seam: string }
const P = (x: number, y: number, z = 0): Point => [(x - y) * .82, (x + y) * .39 - z];
const STONE: Material = { top:'#dbd2b4', light:'#b9ae8d', dark:'#817f70', edge:'#53564d', seam:'#827c6590' };
const CLAY: Material = { top:'#d8b788', light:'#bd9468', dark:'#897050', edge:'#675140', seam:'#805f4190' };
const MARBLE: Material = { top:'#ece2c6', light:'#dbcfaf', dark:'#a49e8e', edge:'#77796d', seam:'#9a947b80' };
const TIMBER: Material = { top:'#bca47b', light:'#927a54', dark:'#66583e', edge:'#493d2e', seam:'#68533790' };
const BRICK: Material = { top:'#b39579', light:'#a66f56', dark:'#735248', edge:'#4b4440', seam:'#d0ad8b80' };
const CONCRETE: Material = { top:'#b8bdaf', light:'#939d92', dark:'#586d68', edge:'#3e504e', seam:'#596c6270' };
const ALLOY: Material = { top:'#d0dcd5', light:'#a6bfb8', dark:'#557c80', edge:'#31565e', seam:'#3d6e7170' };
const SLATE: [string,string] = ['#73868b','#3e5664'];
const COPPER: [string,string] = ['#73988c','#416f68'];
const THATCH: [string,string] = ['#d8c18a','#8d7952'];
const METAL: [string,string] = ['#8c9fa3','#4b6069'];

function polygon(c: Ctx, points: Point[], fill: Surface, outline = '#243d393b', width = .7): void {
  c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath();
  if(Array.isArray(fill)) {
    const ys=points.map(p=>p[1]), xs=points.map(p=>p[0]);
    const g=c.createLinearGradient(Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)+1);
    g.addColorStop(0,fill[0]);g.addColorStop(1,fill[1]);c.fillStyle=g;
  } else c.fillStyle=fill;
  c.fill();if(outline){c.strokeStyle=outline;c.lineWidth=width;c.lineJoin='round';c.stroke();}
}
function stroke(c: Ctx, a: Point, b: Point, color: string, width = 1): void {
  c.beginPath();c.moveTo(...a);c.lineTo(...b);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();
}
function oval(c: Ctx, x:number,y:number,rx:number,ry:number,fill:Surface,outline=''):void {
  c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  if(Array.isArray(fill)){const g=c.createRadialGradient(x-rx*.25,y-ry*.5,0,x,y,rx);g.addColorStop(0,fill[0]);g.addColorStop(1,fill[1]);c.fillStyle=g;}else c.fillStyle=fill;
  c.fill();if(outline){c.strokeStyle=outline;c.lineWidth=.8;c.stroke();}
}
function face(c: Ctx, side:'front'|'right',x:number,y:number,z:number,w:number,h:number,fill:Surface,outline?:string): void {
  const at=(u:number,v:number)=>side==='front'?P(x+u,y,z+v):P(x,y+u,z+v);
  polygon(c,[at(0,0),at(w,0),at(w,h),at(0,h)],fill,outline);
}
function box(c:Ctx,x:number,y:number,w:number,d:number,z:number,h:number,m:Material,detail=1):void {
  polygon(c,[P(x,y+d,z),P(x+w,y+d,z),P(x+w,y+d,z+h),P(x,y+d,z+h)],[m.light,m.dark],m.edge);
  polygon(c,[P(x+w,y,z),P(x+w,y+d,z),P(x+w,y+d,z+h),P(x+w,y,z+h)],[m.dark,m.dark],m.edge);
  polygon(c,[P(x,y,z+h),P(x+w,y,z+h),P(x+w,y+d,z+h),P(x,y+d,z+h)],[m.top,m.light],m.edge);
  if(detail) {
    const course=m===BRICK?4:6;
    for(let v=course;v<h-1;v+=course) {
      stroke(c,P(x,y+d,z+v),P(x+w,y+d,z+v),m.seam,.55);
      stroke(c,P(x+w,y,z+v),P(x+w,y+d,z+v),m.seam,.55);
      for(let u=((Math.floor(v/course)%2)*5)+4;u<w;u+=11)stroke(c,P(x+u,y+d,z+v),P(x+u,y+d,z+v-course),m.seam,.5);
      for(let u=((Math.floor(v/course)%2)*5)+4;u<d;u+=11)stroke(c,P(x+w,y+u,z+v),P(x+w,y+u,z+v-course),m.seam,.5);
    }
    stroke(c,P(x,y+d,z+h),P(x+w,y+d,z+h),'#fff4d64d',.8);
  }
}
function trim(c:Ctx,x:number,y:number,w:number,d:number,z:number,m:Material,height=3):void {box(c,x-1.4,y-1.4,w+2.8,d+2.8,z,height,m,0);}
function roof(c:Ctx,x:number,y:number,w:number,d:number,z:number,h:number,colors:[string,string],type:'hip'|'gable'='hip'):void {
  const a=P(x-3,y-3,z),b=P(x+w+3,y-3,z),e=P(x+w+3,y+d+3,z),f=P(x-3,y+d+3,z);
  const crown=P(x+w*.5,y+d*.5,z+h);
  if(type==='hip') {
    polygon(c,[a,b,crown],[colors[0],colors[1]]);
    polygon(c,[a,crown,f],colors);
    polygon(c,[b,e,crown],[colors[1],colors[1]]);
    polygon(c,[crown,e,f],colors);
    for(let t=.2;t<1;t+=.17) {
      const mix=(u:Point,v:Point):Point=>[u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t];
      stroke(c,mix(crown,e),mix(crown,f),'#203c4140',.65);
      stroke(c,mix(crown,b),mix(crown,e),'#b9d0c329',.6);
    }
    stroke(c,crown,f,'#f9e1af55',.8);
  } else {
    const r0=P(x+w/2,y-3,z+h),r1=P(x+w/2,y+d+3,z+h);
    polygon(c,[a,r0,r1,f],colors);polygon(c,[r0,b,e,r1],[colors[0],colors[1]]);
    polygon(c,[f,r1,e],[colors[0],colors[1]]);
    for(let t=.16;t<1;t+=.16) {
      const q=(u:Point,v:Point):Point=>[u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t];
      stroke(c,q(r0,b),q(r1,e),'#213a444d',.7);
      stroke(c,q(r0,a),q(r1,f),'#c5d5bd35',.65);
    }
    stroke(c,r0,r1,'#e3d2ad88',1.3);
  }
  stroke(c,f,e,'#233e445e',1.3);
}
function opening(c:Ctx,side:'front'|'right',x:number,y:number,z:number,w=7,h=12,glow=false):void {
  face(c,side,x,y,z,w,h,'#444e47','#e2d6b0aa');
  face(c,side,x+.0,y,z+1,w,h-2,glow?['#ebce83','#ab8557']:['#526663','#233f3e'],'#3d4942');
  const at=(u:number,v:number)=>side==='front'?P(x+u,y,z+v):P(x,y+u,z+v);
  stroke(c,at(w/2,0),at(w/2,h),'#c7bd9d',.9);stroke(c,at(0,h*.48),at(w,h*.48),'#bdb498',.8);
  stroke(c,at(-1,0),at(w+1,0),'#e5d6b2',1.5);
}
function arch(c:Ctx,x:number,y:number,z:number,w:number,h:number,wood=true):void {
  const pp=[P(x-w/2,y,z),P(x+w/2,y,z),P(x+w/2,y,z+h-w/2)];
  for(let i=0;i<=12;i++){const a=i/12*Math.PI;pp.push(P(x+Math.cos(a)*w/2,y,z+h-w/2+Math.sin(a)*w/2));}
  polygon(c,pp,wood?['#745c43','#392f29']:['#263f3e','#172d30'],'#dfcda382',1.8);
  for(let u=-w/2+2;u<w/2;u+=3)stroke(c,P(x+u,y,z+.6),P(x+u,y,z+h-w/2),'#d3b8873c',.7);
  stroke(c,P(x-w/2+1,y,z+h*.28),P(x+w/2-1,y,z+h*.28),'#3c3b32',1.7);
  stroke(c,P(x-w/2+1,y,z+h*.58),P(x+w/2-1,y,z+h*.58),'#3c3b32',1.7);
  if(wood){const [px,py]=P(x+2,y,z+h*.42);oval(c,px,py,1,1.3,'#d8bb79');}
}
function stairs(c:Ctx,x:number,y:number,w:number,count:number,z:number,m:Material):void {
  for(let i=count-1;i>=0;i--)box(c,x,y+i*3.3,w,4,0,z-i*z/count,m,0);
}
function crenels(c:Ctx,x:number,y:number,w:number,d:number,z:number,m:Material):void {
  trim(c,x,y,w,d,z,m,3);
  for(let u=0;u<w-2;u+=10)box(c,x+u,y+d-3,5,4,z+3,5,m,0);
  for(let v=0;v<d-3;v+=10)box(c,x+w-3,y+v,4,5,z+3,5,m,0);
}
function cylinder(c:Ctx,x:number,y:number,r:number,z:number,h:number,m:Material,crenellated=false):void {
  const [px,py]=P(x,y,z),ry=r*.47;
  const g=c.createLinearGradient(px-r,py,px+r,py);g.addColorStop(0,m.light);g.addColorStop(.3,m.top);g.addColorStop(1,m.dark);
  c.beginPath();c.moveTo(px-r,py-h);c.lineTo(px-r,py);c.ellipse(px,py,r,ry,0,Math.PI,0,true);c.lineTo(px+r,py-h);c.ellipse(px,py-h,r,ry,0,0,Math.PI,true);c.closePath();c.fillStyle=g;c.fill();c.strokeStyle=m.edge;c.lineWidth=.8;c.stroke();
  for(let h1=6;h1<h;h1+=6){c.beginPath();c.ellipse(px,py-h1,r,ry,0,0,Math.PI);c.strokeStyle=m.seam;c.lineWidth=.5;c.stroke();for(let u=-.7;u<=.7;u+=.7){stroke(c,[px+r*u,py-h1+ry*Math.sqrt(1-u*u)],[px+r*u,py-h1-5+ry*Math.sqrt(1-u*u)],m.seam,.5);}}
  oval(c,px,py-h,r,ry,[m.top,m.light],m.edge);
  oval(c,px,py-h,r*.72,ry*.72,m.dark);
  if(crenellated)for(let a=0;a<Math.PI*2;a+=Math.PI/4){const xx=x+Math.cos(a)*r*.82,yy=y+Math.sin(a)*r*.82;box(c,xx-2,yy-2,4,4,z+h,5,m,0);}
}
function cone(c:Ctx,x:number,y:number,r:number,z:number,h:number,colors:[string,string]):void {
  const [px,py]=P(x,y,z);const pts:Point[]=[[px,py-h]];
  for(let i=0;i<=18;i++){const a=i/18*Math.PI;pts.push([px+Math.cos(a)*r,py+Math.sin(a)*r*.47]);}
  polygon(c,pts,colors,'#2f454466');
  for(const t of [.33,.57,.78]){c.beginPath();c.ellipse(px,py-h*(1-t),r*t,r*.47*t,0,0,Math.PI);c.strokeStyle='#172f414d';c.lineWidth=.65;c.stroke();}
  stroke(c,[px,py-h],[px-r,py],'#efdfb454',.8);
}
function flame(c:Ctx,x:number,y:number,z:number):void {
  const [px,py]=P(x,y,z);const halo=c.createRadialGradient(px,py-2,0,px,py-2,10);halo.addColorStop(0,'#ffc97266');halo.addColorStop(1,'#ffc97200');oval(c,px,py-2,10,10,halo);
  polygon(c,[[px-3,py],[px-3,py-4],[px,py-11],[px+1,py-5],[px+3,py-3],[px+2,py]],['#ffdf93','#cc6a3f'],'',0);
  polygon(c,[[px-1.5,py],[px,py-6],[px+1.5,py]],'#fff0bc','');
}
function brazier(c:Ctx,x:number,y:number,z:number):void {const [px,py]=P(x,y,z);stroke(c,[px,py],[px,py-7],'#5a5747',2);oval(c,px,py-7,4,2,'#615c48');flame(c,x,y,z+8);}
function pole(c:Ctx,x:number,y:number,z:number,h:number,era:number):void {
  const [px,py]=P(x,y,z);stroke(c,[px,py],[px,py-h],'#c7ba91',1.3);
  polygon(c,[[px+.5,py-h+1],[px+12,py-h+3],[px+9,py-h+8],[px+1,py-h+7]],era>=6?'#709f94':'#b79b66','#4a5d4c66');oval(c,px,py-h-1,1.6,1.6,'#e0c18b');
}
function foundation(c:Ctx,era:number):void {
  oval(c,5,16,105,37,'#102b2930');
  polygon(c,[P(-64,-57,-1),P(64,-57,-1),P(64,62,-1),P(-64,62,-1)],era>=6?['#778e86','#526e68']:['#a9a78a','#777f62'],'#334e4530');
  for(let i=0;i<18;i++){const a=i*2.399,rad=75+(i%3)*6;const x=Math.cos(a)*rad,y=Math.sin(a)*rad*.35;oval(c,x,y+13,2+(i%3),.8,'#d6cba65a');}
  if(era<6)for(const [x,y] of [[-67,36],[79,18],[-30,50],[45,-29]]){stroke(c,[x,y],[x-2,y-5],'#74816b',1);stroke(c,[x+1,y],[x+3,y-4],'#89936f',.8);}
}
function barrel(c:Ctx,x:number,y:number,z=0):void {
  const [px,py]=P(x,y,z);c.fillStyle='#806748';c.fillRect(px-3.5,py-7,7,7);oval(c,px,py,3.5,1.8,'#6e5940');oval(c,px,py-7,3.5,1.8,['#b79d6b','#8e754d'],'#5b503c');
  stroke(c,[px-3.5,py-5],[px+3.5,py-5],'#49514a',.8);stroke(c,[px-3.5,py-1.5],[px+3.5,py-1.5],'#49514a',.8);
}
function crates(c:Ctx,x:number,y:number,era:number):void {
  box(c,x,y,9,8,0,8,era>5?CONCRETE:TIMBER,0);stroke(c,P(x,y+8,0),P(x+9,y+8,8),'#c3b390',.8);stroke(c,P(x+9,y,0),P(x+9,y+8,8),'#c3b390',.8);
  box(c,x+3,y+1,5,5,8,5,era>5?ALLOY:TIMBER,0);
}
function palisade(c:Ctx,x:number,y:number,w:number,era:number):void {
  const dark=era===0?'#65553c':'#86694e';
  for(let u=0;u<w;u+=4){const h=17+Math.sin(u*1.7)*2;polygon(c,[P(x+u,y,0),P(x+u+3.8,y,0),P(x+u+3.8,y,h-3),P(x+u+1.8,y,h),P(x+u,y,h-3)],[era===0?'#b29b70':'#c1a07a',dark],'#493e2c',.5);stroke(c,P(x+u+1,y,2),P(x+u+1,y,h-4),'#e2c48e40',.65);}
  for(const h of [5,12])stroke(c,P(x,y,h),P(x+w,y,h),'#584c35',1.4);
}

function settlement(c:Ctx,kind:number):void {
  if(kind===2){
    for(const [x,y] of [[-15,-10],[15,-10],[-15,14],[15,14]]){stroke(c,P(x,y),P(x*.75,y*.75,67),'#6b573b',5);stroke(c,P(x,y,30),P(-x,-y,62),'#9d8151',2);}
    box(c,-18,-15,36,32,64,5,TIMBER,0);roof(c,-23,-19,46,40,81,24,THATCH);
    for(const [x,y] of [[-17,17],[17,17],[17,-15]])stroke(c,P(x,y,68),P(x,y,83),'#8a7249',2.5);
    for(const z of [68,78])stroke(c,P(-18,18,z),P(18,18,z),'#aa9163',2);
    for(let h=0;h<65;h+=6)stroke(c,P(-8,21,h),P(5,21,h),'#bfa779',1.5);
    stroke(c,P(-9,21),P(-9,21,67),'#8b734a',2);stroke(c,P(6,21),P(6,21,67),'#8b734a',2);return;
  }
  if(kind===3){palisade(c,-54,10,32,0);palisade(c,22,10,32,0);for(const x of [-22,22]){stroke(c,P(x,10),P(x,10,45),'#816b47',7);stroke(c,P(x,10,43),P(x,10,48),'#d2bc88',5);}stroke(c,P(-22,10,40),P(22,10,40),'#b79d68',6);for(const x of [-13,0,13])stroke(c,P(x,10,9),P(x,10,38),'#6d5d3e',2);roof(c,-30,3,60,14,46,17,THATCH);return;}
  if(kind===1){
    // A hide signal lodge with a separate open equipment awning.
    cylinder(c,-7,-2,29,0,14,{...TIMBER,top:'#c5b17f',light:'#b19a6f',dark:'#84734f'});
    cone(c,-7,-2,35,15,40,['#d5c18e','#9b855c']);
    arch(c,-7,27,0,14,23);
    for(const [x,y] of [[-35,-20],[22,-20],[-34,29],[26,28]])stroke(c,P(x,y),P(-7,-2,49),'#d9c4928c',.75);
    for(const x of [24,43])stroke(c,P(x,-19),P(x,-19,23),'#92754c',2.5);
    roof(c,21,-24,27,23,23,12,THATCH);
    crates(c,28,-8,0);barrel(c,-35,21);barrel(c,-26,32);brazier(c,22,35,0);pole(c,-33,-14,0,46,0);return;
  }
  const out=kind===1;
  if(!out){palisade(c,-60,-35,116,0);for(let u=-40;u<48;u+=6)stroke(c,P(-58,u),P(-58,u,16),'#8b7850',4);}
  const x=out?-29:-38,y=out?-22:-32,w=out?58:67,d=out?42:56,h=out?22:30;
  box(c,x,y,w,d,0,h,TIMBER);roof(c,x-4,y-4,w+8,d+8,h,45,THATCH,'gable');
  for(let u=x+4;u<x+w;u+=5)stroke(c,P(u,y+d,h),P(u,y+d,0),'#d3bd8666',1.2);
  for(let v=y+4;v<y+d;v+=5)stroke(c,P(x+w,v,h),P(x+w,v,0),'#b89b6c66',1);
  arch(c,x+w*.5,y+d+.3,0,18,25);
  for(const s of [x+3,x+w-3])stroke(c,P(s,y+d+1),P(s,y+d+1,h),'#695239',3);
  if(!out){box(c,27,-20,24,26,0,14,TIMBER);roof(c,27,-20,24,26,14,27,THATCH);crates(c,-48,33,0);barrel(c,-36,41);}
  for(let i=0;i<8;i++) {const xx=out?15+i*.9:38+i*.9;stroke(c,P(xx,30,0),P(xx+3,33,0),'#746346',1.5);}
  for(const [a,b] of [[out?23:44,38],[out?27:48,33],[out?20:40,34]]){const [px,py]=P(a,b);oval(c,px,py,3,1.8,'#a8a78b');}flame(c,out?24:45,34,2);
  pole(c,x-4,y+d,0,out?42:55,0);
}
function bronze(c:Ctx,kind:number):void {
  if(kind===2){box(c,-18,-18,36,36,0,65,CLAY);trim(c,-18,-18,36,36,59,CLAY,6);box(c,-23,-23,46,46,65,7,CLAY);crenels(c,-23,-23,46,46,72,CLAY);arch(c,0,18.3,0,12,23);opening(c,'front',-5,18.4,42,10,13);for(const x of [-18,17])face(c,'front',x,23.3,68,3,4,'#2c7280');return;}
  if(kind===3){for(const x of [-47,24]){box(c,x,-13,23,34,0,47,CLAY);trim(c,x,-13,23,34,41,CLAY,5);crenels(c,x,-13,23,34,47,CLAY);face(c,'front',x+4,21.4,8,15,22,['#c7ac75','#a18251']);}box(c,-24,-13,48,34,34,15,CLAY);for(const x of [-17,-10,-3,4,11])face(c,'front',x,21.3,38,4,8,'#387c82');for(const x of [-15,-10,-5,0,5,10,15])stroke(c,P(x,14,0),P(x,14,34),'#6e5c40',1.6);return;}
  if(kind===1){box(c,-37,-29,74,58,0,27,CLAY);crenels(c,-37,-29,74,58,27,CLAY);box(c,-17,-18,34,30,30,20,CLAY);trim(c,-17,-18,34,30,49,CLAY);arch(c,-8,29.3,0,16,23);stairs(c,-18,30,20,5,9,CLAY);for(const x of [-30,20])face(c,'front',x,29.4,10,5,11,'#3f6e72');pole(c,21,-15,29,34,1);crates(c,42,5,1);return;}
  box(c,-54,-46,108,94,0,12,CLAY);box(c,-43,-36,86,73,12,22,CLAY);box(c,-30,-28,60,50,34,24,CLAY);box(c,-18,-21,36,31,58,22,CLAY);
  for(const [x,y,w,d,z] of [[-54,-46,108,94,12],[-43,-36,86,73,34],[-30,-28,60,50,58],[-18,-21,36,31,80]]){trim(c,x,y,w,d,z-3,{...CLAY,light:'#d7ba85',top:'#e6d29c'},3);for(let u=x+5;u<x+w-4;u+=9)face(c,'front',u,y+d+.3,z-7,4,3,'#39777b');}
  stairs(c,-11,13,22,15,55,CLAY);arch(c,-1,10.4,58,13,20);for(const x of [-23,15])arch(c,x,22.4,35,8,16,false);
  for(const [x,y] of [[-44,41],[44,41]])brazier(c,x,y,12);pole(c,-17,-20,81,28,1);crates(c,-53,50,1);
}
function column(c:Ctx,x:number,y:number,z:number,h:number):void {
  box(c,x-4,y-4,8,8,z,3,MARBLE,0);cylinder(c,x,y,3,z+3,h-5,MARBLE);box(c,x-4.5,y-4.5,9,9,z+h-3,3,MARBLE,0);
  for(const u of [-1.8,0,1.8]){const [xx,yy]=P(x,y,z+4);stroke(c,[xx+u,yy],[xx+u,yy-h+9],'#817e6355',.5);}
}
function classical(c:Ctx,kind:number):void {
  if(kind===2){box(c,-19,-18,38,36,0,55,MARBLE);trim(c,-19,-18,38,36,53,MARBLE,5);for(const [x,y] of [[-16,-14],[16,-14],[-16,14],[16,14]])column(c,x,y,58,21);roof(c,-23,-22,46,44,81,18,['#bfa47f','#866d55']);arch(c,0,18.3,0,13,25);for(const x of [-11,8])arch(c,x,18.3,36,6,13,false);return;}
  if(kind===3){for(const x of [-46,24]){box(c,x,-12,22,30,0,42,MARBLE);trim(c,x,-12,22,30,39,MARBLE,4);}box(c,-24,-12,48,30,29,15,MARBLE);for(const x of [-18,18])column(c,x,19,0,40);for(let i=-14;i<=14;i+=7)face(c,'front',i,18.4,32,4,6,'#967f55');roof(c,-49,-15,98,36,44,14,['#caa884','#936f58'],'gable');return;}
  if(kind===1){
    // A military signal station: flat tower, courtyard and a small portico.
    box(c,-38,-28,76,60,0,6,MARBLE);box(c,-28,-22,38,38,6,45,MARBLE);
    trim(c,-28,-22,38,38,46,MARBLE,5);crenels(c,-28,-22,38,38,51,MARBLE);
    arch(c,-10,16.4,6,13,26);for(const xx of [-23,-4])arch(c,xx,16.4,36,6,12,false);
    for(const xx of [-24,4])column(c,xx,29,6,25);roof(c,-29,14,39,20,32,12,['#c49a75','#8d5d4e'],'gable');
    box(c,14,-20,22,35,6,18,MARBLE);roof(c,13,-21,24,37,24,12,['#c49a75','#8d5d4e']);
    stairs(c,-20,33,22,3,6,MARBLE);pole(c,-22,-15,59,25,2);crates(c,25,28,2);brazier(c,-34,30,6);return;
  }
  const out=kind===1;
  const x=out?-35:-48,y=out?-22:-37,w=out?70:96,d=out?48:78;
  box(c,x-4,y-4,w+8,d+8,0,5,MARBLE);box(c,x,y,w,d,5,5,MARBLE);stairs(c,x+w*.34,y+d+3,w*.34,4,9,MARBLE);
  box(c,x+9,y+6,w-18,d-23,10,out?30:40,MARBLE);arch(c,0,y+d-16+.4,10,16,out?26:34);
  for(let xx=x+5;xx<x+w-2;xx+=out?20:18)column(c,xx,y+d-5,10,out?33:43);
  for(let yy=y+8;yy<y+d-13;yy+=18)column(c,x+w-5,yy,10,out?33:43);
  const h=out?43:53;trim(c,x,y,w,d,h,MARBLE,7);roof(c,x-3,y-3,w+6,d+6,h+7,out?23:32,['#c8a280','#885e4f'],'gable');
  const mid=P(0,y+d+3,h+13);polygon(c,[[mid[0]-8,mid[1]+3],[mid[0],mid[1]-7],[mid[0]+8,mid[1]+3]],'#e7d6a6','#967e59');
  for(const xx of [x+1,x+w-1]){const [px,py]=P(xx,y+d-2,h+10);oval(c,px,py,3,2,'#c0a46b');stroke(c,[px,py],[px,py-5],'#d6bb82',2);}
  if(!out){for(const [a,b] of [[-51,46],[50,46]])brazier(c,a,b,6);pole(c,-45,-28,58,24,2);}else{crates(c,-43,21,2);barrel(c,-31,37);}
}
function medieval(c:Ctx,kind:number):void {
  if(kind===2){cylinder(c,0,0,22,0,75,STONE,true);cone(c,0,0,26,82,29,SLATE);const [px,py]=P(0,0,55);face(c,'front',-3,16,40,6,14,'#30423e');arch(c,0,20,0,12,24);stroke(c,[px,py-57],[px,py-68],'#c9b477',1);polygon(c,[[px,py-67],[px+11,py-64],[px,py-61]],'#b99b62');return;}
  if(kind===3){for(const x of [-38,38]){cylinder(c,x,0,19,0,55,STONE,true);cone(c,x,0,23,62,23,SLATE);}box(c,-25,-10,50,23,32,17,STONE);crenels(c,-25,-10,50,23,49,STONE);for(const x of [-17,-12,-7,-2,3,8,13,18])stroke(c,P(x,6,0),P(x,6,32),'#5c5c4a',2);for(const z of [9,19,29])stroke(c,P(-18,6,z),P(18,6,z),'#8b8263',1.5);return;}
  if(kind===1){box(c,-29,-25,58,50,0,40,STONE);crenels(c,-29,-25,58,50,40,STONE);box(c,-13,-19,26,29,43,24,STONE);roof(c,-13,-19,26,29,67,25,SLATE);cylinder(c,28,24,12,0,48,STONE,true);arch(c,-3,25.4,0,15,25);opening(c,'front',-21,25.4,22,6,11,true);opening(c,'right',29.4,-11,23,6,11,true);pole(c,-23,-18,48,27,3);crates(c,-42,27,3);return;}
  cylinder(c,-39,-34,14,0,55,STONE,true);cylinder(c,40,-34,14,0,57,STONE,true);
  box(c,-45,-34,90,13,0,37,STONE);crenels(c,-45,-34,90,13,37,STONE);
  box(c,-21,-23,47,42,8,63,STONE);trim(c,-21,-23,47,42,38,STONE);roof(c,-22,-24,49,44,71,34,SLATE,'gable');
  for(const xx of [-13,4,16]){opening(c,'front',xx,19.4,47,6,13,true);opening(c,'front',xx,19.4,24,6,12);}
  for(const yy of [-15,1])opening(c,'right',26.4,yy,46,6,13,true);
  cylinder(c,-21,-15,11,20,76,STONE);cone(c,-21,-15,15,101,24,SLATE);pole(c,-21,-15,126,15,3);
  box(c,-44,24,88,14,0,33,STONE);crenels(c,-44,24,88,14,33,STONE);arch(c,-5,38.4,0,20,29);stairs(c,-17,39,24,4,5,STONE);
  for(const x of [-44,44]){cylinder(c,x,31,16,0,49,STONE,true);face(c,'front',x-2,44,28,4,11,'#39473f');}
  brazier(c,-22,41,13);brazier(c,14,41,13);
}
function cannon(c:Ctx,x:number,y:number,z:number,modern=false):void {
  const [px,py]=P(x,y,z);oval(c,px,py,8,4,'#354a46');oval(c,px+3,py-3,6,3,modern?'#69867c':'#74765f');
  stroke(c,[px+1,py-4],[px+17,py-12],modern?'#a6b9a4':'#696c56',5);stroke(c,[px+2,py-5],[px+17,py-13],'#c4c7ac',.8);oval(c,px+17,py-12,2,2.2,'#2a3e38');
  for(const xx of [-6,7])oval(c,px+xx,py+1,3,3.5,'#3d4436','#897f5e');
}
function bastion(c:Ctx,x:number,y:number,z:number,m:Material):void {
  const pts=[[-18,-12],[8,-18],[22,-4],[10,16],[-16,12]];
  polygon(c,pts.map(([a,b])=>P(x+a,y+b,z)),[m.top,m.light],m.edge);
  for(let i=2;i<5;i++){const a=pts[i],b=pts[(i+1)%5];polygon(c,[P(x+a[0],y+a[1],0),P(x+b[0],y+b[1],0),P(x+b[0],y+b[1],z),P(x+a[0],y+a[1],z)],[m.light,m.dark],m.edge);}
  for(let i=0;i<5;i++){const a=pts[i],b=pts[(i+1)%5];stroke(c,P(x+a[0],y+a[1],z),P(x+b[0],y+b[1],z),'#e6d6af',2);}
}
function gunpowder(c:Ctx,kind:number):void {
  if(kind===2){box(c,-20,-18,40,36,0,56,STONE);trim(c,-20,-18,40,36,51,STONE,5);box(c,-18,-16,36,32,56,14,STONE);roof(c,-22,-20,44,40,70,22,COPPER);opening(c,'front',-12,18.4,33,7,13,true);opening(c,'front',4,18.4,33,7,13,true);arch(c,0,18.4,0,13,25);pole(c,-18,-10,72,31,4);return;}
  if(kind===3){for(const x of [-42,42])bastion(c,x,0,37,STONE);box(c,-30,-13,60,28,26,14,STONE);arch(c,0,15.4,0,28,37,false);roof(c,-27,-14,54,29,40,17,COPPER);cannon(c,-39,10,38);cannon(c,45,10,38);return;}
  if(kind===1){bastion(c,-18,6,22,STONE);bastion(c,24,1,22,STONE);box(c,-29,-25,58,47,0,29,STONE);roof(c,-29,-25,58,47,29,25,COPPER,'gable');arch(c,-7,22.4,0,15,23);opening(c,'front',14,22.4,13,7,11,true);cannon(c,-38,25,22);cannon(c,38,21,22);crates(c,-10,40,4);return;}
  bastion(c,-41,-27,25,STONE);bastion(c,40,-28,25,STONE);box(c,-44,-29,88,67,0,22,STONE);
  box(c,-31,-27,62,51,22,31,STONE);trim(c,-31,-27,62,51,49,STONE,5);roof(c,-34,-30,68,57,54,28,COPPER,'gable');
  box(c,-11,-7,22,24,54,23,STONE);roof(c,-12,-8,24,26,77,20,COPPER);pole(c,0,2,97,18,4);
  for(const xx of [-23,-8,10,23])opening(c,'front',xx,24.4,35,6,12,true);
  for(const yy of [-20,-4,10])opening(c,'right',31.4,yy,35,6,12);
  bastion(c,-43,34,25,STONE);bastion(c,43,34,25,STONE);box(c,-26,29,52,14,0,25,STONE);arch(c,0,43.3,0,19,24);
  cannon(c,-45,41,26);cannon(c,47,41,26);brazier(c,-16,45,7);brazier(c,16,45,7);barrel(c,-20,-5,23);
}
function pipe(c:Ctx,a:Point,b:Point,width=2):void {stroke(c,a,b,'#4d5d59',width+1);stroke(c,[a[0]-.6,a[1]-.6],[b[0]-.6,b[1]-.6],'#a6aaa0',width*.45);}
function industrial(c:Ctx,kind:number):void {
  if(kind===2){box(c,-17,-16,34,32,0,61,BRICK);trim(c,-17,-16,34,32,54,STONE,4);box(c,-22,-20,44,40,61,19,BRICK);for(const x of [-17,-5,7])opening(c,'front',x,20.3,65,8,11,true);for(const y of [-13,1])opening(c,'right',22.4,y,65,8,11,true);roof(c,-23,-21,46,42,80,16,METAL);arch(c,0,16.4,0,12,23);return;}
  if(kind===3){for(const x of [-45,28]){box(c,x,-14,17,34,0,44,BRICK);trim(c,x,-14,17,34,40,STONE,5);}pipe(c,P(-28,0,35),P(28,0,35),3);for(let x=-26;x<=26;x+=5)stroke(c,P(x,10),P(x,10,34),'#4b5b59',1.5);for(const z of [5,25])stroke(c,P(-28,10,z),P(28,10,z),'#5f6d66',1.5);box(c,-55,-15,22,26,0,19,BRICK);roof(c,-56,-16,24,28,19,12,METAL);return;}
  if(kind===1){
    // A telegraph supply depot with its own elevated riveted water tank.
    box(c,-19,-16,62,45,0,25,BRICK);roof(c,-20,-17,64,47,25,17,METAL,'gable');
    arch(c,4,29.4,0,18,22);opening(c,'front',25,29.4,12,9,10,true);opening(c,'right',43.4,1,10,11,12,true);
    for(const [x,y] of [[-38,-21],[-21,-21],[-38,-4],[-21,-4]]){pipe(c,P(x,y),P(x,y,48),2);pipe(c,P(x,y,5),P(-59-x,-25-y,39),1.2);}
    cylinder(c,-29.5,-12.5,15,47,21,{...CONCRETE,light:'#809a94',dark:'#526e6a'},false);cone(c,-29.5,-12.5,16,69,10,METAL);
    for(const z of [50,62]){const [px,py]=P(-29.5,-12.5,z);c.beginPath();c.ellipse(px,py,15,7,0,0,Math.PI);c.strokeStyle='#c1c7ad';c.lineWidth=1;c.stroke();}
    pipe(c,P(-17,-9,55),P(-17,-9,4),2);crates(c,-27,32,5);barrel(c,-38,27);barrel(c,-43,20);
    pipe(c,P(39,-28),P(39,-28,72),1.8);for(const h of [59,68]){pipe(c,P(28,-28,h),P(50,-28,h),1);for(const x of [30,48])oval(c,...P(x,-28,h+2),1.7,1.7,'#c2d0c0');}return;
  }
  const out=kind===1;
  const x=out?-34:-46,y=out?-24:-34,w=out?68:87,d=out?48:71,h=out?30:43;
  box(c,x,y,w,d,0,h,BRICK);trim(c,x,y,w,d,3,STONE,4);trim(c,x,y,w,d,h-3,STONE,3);
  roof(c,x-2,y-2,w+4,d+4,h,out?19:27,METAL,'gable');
  for(let xx=x+7;xx<x+w-7;xx+=15){opening(c,'front',xx,y+d+.4,14,8,out?12:15,true);if(!out)opening(c,'front',xx,y+d+.4,32,8,8,true);}
  for(let yy=y+8;yy<y+d-8;yy+=16)opening(c,'right',x+w+.4,yy,15,9,15,true);
  arch(c,x+w*.43,y+d+.5,0,16,24);box(c,x+w-15,y+4,12,13,h*.4,out?46:79,BRICK);trim(c,x+w-15,y+4,12,13,h*.4+(out?46:79),STONE,4);
  const [sx,sy]=P(x+w-9,y+10,h*.4+(out?52:85));oval(c,sx,sy-5,7,3,'#a4b2a344');oval(c,sx+4,sy-14,10,4,'#bfc9b535');oval(c,sx+9,sy-23,13,5,'#c3ccb323');
  pipe(c,P(x+w+.5,y+9,8),P(x+w+.5,y+9,h-2),2);
  if(!out){box(c,-47,38,30,19,0,14,CONCRETE);for(let i=0;i<4;i++)barrel(c,-43+i*7,43);crates(c,32,44,5);pole(c,-40,-26,h+25,22,5);}else {crates(c,-42,26,5);barrel(c,24,35);}
}
function dish(c:Ctx,x:number,y:number,z:number,r:number):void {
  const [px,py]=P(x,y,z);stroke(c,[px,py+6],[px+2,py-7],'#546e69',3);
  c.save();c.translate(px,py-8);c.rotate(-.45);c.beginPath();c.ellipse(0,0,r,r*.5,0,0,Math.PI*2);const g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#d3d9c7');g.addColorStop(.6,'#92aca2');g.addColorStop(1,'#5a7a72');c.fillStyle=g;c.fill();c.strokeStyle='#445f59';c.lineWidth=.9;c.stroke();
  c.beginPath();c.ellipse(0,0,r*.75,r*.35,0,0,Math.PI*2);c.strokeStyle='#738d8077';c.stroke();stroke(c,[-r*.7,r*.12],[r*.15,-r*.7],'#d1dbca',1);stroke(c,[r*.65,r*.15],[r*.15,-r*.7],'#d1dbca',1);oval(c,r*.15,-r*.7,2,2,'#d8d4af');c.restore();
}
function solar(c:Ctx,x:number,y:number,w:number,d:number,z:number):void {
  polygon(c,[P(x,y,z),P(x+w,y,z),P(x+w,y+d,z+4),P(x,y+d,z+4)],['#4e7782','#234653'],'#b5c4ae',.8);
  for(let u=4;u<w;u+=5)stroke(c,P(x+u,y,z),P(x+u,y+d,z+4),'#9cbdc266',.6);
  for(let v=3;v<d;v+=4)stroke(c,P(x,y+v,z+v/d*4),P(x+w,y+v,z+v/d*4),'#9cbdc255',.6);
}
function modern(c:Ctx,kind:number):void {
  if(kind===2){for(const [x,y] of [[-14,-13],[14,-13],[-14,13],[14,13]]){pipe(c,P(x,y),P(x,y,66),3);pipe(c,P(x,y,8),P(-x,-y,54),1.5);}box(c,-23,-21,46,42,65,20,CONCRETE);for(const x of [-17,-4,9])opening(c,'front',x,21.4,70,10,11);for(const y of [-15,0])opening(c,'right',23.4,y,70,10,11);box(c,-25,-23,50,46,85,4,CONCRETE,0);dish(c,0,-5,91,16);pole(c,18,15,88,26,6);return;}
  if(kind===3){for(const x of [-47,25])box(c,x,-14,22,35,0,22,CONCRETE);box(c,-16,-12,31,29,0,16,CONCRETE);for(let x=-44;x<=45;x+=6){stroke(c,P(x,22,0),P(x,22,22),'#667b71',1.4);}pipe(c,P(-47,22,21),P(47,22,21),1);stroke(c,P(-25,18,19),P(24,18,10),'#e2ce90',4);for(let t=0;t<1;t+=.2){const a=P(-25+49*t,18,19-9*t);stroke(c,a,[a[0]+2,a[1]-1],'#4a5750',3);}roof(c,-20,-15,39,35,17,8,METAL);return;}
  if(kind===1){
    // A low field radar shelter behind earth-filled defensive blocks.
    box(c,-31,-24,62,46,0,19,CONCRETE);roof(c,-32,-25,64,48,19,12,METAL);
    face(c,'front',-10,22.5,0,18,17,['#65796e','#344f47'],'#a9b5a1');
    for(const x of [-24,15])face(c,'front',x,22.4,11,11,4,'#284e51','#9cbaa9');
    solar(c,-27,-18,24,20,30);dish(c,13,-5,32,19);
    for(const [x,y] of [[-46,18],[-31,30],[-16,39],[27,38],[42,25]])box(c,x,y,13,11,0,11,{...CONCRETE,light:'#9d9c78',dark:'#6d7a60'},0);
    box(c,35,-25,12,18,0,14,CONCRETE,0);for(let i=0;i<4;i++)face(c,'front',37+i*2,-6.5,5,1,6,'#354f49');
    pipe(c,P(38,-18,15),P(38,-18,68),1.3);pipe(c,P(29,-18,57),P(47,-18,57),1);oval(c,...P(38,-18,69),2,2,'#c6b789');crates(c,-40,-16,6);return;
  }
  const out=kind===1;
  box(c,out?-37:-54,out?-27:-40,out?73:103,out?57:83,0,out?24:33,CONCRETE);
  const x=out?-37:-54,y=out?-27:-40,w=out?73:103,d=out?57:83,h=out?24:33;
  trim(c,x,y,w,d,h-3,CONCRETE,5);box(c,x+12,y+9,w-24,d-27,h+2,13,CONCRETE,0);
  for(const xx of [x+7,x+w-22])face(c,'front',xx,y+d+.4,14,15,6,['#8eb2ac','#355a5c'],'#334f4f');
  face(c,'front',-10,y+d+.6,0,21,22,['#657b73','#354f49'],'#c2c6ac');for(let t=5;t<21;t+=4)stroke(c,P(-10,y+d+.8,t),P(11,y+d+.8,t),'#253f3a77',.8);
  for(let yy=y+9;yy<y+d-10;yy+=13)face(c,'right',x+w+.4,yy,13,8,5,'#2f5659','#8fa69a');
  for(let i=0;i<3;i++)box(c,x+16+i*8,y+19,6,10,h+16,3,{...CONCRETE,top:'#627f76'},0);
  solar(c,x+15,y+11,25,19,h+16);dish(c,out?17:21,out?-6:-13,h+20,out?15:22);
  if(!out){box(c,24,-26,17,18,35,39,CONCRETE);for(const xx of [26,33])face(c,'front',xx,-7.6,58,5,8,'#39696b','#bac7af');box(c,21,-29,23,24,74,4,CONCRETE,0);pipe(c,P(34,-17,78),P(34,-17,116),1.3);pipe(c,P(20,-17,105),P(47,-17,105),1.1);oval(c,...P(34,-17,117),2.2,2.2,'#d6a57b');cannon(c,42,34,35,true);}
  for(const xx of [-43,-31,-19]){box(c,xx,y+d+3,10,7,0,8,CONCRETE,0);}crates(c,40,24,6);pole(c,x+2,y+3,h+6,34,6);
}
function lightstrip(c:Ctx,a:Point,b:Point,color='#91ede0',width=1.6):void {stroke(c,a,b,'#366e7690',width+3);stroke(c,a,b,color,width);}
function future(c:Ctx,kind:number):void {
  if(kind===2){box(c,-18,-16,36,32,0,10,ALLOY,0);for(const [x,y] of [[-13,-10],[13,10]]){box(c,x-4,y-4,8,8,10,80,ALLOY,0);lightstrip(c,P(x+4,y+4,18),P(x+4,y+4,84));}box(c,-24,-21,48,42,79,14,ALLOY,0);roof(c,-25,-22,50,44,93,15,['#c5dcd4','#618f94']);for(const xx of [-18,-5,8])face(c,'front',xx,21.4,83,10,6,'#418b98','#bdebd7');dish(c,0,0,110,19);lightstrip(c,P(-24,21,80),P(24,21,80));return;}
  if(kind===3){for(const x of [-42,30]){box(c,x,-13,12,28,0,58,ALLOY,0);box(c,x-4,-17,20,36,52,9,ALLOY,0);lightstrip(c,P(x+12,15,5),P(x+12,15,52));}box(c,-30,-12,60,25,50,8,ALLOY,0);lightstrip(c,P(-30,13,51),P(30,13,51));const g=c.createLinearGradient(-20,-10,20,30);g.addColorStop(0,'#73d9e21c');g.addColorStop(.5,'#73d9e24d');g.addColorStop(1,'#73d9e211');polygon(c,[P(-29,3,0),P(29,3,0),P(29,3,49),P(-29,3,49)],g,'#80dedc80');for(let h=5;h<48;h+=5)stroke(c,P(-29,3,h),P(29,3,h),'#a0eee63d',.7);return;}
  if(kind===1){
    // A round autonomous survey hub with curved glazing and two solar wings.
    cylinder(c,0,0,34,0,13,ALLOY);cylinder(c,0,0,26,13,28,ALLOY);
    const [px,py]=P(0,0,34);c.beginPath();c.ellipse(px,py,26,12.2,0,.05,Math.PI-.05);c.strokeStyle='#4b9ea5';c.lineWidth=9;c.stroke();
    for(const t of [.25,.5,.75]){const a=t*Math.PI;stroke(c,[px+Math.cos(a)*26,py+Math.sin(a)*12-4],[px+Math.cos(a)*26,py+Math.sin(a)*12+4],'#c4ded1',1.3);}
    cone(c,0,0,30,43,18,['#c6ded2','#709f9b']);oval(c,...P(0,0,62),7,3,['#b5f6df','#67b7b6']);
    solar(c,-59,-18,26,31,7);solar(c,33,-18,26,31,7);box(c,-11,27,22,15,0,6,ALLOY,0);lightstrip(c,P(-10,42,6),P(10,42,6));
    for(const x of [-43,43]){box(c,x-3,22,6,6,0,29,ALLOY,0);lightstrip(c,P(x+3,28,4),P(x+3,28,26));}pipe(c,P(4,-12,57),P(4,-12,89),1);oval(c,...P(4,-12,90),2.5,2.5,'#b8f9dd');return;
  }
  const out=kind===1;
  const vertices:Point[]=out?[[-42,-21],[0,-43],[43,-17],[43,22],[0,46],[-42,22]]:[[-60,-24],[0,-61],[60,-28],[60,26],[0,61],[-60,24]];
  const hh=out?13:16;
  for(let i=2;i<vertices.length;i++){const [x,y]=vertices[i],[xx,yy]=vertices[(i+1)%vertices.length];polygon(c,[P(x,y,0),P(xx,yy,0),P(xx,yy,hh),P(x,y,hh)],['#698b8c','#365e68'],'#2c5260');}
  polygon(c,vertices.map(([x,y])=>P(x,y,hh)),['#a9c3b9','#577e80'],'#304e58');
  const w=out?61:81,d=out?48:65,x=-w/2,y=-d/2;
  box(c,x,y,w,d,hh,18,ALLOY,0);
  const crownZ=out?69:89;
  polygon(c,[P(x-3,y+d+3,hh+18),P(x+w+3,y+d+3,hh+18),P(18,12,crownZ),P(-18,12,crownZ)],['#d2e0d4','#7bafa8'],'#3d6767');
  polygon(c,[P(x+w+3,y-3,hh+18),P(x+w+3,y+d+3,hh+18),P(18,12,crownZ),P(18,-14,crownZ)],['#91b9b2','#456f7b'],'#3d6767');
  polygon(c,[P(x-3,y-3,hh+18),P(x+w+3,y-3,hh+18),P(18,-14,crownZ),P(-18,-14,crownZ)],['#dce7d7','#96b9b0'],'#476c70');
  polygon(c,[P(-18,-14,crownZ),P(18,-14,crownZ),P(18,12,crownZ),P(-18,12,crownZ)],['#8ce1cf','#417d8a'],'#7ad3ca');
  const [ox,oy]=P(0,0,crownZ+2);oval(c,ox,oy,11,5,['#c6f8df','#59b5ba'],'#bbf6db');oval(c,ox,oy,5,2,'#d9fae8');
  for(const xx of [-w/2+8,w/2-14]){face(c,'front',xx,y+d+.5,hh+5,7,6,'#7bd4cd','#b2ede0');}
  face(c,'front',-11,y+d+.7,hh,22,17,['#476f76','#2a4858'],'#8ed7cf');lightstrip(c,P(-10,y+d+1,hh+15),P(10,y+d+1,hh+15));
  for(const x1 of out?[-36,36]:[-51,51]){box(c,x1-5,17,10,10,hh,36,ALLOY,0);lightstrip(c,P(x1+5,27,hh+8),P(x1+5,27,hh+32));box(c,x1-6,16,12,12,hh+36,4,ALLOY,0);oval(c,...P(x1,22,hh+42),3,2,'#9bebda');}
  for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length];lightstrip(c,P(a[0]*.95,a[1]*.95,hh+1),P(b[0]*.95,b[1]*.95,hh+1),'#7acabd',.9);}
  if(!out){pipe(c,P(10,-14,crownZ),P(10,-14,133),1.2);oval(c,...P(10,-14,134),2.5,2.5,'#c5f9e4');solar(c,-48,-25,20,23,hh+2);solar(c,29,-25,20,23,hh+2);}else{crates(c,36,34,7);}
}

/** kind: 0 stronghold, 1 independent outpost, 2 watchtower, 3 gate. */
export function drawArchitecture(ctx:Ctx,era:number,kind:number):void {
  ctx.save();ctx.translate(128,184);ctx.lineJoin='round';ctx.lineCap='round';
  const age=Math.max(0,Math.min(7,Math.floor(era))),variant=Math.max(0,Math.min(3,Math.floor(kind)));
  if(variant<2)foundation(ctx,age);else oval(ctx,4,10,variant===2?46:76,variant===2?18:25,'#102b2930');
  const painters=[settlement,bronze,classical,medieval,gunpowder,industrial,modern,future];painters[age](ctx,variant);
  ctx.restore();
}

/** Matching defensive barricade artwork, using the same 256px atlas cell. */
export function drawBarrier(ctx:Ctx,era:number):void {
  ctx.save();ctx.translate(128,184);oval(ctx,3,9,66,22,'#102b2930');
  if(era<2){palisade(ctx,-48,10,96,era);for(const x of [-34,0,34]){stroke(ctx,P(x,10),P(x-8,25,11),'#8c724e',4);stroke(ctx,P(x-8,25,11),P(x-5,30),'#665239',3);}}
  else if(era<5){const m=era===2?MARBLE:STONE;box(ctx,-49,-5,98,19,0,20,m);crenels(ctx,-49,-5,98,19,20,m);if(era===4)for(const x of [-30,24])cannon(ctx,x,5,26);}
  else if(era===5){for(const x of [-31,0,31]){stroke(ctx,P(x-11,-4),P(x+11,19,23),'#626e66',5);stroke(ctx,P(x+11,-4),P(x-11,19,23),'#626e66',5);stroke(ctx,P(x,-10,13),P(x,28,13),'#9ba89a',3);}pipe(ctx,P(-49,15,22),P(49,15,22),1);}
  else if(era===6){for(let x=-48;x<48;x+=24){box(ctx,x,-5,21,19,0,15,CONCRETE,0);face(ctx,'front',x+3,14.4,6,15,4,'#cdbd88');for(let u=3;u<18;u+=7)face(ctx,'front',x+u,14.7,6,3,4,'#5d6659');}}
  else{for(const x of [-49,-2,45]){box(ctx,x,-4,6,17,0,31,ALLOY,0);lightstrip(ctx,P(x+6,13,3),P(x+6,13,28));}polygon(ctx,[P(-43,3,2),P(45,3,2),P(45,3,27),P(-43,3,27)],['#89e3dc38','#79e1de13'],'#90e7de80');for(let z=6;z<27;z+=5)stroke(ctx,P(-43,3,z),P(45,3,z),'#8deddf4d',.7);}
  ctx.restore();
}

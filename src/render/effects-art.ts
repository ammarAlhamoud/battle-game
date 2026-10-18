import type Phaser from 'phaser';
import type { Role, Vec } from '../contracts';

/** Presentation-only events. Coordinates have already passed the caller's visibility checks. */
export interface BattleEffect {
  x: number;
  y: number;
  target?: Vec;
  kind: string;
  birth: number;
  owner: number;
  seed: number;
  role?: Role;
}
type G = Phaser.GameObjects.Graphics;
const TEAM = [0x84dfc0, 0xf4a38e];
const TEAM_LIGHT = [0xd8fff0, 0xffe0be];
const DUST = [0xb7a47f, 0xcbb794, 0x8a927d, 0xb5b69b, 0xaaa18f, 0x9ea89b, 0x9bada3, 0x96b4c1];
const clamp = (x: number, min = 0, max = 1): number => Math.max(min, Math.min(max, x));
const random = (seed: number, n: number): number => {
  const v = Math.sin(seed * 17.117 + n * 113.377) * 43758.5453123;
  return v - Math.floor(v);
};
const ease = (t: number): number => 1 - Math.pow(1 - clamp(t), 3);
const sideOf = (effect: BattleEffect): number => effect.owner === 0 ? 0 : 1;

function flightDuration(effect: BattleEffect, era: number): number {
  if (effect.role === 'siege') return era < 4 ? 680 : era < 6 ? 590 : era === 6 ? 550 : 430;
  if (era === 0) return 360;
  if (era === 1 || era === 3) return 410;
  if (era === 2) return 450;
  return era === 7 ? 165 : era === 4 ? 150 : era === 5 ? 120 : 95;
}

/** Keep cannon smoke and capture glints alive after the projectile or first ring has vanished. */
export function effectLifetime(effect: BattleEffect, era: number): number {
  if (effect.kind === 'shot') return flightDuration(effect, era) + (effect.role === 'siege' ? 720 : era >= 4 ? 330 : 270);
  if (effect.kind === 'death') return 850;
  if (effect.kind === 'hit') return 370;
  if (effect.kind === 'capture') return 1320;
  if (effect.kind === 'build') return 1000;
  if (effect.kind === 'deploy') return 820;
  if (effect.kind === 'ability' || effect.kind === 'rally' || effect.kind === 'recon') return 1150;
  if (effect.kind === 'alert') return 1050;
  return 510;
}

function segment(g: G, a: Vec, b: Vec, color: number, alpha: number, width = 1): void {
  if (alpha <= .008) return;
  g.lineStyle(width, color, clamp(alpha)).lineBetween(a.x, a.y, b.x, b.y);
}
function polygon(g: G, points: Vec[], color: number, alpha: number): void {
  if (alpha > .008) g.fillStyle(color, clamp(alpha)).fillPoints(points, true);
}
function ring(g: G, p: Vec, radius: number, color: number, alpha: number, width = 1, ratio = .43): void {
  if (alpha > .008) g.lineStyle(width, color, clamp(alpha)).strokeEllipse(p.x, p.y, radius * 2, radius * 2 * ratio);
}
function cross(g: G, p: Vec, radius: number, color: number, alpha: number, width = 1): void {
  segment(g, { x: p.x - radius, y: p.y }, { x: p.x + radius, y: p.y }, color, alpha, width);
  segment(g, { x: p.x, y: p.y - radius }, { x: p.x, y: p.y + radius }, color, alpha, width);
}
function star(g: G, p: Vec, radius: number, color: number, alpha: number): void {
  polygon(g, [
    { x: p.x, y: p.y - radius }, { x: p.x + radius * .23, y: p.y - radius * .22 },
    { x: p.x + radius, y: p.y }, { x: p.x + radius * .22, y: p.y + radius * .22 },
    { x: p.x, y: p.y + radius }, { x: p.x - radius * .22, y: p.y + radius * .22 },
    { x: p.x - radius, y: p.y }, { x: p.x - radius * .23, y: p.y - radius * .22 },
  ], color, alpha);
}
function glow(g: G, p: Vec, radius: number, color: number, alpha: number, simple: boolean): void {
  g.fillStyle(color, clamp(alpha * .1)).fillCircle(p.x, p.y, radius);
  if (!simple) g.fillStyle(color, clamp(alpha * .2)).fillCircle(p.x, p.y, radius * .58);
  g.fillStyle(0xf1fff1, clamp(alpha * .8)).fillCircle(p.x, p.y, radius * .17);
}
function dust(g: G, p: Vec, t: number, seed: number, era: number, siege: boolean, simple: boolean): void {
  if (t < 0 || t > 1) return;
  const n = simple ? 2 : siege ? 5 : 3, size = siege ? 1.7 : 1;
  for (let i = 0; i < n; i++) {
    const a = random(seed, i + 4) * Math.PI * 2;
    const distance = (5 + random(seed, i + 22) * 12) * ease(t) * size;
    const x = p.x + Math.cos(a) * distance, y = p.y + Math.sin(a) * distance * .4 - t * (siege ? 13 : 7);
    g.fillStyle(DUST[era], (1 - t) * (siege ? .25 : .31)).fillEllipse(x, y, (3 + t * 8) * size, (2 + t * 5) * size);
  }
}
function sparks(g: G, p: Vec, t: number, seed: number, color: number, large: boolean, simple: boolean): void {
  if (t < 0 || t > 1) return;
  const count = simple ? 2 : large ? 7 : 4;
  for (let i = 0; i < count; i++) {
    const a = random(seed, i) * Math.PI * 2;
    const travel = (large ? 12 : 5) + random(seed, 17 + i) * (large ? 22 : 12);
    const d = ease(t) * travel;
    const start = { x: p.x + Math.cos(a) * Math.max(0, d - (1 - t) * 5), y: p.y + Math.sin(a) * Math.max(0, d - (1 - t) * 5) * .7 + t * t * 13 };
    const end = { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * .7 + t * t * 13 };
    segment(g, start, end, i % 3 === 0 ? 0xfff3c2 : color, (1 - t) * .95, large ? 1.8 : 1.2);
  }
}
function impact(g: G, p: Vec, t: number, e: BattleEffect, era: number, simple: boolean): void {
  if (t < 0 || t > 1) return;
  const siege = e.role === 'siege', energy = era === 7, color = TEAM[sideOf(e)];
  if (energy) {
    if (t < .55) {
      glow(g, { x: p.x, y: p.y - 9 }, (siege ? 29 : 12) * (1 - t), color, 1 - t, simple);
      ring(g, p, 4 + ease(t) * (siege ? 41 : 15), color, (1 - t) * .75, siege ? 2.2 : 1.2);
    }
    sparks(g, { x: p.x, y: p.y - 8 }, t, e.seed, color, siege, simple);
  } else if (siege && era >= 4) {
    if (t < .43) {
      const scale = Math.sin(clamp(t / .43) * Math.PI);
      g.fillStyle(0xf7b06b, (1 - t) * .55).fillCircle(p.x, p.y - 10, 6 + scale * 13);
      g.fillStyle(0xffedb6, (1 - t) * .85).fillCircle(p.x - 2, p.y - 12, 3 + scale * 7);
      if (!simple) ring(g, p, 6 + ease(t) * 37, 0xe6c496, (1 - t) * .4, 1.3);
    }
    dust(g, p, t, e.seed, era, true, simple);
    sparks(g, { x: p.x, y: p.y - 7 }, t, e.seed, 0xf2c48a, true, simple);
  } else {
    if (t < .24) star(g, { x: p.x, y: p.y - 17 }, (1 - t / .24) * (siege ? 13 : 6), 0xf1dfad, .9);
    dust(g, p, t, e.seed, era, siege, simple);
    if (era > 2 || siege) sparks(g, { x: p.x, y: p.y - 11 }, t, e.seed, 0xc6d0bd, siege, simple);
  }
}

function drawShot(g: G, e: BattleEffect, p: Vec, q: Vec, age: number, era: number, simple: boolean): void {
  const duration = flightDuration(e, era), t = clamp(age / duration), siege = e.role === 'siege';
  const side = sideOf(e), color = TEAM[side], sourceHeight = siege ? 43 : 36, targetHeight = siege ? 7 : 23;
  const source = { x: p.x, y: p.y - sourceHeight }, destination = { x: q.x, y: q.y - targetHeight };
  const dx = destination.x - source.x, dy = destination.y - source.y;
  const arc = era < 4 ? siege ? 65 : era === 2 ? 22 : 30 : siege && era < 7 ? 45 : 0;
  const point = (fraction: number): Vec => ({ x: source.x + dx * fraction, y: source.y + dy * fraction - Math.sin(fraction * Math.PI) * arc });
  const projectile = point(t), theta = Math.atan2(dy - Math.cos(t * Math.PI) * Math.PI * arc, dx);
  const direction = { x: Math.cos(theta), y: Math.sin(theta) }, normal = { x: -direction.y, y: direction.x };
  const local = (forward: number, across = 0): Vec => ({ x: projectile.x + direction.x * forward + normal.x * across, y: projectile.y + direction.y * forward + normal.y * across });
  const tail = Math.min(1, age / (era === 4 ? 140 : 85));
  if (era >= 4 && era < 7 && age < (siege ? 180 : 105)) {
    const intensity = 1 - tail;
    const barrel = { x: source.x + Math.cos(theta) * 18, y: source.y + Math.sin(theta) * 18 };
    star(g, barrel, (siege ? 15 : era === 4 ? 9 : 6) * intensity, 0xffebbc, intensity);
    if (!simple && siege) glow(g, barrel, 21 * intensity, 0xf6c27e, intensity * .5, false);
  }
  // Powder hangs locally, while modern infantry produces only a short flash.
  if (era >= 4 && era <= 5 && age < 360 && !simple) {
    const smoke = age / 360;
    g.fillStyle(0xddd8bf, (1 - smoke) * (siege ? .23 : .15)).fillEllipse(source.x + dx * .025 + smoke * 6, source.y - smoke * 13, 4 + smoke * (siege ? 24 : 14), 3 + smoke * 11);
  }
  if (age < duration) {
    if (era === 7) {
      if (siege) {
        const trail = point(Math.max(0, t - .18));
        segment(g, trail, projectile, color, .12, 12);
        segment(g, trail, projectile, color, .54, 4);
        glow(g, projectile, 12, color, .95, simple);
        g.fillStyle(TEAM_LIGHT[side], .96).fillEllipse(projectile.x, projectile.y, 6.5, 5);
      } else {
        const back = point(Math.max(0, t - (e.role === 'ranged' ? .56 : .27)));
        if (!simple) segment(g, back, projectile, color, .12, 7);
        segment(g, back, projectile, color, .74, e.role === 'ranged' ? 2.4 : 2);
        segment(g, back, projectile, TEAM_LIGHT[side], .94, .85);
        g.fillStyle(0xeefff0, 1).fillCircle(projectile.x, projectile.y, 1.8);
      }
    } else if (era === 6 && siege) {
      const back = point(Math.max(0, t - .2));
      segment(g, back, projectile, 0xd1cdb4, .25 * (1 - t * .25), simple ? 2 : 4);
      if (!simple) {
        const older = point(Math.max(0, t - .35));
        segment(g, older, back, 0xb9c1af, .13, 6);
      }
      segment(g, local(-10), local(-3), 0xf4c58a, .96, 2.5);
      segment(g, local(-3), local(5), 0xe0e4cd, 1, 3.1);
      polygon(g, [local(9), local(3, -2.1), local(3, 2.1)], 0xc8d6c8, 1);
      polygon(g, [local(-2,-1),local(-7,-4),local(-6,0),local(-7,4),local(-2,1)],0x839b8a,.9);
    } else if (siege) {
      const back = point(Math.max(0, t - .07));
      segment(g, back, projectile, era < 4 ? 0xc7c6aa : 0xead4a9, .36, 1.2);
      g.fillStyle(0x203538, .95).fillCircle(projectile.x + .8, projectile.y + 1, era < 4 ? 4.1 : 3.5);
      g.fillStyle(era < 4 ? 0xa4b09a : 0xb7c5b5, 1).fillCircle(projectile.x - .5, projectile.y - .7, era < 4 ? 3.6 : 2.7);
      if (!simple) g.fillStyle(0xdde1c7,.8).fillCircle(projectile.x-1.5,projectile.y-1.6,.9);
      if (era < 4) ring(g, { x: projectile.x, y: p.y + (q.y - p.y) * t + 1 }, 3 + Math.sin(t * Math.PI) * 2, 0x243c36, .19, 1);
    } else if (era === 0) {
      segment(g, point(Math.max(0, t - .085)), projectile, 0xddd2ad, .4, 1);
      g.fillStyle(0xc3c9b2,1).fillCircle(projectile.x,projectile.y,2.3);
      g.fillStyle(0x6b8072,.95).fillCircle(projectile.x+.7,projectile.y+.6,1.5);
    } else if (era < 4) {
      const length = era === 2 ? 21 : 15;
      segment(g, local(-length), local(0), 0x3b4435, 1, 2);
      segment(g, local(-length), local(0), 0xddc391, 1, 1);
      polygon(g, [local(5), local(-1,-2), local(-1,2)], 0xdde1cc, 1);
      if (!simple) {
        polygon(g, [local(-length+4),local(-length-1,-3),local(-length-1,-.6),local(-length+2)], TEAM_LIGHT[side],.96);
        polygon(g, [local(-length+4),local(-length-1,3),local(-length-1,.6),local(-length+2)], 0x9fbaa4,.9);
      }
    } else {
      const trace = point(Math.max(0, t - .2));
      segment(g, trace, projectile, 0xeac590, era === 4 ? .78 : .56, era === 4 ? 1.25 : .95);
      g.fillStyle(0xffedba, .95).fillCircle(projectile.x, projectile.y, 1.2);
    }
  } else {
    const impactTime = (age - duration) / (siege ? 720 : era >= 4 ? 330 : 270);
    impact(g, { x: q.x, y: q.y }, impactTime, e, era, simple);
  }
}

function deployment(g: G, p: Vec, t: number, color: number, era: number, simple: boolean): void {
  const alpha = Math.sin(Math.PI * t), r = 8 + ease(t) * 17;
  ring(g, p, r, color, alpha * .58, 1.5);
  if (!simple) ring(g, p, Math.max(2, r - 5), 0xe9e2bf, alpha * .3, .8);
  if (era === 7) {
    for (const x of [-12, 0, 12]) segment(g, { x: p.x + x, y: p.y - 2 }, { x: p.x + x, y: p.y - (13 + t * 32) }, color, (1 - t) * .4, 1.3);
    ring(g, { x: p.x, y: p.y - t * 46 }, 11, color, (1 - t) * .5, 1);
  } else {
    const count = simple ? 2 : 4;
    for (let n = 0; n < count; n++) {
      const x = p.x - 12 + n * (24 / (count - 1)), y = p.y - t * 24 - n % 2 * 5;
      star(g, { x, y }, 2.5 * alpha, n % 2 ? color : 0xede1b7, alpha * .8);
    }
  }
}
function build(g: G, p: Vec, t: number, color: number, simple: boolean): void {
  const alpha = Math.sin(Math.PI * t) * .65, height = 13 + ease(t) * 28, w = 17, d = 7;
  const bottom = [{ x:p.x-w,y:p.y },{ x:p.x,y:p.y+d },{ x:p.x+w,y:p.y },{ x:p.x,y:p.y-d }];
  const top = bottom.map(q=>({x:q.x,y:q.y-height}));
  g.lineStyle(1,color,alpha).strokePoints(bottom,true).strokePoints(top,true);
  for (const n of simple ? [0,2] : [0,1,2]) segment(g,bottom[n],top[n],color,alpha,.8);
  if (!simple) {
    segment(g,bottom[0],top[1],color,alpha*.45,.8);segment(g,bottom[1],top[2],color,alpha*.45,.8);
    const spark={x:p.x+Math.sin(t*14)*13,y:p.y-height-3};star(g,spark,3.5*(1-t),0xffe7a9,1-t);
  }
  ring(g,p,12+t*22,color,(1-t)*.38,1);
}
function recon(g: G, p: Vec, t: number, color: number, simple: boolean): void {
  const r=10+ease(t)*52,alpha=(1-t)*.67;
  ring(g,p,r,color,alpha,1.5);
  if(!simple)ring(g,p,r*.76,color,alpha*.25,.8);
  const a=t*Math.PI*2.3-Math.PI/2;
  segment(g,p,{x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.43},color,alpha,1.5);
  const points:Vec[]=[];
  for(let n=0;n<=7;n++){const q=a-.5+n/7*.5;points.push({x:p.x+Math.cos(q)*r,y:p.y+Math.sin(q)*r*.43});}
  if(!simple)polygon(g,[p,...points],color,alpha*.1);
  g.fillStyle(0xe8ffe3,alpha).fillCircle(p.x,p.y,2);
  // The sweep is decorative: it never creates dots at unseen enemy positions.
}
function rally(g: G, p: Vec, t: number, color: number, simple: boolean): void {
  const alpha=Math.sin(Math.PI*t),r=12+ease(t)*31;
  ring(g,p,r,color,alpha*.62,1.6);
  if(!simple)ring(g,p,r-5,0xf1e4bb,alpha*.2,.7);
  for(let n=0;n<4;n++){
    const a=n*Math.PI/2+t*.5;const x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r*.43;
    polygon(g,[{x:x+Math.cos(a)*5,y:y+Math.sin(a)*2.2},{x:x-Math.sin(a)*3,y:y+Math.cos(a)*1.5},{x:x+Math.sin(a)*3,y:y-Math.cos(a)*1.5}],color,alpha*.8);
  }
  if(!simple){const y=p.y-11-t*25;star(g,{x:p.x,y},5*alpha,0xece9bd,alpha*.85);}
}
function capture(g: G, p: Vec, t: number, color: number, simple: boolean): void {
  const alpha=1-t;
  ring(g,p,15+ease(t)*59,color,alpha*.58,2);
  if(!simple)ring(g,p,8+ease(Math.max(0,t-.14))*45,0xe4d5a7,alpha*.38,1);
  const count=simple?3:6;
  for(let n=0;n<count;n++){
    const a=n/count*Math.PI*2,r=19+t*22;
    const q={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.4-t*36};
    segment(g,q,{x:q.x,y:q.y+4+alpha*4},n%2?color:0xf0dfad,alpha*.7,1.4);
  }
  if(t<.45)star(g,{x:p.x,y:p.y-46-t*18},(1-t/.45)*8,0xffe3a7,(1-t/.45)*.8);
}
function order(g: G, p: Vec, t: number, color: number): void {
  const r=7+ease(t)*13,alpha=(1-t)*.85;
  const points=[{x:p.x,y:p.y-r*.45},{x:p.x+r,y:p.y},{x:p.x,y:p.y+r*.45},{x:p.x-r,y:p.y}];
  g.lineStyle(1.2,color,alpha).strokePoints(points,true);
  g.fillStyle(color,alpha*.75).fillCircle(p.x,p.y,Math.max(.6,2*(1-t)));
}

/** Bounded procedural FX: no filters, textures, random state, simulation reads or hidden targets. */
export function drawBattleEffects(
  graphics: G,
  effects: BattleEffect[],
  time: number,
  era: number,
  world: (point: Vec) => Vec,
  frameMs: number,
): void {
  era=Math.floor(clamp(era,0,7));
  const simple=frameMs>34,limit=simple?40:100;
  // The caller clears this shared graphics object before the frame and discards expired events.
  for(let i=Math.max(0,effects.length-limit);i<effects.length;i++){
    const e=effects[i],age=time-e.birth,lifetime=effectLifetime(e,era);
    if(age<0||age>=lifetime)continue;
    const t=clamp(age/lifetime),p=world(e),color=TEAM[sideOf(e)];
    if(e.kind==='shot'&&e.target){drawShot(graphics,e,p,world(e.target),age,era,simple);continue;}
    if(e.kind==='hit'){
      impact(graphics,p,t,e,era,simple);continue;
    }
    if(e.kind==='death'){
      dust(graphics,p,t,e.seed,era,true,simple);
      if(era>=5)sparks(graphics,{x:p.x,y:p.y-14},t,e.seed,era===7?color:0xdbcca3,false,simple);
      if(!simple)ring(graphics,p,4+ease(t)*23,era===7?color:0xc9c6a5,(1-t)*.2,.8);
      continue;
    }
    if(e.kind==='capture'){capture(graphics,p,t,color,simple);continue;}
    if(e.kind==='deploy'){deployment(graphics,p,t,color,era,simple);continue;}
    if(e.kind==='build'){build(graphics,p,t,color,simple);continue;}
    if(e.kind==='recon'||(e.kind==='ability'&&e.role==='scout')){recon(graphics,p,t,color,simple);continue;}
    if(e.kind==='ability'&&e.role==='engineer'){build(graphics,p,t,color,simple);continue;}
    if(e.kind==='ability'||e.kind==='rally'){rally(graphics,p,t,color,simple);continue;}
    if(e.kind==='alert'){
      const y=p.y-71-Math.sin(t*Math.PI)*6,alpha=Math.sin(t*Math.PI);
      graphics.lineStyle(1.5,0xf4c987,alpha*.86).strokePoints([{x:p.x,y:y-8},{x:p.x+7,y},{x:p.x,y:y+8},{x:p.x-7,y}],true);
      segment(graphics,{x:p.x,y:y-3},{x:p.x,y:y+1},0xffe4b4,alpha,1.8);
      graphics.fillStyle(0xffe4b4,alpha).fillCircle(p.x,y+4,1);
      if(!simple)ring(graphics,p,18+ease(t)*25,0xefbc7f,(1-t)*.3,1);
      continue;
    }
    order(graphics,p,t,color);
  }
}

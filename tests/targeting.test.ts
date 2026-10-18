import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { content } from '../src/content/index.js';
import { createBattle } from '../src/sim/engine.js';
import { checkTarget } from '../src/sim/targeting.js';

function fixture() {
  const mission = content.missions.find(m => m.era === 3 && m.roster.includes('engineer'))!;
  const skills = content.skills.map(s => s.id);
  const state = createBattle(mission, content, skills, []);
  const engineer = state.units.find(u => u.owner === 0)!;
  engineer.defId = content.eras[mission.era]!.units.find(u => u.role === 'engineer')!.id;
  return { mission, state, engineer };
}
test('target preview rejects out-of-bounds and fogged spells but recon can reveal unknown ground', () => {
  const { mission, state } = fixture();
  const point = { x: mission.map[0]!.length - 2, y: 1 };
  state.fog[0].visible.fill(false);
  assert.equal(checkTarget(state, content, { kind: 'volley', ids: [] }, point).valid, false);
  assert.equal(checkTarget(state, content, { kind: 'recon', ids: [] }, point).valid, true);
  assert.equal(checkTarget(state, content, { kind: 'recon', ids: [] }, { x: -1, y: 1 }).valid, false);
  assert.equal(checkTarget(state, content, { kind: 'recon', ids: [] }, { x: NaN, y: 1 }).valid, false);
});
test('construction preview validates engineers, terrain, clear space and actual discounted cost', () => {
  const { mission, state, engineer } = fixture(); state.fog[0].visible.fill(true);
  let point = { x: 0, y: 0 };
  outer: for (let y=0;y<mission.map.length;y++) for(let x=0;x<mission.map[0]!.length;x++) {
    const testPoint={x,y}; if (checkTarget(state,content,{kind:'tower',ids:[engineer.id]},testPoint).valid) { point=testPoint; break outer; }
  }
  const target = { kind: 'tower' as const, ids: [engineer.id] };
  assert.equal(checkTarget(state,content,target,{x:-.3,y:point.y}).valid,false);
  const check = checkTarget(state, content, target, point); assert.equal(check.valid, true); assert.ok(check.cost < 65);
  assert.equal(checkTarget(state, content, { ...target, ids: [] }, point).valid, false);
  state.structures.push({id:'test',owner:0,kind:'barrier',hp:100,maxHp:100,built:0,...point});
  assert.equal(checkTarget(state, content, target, point).valid, false);
  state.structures=[];state.factions[0].resources=check.cost-1;
  assert.equal(checkTarget(state, content, target, point).valid, false);
});
test('construction preview never leaks hidden enemy construction', () => {
  const { state, engineer } = fixture(); const target={kind:'tower' as const,ids:[engineer.id]};
  const point={x:12,y:12};state.fog[0].visible.fill(false);
  const before=checkTarget(state,content,target,point);
  state.structures.push({id:'hidden',owner:1,kind:'tower',hp:100,maxHp:100,built:1,...point});
  assert.deepEqual(checkTarget(state,content,target,point),before);
});
test('target preview enforces ownership, skill, cooldown and affordability', () => {
  const { state, engineer } = fixture(); const point={x:engineer.x,y:engineer.y};
  assert.equal(checkTarget(state,content,{kind:'attack',ids:[]},point).valid,false);
  state.factions[0].skills=[];
  assert.equal(checkTarget(state,content,{kind:'recon',ids:[]},point).valid,false);
  state.factions[0].skills=content.skills.map(s=>s.id);state.factions[0].cooldowns.recon=10;
  assert.equal(checkTarget(state,content,{kind:'recon',ids:[]},point).valid,false);
  state.factions[0].cooldowns.recon=0;state.factions[0].resources=0;
  assert.equal(checkTarget(state,content,{kind:'recon',ids:[]},point).valid,false);
});

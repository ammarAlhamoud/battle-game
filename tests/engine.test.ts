import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { BattleState, GameContent, MissionDef, Role, Side, SkillDef, Unit, UnitDef } from '../src/contracts.js';
import { applyCommand, capacity, createBattle, RULES, stepBattle, unitVisible, unlockedUnits, usage } from '../src/sim/engine.js';

const makeDef = (role: Role, extra: Partial<UnitDef> = {}): UnitDef => ({ id: `e1-${role}`, era: 0, name: role, role, description: role,
  hp: 100, damage: 12, armor: 2, attackTime: 1, range: 1.4, speed: 2, cost: 20, capacity: 1,
  training: 1, vision: 6, capture: 1, stealth: false, detection: 0, splash: 0, counters: {}, ...extra });
const skill = (id: string, effect: SkillDef['effect'], value: number): SkillDef => ({ id, name: id, description: id, era: null, cost: 1, prerequisites: [], effect, value, x: 0, y: 0 });
function fixture(patch: Partial<MissionDef> = {}): { mission: MissionDef; content: GameContent; state: BattleState } {
  const mission: MissionDef = { id: 'e1m1', era: 0, index: 0, name: 'test', subtitle: '', briefing: '', concept: '', finale: false, seed: 42,
    map: Array.from({ length: 18 }, () => '.'.repeat(24)),
    strongholds: [
      { id: 'a', x: 3, y: 13, name: 'A', kind: 'main', owner: 0, capacity: 0, reward: 80, vision: 7 },
      { id: 'b', x: 20, y: 3, name: 'B', kind: 'main', owner: 1, capacity: 0, reward: 80, vision: 7 },
      { id: 'c', x: 11, y: 9, name: 'C', kind: 'outpost', owner: null, capacity: 3, reward: 50, vision: 5 }],
    resources: [300, 300], capacity: 8, reserveCapacity: 3, starting: [['frontline'], ['frontline']],
    roster: ['frontline', 'ranged', 'guard', 'scout', 'stealth', 'siege', 'engineer'],
    ai: { aggression: .5, expansion: .5, defense: .5, scout: .5, preferred: ['frontline'] }, thresholds: [500, 1000, 1500], parTime: 240, ...patch };
  const units = [makeDef('frontline'), makeDef('ranged', { range: 5, hp: 65, counters: { frontline: 1.4 } }),
    makeDef('guard', { hp: 150, armor: 7 }), makeDef('scout', { speed: 3, vision: 9, detection: 5 }),
    makeDef('stealth', { stealth: true, skill: 'sneak' }), makeDef('siege', { range: 6, splash: 1.6, capacity: 3, cost: 70 }),
    makeDef('engineer', { capture: .5 })];
  const content: GameContent = { eras: [{ id: 0, name: 'Test', subtitle: '', years: '', color: '', ground: '', accent: '', description: '', art: '', units }], missions: [mission],
    skills: [skill('parallel', 'lines', 1), skill('capacity', 'capacity', 3), skill('reserve', 'reserve', 2), skill('train', 'training', .25),
      skill('sneak', 'stealth', .2), skill('doctrine', 'formations', 1), skill('rally', 'rally', 1), skill('recon', 'recon', 1), skill('volley', 'volley', 1)] };
  return { mission, content, state: createBattle(mission, content, [], []) };
}
function ticks(state: BattleState, content: GameContent, count: number): void { for (let i = 0; i < count; i++) stepBattle(state, content); }
function own(state: BattleState, side: Side = 0): Unit { return state.units.find(u => u.owner === side)!; }

test('resources have no passive income; production charges exact costs and cancellation distinguishes started jobs', () => {
  const { state, content } = fixture(); const before = state.factions[0].resources;
  ticks(state, content, 50); assert.equal(state.factions[0].resources, before);
  applyCommand(state, { type: 'recruit', side: 0, unitId: 'e1-frontline' }, content);
  const first = state.factions[0].lines[0]!.queue[0]!; assert.equal(state.factions[0].resources, before - 20);
  applyCommand(state, { type: 'cancelTraining', side: 0, line: 0, jobId: first.id }, content); assert.equal(state.factions[0].resources, before);
  applyCommand(state, { type: 'recruit', side: 0, unitId: 'e1-frontline' }, content); stepBattle(state, content);
  const second = state.factions[0].lines[0]!.queue[0]!; assert.equal(second.started, true);
  applyCommand(state, { type: 'cancelTraining', side: 0, line: 0, jobId: second.id }, content);
  assert.equal(state.factions[0].resources, before - 10); assert.equal(state.factions[0].earned, 0);
});

test('parallel lines progress independently; reserve saturation blocks only one line and resumes automatically', () => {
  const { mission, content } = fixture({ capacity: 1, reserveCapacity: 1 });
  const state = createBattle(mission, content, ['parallel'], []);
  applyCommand(state, { type: 'autoDeploy', side: 0, value: false }, content);
  for (const line of [0, 1]) applyCommand(state, { type: 'recruit', side: 0, unitId: 'e1-frontline', line }, content);
  ticks(state, content, 11);
  assert.equal(state.factions[0].reserves.length, 1); assert.equal(state.factions[0].lines[1]!.blocked, true);
  assert.equal(state.factions[0].lines[0]!.queue.length, 0);
  state.units = state.units.filter(u => u.owner !== 0);
  applyCommand(state, { type: 'deploy', side: 0 }, content); stepBattle(state, content);
  assert.equal(state.factions[0].lines[1]!.blocked, false); assert.equal(state.factions[0].reserves.length, 1);
});

test('reserve fallback preserves priority and manual mode while obeying capacity', () => {
  const { state, content } = fixture({ capacity: 2 });
  state.factions[0].autoDeploy = false;
  state.factions[0].reserves = [{ id: 'r100', unitId: 'e1-siege' }, { id: 'r101', unitId: 'e1-frontline' }, { id: 'r102', unitId: 'e1-frontline' }];
  stepBattle(state, content); assert.equal(state.factions[0].reserves.length, 3);
  applyCommand(state, { type: 'deploy', side: 0 }, content);
  assert.deepEqual(state.factions[0].reserves.map(r => r.id), ['r100', 'r102']); assert.equal(usage(state, 0, content), 2);
});

test('lost capacity blocks further deployment without changing existing unit strength', () => {
  const { state, content } = fixture({ capacity: 1 }); const outpost = state.strongholds.find(s => s.id === 'c')!; outpost.owner = 0;
  assert.equal(capacity(state, 0, content), 4);
  for (let i = 0; i < 2; i++) { applyCommand(state, { type: 'recruit', side: 0, unitId: 'e1-frontline' }, content); ticks(state, content, 11); }
  const health = state.units.filter(u => u.owner === 0).map(u => u.hp); outpost.owner = 1;
  assert.equal(capacity(state, 0, content), 1); assert.equal(usage(state, 0, content), 3);
  stepBattle(state, content); assert.deepEqual(state.units.filter(u => u.owner === 0).map(u => u.hp), health);
});

test('capture is gradual, contested and reversible; first capture reward cannot be farmed by recapture', () => {
  const { state, content } = fixture(); const point = state.strongholds.find(s => s.id === 'c')!, soldier = own(state);
  soldier.x = point.x - 1; soldier.y = point.y; soldier.orders = [{ kind: 'defend', x: soldier.x, y: soldier.y }];
  ticks(state, content, 20); assert.ok(point.progress > 0 && point.progress < 100);
  const defender = own(state, 1); defender.x = point.x + 1; defender.y = point.y; defender.orders = [{ kind: 'defend', x: defender.x, y: defender.y }];
  const progress = point.progress; ticks(state, content, 5); assert.equal(point.progress, progress);
  soldier.x = 3; soldier.y = 12; soldier.orders = [{ kind: 'defend', x: 3, y: 12 }]; ticks(state, content, 20); assert.ok(point.progress < progress);
  defender.x = 20; defender.y = 4; defender.orders = [{ kind: 'defend', x: 20, y: 4 }]; soldier.x = point.x - 1; soldier.y = point.y;
  soldier.orders = [{ kind: 'defend', x: soldier.x, y: soldier.y }];
  const funds = state.factions[0].resources; ticks(state, content, 160); assert.equal(point.owner, 0); assert.equal(state.factions[0].resources, funds + 50);
  point.owner = 1; point.progress = 99.8; point.capturing = 0; stepBattle(state, content); assert.equal(point.owner, 0); assert.equal(state.factions[0].resources, funds + 50);
});

test('main capture wins; main buildings cannot be destroyed by attack', () => {
  const { state, content } = fixture(); const enemyMain = state.strongholds.find(s => s.id === 'b')!;
  own(state, 1).x = 1; own(state, 1).y = 1; const u = own(state); u.x = enemyMain.x - 1; u.y = enemyMain.y;
  u.orders = [{ kind: 'capture', target: enemyMain.id, x: enemyMain.x, y: enemyMain.y }];
  ticks(state, content, 260); assert.equal(state.winner, 0); assert.equal(state.ended, true); assert.equal(enemyMain.owner, 0);
});

test('military collapse considers viable queues, reserves and affordable replacement', () => {
  const { state, content } = fixture(); state.units = state.units.filter(u => u.owner !== 0); state.factions[0].resources = 20;
  stepBattle(state, content); assert.equal(state.ended, false);
  applyCommand(state, { type: 'recruit', side: 0, unitId: 'e1-frontline' }, content); stepBattle(state, content); assert.equal(state.ended, false);
  ticks(state, content, 12); assert.ok(state.units.some(u => u.owner === 0));
  state.units = state.units.filter(u => u.owner !== 0); state.factions[0].resources = 0; state.factions[0].reserves = [{ id: 'r999', unitId: 'e1-frontline' }];
  state.factions[0].autoDeploy = false; stepBattle(state, content); assert.equal(state.ended, false);
  state.factions[0].reserves = []; stepBattle(state, content); assert.equal(state.winner, 1);
});

test('pause freezes movement/combat/production/capture/AI/cooldowns while allowing command planning and deferred deploy', () => {
  const { state, content } = fixture(); applyCommand(state, { type: 'recruit', side: 0, unitId: 'e1-frontline' }, content);
  state.factions[0].reserves.push({ id: 'r900', unitId: 'e1-frontline' }); state.factions[0].cooldowns.recon = 10;
  applyCommand(state, { type: 'pause', value: true }, content); const tick = state.tick, time = state.time, count = state.units.length;
  applyCommand(state, { type: 'order', side: 0, ids: [own(state).id], order: { kind: 'move', x: 8, y: 12 } }, content);
  applyCommand(state, { type: 'deploy', side: 0 }, content); ticks(state, content, 50);
  assert.equal(state.tick, tick); assert.equal(state.time, time); assert.equal(state.units.length, count); assert.equal(state.factions[0].cooldowns.recon, 10);
  assert.equal(own(state).orders.length, 1); assert.equal(state.factions[0].lines[0]!.queue[0]!.remaining, 1);
  applyCommand(state, { type: 'pause', value: false }, content); stepBattle(state, content); assert.equal(state.units.length, count + 1);
});

test('combat obeys counters, cover and nonnegative armor damage; kills award finite resources with diminishing score only', () => {
  const { state, content } = fixture(); const attacker = own(state), victim = own(state, 1); attacker.x = 10; attacker.y = 10; victim.x = 11; victim.y = 10;
  attacker.orders = [{ kind: 'defend', x: 10, y: 10 }]; victim.orders = [{ kind: 'defend', x: 11, y: 10 }];
  victim.hp = 1; const resources = state.factions[0].resources; stepBattle(state, content);
  assert.equal(state.factions[0].resources, resources + 9); assert.equal(state.factions[0].kills['e1-frontline'], 1);
  const first = state.factions[0].score;
  for (let i = 0; i < 2; i++) {
    state.units.push({ ...victim, id: `enemy${i}`, hp: 1, orders: [], route: [] }); attacker.cooldown = 0; stepBattle(state, content);
  }
  assert.equal(state.factions[0].resources, resources + 27); assert.ok(state.factions[0].score - first < first * 2);
  assert.ok(state.events.length <= 80);
});

test('stealth obeys fog and detector rules symmetrically; attacking reveals ambushers temporarily', () => {
  const { state, content } = fixture(); const observer = own(state), hidden = own(state, 1);
  observer.x = 10; observer.y = 10; observer.orders = [{ kind: 'defend', x: 10, y: 10 }]; hidden.x = 13; hidden.y = 10; hidden.defId = 'e1-stealth'; hidden.orders = [{ kind: 'defend', x: 13, y: 10 }];
  stepBattle(state, content); assert.equal(unitVisible(state, hidden, 0, content), false);
  observer.defId = 'e1-scout'; stepBattle(state, content); assert.equal(unitVisible(state, hidden, 0, content), true);
  observer.defId = 'e1-frontline'; hidden.lastHit = state.time; assert.equal(unitVisible(state, hidden, 0, content), true);
  hidden.x = 22; hidden.y = 16; stepBattle(state, content); assert.equal(unitVisible(state, hidden, 0, content), false);
});

test('skills affect capacity/reserves/parallel training and lock era roster and advanced formations', () => {
  const { mission, content } = fixture(); const state = createBattle(mission, content, ['capacity', 'reserve', 'parallel', 'train', 'sneak', 'doctrine'], []);
  assert.equal(capacity(state, 0, content), 11); assert.equal(state.factions[0].reserveCapacity, 5); assert.equal(state.factions[0].lines.length, 2);
  assert.ok(unlockedUnits(state, 0, content).some(u => u.role === 'stealth'));
  applyCommand(state, { type: 'recruit', side: 0, unitId: 'e1-frontline' }, content); assert.equal(state.factions[0].lines[0]!.queue[0]!.total, .75);
  applyCommand(state, { type: 'formation', side: 0, ids: [own(state).id], formation: 'shield' }, content); assert.equal(own(state).formation, 'shield');
  const basic = createBattle(mission, content, [], []); applyCommand(basic, { type: 'formation', side: 0, ids: [own(basic).id], formation: 'shield' }, content); assert.equal(own(basic).formation, 'line');
});

test('global abilities cost resources, respect unlocks/cooldowns/vision and pause; engineer construction is finite and destructible', () => {
  const { mission, content } = fixture(); const state = createBattle(mission, content, ['recon', 'rally', 'volley'], []);
  const funds = state.factions[0].resources; applyCommand(state, { type: 'ability', side: 0, ability: 'recon', x: 15, y: 10 }, content);
  assert.equal(state.factions[0].resources, funds - RULES.abilityCosts.recon); const after = state.factions[0].resources;
  applyCommand(state, { type: 'ability', side: 0, ability: 'recon', x: 15, y: 10 }, content); assert.equal(state.factions[0].resources, after);
  const engineer = own(state); engineer.defId = 'e1-engineer'; engineer.x = 8.3; engineer.y = 12;
  applyCommand(state, { type: 'build', side: 0, ids: [engineer.id], kind: 'barrier', x: 9, y: 12 }, content); ticks(state, content, 90);
  assert.equal(state.structures.length, 1); assert.equal(state.structures[0]!.built, 1); assert.equal(state.factions[0].resources, after - RULES.barrierCost);
  state.structures[0]!.hp = 0; stepBattle(state, content); assert.equal(state.structures.length, 0);
});

test('queued plans survive self-defense and complete movement; JSON restore continues deterministically including AI', () => {
  const { state, content } = fixture(); const u = own(state), e = own(state, 1); u.x = 8; u.y = 12; e.x = 9; e.y = 12; e.hp = 1;
  applyCommand(state, { type: 'order', side: 0, ids: [u.id], order: { kind: 'move', x: 12, y: 12 } }, content); stepBattle(state, content);
  assert.equal(u.orders[0]?.kind, 'move'); ticks(state, content, 40); assert.ok(u.x > 10);
  state.aiSides = [0, 1]; const restored = JSON.parse(JSON.stringify(state)) as BattleState;
  ticks(state, content, 50); ticks(restored, content, 50); assert.deepEqual(restored, state);
});

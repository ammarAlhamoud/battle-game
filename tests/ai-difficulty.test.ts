import test from 'node:test';
import assert from 'node:assert/strict';
import type { BattleState, Command, Difficulty, ObservedState, Role, Unit } from '../src/contracts.js';
import { content } from '../src/content/index.js';
import { decideAI } from '../src/sim/ai.js';
import { DIFFICULTIES, difficultyProfile } from '../src/sim/difficulty.js';
import { applyCommand, createBattle, stepBattle } from '../src/sim/engine.js';

function fixture(difficulty: Difficulty = 'relaxed', id = 'e1m1'): { o: ObservedState; state: BattleState } {
  const mission = content.missions.find(mission => mission.id === id)!;
  const state = createBattle(mission, content, [], []);
  const o: ObservedState = {
    side: 1, time: 0, tick: 0, own: state.units.filter(unit => unit.owner === 1), enemies: [],
    strongholds: state.strongholds, faction: state.factions[1], enemyMemory: {}, structures: state.structures,
    map: mission.map, mission, plan: state.ai[1], difficulty, aiGraceUntil: 0,
  };
  return { o, state };
}
const recruits = (commands: Command[]) => commands.filter(command => command.type === 'recruit');
const capacityOf = (o: ObservedState, id: string): number => content.eras[o.mission.era]!.units.find(def => def.id === id)!.capacity;
function projected(o: ObservedState): number {
  return o.own.reduce((total, unit) => total + capacityOf(o, unit.defId), 0)
    + o.faction.reserves.reduce((total, unit) => total + capacityOf(o, unit.unitId), 0)
    + o.faction.lines.reduce((total, line) => total + line.queue.reduce((sum, job) => sum + capacityOf(o, job.unitId), 0), 0);
}
function apply(state: BattleState, commands: Command[]): void { commands.forEach(command => applyCommand(state, command, content)); }

test('difficulty policies change tempo and tactics, with the original veteran default', () => {
  assert.equal(difficultyProfile(), DIFFICULTIES.veteran);
  assert.deepEqual(['relaxed', 'standard', 'veteran'].map(mode => {
    const p = difficultyProfile(mode as Difficulty);
    return [p.preparationSeconds, p.livePreparationSeconds, p.reactionSeconds, p.recruitSeconds, p.armyCapacityRatio];
  }), [[90, 45, 3, 12, .55], [30, 20, 2, 4, .8], [0, 0, 1, 1, 1]]);
  assert.equal(DIFFICULTIES.relaxed.scouting, false); assert.equal(DIFFICULTIES.relaxed.globalAbilities, false);
  assert.equal(DIFFICULTIES.standard.unitAbilitiesPerDecision, 1);
});

test('preparation withdraws distant soldiers, holds nearby soldiers and never pressures enemy territory', () => {
  const { o, state } = fixture(); o.time = 5; o.aiGraceUntil = 90;
  const home = o.strongholds.find(site => site.kind === 'main' && site.owner === 1)!;
  const distant = o.own[0]!; distant.x = 12; distant.y = 12;
  distant.orders = [{ kind: 'capture', x: 4, y: 19, target: 'e1m1-home' }];
  const commands = decideAI(o, content);
  assert.equal(o.plan.objective, home.id); assert.equal(o.plan.mode, 'defend'); assert.equal(o.plan.nextDecision, 8);
  assert.ok(!commands.some(command => ['ability', 'unitAbility', 'build'].includes(command.type)));
  const retreat = commands.find(command => command.type === 'editOrders' && command.ids.includes(distant.id));
  assert.ok(retreat?.type === 'editOrders');
  assert.deepEqual(retreat.orders.map(order => order.kind), ['move', 'defend']);
  assert.equal(retreat.orders[0]!.x, home.x); assert.equal(retreat.orders[1]!.target, home.id);
  for (const command of commands) if (command.type === 'order') assert.equal(command.order.kind, 'defend');
  apply(state, commands); o.time = 8;
  const repeated = decideAI(o, content);
  assert.ok(!repeated.some(command => command.type === 'editOrders' && command.ids.includes(distant.id)), 'an existing withdrawal is not continually restarted');
  assert.ok(!repeated.some(command => command.type === 'order' && command.order.kind === 'move'), 'soldiers already home do not receive a move loop');
});

test('a preparation period still permits normal self-defense against a visible invader', () => {
  const { o, state } = fixture(); o.aiGraceUntil = 90;
  const defender = o.own[0]!, invader = state.units.find(unit => unit.owner === 0)!;
  defender.x = 22; defender.y = 4; invader.x = 21; invader.y = 4;
  invader.orders = [{ kind: 'defend', x: 21, y: 4 }]; o.enemies = [invader];
  const before = invader.hp; apply(state, decideAI(o, content)); stepBattle(state, content);
  assert.ok(invader.hp < before, 'holding the main stronghold does not disable ordinary attacks');
  assert.ok(state.factions[1].damageDealt > 0);
});

test('the computer resumes ordinary objectives when preparation expires', () => {
  const { o, state } = fixture(); o.aiGraceUntil = 90; o.time = 89;
  apply(state, decideAI(o, content)); assert.equal(o.plan.mode, 'defend');
  o.time = 90;
  const commands = decideAI(o, content);
  assert.equal(o.plan.mode, 'expand');
  assert.ok(commands.some(command => command.type === 'order' && command.order.kind === 'capture'));
});

test('standard can detach a scout while relaxed keeps its army on one strategic objective', () => {
  const easy = fixture('relaxed', 'e1m4').o, middle = structuredClone(easy); middle.difficulty = 'standard';
  easy.faction.resources = 0; middle.faction.resources = 0;
  const scout = easy.own.find(unit => unit.defId === 'e1-scout')!;
  const easyOrders = decideAI(easy, content).filter(command => command.type === 'order');
  const middleOrders = decideAI(middle, content).filter(command => command.type === 'order');
  assert.equal(new Set(easyOrders.map(command => command.order.target)).size, 1);
  assert.ok(easyOrders.some(command => command.ids.includes(scout.id) && command.ids.length === easy.own.length));
  assert.ok(middleOrders.some(command => command.ids.includes(scout.id) && command.ids.length < middle.own.length));
  assert.ok(new Set(middleOrders.map(command => command.order.target)).size > 1);
});

test('relaxed and standard recruitment count deployed, queued and reserve capacity before every purchase', () => {
  for (const difficulty of ['relaxed', 'standard'] as const) {
    const { o } = fixture(difficulty);
    o.faction.baseCapacity = 20;
    const cap = Math.floor(20 * difficultyProfile(difficulty).armyCapacityRatio);
    const needed = cap - projected(o);
    o.faction.reserves = Array.from({ length: needed }, (_, index) => ({ id: `r${900 + index}`, unitId: 'e1-frontline' }));
    o.faction.lines.push({ id: 'extra-line', queue: [], blocked: false });
    o.faction.lines[0]!.queue.push({ id: 'j900', unitId: 'e1-guard', total: 7, remaining: 7, started: false });
    o.faction.reserves.splice(0, 2);
    assert.equal(projected(o), cap);
    assert.equal(recruits(decideAI(o, content)).length, 0, 'reserves and work on every line consume the soft target');
    o.faction.reserves.pop();
    const recruit = recruits(decideAI(o, content));
    assert.equal(recruit.length, 1); assert.equal(capacityOf(o, recruit[0]!.unitId), 1, 'a heavy unit cannot overrun the one remaining place');
    assert.ok(projected(o) + capacityOf(o, recruit[0]!.unitId) <= cap);
  }
});

test('the eased capacity target respects starting army capacity without increasing for an oversized existing army', () => {
  const { o } = fixture(); o.faction.baseCapacity = 6;
  o.own = o.own.slice(0, 3);
  assert.equal(projected(o), 3);
  assert.equal(recruits(decideAI(o, content)).length, 1, 'the target is at least the four starting capacity points');
  o.faction.lines[0]!.queue.push({ id: 'j901', unitId: 'e1-frontline', total: 4, remaining: 4, started: false });
  o.faction.reserves.push({ id: 'r901', unitId: 'e1-guard' });
  o.time = 100;
  assert.equal(projected(o), 6);
  assert.equal(recruits(decideAI(o, content)).length, 0, 'an existing over-target army does not enlarge the policy target');
});

test('eased modes recruit at most one soldier per decision and persist their purchase cadence', () => {
  for (const difficulty of ['relaxed', 'standard'] as const) {
    const { o, state } = fixture(difficulty);
    o.faction.lines.push({ id: 'extra-line', queue: [], blocked: false });
    const profile = difficultyProfile(difficulty);
    const first = decideAI(o, content); assert.equal(recruits(first).length, 1); apply(state, first);
    assert.equal(o.plan.nextRecruitAt, profile.recruitSeconds);
    const restored = structuredClone(o);
    for (const observation of [o, restored]) {
      observation.time = profile.reactionSeconds;
      assert.equal(recruits(decideAI(observation, content)).length, 0);
      observation.time = profile.recruitSeconds;
      assert.equal(recruits(decideAI(observation, content)).length, 1);
      assert.equal(observation.plan.nextRecruitAt, profile.recruitSeconds * 2);
    }
  }
});

function tacticalFixture(difficulty: Difficulty): ObservedState {
  const { o } = fixture(difficulty, 'e3m3'); o.time = 200;
  o.faction.resources = 1000;
  o.faction.skills = content.skills.filter(skill => skill.era === null || skill.era === o.mission.era).map(skill => skill.id);
  for (const site of o.strongholds) if (site.kind !== 'main') site.owner = 1;
  const roles: Role[] = ['frontline', 'ranged', 'guard', 'scout', 'stealth', 'siege', 'engineer'];
  const base = o.own[0]!;
  o.own = roles.map((role, index): Unit => {
    const def = content.eras[o.mission.era]!.units.find(unit => unit.role === role)!;
    return { ...structuredClone(base), id: `t${index}`, defId: def.id, hp: def.hp * (index < 2 ? .4 : 1), x: 11, y: 12 };
  });
  const ranged = content.eras[o.mission.era]!.units.find(unit => unit.role === 'ranged')!;
  o.enemies = [0, 1, 2].map(index => ({ ...structuredClone(base), id: `enemy${index}`, owner: 0, defId: ranged.id, hp: ranged.hp, x: 9 + index * .4, y: 14 }));
  return o;
}

test('relaxed disables advanced pressure while standard caps unit abilities to one per decision', () => {
  const relaxed = tacticalFixture('relaxed'); const easy = decideAI(relaxed, content);
  assert.ok(!easy.some(command => ['ability', 'unitAbility', 'build', 'editOrders'].includes(command.type)));
  const standard = tacticalFixture('standard'); const middle = decideAI(standard, content);
  assert.ok(middle.some(command => command.type === 'ability'), 'standard retains purchased global abilities');
  assert.equal(middle.find(command => command.type === 'unitAbility')?.ids.length, 1);
  assert.ok(!middle.some(command => command.type === 'editOrders'), 'standard does not create flanking assault queues');
  const veteran = tacticalFixture('veteran'); const hard = decideAI(veteran, content);
  assert.ok(hard.some(command => command.type === 'editOrders'), 'the original opponent retains observed-target flanking');
  assert.ok((hard.find(command => command.type === 'unitAbility')?.ids.length ?? 0) > 1);
});

test('missing difficulty preserves veteran commands and player-side automation cannot receive computer easing', () => {
  const explicit = tacticalFixture('veteran'), legacy = structuredClone(explicit);
  delete legacy.difficulty; delete legacy.aiGraceUntil;
  assert.deepEqual(decideAI(explicit, content), decideAI(legacy, content)); assert.deepEqual(explicit.plan, legacy.plan);
  assert.equal(legacy.plan.nextRecruitAt, undefined, 'legacy plans do not acquire a new recruitment throttle');
  const player = fixture('relaxed').o; player.side = 0;
  const normalPlayer = structuredClone(player); delete normalPlayer.difficulty;
  player.aiGraceUntil = 900;
  assert.deepEqual(decideAI(player, content), decideAI(normalPlayer, content));
});

test('difficulty decisions use only their observation and never alter battle resources, units or definitions', () => {
  const { o } = fixture(); const allowed = new Set(Object.keys(o));
  const own = structuredClone(o.own), faction = structuredClone(o.faction), definitions = structuredClone(content.eras[o.mission.era]!.units);
  const safe = new Proxy(o, { get(target, key, receiver) {
    assert.ok(typeof key !== 'string' || allowed.has(key), `hidden state access: ${String(key)}`);
    return Reflect.get(target, key, receiver);
  } });
  const commands = decideAI(safe, content);
  assert.ok(commands.every(command => command.type !== 'recruit' || content.eras[o.mission.era]!.units.some(unit => unit.id === command.unitId && unit.cost <= faction.resources)));
  assert.deepEqual(o.own, own); assert.deepEqual(o.faction, faction);
  assert.deepEqual(content.eras[o.mission.era]!.units, definitions);
});

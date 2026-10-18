import test from 'node:test';
import assert from 'node:assert/strict';
import { decideAI } from '../src/sim/ai.js';
import type { Command, GameContent, ObservedState, Role, Unit, UnitDef } from '../src/contracts.js';

const roles: Role[] = ['frontline', 'ranged', 'guard', 'scout', 'stealth', 'siege', 'engineer'];
const defs: UnitDef[] = roles.map((role, i) => ({ id: `e1-${role}`, era: 0, name: role, role, description: role,
  hp: 100, damage: 10, armor: 1, attackTime: 1, range: role === 'ranged' ? 4 : 1,
  speed: 1, cost: 30 + i * 3, capacity: 1, training: 4, vision: 6, capture: 1, stealth: role === 'stealth', detection: 1,
  splash: 0, counters: role === 'guard' ? { scout: 2 } : role === 'frontline' ? { ranged: 2 } : {},
}));
const unit = (id: string, role: Role, owner: 0 | 1, x: number, y: number): Unit => ({ id, defId: `e1-${role}`, owner, x, y,
  hp: 100, facing: 0, orders: [], route: [], cooldown: 0, abilityCooldown: 0, formation: 'line', group: 0, slot: 0, status: 'idle', lastHit: 0, stuck: 0,
});
function fixture(): { o: ObservedState; content: GameContent } {
  const map = Array.from({ length: 20 }, () => '....................');
  const strongholds = [
    { id: 'home', kind: 'main' as const, owner: 1 as const, x: 2, y: 2, name: 'Home', capacity: 0, reward: 0, vision: 6, progress: 0, capturing: null },
    { id: 'enemy', kind: 'main' as const, owner: 0 as const, x: 17, y: 17, name: 'Enemy', capacity: 0, reward: 0, vision: 6, progress: 0, capturing: null },
    { id: 'outpost', kind: 'outpost' as const, owner: null, x: 9, y: 9, name: 'Outpost', capacity: 3, reward: 40, vision: 5, progress: 0, capturing: null },
  ];
  const mission = { id: 'e1m1', era: 0, index: 0, name: 'Test', subtitle: '', briefing: '', concept: '', finale: false,
    seed: 123, map, strongholds, resources: [200, 200] as [number, number], capacity: 12, reserveCapacity: 4,
    starting: [roles, roles] as [Role[], Role[]], roster: roles,
    ai: { aggression: .5, expansion: 1, defense: 1, scout: 1, preferred: ['frontline'] as Role[] }, thresholds: [100, 200, 300], parTime: 300,
  };
  const o: ObservedState = { side: 1, time: 50, tick: 500, own: [unit('a', 'frontline', 1, 3, 3), unit('b', 'ranged', 1, 4, 3)], enemies: [],
    strongholds, faction: { resources: 100, spent: 0, earned: 0, baseCapacity: 12, reserveCapacity: 4, lines: [{ id: 'l1', queue: [], blocked: false }, { id: 'l2', queue: [], blocked: false }],
      reserves: [], autoDeploy: true, skills: [], cooldowns: {}, kills: {}, score: 0, lost: 0, captured: [], damageDealt: 0 },
    enemyMemory: {}, structures: [], map, mission, plan: { nextDecision: 0, objective: null, mode: 'expand', lastKnown: {}, decisions: 0 },
  };
  const content: GameContent = { eras: [{ id: 0, name: 'Test', subtitle: '', years: '', color: '', ground: '', accent: '', description: '', art: '', units: defs }], missions: [mission], skills: [] };
  return { o, content };
}
const spend = (commands: Command[]): number => commands.reduce((sum, c) => sum + (c.type === 'recruit' ? defs.find(d => d.id === c.unitId)!.cost
  : c.type === 'build' ? (c.kind === 'tower' ? 65 : 35) : c.type === 'ability' ? ({ rally: 30, recon: 25, volley: 45 }[c.ability]) : c.type === 'unitAbility' ? c.ids.length * 4 : 0), 0);

test('AI is deterministic, updates persisted planning, and uses only its observation', () => {
  const { o, content } = fixture();
  const copy = structuredClone(o), allowed = new Set(Object.keys(o));
  const safe = new Proxy(o, { get(target, key, receiver) { assert.ok(typeof key !== 'string' || allowed.has(key), `illegal hidden-state read: ${String(key)}`); return Reflect.get(target, key, receiver); } });
  const result = decideAI(safe, content);
  assert.deepEqual(result, decideAI(copy, content));
  assert.equal(o.plan.decisions, 1); assert.equal(o.plan.nextDecision, 51);
  assert.equal(o.plan.mode, 'expand'); assert.equal(o.plan.objective, 'outpost');
  assert.ok(result.some(c => c.type === 'order' && c.order.target === 'outpost'));
});

test('strategic AI changes from expansion to immediate main defense on a visible threat', () => {
  const { o, content } = fixture();
  decideAI(o, content);
  o.enemies = [unit('e1', 'frontline', 0, 3, 2), unit('e2', 'siege', 0, 4, 2)];
  const result = decideAI(o, content);
  assert.equal(o.plan.mode, 'defend'); assert.equal(o.plan.objective, 'home');
  assert.ok(result.some(c => c.type === 'order' && c.order.kind === 'defend'));
  assert.ok(spend(result) <= o.faction.resources);
});

test('counter recruitment adapts to observed scouts and cannot spend hidden extra resources', () => {
  const { o, content } = fixture();
  o.faction.resources = 37;
  o.enemies = Array.from({ length: 6 }, (_, i) => unit(`s${i}`, 'scout', 0, 17, 12 + i));
  const result = decideAI(o, content), recruits = result.filter(c => c.type === 'recruit');
  assert.equal(recruits.length, 1); assert.equal(recruits[0]?.unitId, 'e1-guard');
  assert.ok(spend(result) <= 37);
});

test('AI does not overwrite unchanged plans on a repeating attack timer', () => {
  const { o, content } = fixture();
  o.faction.resources = 0;
  const first = decideAI(o, content);
  for (const c of first) if (c.type === 'order') for (const u of o.own) if (c.ids.includes(u.id)) u.orders = [c.order];
  o.time += 1;
  const second = decideAI(o, content);
  assert.equal(second.filter(c => c.type === 'order').length, 0);
});

test('stale fog memories expire and skill-locked specialist units are not recruited', () => {
  const { o, content } = fixture();
  o.enemyMemory = { stale: { id: 'stale', defId: 'e1-scout', x: 12, y: 12, seen: -100 } };
  const guarded = structuredClone(content);
  guarded.eras[0]!.units.forEach(d => { if (d.role !== 'frontline') d.skill = `locked-${d.role}`; });
  const result = decideAI(o, guarded);
  assert.deepEqual(o.plan.lastKnown, {});
  assert.ok(result.filter(c => c.type === 'recruit').every(c => c.unitId === 'e1-frontline'));
});

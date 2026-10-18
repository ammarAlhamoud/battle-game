import test from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../src/content/index.js';
import { createBattle } from '../src/sim/engine.js';
import { observeBattleIntel } from '../src/ui/battle-intel.js';

function fixture() {
  const mission = content.missions[0]!;
  const state = createBattle(mission, content, [], []);
  const site = state.strongholds.find(item => item.kind !== 'main')!;
  const width = mission.map[0]!.length;
  const index = Math.round(site.y) * width + Math.round(site.x);
  state.fog[0].visible.fill(false); state.fog[0].explored.fill(false);
  return { mission, state, site, index, width };
}

test('unseen sites stay hidden and explored sites without legal history have unknown ownership', () => {
  const { mission, state, site, index } = fixture();
  site.owner = 1; site.progress = 83; site.capturing = 0;
  const unseen = observeBattleIntel(content, mission, state);
  assert.ok(!unseen.sites.some(item => item.id === site.id));
  assert.ok(unseen.sites.some(item => item.kind === 'main' && item.owner === 0));
  state.fog[0].explored[index] = true;
  const explored = observeBattleIntel(content, mission, state).sites.find(item => item.id === site.id)!;
  assert.equal(explored.owner, 'unknown');
  assert.equal(explored.progress, 0);
  assert.equal(explored.capturing, null);
});

test('hidden ownership and capture changes cannot replace the last legal observation', () => {
  const { mission, state, site, index } = fixture();
  state.fog[0].explored[index] = true; state.fog[0].visible[index] = true;
  site.owner = 1; site.capturing = 0; site.progress = 23;
  const legal = observeBattleIntel(content, mission, state);
  const previousMemory = structuredClone(legal.memory);
  state.fog[0].visible[index] = false;
  site.owner = null; site.capturing = 1; site.progress = 96; state.time += 10;
  const hidden = observeBattleIntel(content, mission, state, legal.memory).sites.find(item => item.id === site.id)!;
  assert.equal(hidden.owner, 1);
  assert.equal(hidden.capturing, 0);
  assert.equal(hidden.progress, 23);
  assert.equal(hidden.observedAt, previousMemory.sites[site.id]!.observedAt);
  assert.equal(hidden.visible, false);
  assert.deepEqual(legal.memory, previousMemory, 'observer must not mutate its previous memory');
});

test('feed excludes hidden enemy events, deduplicates reports and keeps only three newest legal events', () => {
  const { mission, state, site, index } = fixture();
  const initial = observeBattleIntel(content, mission, state);
  state.tick = 20; state.time = 2;
  state.events = [
    { id: 90, tick: 20, kind: 'alert', owner: 1, x: site.x, y: site.y, text: 'Hidden enemy alert' },
    { id: 91, tick: 20, kind: 'capture', owner: 1, x: site.x, y: site.y, text: 'Hidden enemy capture' },
    { id: 92, tick: 20, kind: 'deploy', owner: 0, x: site.x, y: site.y, text: 'Own reinforcement' },
    { id: 93, tick: 20, kind: 'death', owner: 0, x: site.x, y: site.y, text: 'Own casualty' },
  ];
  const hidden = observeBattleIntel(content, mission, state, initial.memory);
  assert.deepEqual(hidden.feed.map(item => item.id), [93, 92]);
  state.fog[0].visible[index] = true;
  state.events.push({ id: 94, tick: 20, kind: 'alert', owner: 1, x: site.x, y: site.y });
  const visible = observeBattleIntel(content, mission, state, hidden.memory);
  assert.deepEqual(visible.feed.map(item => item.id), [94, 93, 92]);
  assert.deepEqual(observeBattleIntel(content, mission, state, visible.memory).feed, visible.feed);
});

test('restored event history cannot reveal old enemy alerts and first-capture rewards are reported once', () => {
  const { mission, state, site, index } = fixture();
  state.tick = 200; state.time = 20; state.fog[0].visible[index] = true;
  state.events = [
    { id: 90, tick: 200, kind: 'alert', owner: 1, x: site.x, y: site.y },
    { id: 91, tick: 90, kind: 'deploy', owner: 0, x: site.x, y: site.y },
  ];
  const restored = observeBattleIntel(content, mission, state);
  assert.deepEqual(restored.feed, []);
  site.owner = 0; state.factions[0].captured.push(site.id);
  state.events.push(
    { id: 92, tick: 200, kind: 'capture', owner: 0, x: site.x, y: site.y, text: site.name },
    { id: 93, tick: 200, kind: 'capture', owner: 0, x: site.x, y: site.y, text: site.name },
  );
  const captures = observeBattleIntel(content, mission, state, restored.memory);
  assert.deepEqual(captures.feed.map(item => item.reward), [0, site.reward]);
  assert.equal(captures.outpostsHeld, 1);
});

test('home alerts use legal main capture state and the same stealth-aware visibility as the renderer', () => {
  const { mission, state, width } = fixture();
  const home = state.strongholds.find(item => item.kind === 'main' && item.owner === 0)!;
  home.progress = 35; home.capturing = 1;
  const capturing = observeBattleIntel(content, mission, state);
  assert.equal(capturing.alert?.kind, 'capture'); assert.equal(capturing.alert?.progress, 35);
  home.progress = 0; home.capturing = null;
  const enemy = state.units.find(item => item.owner === 1)!;
  enemy.x = home.x + 5; enemy.y = home.y;
  state.units = [enemy];
  assert.equal(observeBattleIntel(content, mission, state).alert, null);
  state.fog[0].visible[Math.round(enemy.y) * width + Math.round(enemy.x)] = true;
  assert.equal(observeBattleIntel(content, mission, state).alert?.kind, 'nearby');
  enemy.defId = content.eras[0]!.units.find(item => item.stealth)!.id;
  enemy.lastHit = -100;
  assert.equal(observeBattleIntel(content, mission, state).alert, null, 'visible terrain must not reveal undetected stealth soldiers');
});

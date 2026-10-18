import test from 'node:test';
import assert from 'node:assert/strict';
import type { BattleState, Faction, GameContent, MissionDef, SaveData, UnitDef } from '../src/contracts.js';
import { content } from '../src/content/index.js';
import { createBattle, stepBattle } from '../src/sim/engine.js';
import {
  buySkill, createCampaign, finishMission, importSave, isMissionUnlocked,
  respec, validateSave,
} from '../src/persistence/index.js';

const unit: UnitDef = {
  id: 'soldier', era: 0, name: 'Soldier', role: 'frontline', description: 'Test infantry',
  hp: 100, damage: 10, armor: 1, attackTime: 1, range: 1, speed: 2,
  cost: 20, capacity: 1, training: 2, vision: 5, capture: 1, stealth: false,
  detection: 1, splash: 0, counters: {},
};
const first: MissionDef = {
  id: 'e1m1', era: 0, index: 0, name: 'First', subtitle: 'Test', briefing: 'Test',
  concept: 'Test', finale: false, seed: 1, map: Array.from({ length: 12 }, () => '.'.repeat(12)),
  strongholds: [
    { id: 'home', name: 'Home', kind: 'main', owner: 0, x: 2, y: 2, capacity: 0, reward: 0, vision: 5 },
    { id: 'enemy', name: 'Enemy', kind: 'main', owner: 1, x: 9, y: 9, capacity: 0, reward: 0, vision: 5 },
  ],
  resources: [100, 100], capacity: 10, reserveCapacity: 5, starting: [['frontline'], ['frontline']],
  roster: ['frontline'], ai: { aggression: .5, expansion: .5, defense: .5, scout: .5, preferred: ['frontline'] },
  thresholds: [100, 200, 300, 400], parTime: 600,
};
const fixture: GameContent = {
  eras: [0, 1].map(id => ({ id, name: `Era ${id}`, subtitle: 'Test', years: 'Test', color: '#fff', ground: '#111', accent: '#aaa', description: 'Test', art: 'test', units: id === 0 ? [unit] : [{ ...unit, id: 'soldier2', era: 1 }] })),
  missions: [first, { ...first, id: 'e2m1', era: 1 }],
  skills: [
    { id: 'basic', name: 'Basic', description: 'Test', era: null, cost: 1, prerequisites: [], effect: 'capacity', value: 2, x: 0, y: 0 },
    { id: 'advanced', name: 'Advanced', description: 'Test', era: null, cost: 2, prerequisites: ['basic'], effect: 'lines', value: 1, x: 1, y: 0 },
    { id: 'future', name: 'Future', description: 'Test', era: 1, cost: 1, prerequisites: [], effect: 'armor', value: 1, x: 0, y: 1 },
  ],
};

function faction(side: number): Faction {
  return {
    resources: 80, spent: 20, earned: 0, baseCapacity: 10, reserveCapacity: 5,
    lines: [{ id: `line-${side}`, queue: [{ id: `job-${side}`, unitId: 'soldier', remaining: 1, total: 2, started: true }], blocked: false }],
    reserves: [{ id: `reserve-${side}`, unitId: 'soldier' }], autoDeploy: true, skills: [],
    cooldowns: { rally: 2, 'tower:s1': 1, 'reveal:2.5,3.5': 3, 'pending:volley:2,3': -1 },
    kills: { soldier: 4 }, score: 1000, lost: 1, captured: [], damageDealt: 200,
  };
}

function battle(ended = true, winner: 0 | 1 | null = 0): BattleState {
  return {
    version: 1, missionId: 'e1m1', seed: 1, tick: 24, time: 2.4, paused: true,
    units: [0, 1].map(owner => ({
      id: `unit-${owner}`, owner: owner as 0 | 1, defId: 'soldier', x: owner ? 8 : 3, y: owner ? 8 : 3,
      hp: 80, facing: .5, orders: [{ kind: 'move', x: 5, y: 5 }, { kind: 'capture', x: 9, y: 9, target: 'enemy' }],
      route: [{ x: 4, y: 4 }], cooldown: .4, abilityCooldown: 3, formation: 'wedge',
      group: 1, slot: owner, status: 'walk', lastHit: -100, stuck: 0, targetId: `unit-${1 - owner}`,
    })),
    factions: [faction(0), faction(1)],
    strongholds: first.strongholds.map(s => ({ ...s, progress: 25, capturing: s.owner === 0 ? 1 : 0 })),
    structures: [{ id: 's1', owner: 0, hp: 50, maxHp: 100, kind: 'tower', built: 1, x: 4, y: 5 }],
    fog: [0, 1].map(() => ({
      visible: Array(144).fill(true), explored: Array(144).fill(true),
      memory: { 'unit-1': { id: 'unit-1', defId: 'soldier', x: 8, y: 8, seen: 2 } },
    })) as unknown as BattleState['fog'],
    ai: [0, 1].map(() => ({ nextDecision: 3, objective: 'enemy', mode: 'attack', decisions: 2, lastKnown: {} })) as BattleState['ai'],
    events: [{ id: 20, tick: 23, kind: 'shot', owner: 0, x: 3, y: 3, target: { x: 8, y: 8 }, text: 'Test' }],
    nextId: 30, winner, ended, aiSides: [1],
  };
}

function save(): SaveData { return { version: 1, savedAt: 1000, campaign: createCampaign(), battle: battle(false, null) }; }

test('mission unlocks require the preceding victory and preserve replay access', () => {
  const campaign = createCampaign();
  assert.equal(isMissionUnlocked(campaign, 'e1m1', fixture), true);
  assert.equal(isMissionUnlocked(campaign, 'e2m1', fixture), false);
  assert.equal(isMissionUnlocked(campaign, 'missing', fixture), false);
  finishMission(campaign, battle(), fixture);
  assert.equal(isMissionUnlocked(campaign, 'e1m1', fixture), true);
  assert.equal(isMissionUnlocked(campaign, 'e2m1', fixture), true);
});

test('skill purchases enforce prerequisite, era, balance, duplicate and between-mission rules', () => {
  const campaign = createCampaign();
  assert.ok(buySkill(campaign, 'advanced', fixture));
  assert.ok(buySkill(campaign, 'future', fixture));
  assert.ok(buySkill(campaign, 'basic', fixture, true));
  assert.equal(campaign.points, 3);
  assert.equal(buySkill(campaign, 'basic', fixture), null);
  assert.ok(buySkill(campaign, 'basic', fixture));
  assert.equal(buySkill(campaign, 'advanced', fixture), null);
  assert.equal(campaign.points, 0);
  assert.deepEqual(campaign.skills, ['basic', 'advanced']);
  assert.ok(buySkill(campaign, 'missing', fixture));
});

test('defeat awards bounded partial rewards once and a victory claims only the remainder', () => {
  const campaign = createCampaign();
  const defeat = battle(true, 1);
  assert.equal(finishMission(campaign, defeat, fixture).reward, 2);
  assert.equal(finishMission(campaign, defeat, fixture).reward, 0);
  assert.equal(campaign.points, 5);
  assert.equal(campaign.records.e1m1.victory, false);
  assert.deepEqual(campaign.records.e1m1.claimed, [0, 1]);
  assert.equal(isMissionUnlocked(campaign, 'e2m1', fixture), false);
  assert.equal(finishMission(campaign, battle(), fixture).reward, 2);
  assert.equal(finishMission(campaign, battle(), fixture).reward, 0);
  assert.equal(campaign.points, 7);
  assert.deepEqual(campaign.records.e1m1.claimed, [0, 1, 2, 3]);
  assert.equal(campaign.records.e1m1.bestScore, 1000);
  assert.equal(validateSave({ ...save(), campaign }, fixture).campaign.totalEarned, 7);
});

test('improved replay claims only newly attained thresholds and never reduces best score', () => {
  const campaign = createCampaign();
  const low = battle(); low.factions[0].score = 150;
  assert.equal(finishMission(campaign, low, fixture).reward, 1);
  assert.equal(finishMission(campaign, battle(), fixture).reward, 3);
  assert.equal(finishMission(campaign, low, fixture).reward, 0);
  assert.equal(campaign.records.e1m1.bestScore, 1000);
  assert.equal(campaign.points, 7);
});

test('unfinished and locked mission results cannot mutate campaign rewards', () => {
  const campaign = createCampaign();
  const before = structuredClone(campaign);
  assert.throws(() => finishMission(campaign, battle(false, null), fixture), /not finished/);
  const locked = battle(); locked.missionId = 'e2m1';
  assert.throws(() => finishMission(campaign, locked, fixture), /locked/);
  assert.deepEqual(campaign, before);
});

test('respec refunds purchases minus the one-point fee and conserves net points', () => {
  const campaign = createCampaign();
  buySkill(campaign, 'basic', fixture); buySkill(campaign, 'advanced', fixture);
  assert.ok(respec(campaign, fixture, true));
  assert.equal(campaign.skills.length, 2);
  assert.equal(respec(campaign, fixture), null);
  assert.equal(campaign.points, 2);
  assert.equal(campaign.totalEarned, 2);
  assert.deepEqual(campaign.skills, []);
  assert.ok(respec(campaign, fixture));
  assert.doesNotThrow(() => validateSave({ ...save(), campaign }, fixture));
});

test('complete save round trip retains orders, routes, both queues, reserves, fog, AI, cooldowns and events', () => {
  const input = save();
  const restored = validateSave(JSON.parse(JSON.stringify(input)), fixture);
  assert.deepEqual(restored, input);
  restored.battle!.units[0].orders[0].x = 10;
  assert.equal(input.battle!.units[0].orders[0].x, 5);
});

test('save validation rejects invalid versions, nonfinite values, missing fields and foreign references', () => {
  for (const mutate of [
    (s: SaveData) => { s.version = 2 as 1; },
    (s: SaveData) => { s.battle!.units[0].hp = Number.NaN; },
    (s: SaveData) => { s.battle!.factions[0].resources = -1; },
    (s: SaveData) => { s.battle!.units[0].defId = 'unknown'; },
    (s: SaveData) => { s.battle!.factions[0].lines[0].queue[0].unitId = 'soldier2'; },
    (s: SaveData) => { delete (s.battle as unknown as Record<string, unknown>).ai; },
    (s: SaveData) => { s.battle!.factions[0].reserves[0].id = 'unit-0'; },
    (s: SaveData) => { s.battle!.strongholds[0].reward = 999; },
    (s: SaveData) => { s.battle!.winner = 0; },
  ]) {
    const input = save(); mutate(input);
    assert.throws(() => validateSave(input, fixture), /Invalid save/);
  }
});

test('save validation rejects malformed fog, memory, queues, abilities and unsupported fields', () => {
  for (const mutate of [
    (s: SaveData) => { s.battle!.fog[0].visible.pop(); },
    (s: SaveData) => { s.battle!.fog[0].explored[0] = false; },
    (s: SaveData) => { s.battle!.fog[0].memory['unit-1'].seen = 9999; },
    (s: SaveData) => { s.battle!.factions[0].lines[0].queue[0].remaining = 3; },
    (s: SaveData) => { s.battle!.factions[0].cooldowns.unlimited = 1; },
    (s: SaveData) => { (s.battle as unknown as Record<string, unknown>).secretCheat = true; },
    (s: SaveData) => { s.battle!.events[0].tick = 999; },
  ]) {
    const input = save(); mutate(input);
    assert.throws(() => validateSave(input, fixture), /Invalid save/);
  }
});

test('corrupt progression cannot duplicate thresholds, mint points, bypass prerequisites or skip missions', () => {
  for (const mutate of [
    (s: SaveData) => { s.campaign.points = 4; s.campaign.totalEarned = 4; },
    (s: SaveData) => { s.campaign.points = 4; },
    (s: SaveData) => { s.campaign.skills = ['advanced']; s.campaign.points = 1; },
    (s: SaveData) => { s.campaign.skills = ['basic', 'basic']; s.campaign.points = 1; },
    (s: SaveData) => { s.campaign.records.e1m1 = { bestScore: 1000, victory: true, claimed: [0, 0] }; },
    (s: SaveData) => { s.campaign.records.e1m1 = { bestScore: 1000, victory: true, claimed: [1] }; },
    (s: SaveData) => { s.campaign.records.e1m1 = { bestScore: 1000, victory: false, claimed: [0, 1, 2] }; },
    (s: SaveData) => { s.campaign.records.e2m1 = { bestScore: 1000, victory: true, claimed: [] }; },
  ]) {
    const input = save(); mutate(input);
    assert.throws(() => validateSave(input, fixture), /Invalid save/);
  }
});

test('portable import checks byte limits, JSON syntax and full runtime schema', async () => {
  const input = save();
  const file = new File([JSON.stringify(input)], 'campaign.json', { type: 'application/json' });
  assert.deepEqual(await importSave(file, fixture), input);
  await assert.rejects(importSave(new File(['{'], 'bad.json'), fixture), /valid JSON/);
  await assert.rejects(importSave(new File([], 'empty.json'), fixture), /16 MiB/);
  await assert.rejects(importSave(new File(['{"version":999}'], 'version.json'), fixture), /Invalid save/);
});

test('every authored mission creates a complete valid battle snapshot', () => {
  const campaign = createCampaign();
  for (const mission of [...content.missions].sort((a, b) => a.era - b.era || a.index - b.index)) {
    const state = createBattle(mission, content, [], [0, 1]);
    for (let tick = 0; tick < 8; tick++) stepBattle(state, content);
    const input: SaveData = { version: 1, savedAt: 1000, campaign, battle: state };
    assert.deepEqual(validateSave(input, content).battle, state, mission.id);
    campaign.records[mission.id] = { bestScore: 0, claimed: [], victory: true };
  }
});

test('restoring the complete live simulation preserves deterministic continuation', () => {
  const campaign = createCampaign();
  assert.equal(buySkill(campaign, 'discipline', content), null);
  const state = createBattle(content.missions[0], content, campaign.skills, [0, 1]);
  for (let tick = 0; tick < 80; tick++) stepBattle(state, content);
  const restored = validateSave({ version: 1, savedAt: 1000, campaign, battle: state }, content).battle!;
  assert.deepEqual(restored, state);
  for (let tick = 0; tick < 40; tick++) {
    stepBattle(state, content);
    stepBattle(restored, content);
  }
  assert.deepEqual(restored, state);
});

test('the complete forty-mission progression crosses all eras without resetting or duplicating points', () => {
  const campaign = createCampaign();
  let expectedPoints = 3;
  for (const mission of [...content.missions].sort((a, b) => a.era - b.era || a.index - b.index)) {
    assert.equal(isMissionUnlocked(campaign, mission.id, content), true);
    const state = createBattle(mission, content, [], []);
    state.ended = true; state.winner = 0;
    state.factions[0].score = mission.thresholds.at(-1)!;
    assert.equal(finishMission(campaign, state, content).reward, mission.thresholds.length);
    expectedPoints += mission.thresholds.length;
    assert.equal(finishMission(campaign, state, content).reward, 0);
    assert.equal(campaign.points, expectedPoints);
  }
  assert.equal(Object.keys(campaign.records).length, 40);
  assert.equal(content.eras.length, 8);
  assert.doesNotThrow(() => validateSave({ version: 1, savedAt: 1000, campaign, battle: null }, content));
});

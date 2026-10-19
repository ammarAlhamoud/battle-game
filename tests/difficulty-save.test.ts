import test from 'node:test';
import assert from 'node:assert/strict';
import type { BattleState, Difficulty, SaveData } from '../src/contracts.js';
import { content } from '../src/content/index.js';
import { applyCommand, createBattle, stepBattle } from '../src/sim/engine.js';
import { buySkill, createCampaign, exportSave, finishMission, importSave, validateSave } from '../src/persistence/index.js';

function fixture(difficulty: Difficulty = 'relaxed'): SaveData {
  const campaign = createCampaign(); campaign.difficulty = difficulty;
  assert.equal(buySkill(campaign, 'discipline', content), null);
  assert.equal(buySkill(campaign, 'logistics', content), null);
  const battle = createBattle(content.missions[0], content, campaign.skills, [1], difficulty);
  battle.paused = true;
  return { version: 1, savedAt: 1000, campaign, battle };
}

function assertMechanicalStateUnchanged(before: BattleState, after: BattleState): void {
  for (const key of ['version', 'missionId', 'seed', 'tick', 'time', 'paused', 'nextId', 'winner', 'ended'] as const) assert.equal(after[key], before[key], key);
  for (const key of ['factions', 'strongholds', 'structures', 'fog', 'events', 'aiSides'] as const) assert.deepEqual(after[key], before[key], key);
  assert.deepEqual(after.ai[0], before.ai[0], 'the player plan is not an enemy difficulty setting');
  assert.deepEqual(after.units.filter(u => u.owner === 0), before.units.filter(u => u.owner === 0), 'player units and their full command queues remain unchanged');
  assert.deepEqual(after.units.filter(u => u.owner === 1).map(({ orders: _orders, route: _route, targetId: _target, status: _status, ...unit }) => unit), before.units.filter(u => u.owner === 1).map(({ orders: _orders, route: _route, targetId: _target, status: _status, ...unit }) => unit), 'enemy military values are unchanged');
}

test('new campaigns choose relaxed while direct simulation callers retain the original veteran default', () => {
  assert.equal(createCampaign().difficulty, 'relaxed');
  const veteran = createBattle(content.missions[0], content);
  assert.equal(veteran.difficulty ?? 'veteran', 'veteran');
});

test('every difficulty and both interface languages survive a complete version-one portable save', async () => {
  for (const difficulty of ['relaxed', 'standard', 'veteran'] as const) for (const language of ['en', 'ar'] as const) {
    const input = fixture(difficulty); input.campaign.language = language;
    input.battle!.ai[1].nextRecruitAt = 48;
    assert.deepEqual(validateSave(input, content), input);
    const imported = await importSave(new File([exportSave(input)], `${difficulty}-${language}.json`), content);
    assert.deepEqual(imported, input);
  }
});

test('legacy version-one saves without difficulty or recruitment scheduling remain valid veteran battles', async () => {
  const input = fixture('veteran');
  delete input.campaign.difficulty; delete input.battle!.difficulty; delete input.battle!.aiGraceUntil;
  for (const plan of input.battle!.ai) delete plan.nextRecruitAt;
  const imported = await importSave(new File([JSON.stringify(input)], 'legacy-v1.json'), content);
  assert.equal(imported.campaign.difficulty ?? 'veteran', 'veteran');
  assert.equal(imported.battle!.difficulty ?? 'veteran', 'veteran');
  assert.equal(imported.battle!.aiGraceUntil ?? 0, 0);
  assert.deepEqual(imported.campaign.records, input.campaign.records);
  assert.deepEqual(imported.battle!.units, input.battle!.units);
});

test('an easier live switch changes enemy planning without resetting battle, pause, army or finite economy', () => {
  const input = fixture('veteran'), battle = input.battle!;
  battle.time = 125; battle.tick = 1250;
  const home = battle.strongholds.find(h => h.kind === 'main' && h.owner === 0)!;
  applyCommand(battle, { type: 'order', side: 1, ids: battle.units.filter(u => u.owner === 1).map(u => u.id), order: { kind: 'capture', x: home.x, y: home.y, target: home.id } }, content);
  const before = structuredClone(battle);
  applyCommand(battle, { type: 'difficulty', value: 'relaxed' }, content);
  assertMechanicalStateUnchanged(before, battle);
  assert.equal(battle.difficulty, 'relaxed');
  assert.equal(battle.aiGraceUntil, before.time + 45);
  assert.ok(battle.units.filter(u => u.owner === 1).every(u => !u.orders.some(o => o.kind === 'capture' && o.target === home.id)), 'the previous attack plan is cleared during the new preparation window');
  input.campaign.difficulty = 'relaxed';
  const loaded = validateSave(input, content);
  assert.equal(loaded.battle!.aiGraceUntil, battle.aiGraceUntil);
  assertMechanicalStateUnchanged(battle, loaded.battle!);
});

test('reapplying the same difficulty does not restart the preparation deadline or mutate a paused state', () => {
  const battle = fixture('veteran').battle!;
  applyCommand(battle, { type: 'difficulty', value: 'relaxed' }, content);
  const deadline = battle.aiGraceUntil;
  battle.paused = false; for (let i = 0; i < 20; i++) stepBattle(battle, content); battle.paused = true;
  const before = structuredClone(battle);
  applyCommand(battle, { type: 'difficulty', value: 'relaxed' }, content);
  assert.equal(battle.aiGraceUntil, deadline);
  assert.deepEqual(battle, before);
});

test('invalid difficulty values and malformed preparation or recruitment clocks are rejected', () => {
  for (const value of ['easy', 'RELAXED', '', null, false, 1, {}]) {
    const save = fixture();
    (save.campaign as unknown as Record<string, unknown>).difficulty = value;
    assert.throws(() => validateSave(save, content), /difficulty/);
    const battleSave = fixture();
    (battleSave.battle as unknown as Record<string, unknown>).difficulty = value;
    assert.throws(() => validateSave(battleSave, content), /difficulty/);
  }
  for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, '45']) {
    const save = fixture();
    (save.battle as unknown as Record<string, unknown>).aiGraceUntil = value;
    assert.throws(() => validateSave(save, content), /aiGraceUntil/);
    const planSave = fixture();
    (planSave.battle!.ai[1] as unknown as Record<string, unknown>).nextRecruitAt = value;
    assert.throws(() => validateSave(planSave, content), /nextRecruitAt/);
  }
});

test('changing difficulty between replays cannot reset campaign rewards or duplicate threshold claims', () => {
  const campaign = createCampaign();
  const veteran = createBattle(content.missions[0], content, [], [], 'veteran');
  veteran.ended = true; veteran.winner = 0; veteran.factions[0].score = 20000;
  const first = finishMission(campaign, veteran, content);
  assert.equal(first.reward, content.missions[0].thresholds.length);
  const earned = structuredClone(campaign);
  campaign.difficulty = 'relaxed';
  const relaxed = createBattle(content.missions[0], content, [], [], 'relaxed');
  relaxed.ended = true; relaxed.winner = 0; relaxed.factions[0].score = 20000;
  assert.equal(finishMission(campaign, relaxed, content).reward, 0);
  assert.deepEqual(campaign.records, earned.records); assert.equal(campaign.points, earned.points); assert.equal(campaign.totalEarned, earned.totalEarned);
  assert.doesNotThrow(() => validateSave({ version: 1, savedAt: 1000, campaign, battle: relaxed }, content));
});

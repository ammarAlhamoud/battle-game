import test from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../src/content/index.js';
import { getLanguage, missingTranslations, setLanguage, translate } from '../src/i18n/index.js';

test('language state is DOM independent and English preserves exact source text', () => {
  setLanguage('en');
  assert.equal(getLanguage(), 'en');
  const source = '  Recruit Flint spears, 48 supplies, 1 capacity, 4.5 seconds\n';
  assert.equal(translate(source), source);
  setLanguage('ar');
  assert.equal(getLanguage(), 'ar');
  assert.equal(translate('Settings'), 'الإعدادات');
  assert.equal(translate('Settings', 'en'), 'Settings');
  setLanguage('en');
});

test('Arabic settings, battle messages and skill errors are complete meaningful sentences', () => {
  const sources = [
    'Language changes immediately. Your battle is not restarted.',
    'All progress is saved automatically.',
    'No passive income',
    'Finish the saved battle before purchasing skills. Its original army must remain consistent.',
    'Purchase the connected prerequisite skills first.',
    'Concede & review results',
    'The field is yours. Carry this knowledge into the next battle.',
    'Local save was interrupted; the previous save is preserved.',
  ];
  for (const source of sources) {
    const result = translate(source, 'ar');
    assert.notEqual(result, source, source);
    assert.match(result, /[\u0600-\u06ff]/, source);
    assert.doesNotMatch(result, /[A-Za-z]/, source);
  }
});

test('runtime production, army, combat and queue templates translate their complete contents', () => {
  const sources = [
    'Civilization tree  ·  12 SP', '8 / 40 BATTLES WON', 'Age IV of VIII',
    'AGE VIII / BATTLE 5 / ERA FINALE', '2,450 SCORE', '+3 SP', '2 SP · PREREQUISITE REQUIRED',
    'Downloading 42%', '16 / 20 army capacity · 3 / 8 reserve slots · 2 production lines',
    '48 supplies · 1 cap · 4.5s', '341 / 341 health · frontline, ranged, scout',
    '120 health · 15 damage · 2 armor · 4.5 range · 7 vision',
    'Rally · 30 supplies', 'Recon · 12s', 'Ability 18s', 'LINE 2', 'RESERVES  /  4',
    'PLANNED ORDERS  /  3', 'Edit order 2', 'Move → 8, 16',
    'Rally is ready in 10 seconds.', 'Volley needs 45 supplies.', 'Recon · select a target', 'Use volley',
    'Build a barrier', 'Build tower', '8 soldiers selected', 'Control group 3 assigned.',
  ];
  for (const source of sources) {
    const result = translate(source, 'ar');
    assert.match(result, /[\u0600-\u06ff]/, source);
    assert.doesNotMatch(result, /[A-Za-z]/, `${source}: ${result}`);
  }
  assert.equal(translate('Move → 8, 16', 'ar'), 'تحرك ← 8, 16');
  assert.equal(translate('48 supplies · 1 cap · 4.5s', 'ar'), '48 إمدادات · 1 سعة · 4.5 ث');
});

test('dynamic unit, mission, skill and era names use exact authored Arabic content', () => {
  const era = content.eras[0]!;
  const mission = content.missions[0]!;
  const unit = era.units[0]!;
  const skill = content.skills[0]!;
  const sources = [
    `↶ Resume ${mission.name} · 03:14`,
    `Recruit ${unit.name}, ${unit.cost} supplies, ${unit.capacity} capacity, ${unit.training} seconds`,
    `Cancel ${unit.name} · 50% refund`,
    `${era.name} / ${mission.name}`,
    `REQUIRES: ${skill.name}`,
    `CANCEL: 100% before training · 50% after training begins. ACTIVE: ${skill.name}`,
    `Original illustration of ${era.name}`,
    `${unit.description}\n${unit.hp} health · ${unit.damage} damage · ${unit.armor} armor · ${unit.range} range · ${unit.vision} vision`,
  ];
  for (const source of sources) {
    const result = translate(source, 'ar');
    assert.doesNotMatch(result, /[A-Za-z]/, `${source}: ${result}`);
    assert.match(result, /[\u0600-\u06ff]/);
  }
});

test('nested recovery and validation errors translate without altering saved data', () => {
  const input = 'Save failed: Error: Invalid save at battle.factions[0].resources: number outside valid range';
  const output = translate(input, 'ar');
  assert.match(output, /تعذر الحفظ/);
  assert.match(output, /الإمدادات/);
  assert.match(output, /\[0\]/);
  assert.doesNotMatch(output, /[A-Za-z]/);
  assert.equal(input, 'Save failed: Error: Invalid save at battle.factions[0].resources: number outside valid range');
  const recovery = translate('Save could not be restored: The selected file is not valid JSON.. You can import a backup.', 'ar');
  assert.match(recovery, /نسخة احتياطية/);
  assert.doesNotMatch(recovery, /[A-Za-z]/);
});

test('unknown strings, key codes and existing Arabic are safely preserved', () => {
  missingTranslations.clear();
  assert.equal(translate('Future unrecognized label', 'ar'), 'Future unrecognized label');
  assert.equal(translate('Future unrecognized label / Campaign', 'ar'), 'Future unrecognized label / Campaign');
  assert.ok(missingTranslations.has('Future unrecognized label'));
  assert.equal(translate('إعدادات اللعبة', 'ar'), 'إعدادات اللعبة');
  assert.equal(translate('Q / R / T / V', 'ar'), 'Q / R / T / V');
  assert.equal(translate('03:14', 'ar'), '03:14');
  assert.equal(translate('12 / 20', 'ar'), '12 / 20');
  assert.equal(translate('EIGHTFOLD', 'ar'), 'EIGHTFOLD');
  setLanguage('en');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GameContent } from '../src/contracts.js';
import { content, validateContent } from '../src/content/index.js';

test('all eight eras, forty authored maps and complete gameplay references validate', () => {
  assert.deepEqual(validateContent(content), []);
  assert.equal(content.eras.length, 8);
  assert.equal(content.missions.length, 40);
  assert.equal(content.eras.reduce((total, era) => total + era.units.length, 0), 51);
  assert.equal(new Set(content.missions.map(mission => mission.map.join('\n'))).size, 40);
  for (const era of content.eras) {
    const missions = content.missions.filter(mission => mission.era === era.id);
    assert.equal(missions.length, 5);
    assert.equal(missions.filter(mission => mission.finale).length, 1);
    assert.equal(missions.find(mission => mission.finale)?.index, 4);
  }
});

test('every referenced era asset is bundled original SVG artwork', () => {
  for (const era of content.eras) {
    const path = resolve('public', era.art);
    assert.ok(existsSync(path), `${era.art} must be bundled`);
    const svg = readFileSync(path, 'utf8');
    assert.match(svg, /<svg\b/);
    assert.doesNotMatch(svg, /https?:\/\/(?!www\.w3\.org)/, 'era art must not depend on external downloads');
  }
});

test('content schema reports malformed nested input without throwing', () => {
  for (const bad of [null, {}, { eras: [null], missions: [], skills: [] }]) assert.ok(validateContent(bad as unknown as GameContent).length > 0);
  const broken = structuredClone(content);
  (broken.missions[0] as unknown as { map: null }).map = null;
  assert.ok(validateContent(broken).some(error => error.includes('map')));
});

test('validator rejects missing campaign entries and a duplicated map', () => {
  const missing = structuredClone(content); missing.missions.pop();
  assert.ok(validateContent(missing).some(error => error.includes('forty')));
  const duplicate = structuredClone(content); duplicate.missions[1]!.map = [...duplicate.missions[0]!.map];
  assert.ok(validateContent(duplicate).some(error => error.includes('distinct authored map')));
});

test('validator catches unresolved unlocks and prerequisite cycles', () => {
  const badUnit = structuredClone(content); badUnit.eras[0]!.units[4]!.skill = 'missing-skill';
  assert.ok(validateContent(badUnit).some(error => error.includes('invalid era-specific unlock')));
  const cyclic = structuredClone(content); cyclic.skills[0]!.prerequisites = ['logistics'];
  assert.ok(validateContent(cyclic).some(error => error.includes('cycle')));
  const wrongEra = structuredClone(content); wrongEra.skills.find(skill => skill.id === 'e1-stealth')!.prerequisites = ['e2-stealth'];
  assert.ok(validateContent(wrongEra).some(error => error.includes('invalid prerequisite')));
});

test('validator rejects economic invalidity and unreachable objectives', () => {
  const broken = structuredClone(content);
  broken.eras[0]!.units[0]!.cost = -100;
  broken.missions[0]!.resources[1] = 999999;
  assert.ok(validateContent(broken).some(error => error.includes('cost')));
  assert.ok(validateContent(broken).some(error => error.includes('starting resources')));
  const blocked = structuredClone(content);
  const mission = blocked.missions[0]!;
  for (const [x, y] of [[3, 19], [5, 19], [4, 18], [4, 20]]) {
    const row = mission.map[y!]!;
    mission.map[y!] = row.slice(0, x!) + '#' + row.slice(x! + 1);
  }
  assert.ok(validateContent(blocked).some(error => error.includes('unreachable')));
});

test('all missions use symmetrical finite budgets and never start with locked specialists', () => {
  for (const mission of content.missions) {
    assert.equal(mission.resources[0], mission.resources[1]);
    assert.deepEqual(mission.starting[0], mission.starting[1]);
    for (const role of mission.starting.flat()) {
      assert.equal(content.eras[mission.era]!.units.find(unit => unit.role === role)?.skill, undefined);
    }
    assert.ok(mission.strongholds.filter(site => site.kind !== 'main').every(site => site.reward > 0));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { content } from '../src/content/index.js';
import { arContent } from '../src/i18n/content-ar.js';

const displayStrings = [
  ...content.eras.flatMap(era => [era.name, era.subtitle, era.years, era.description, ...era.units.flatMap(unit => [unit.name, unit.description])]),
  ...content.skills.flatMap(skill => [skill.name, skill.description]),
  ...content.missions.flatMap(mission => [mission.name, mission.subtitle, mission.briefing, mission.concept, ...(mission.tutorial ? [mission.tutorial] : []), ...mission.strongholds.map(site => site.name)]),
];

test('Arabic content covers every era, unit, skill, mission, tutorial and stronghold display string', () => {
  const unique = new Set(displayStrings);
  assert.equal(unique.size, 504);
  assert.equal(Object.keys(arContent).length, unique.size);
  for (const source of unique) {
    assert.ok(Object.hasOwn(arContent, source), `Missing Arabic translation: ${source}`);
    assert.match(arContent[source]!, /[\u0621-\u064A]/, `Translation must contain Arabic: ${source}`);
    assert.notEqual(arContent[source], source);
    assert.doesNotMatch(arContent[source]!, /[a-z]/i, `Arabic content must not retain English prose: ${source}`);
  }
});

test('Arabic content retains numeric skill rules and leaves internal identifiers untranslated', () => {
  for (const skill of content.skills) {
    const sourceNumbers = skill.description.match(/\d+/g) ?? [];
    const translatedNumbers = arContent[skill.description]!.match(/\d+/g) ?? [];
    assert.deepEqual(translatedNumbers, sourceNumbers, `Rule numbers changed for ${skill.id}`);
    assert.equal(arContent[skill.id], undefined);
  }
  for (const mission of content.missions) assert.equal(arContent[mission.id], undefined);
  for (const era of content.eras) {
    assert.equal(arContent[era.art], undefined);
    for (const unit of era.units) assert.equal(arContent[unit.id], undefined);
  }
});

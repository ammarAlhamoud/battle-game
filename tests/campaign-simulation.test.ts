import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { content } from '../src/content/index.js';
import { createBattle, RULES, stepBattle } from '../src/sim/engine.js';

test('real first mission supports distinct equal-budget skill builds and autonomous battles conserve the finite economy', () => {
  const mission = content.missions[0]!;
  const definitions = new Map(content.eras.flatMap(e => e.units.map(d => [d.id, d] as const)));
  const winners = [];
  for (const skills of [[], ['discipline', 'logistics']]) {
    const state = createBattle(mission, content, skills, [0, 1]);
    for (let tick = 0; tick < 6000 && !state.ended; tick++) stepBattle(state, content);
    assert.equal(state.ended, true, `battle stalled with skills ${skills.join(',')}`);
    winners.push(state.winner);
    assert.ok(state.ai.every(plan => plan.decisions > 20), 'both opponents made strategic decisions');
    assert.ok(state.factions.every(f => f.captured.length > 1), 'both opponents contested subsidiary territory');
    for (const side of [0, 1] as const) {
      const faction = state.factions[side];
      const killIncome = Object.entries(faction.kills).reduce((n, [id, count]) => n + Math.max(1, Math.round(definitions.get(id)!.cost * RULES.killResourceFraction)) * count, 0);
      const captureIncome = mission.strongholds.filter(s => faction.captured.includes(s.id) && s.owner !== side).reduce((n, s) => n + s.reward, 0);
      assert.equal(faction.earned, killIncome + captureIncome, 'income comes exclusively from actual kills and first captures');
      assert.equal(faction.resources, mission.resources[side] + faction.earned - faction.spent, 'AI cannot spend resources it did not receive');
      assert.ok(faction.resources >= 0);
      assert.equal(Object.values(faction.kills).reduce((n, k) => n + k, 0), state.factions[side === 0 ? 1 : 0].lost);
    }
  }
  assert.deepEqual(new Set(winners), new Set([0, 1]), 'the initial skill decision changes the outcome without changing enemy budgets');
});

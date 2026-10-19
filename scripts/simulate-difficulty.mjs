import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { content } from '../.test-build/src/content/index.js';
import { applyCommand, capacity, createBattle, RULES, stepBattle, usage } from '../.test-build/src/sim/engine.js';

// Run npm test first. This is a small, deliberately unsophisticated player policy,
// not the production AI controlling both sides and not a claim about human win rates.
const modeArg = process.argv.find(arg => arg.startsWith('--mode='));
const missionArg = process.argv.find(arg => arg.startsWith('--mission='));
const tickArg = process.argv.find(arg => arg.startsWith('--ticks='));
const noSkills = process.argv.includes('--no-skills');
const modes = modeArg ? [modeArg.slice(7)] : ['relaxed', 'standard', 'veteran'];
const limit = tickArg ? Number(tickArg.slice(8)) : 9000;
assert.ok(Number.isInteger(limit) && limit > 0 && limit <= 36_000, '--ticks must be an integer between 1 and 36000');
assert.ok(modes.every(mode => ['relaxed', 'standard', 'veteran'].includes(mode)), 'unknown difficulty');
const missions = missionArg ? content.missions.filter(m => m.id === missionArg.slice(10)) : content.missions.filter(m => m.era === 0);
assert.ok(missions.length, 'unknown mission');
const directory = 'test-results/difficulty-balance';
const reportPath = `${directory}/${noSkills ? `report-no-skills-${modes.join('-')}-${missionArg ? missions[0].id : 'first-era'}` : 'report'}.json`;
await mkdir(directory, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(), fixedStep: .1, maximumSeconds: limit / 10,
  policy: 'Every 5 simulation seconds, recruit a fixed two-frontline/one-ranged cycle and send one army to the nearest known non-player subsidiary, then the enemy main. Reissue only for a changed objective or a new/idle soldier. No ability, formation or counter micro; only legitimately visible ownership and the public authored map.',
  skills: noSkills ? [] : ['discipline', 'logistics'], initialSkillBudget: 3,
  initialSkillPointsSpent: noSkills ? 0 : 3,
  scope: `Independent first-era missions, ${noSkills ? 'without purchased skills' : 'using only the initial skill budget'}; later campaign upgrades are deliberately excluded. Results measure this policy, not human success rates.`,
  runs: [], summaries: [],
};

for (const difficulty of modes) for (const mission of missions) {
  const state = createBattle(mission, content, report.skills, [1], difficulty);
  assert.equal(state.difficulty ?? 'veteran', difficulty, 'compile the current difficulty engine with npm test first');
  const defs = content.eras[mission.era].units;
  const byId = new Map(defs.map(d => [d.id, d]));
  const known = new Map(mission.strongholds.map(h => [h.id, structuredClone(h)]));
  let recruited = 0, targetId = null, peakUnits = state.units.length;
  const began = performance.now();
  for (let tick = 0; tick < limit && !state.ended; tick++) {
    if (tick % 50 === 0) {
      const own = state.units.filter(u => u.owner === 0), faction = state.factions[0];
      for (const hold of state.strongholds) if (hold.owner === 0 || state.fog[0].visible[Math.round(hold.y) * mission.map[0].length + Math.round(hold.x)]) known.set(hold.id, structuredClone(hold));
      const origin = own.length ? { x: own.reduce((n, u) => n + u.x, 0) / own.length, y: own.reduce((n, u) => n + u.y, 0) / own.length } : mission.strongholds.find(h => h.kind === 'main' && h.owner === 0);
      if (!targetId || known.get(targetId)?.owner === 0) {
        const candidates = [...known.values()].filter(h => h.kind !== 'main' && h.owner !== 0).sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y) || a.id.localeCompare(b.id));
        targetId = (candidates[0] || [...known.values()].find(h => h.kind === 'main' && h.owner === 1)).id;
      }
      const target = known.get(targetId);
      const ids = own.filter(u => !u.orders.length || u.orders.at(-1).target !== targetId).map(u => u.id);
      if (ids.length) applyCommand(state, { type: 'order', side: 0, ids, order: { kind: 'capture', x: target.x, y: target.y, target: target.id } }, content);
      const queued = faction.lines.reduce((n, line) => n + line.queue.length, 0) + faction.reserves.length;
      if (usage(state, 0, content) + queued < capacity(state, 0, content) + 2 && faction.lines[0].queue.length < 2) {
        const role = recruited % 3 === 2 ? 'ranged' : 'frontline';
        const def = defs.find(d => d.role === role && mission.roster.includes(d.role));
        if (def && faction.resources >= def.cost) { applyCommand(state, { type: 'recruit', side: 0, unitId: def.id }, content); recruited++; }
      }
    }
    stepBattle(state, content);
    peakUnits = Math.max(peakUnits, state.units.length);
  }
  for (const side of [0, 1]) {
    const faction = state.factions[side];
    const killIncome = Object.entries(faction.kills).reduce((n, [id, count]) => n + Math.max(1, Math.round(byId.get(id).cost * RULES.killResourceFraction)) * count, 0);
    const captureIncome = mission.strongholds.filter(h => faction.captured.includes(h.id) && h.owner !== side).reduce((n, h) => n + h.reward, 0);
    assert.equal(faction.earned, killIncome + captureIncome, 'difficulty may not mint battle resources');
    assert.equal(faction.resources, mission.resources[side] + faction.earned - faction.spent, 'finite resource ledger must balance');
    assert.ok(faction.resources >= 0);
  }
  const result = {
    mission: mission.id, difficulty, ended: state.ended, winner: state.winner,
    outcome: !state.ended ? 'time-limit' : state.winner === 0 ? 'player-victory' : 'player-defeat',
    simulationSeconds: state.time, wallMilliseconds: Math.round(performance.now() - began), peakUnits,
    remaining: state.units.reduce((counts, unit) => { counts[unit.owner]++; return counts; }, [0, 0]),
    resources: state.factions.map(f => f.resources), scores: state.factions.map(f => f.score),
    kills: state.factions.map(f => Object.values(f.kills).reduce((n, count) => n + count, 0)),
    firstCaptures: state.factions.map(f => f.captured.length - 1), enemyDecisions: state.ai[1].decisions,
    finiteEconomyVerified: true,
  };
  report.runs.push(result); console.log(JSON.stringify(result));
  await writeFile(reportPath, JSON.stringify(report, null, 2));
}
for (const difficulty of modes) {
  const runs = report.runs.filter(r => r.difficulty === difficulty);
  report.summaries.push({ difficulty, tested: runs.length, playerWins: runs.filter(r => r.winner === 0).length, playerLosses: runs.filter(r => r.winner === 1).length, timeLimits: runs.filter(r => !r.ended).length, totalWallMilliseconds: runs.reduce((n, r) => n + r.wallMilliseconds, 0) });
}
await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ summary: report.summaries, report: reportPath }, null, 2));

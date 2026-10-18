/** Run after npm test (the TypeScript simulation is emitted in .test-build).
 * Produces measured AI-vs-AI campaign reports and authentic near-result browser fixtures.
 * No positions, resources, capture progress or combat values are modified by this runner.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { content } from '../.test-build/src/content/index.js';
import { createBattle, stepBattle } from '../.test-build/src/sim/engine.js';
import { createCampaign, validateSave } from '../.test-build/src/persistence/index.js';

const args = new Set(process.argv.slice(2));
const capArgument = process.argv.find(value => value.startsWith('--ticks='));
const limit = capArgument ? Number(capArgument.slice(8)) : 6000;
const missionArgument = process.argv.find(value => value.startsWith('--mission='));
const missions = missionArgument ? content.missions.filter(m => m.id === missionArgument.slice(10)) : args.has('--all') ? content.missions : content.missions.filter(m => m.index === 0 || m.index === 4);
const reportPath = `test-results/campaign-${args.has('--skills') ? 'all-skills' : args.has('--basic-skills') ? 'initial-skills' : 'baseline'}-${missionArgument ? missionArgument.slice(10) : args.has('--all') ? 'all' : 'representative'}.json`;
const reports = []; let victoryFixture = false, defeatFixture = false;
await mkdir('test-results', { recursive: true });
for (const mission of missions) {
  const selectedSkills = args.has('--skills') ? content.skills.filter(s => s.era === null || s.era === mission.era).map(s => s.id) : args.has('--basic-skills') ? ['discipline', 'logistics'] : [];
  const state = createBattle(mission, content, selectedSkills, [0, 1]);
  const start = performance.now(); let peak = state.units.length, maximumStep = 0;
  for (let tick = 0; tick < limit && !state.ended; tick++) {
    const prior = mission.id === 'e1m1' && !args.has('--skills') ? JSON.parse(JSON.stringify(state)) : null;
    if (mission.id === 'e1m1' && !args.has('--skills')) {
      const enemyMain = state.strongholds.find(s => s.id.endsWith('-enemy'));
      const ownMain = state.strongholds.find(s => s.id.endsWith('-home'));
      const aboutToWin = enemyMain.capturing === 0 && enemyMain.progress >= 95;
      const aboutToLose = ownMain.capturing === 1 && ownMain.progress >= 95;
      if ((!victoryFixture && aboutToWin) || (!defeatFixture && aboutToLose)) {
        const battle = JSON.parse(JSON.stringify(state)); battle.aiSides = [1];
        const campaign = createCampaign(); campaign.skills = selectedSkills; campaign.points -= content.skills.filter(s => selectedSkills.includes(s.id)).reduce((n, s) => n + s.cost, 0);
        const save = { version: 1, savedAt: Date.now(), campaign, battle };
        // The portable file follows the exact production importer validation.
        validateSave(save, content);
        const name = aboutToWin ? 'late-victory' : 'late-defeat';
        await writeFile(`test-results/${name}.json`, JSON.stringify(save));
        console.log(JSON.stringify({ fixture: name, mission: mission.id, time: state.time, capture: aboutToWin ? enemyMain.progress : ownMain.progress }));
        if (aboutToWin) victoryFixture = true; else defeatFixture = true;
      }
    }
    const before = performance.now(); stepBattle(state, content); maximumStep = Math.max(maximumStep, performance.now() - before); peak = Math.max(peak, state.units.length);
    if (state.ended && prior && !(state.winner === 0 ? victoryFixture : defeatFixture)) {
      prior.aiSides = [1];
      const name = state.winner === 0 ? 'late-victory' : 'late-defeat';
      const campaign = createCampaign(); campaign.skills = selectedSkills; campaign.points -= content.skills.filter(s => selectedSkills.includes(s.id)).reduce((n, s) => n + s.cost, 0);
      const save = validateSave({ version: 1, savedAt: Date.now(), campaign, battle: prior }, content);
      await writeFile(`test-results/${name}.json`, JSON.stringify(save));
      console.log(JSON.stringify({ fixture: name, mission: mission.id, time: prior.time, condition: 'military collapse or capture next tick' }));
      if (state.winner === 0) victoryFixture = true; else defeatFixture = true;
    }
    if ((tick + 1) % 2000 === 0) console.log(JSON.stringify({ progress: mission.id, time: state.time, units: state.units.length, kills: state.factions.map(f => Object.values(f.kills).reduce((n, k) => n + k, 0)), objectives: state.ai.map(a => a.objective), modes: state.ai.map(a => a.mode) }));
  }
  const elapsedMs = performance.now() - start;
  const report = { id: mission.id, skills: selectedSkills.length, ended: state.ended, winner: state.winner, time: state.time, ticks: state.tick, peakUnits: peak,
    elapsedMs: Math.round(elapsedMs), averageStepMs: +(elapsedMs / state.tick).toFixed(3), maximumStepMs: +maximumStep.toFixed(3),
    remaining: state.units.reduce((s, u) => { s[u.owner]++; return s; }, [0, 0]), resources: state.factions.map(f => f.resources),
    scores: state.factions.map(f => f.score),
    kills: state.factions.map(f => Object.values(f.kills).reduce((n, k) => n + k, 0)), captures: state.factions.map(f => f.captured.length - 1),
    objectives: state.ai.map(a => a.objective), modes: state.ai.map(a => a.mode), stalledUnits: state.units.filter(u => u.stuck > .5).length,
    mainProgress: state.strongholds.filter(s => s.kind === 'main').map(s => ({ owner: s.owner, progress: +s.progress.toFixed(2), capturing: s.capturing })) };
  reports.push(report); console.log(JSON.stringify(report));
  if (!state.ended) await writeFile(`test-results/stalled-${mission.id}.json`, JSON.stringify(state));
  await writeFile(reportPath, JSON.stringify({ engine: 'Node.js', fixedStep: .1, limit, skills: args.has('--skills'), missions: reports }, null, 2));
}
console.log(JSON.stringify({ summary: true, completed: reports.filter(r => r.ended).length, tested: reports.length, totalMs: reports.reduce((n, r) => n + r.elapsedMs, 0), victoryFixture, defeatFixture }));

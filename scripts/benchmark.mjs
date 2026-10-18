/** Headless simulation benchmarks. Compile first with npm test; no browser/frame-rate claim is made. */
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
let content, createBattle, stepBattle, applyCommand, findPath, isWalkable;
try {
  ({ content } = await import('../.test-build/src/content/index.js'));
  ({ createBattle, stepBattle, applyCommand } = await import('../.test-build/src/sim/engine.js'));
  ({ findPath, isWalkable } = await import('../.test-build/src/sim/navigation.js'));
} catch (error) {
  console.error('Compile current TypeScript with npm test before running this benchmark.');
  throw error;
}
const readOptional = async path => { try { return (await readFile(path, 'utf8')).trim(); } catch { return null; } };
const rounded = n => Math.round(n * 1000) / 1000;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const memory = () => {
  const { rss, heapUsed, heapTotal, external, arrayBuffers } = process.memoryUsage();
  return { rss, heapUsed, heapTotal, external, arrayBuffers };
};
const memoryDelta = (before, after) => Object.fromEntries(Object.keys(before).map(key => [key, after[key] - before[key]]));
const forceGC = () => { if (typeof globalThis.gc === 'function') globalThis.gc(); };
function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = p => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? 0;
  return { samples: samples.length, totalMs: rounded(samples.reduce((a, b) => a + b, 0)), meanMs: rounded(samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length)),
    p50Ms: rounded(percentile(.5)), p95Ms: rounded(percentile(.95)), p99Ms: rounded(percentile(.99)), maxMs: rounded(sorted.at(-1) ?? 0) };
}

/** Synthetic density uses unchanged authored unit statistics, legal terrain, and unique IDs.
 * The large starting army intentionally exceeds authored capacity; existing units remain legal under capacity-drop rules.
 */
function densityFixture(count, missionId = 'e4m2') {
  const mission = content.missions.find(m => m.id === missionId);
  if (!mission) throw new Error(`Missing benchmark mission ${missionId}`);
  const state = createBattle(mission, content, [], [0, 1]);
  const initial = state.units, units = [], used = new Set();
  for (const side of [0, 1]) {
    const templates = initial.filter(u => u.owner === side);
    if (!templates.length) throw new Error(`No starting templates for side ${side}`);
    const home = state.strongholds.find(s => s.kind === 'main' && s.owner === side);
    const candidates = [];
    for (let y = 1; y < mission.map.length - 1; y++) for (let x = 1; x < mission.map[0].length - 1; x++) {
      const cell = { x, y };
      if (isWalkable(mission.map, x, y) && !state.strongholds.some(s => s.kind !== 'gate' && distance(s, cell) < .9)) candidates.push(cell);
    }
    candidates.sort((a, b) => distance(a, home) - distance(b, home) || a.y - b.y || a.x - b.x);
    const sideCount = side === 0 ? Math.floor(count / 2) : Math.ceil(count / 2);
    for (let i = 0; i < sideCount; i++) {
      const cell = candidates.find(p => !used.has(`${p.x},${p.y}`));
      if (!cell) throw new Error(`Cannot place ${count} legal nonoverlapping units in ${missionId}`);
      used.add(`${cell.x},${cell.y}`);
      units.push({ ...structuredClone(templates[i % templates.length]), ...cell, id: `benchmark-${side}-${i}`, orders: [], route: [], group: side + 1, slot: i });
    }
  }
  state.units = units;
  state.nextId += count;
  for (const side of [0, 1]) {
    const enemyMain = state.strongholds.find(s => s.kind === 'main' && s.owner !== side);
    applyCommand(state, { type: 'order', side, ids: state.units.filter(u => u.owner === side).map(u => u.id), order: { kind: 'capture', x: enemyMain.x, y: enemyMain.y, target: enemyMain.id } }, content);
  }
  return state;
}

function measureDensity(label, count, ticks = 200) {
  let state = densityFixture(count);
  const durations = [], beforeMemory = memory(), initialUnits = state.units.length;
  let minUnits = initialUnits, maxUnits = initialUnits, resets = 0;
  for (let i = 0; i < ticks; i++) {
    if (state.ended) { state = densityFixture(count); resets++; }
    const started = performance.now();
    stepBattle(state, content);
    durations.push(performance.now() - started);
    minUnits = Math.min(minUnits, state.units.length); maxUnits = Math.max(maxUnits, state.units.length);
  }
  return { label, mission: state.missionId, initialUnits, observedUnits: { min: minUnits, max: maxUnits }, requestedTicks: ticks,
    simulatedSeconds: ticks * .1, fixtureResets: resets, timing: summarize(durations), memoryDeltaBytes: memoryDelta(beforeMemory, memory()) };
}

function measureRoutes() {
  const rows = Array.from({ length: 24 }, (_, y) => Array.from({ length: 28 }, (_, x) => x === 13 ? (y === 12 ? '=' : '~') : (x < 8 && y % 3 === 0 ? 'f' : '.')).join(''));
  const durations = [], bridgeBarrier = { id: 'bottleneck', kind: 'barrier', owner: 1, x: 13, y: 12, hp: 180, maxHp: 180, built: 1 };
  let reached = 0, recovered = 0, waypoints = 0;
  for (let i = 0; i < 100; i++) {
    const start = { x: 1 + i % 10, y: 1 + i % 21 }, goal = { x: 16 + i % 10, y: 1 + (i * 7) % 21 };
    const started = performance.now();
    const path = findPath(rows, start, goal, i % 2 ? [bridgeBarrier] : [], 0);
    durations.push(performance.now() - started); waypoints += path.length;
    if (path.at(-1)?.x === goal.x && path.at(-1)?.y === goal.y) reached++; else recovered++;
  }
  if (reached !== 50 || recovered !== 50) throw new Error(`Bottleneck routing failed: ${reached} reached, ${recovered} recovered`);
  return { label: 'One-cell bridge / dynamic enemy barrier', dimensions: [28, 24], routes: 100, reachable: reached, safeUnreachableRecovery: recovered,
    totalWaypoints: waypoints, timing: summarize(durations) };
}

function measureTransitions() {
  forceGC();
  const before = memory(), samples = [], durations = [];
  for (let i = 0; i < 50; i++) {
    const mission = content.missions[i % content.missions.length];
    const started = performance.now();
    const state = createBattle(mission, content, [], [0, 1]);
    for (let tick = 0; tick < 10 && !state.ended; tick++) stepBattle(state, content);
    durations.push(performance.now() - started);
    if ((i + 1) % 10 === 0) { forceGC(); samples.push({ transitions: i + 1, ...memory() }); }
  }
  forceGC();
  const after = memory();
  return { transitions: 50, distinctMissions: Math.min(50, content.missions.length), ticksPerTransition: 10, forcedGC: typeof globalThis.gc === 'function',
    timing: summarize(durations), beforeBytes: before, afterBytes: after, memoryDeltaBytes: memoryDelta(before, after), samplesBytes: samples };
}

function measureExtended(ticks = 5000) {
  forceGC();
  const before = memory(), durations = [], samples = [], completedBattles = [];
  let state = densityFixture(40), quietTicks = 0, longestQuietTicks = 0;
  let minUnits = state.units.length, maxUnits = state.units.length, accumulatedMovement = 0, accumulatedDamage = 0, ownershipChanges = 0;
  for (let i = 0; i < ticks; i++) {
    if (state.ended) { completedBattles.push({ winner: state.winner, durationSeconds: state.time }); state = densityFixture(40); quietTicks = 0; }
    const positions = new Map(state.units.map(u => [u.id, { x: u.x, y: u.y }]));
    const owners = state.strongholds.map(s => s.owner), previousDamage = state.factions.reduce((n, f) => n + f.damageDealt, 0);
    const started = performance.now(); stepBattle(state, content); durations.push(performance.now() - started);
    const moved = state.units.reduce((n, u) => n + (positions.has(u.id) ? distance(positions.get(u.id), u) : 0), 0);
    const damage = state.factions.reduce((n, f) => n + f.damageDealt, 0) - previousDamage;
    const captures = state.strongholds.reduce((n, stronghold, index) => n + (stronghold.owner !== owners[index] ? 1 : 0), 0);
    accumulatedMovement += moved; accumulatedDamage += damage; ownershipChanges += captures;
    quietTicks = moved < .01 && damage < .001 && captures === 0 ? quietTicks + 1 : 0;
    longestQuietTicks = Math.max(longestQuietTicks, quietTicks);
    minUnits = Math.min(minUnits, state.units.length); maxUnits = Math.max(maxUnits, state.units.length);
    if ((i + 1) % 500 === 0) { forceGC(); samples.push({ ticks: i + 1, currentBattleSeconds: state.time, units: state.units.length, ...memory() }); }
  }
  if (state.ended) completedBattles.push({ winner: state.winner, durationSeconds: state.time });
  forceGC();
  const after = memory();
  return { requestedTicks: ticks, simulatedSeconds: ticks * .1, initialUnitsPerBattle: 40, observedUnits: { min: minUnits, max: maxUnits },
    completedBattles, currentBattle: { ended: state.ended, elapsedSeconds: state.time, units: state.units.length, winner: state.winner },
    activity: { accumulatedMovementCells: rounded(accumulatedMovement), accumulatedDamage: rounded(accumulatedDamage), ownershipChanges, longestNoMovementDamageOrCaptureSeconds: longestQuietTicks * .1 },
    timing: summarize(durations), forcedGC: typeof globalThis.gc === 'function', beforeBytes: before, afterBytes: after,
    memoryDeltaBytes: memoryDelta(before, after), samplesBytes: samples,
    caveat: 'Artificial density fixture resets only after actual battle completion. Quiet-period detection is a coarse diagnostic, not a proof against tactical deadlocks.' };
}

// Warm the shared code before measurements; density fixtures themselves are created outside tick timers.
let warm = densityFixture(40);
for (let i = 0; i < 30 && !warm.ended; i++) stepBattle(warm, content);
warm = null;
forceGC();
const result = {
  measuredAt: new Date().toISOString(), scope: 'Synthetic single-threaded Node simulation only; no renderer, Worker IPC, browser FPS, or device-class claim.',
  environment: { node: process.version, platform: process.platform, arch: process.arch, kernel: os.release(), cpuModel: os.cpus()[0]?.model ?? 'unknown', logicalCPUs: os.cpus().length,
    osMemoryBytes: os.totalmem(), cgroupCPUMax: await readOptional('/sys/fs/cgroup/cpu.max'), cgroupMemoryMax: await readOptional('/sys/fs/cgroup/memory.max'),
    forcedGC: typeof globalThis.gc === 'function' },
  methodology: { fixedStepSeconds: .1, warmupTicks: 30, aiSides: [0, 1], fixture: 'Authored e4m2, unchanged initial-role templates, legal unique cell placements, artificial deployed density above ordinary capacity.',
    caveats: ['One run in a shared container; JIT, GC, and co-tenant load affect results.', 'Per-tick memory deltas include temporary allocations and cannot establish a leak.', 'Transition post-GC retained heap is indicative only; browser scene and GPU memory require browser testing.'] },
  ordinary: measureDensity('Ordinary 40-unit encounter', 40), heavy: measureDensity('Heavy 200-unit encounter', 200),
  bottleneckPathfinding: measureRoutes(), repeatedTransitions: measureTransitions(), extendedSession: measureExtended(),
};
await mkdir(`${projectRoot}/test-results`, { recursive: true });
await writeFile(`${projectRoot}/test-results/benchmark.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

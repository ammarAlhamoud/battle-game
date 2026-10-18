import type { BattleState, Command, Faction, Formation, GameContent, GameEvent, MissionDef, Order, Side, Stronghold, Structure, Unit, UnitDef, Vec } from '../contracts.js';
import { decideAI } from './ai.js';
import { findPath, formationModifiers, formationOffset, isNarrow, isWalkable, localAvoidance, terrainAt, terrainModifiers } from './navigation.js';

/** All authoritative mechanics use cell coordinates and seconds. No wall clock or Math.random. */
export const RULES = {
  step: .1, startedRefund: .5, captureRadius: 2.15, mainCaptureRate: 4, captureRate: 7,
  barrierCost: 35, towerCost: 65, barrierHp: 180, towerHp: 130,
  barrierTime: 8, towerTime: 12, reserveLimit: 30, queueLimit: 18,
  killResourceFraction: .45, killScoreMultiplier: 3,
  abilityCosts: { rally: 30, recon: 25, volley: 45 }, abilityCooldowns: { rally: 45, recon: 35, volley: 55 },
} as const;
const other = (side: Side): Side => side === 0 ? 1 : 0;
const distance = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
const cloneOrder = (o: Order): Order => ({ kind: o.kind, x: o.x, y: o.y, ...(o.target ? { target: o.target } : {}) });
const definitions = new WeakMap<GameContent, Map<string, UnitDef>>();
function defs(content: GameContent): Map<string, UnitDef> {
  let result = definitions.get(content);
  if (!result) { result = new Map(content.eras.flatMap(e => e.units.map(u => [u.id, u] as const))); definitions.set(content, result); }
  return result;
}
function definition(content: GameContent, id: string): UnitDef { const d = defs(content).get(id); if (!d) throw new Error(`Unknown unit ${id}`); return d; }
function missionOf(state: BattleState, content: GameContent): MissionDef { const m = content.missions.find(m => m.id === state.missionId); if (!m) throw new Error(`Unknown mission ${state.missionId}`); return m; }
function effect(state: BattleState, side: Side, content: GameContent, type: string): number {
  const era = missionOf(state, content).era;
  return content.skills.reduce((total, skill) => total + (state.factions[side].skills.includes(skill.id) && skill.effect === type && (skill.era === null || skill.era === era) ? skill.value : 0), 0);
}
function hasEffect(state: BattleState, side: Side, content: GameContent, type: string): boolean {
  const era = missionOf(state, content).era;
  return content.skills.some(s => state.factions[side].skills.includes(s.id) && s.effect === type && (s.era === null || s.era === era));
}
function main(state: BattleState, side: Side): Stronghold | undefined { return state.strongholds.find(s => s.kind === 'main' && s.owner === side); }
function obstacles(state: BattleState): Structure[] {
  // Buildings occupy one map cell; capture remains possible from the surrounding zone.
  return [...state.structures, ...state.strongholds.filter(s => s.kind !== 'gate').map(s => ({ id: `obstacle:${s.id}`, x: s.x, y: s.y, owner: (s.owner ?? 0) as Side, hp: 1, maxHp: 1, built: 1, kind: 'tower' as const }))];
}
function emit(state: BattleState, event: Omit<GameEvent, 'id' | 'tick'>): void {
  state.events.push({ ...event, id: state.nextId++, tick: state.tick });
  if (state.events.length > 80) state.events.splice(0, state.events.length - 80);
}
export function capacity(state: BattleState, side: Side, content: GameContent): number {
  return Math.max(0, state.factions[side].baseCapacity + effect(state, side, content, 'capacity') + state.strongholds.filter(s => s.kind !== 'main' && s.owner === side).reduce((n, s) => n + s.capacity, 0));
}
export function usage(state: BattleState, side: Side, content: GameContent): number {
  return state.units.reduce((n, u) => n + (u.owner === side && u.hp > 0 ? definition(content, u.defId).capacity : 0), 0);
}
export function unlockedUnits(state: BattleState, side: Side, content: GameContent): UnitDef[] {
  const mission = missionOf(state, content);
  return (content.eras.find(e => e.id === mission.era)?.units ?? []).filter(u => mission.roster.includes(u.role) && (!u.skill || state.factions[side].skills.includes(u.skill)));
}
function faction(resources: number, mission: MissionDef, skills: string[]): Faction {
  return { resources, spent: 0, earned: 0, baseCapacity: mission.capacity, reserveCapacity: mission.reserveCapacity,
    lines: [], reserves: [], autoDeploy: true, skills: [...skills], cooldowns: {}, kills: {}, score: 0,
    lost: 0, captured: [], damageDealt: 0 };
}
function spawn(state: BattleState, side: Side, def: UnitDef, content: GameContent, initial = false): Unit | null {
  const home = main(state, side); if (!home) return null;
  const mission = missionOf(state, content);
  const candidates: Vec[] = [];
  // Stable spiral prevents fresh reinforcements stacking inside the stronghold.
  for (let radius = 1; radius <= 5; radius++) for (let i = 0; i < radius * 8; i++) {
    const angle = i / (radius * 8) * Math.PI * 2;
    candidates.push({ x: home.x + Math.cos(angle) * radius * .7, y: home.y + Math.sin(angle) * radius * .7 });
  }
  const blocked = obstacles(state);
  const position = candidates.find(p => isWalkable(mission.map, p.x, p.y, blocked, side) && state.units.every(u => distance(u, p) > .52));
  if (!position) return null;
  const unit: Unit = { id: `u${state.nextId++}`, owner: side, defId: def.id, hp: def.hp, x: position.x, y: position.y,
    facing: side ? Math.PI : 0, orders: [], route: [], cooldown: 0, abilityCooldown: 0, formation: 'line',
    group: 0, slot: 0, status: 'idle', lastHit: -100, stuck: 0 };
  state.units.push(unit);
  if (!initial) emit(state, { kind: 'deploy', owner: side, x: unit.x, y: unit.y, text: def.name });
  return unit;
}
export function createBattle(mission: MissionDef, content: GameContent, skills: string[] = [], aiSides: Side[] = [1]): BattleState {
  const width = mission.map[0]?.length ?? 0, cells = width * mission.map.length;
  const knownSkills = skills.filter(id => content.skills.some(s => s.id === id));
  const state: BattleState = { version: 1, missionId: mission.id, seed: mission.seed, tick: 0, time: 0, paused: false,
    units: [], factions: [faction(mission.resources[0], mission, knownSkills), faction(mission.resources[1], mission, knownSkills)],
    strongholds: mission.strongholds.map(s => ({ ...s, progress: 0, capturing: null })), structures: [],
    fog: [0, 1].map(() => ({ visible: Array<boolean>(cells).fill(false), explored: Array<boolean>(cells).fill(false), memory: {} })) as BattleState['fog'],
    ai: [0, 1].map(() => ({ nextDecision: 0, objective: null, mode: 'expand', lastKnown: {}, decisions: 0 })) as BattleState['ai'],
    events: [], nextId: 1, winner: null, ended: false, aiSides: [...aiSides] };
  for (const side of [0, 1] as Side[]) {
    const f = state.factions[side];
    f.reserveCapacity += effect(state, side, content, 'reserve');
    for (let i = 0; i < Math.min(5, 1 + Math.floor(effect(state, side, content, 'lines'))); i++) f.lines.push({ id: `l${state.nextId++}`, queue: [], blocked: false });
    f.captured = state.strongholds.filter(s => s.owner === side).map(s => s.id);
    const era = content.eras.find(e => e.id === mission.era);
    for (const role of mission.starting[side]) { const d = era?.units.find(u => u.role === role); if (d) spawn(state, side, d, content, true); }
  }
  updateFog(state, content);
  return state;
}

function tileIndex(mission: MissionDef, position: Vec): number { return Math.round(position.y) * mission.map[0]!.length + Math.round(position.x); }
function inside(mission: MissionDef, position: Vec): boolean { return Math.round(position.x) >= 0 && Math.round(position.y) >= 0 && Math.round(position.y) < mission.map.length && Math.round(position.x) < mission.map[0]!.length; }
function lineOfSight(map: string[], source: Vec, target: Vec): boolean {
  const length = distance(source, target), steps = Math.ceil(length * 2); let forest = 0; let last = '';
  for (let i = 1; i < steps; i++) {
    const x = Math.round(source.x + (target.x - source.x) * i / steps), y = Math.round(source.y + (target.y - source.y) * i / steps);
    const key = `${x},${y}`; if (key === last) continue; last = key;
    const tile = map[y]?.[x]; if (tile === '#') return false;
    if (tile === 'f' && ++forest > 2 && length > 3) return false;
  }
  return true;
}
/** Shared by renderer, minimap and AI. Terrain visibility alone never reveals stealth. */
export function unitVisible(state: BattleState, unit: Unit, side: Side, content: GameContent): boolean {
  if (unit.owner === side) return true;
  const mission = missionOf(state, content);
  if (!inside(mission, unit) || !state.fog[side].visible[tileIndex(mission, unit)]) return false;
  const def = definition(content, unit.defId);
  if (!def.stealth || state.time - unit.lastHit < 1.5) return true;
  return state.units.some(observer => observer.owner === side && observer.hp > 0 && distance(observer, unit) <= Math.max(1.25, definition(content, observer.defId).detection + effect(state, side, content, 'vision')) && lineOfSight(mission.map, observer, unit))
    || state.strongholds.some(s => s.owner === side && distance(s, unit) <= 1.4)
    || Object.keys(state.factions[side].cooldowns).some(key => key.startsWith('reveal:') && state.factions[side].cooldowns[key]! > 0 && distance(unit, decodePoint(key)) <= 9);
}
function decodePoint(key: string): Vec { const pair = key.slice(key.indexOf(':') + 1).split(',').map(Number); return { x: pair[0] ?? 0, y: pair[1] ?? 0 }; }
function updateFog(state: BattleState, content: GameContent): void {
  const mission = missionOf(state, content), width = mission.map[0]!.length;
  for (const side of [0, 1] as Side[]) {
    const fog = state.fog[side]; fog.visible.fill(false);
    const sources: { p: Vec; radius: number; recon?: boolean }[] = state.units.filter(u => u.owner === side && u.hp > 0).map(u => ({ p: u, radius: (definition(content, u.defId).vision + effect(state, side, content, 'vision')) * terrainModifiers(terrainAt(mission.map, u.x, u.y)).vision }));
    for (const s of state.strongholds) if (s.owner === side) sources.push({ p: s, radius: s.vision });
    for (const s of state.structures) if (s.owner === side && s.kind === 'tower' && s.built >= 1 && s.hp > 0) sources.push({ p: s, radius: 7 });
    for (const [key, time] of Object.entries(state.factions[side].cooldowns)) if (key.startsWith('reveal:') && time > 0) sources.push({ p: decodePoint(key), radius: 9, recon: true });
    for (const { p, radius, recon } of sources) {
      for (let y = Math.max(0, Math.ceil(p.y - radius)); y <= Math.min(mission.map.length - 1, Math.floor(p.y + radius)); y++) for (let x = Math.max(0, Math.ceil(p.x - radius)); x <= Math.min(width - 1, Math.floor(p.x + radius)); x++) {
        const point = { x, y }, sight = terrainAt(mission.map, x, y) === 'f' ? radius * .82 : radius;
        if (distance(p, point) <= sight && (recon || lineOfSight(mission.map, p, point))) { fog.visible[y * width + x] = true; fog.explored[y * width + x] = true; }
      }
    }
    // Remove stale ghosts only when their remembered location is legitimately inspected.
    for (const [id, memory] of Object.entries(fog.memory)) if (fog.visible[tileIndex(mission, memory)] && !state.units.some(u => u.id === id && unitVisible(state, u, side, content))) delete fog.memory[id];
    for (const unit of state.units) if (unit.hp > 0 && unit.owner !== side && unitVisible(state, unit, side, content)) fog.memory[unit.id] = { id: unit.id, defId: unit.defId, x: unit.x, y: unit.y, seen: state.time };
  }
}

function deployReserves(state: BattleState, side: Side, content: GameContent, requested?: string): void {
  const f = state.factions[side];
  // Iterate a copy: priority remains stable when an oversized unit cannot currently fit.
  for (const reserve of [...f.reserves]) {
    if (requested && reserve.id !== requested) continue;
    const def = definition(content, reserve.unitId);
    if (usage(state, side, content) + def.capacity <= capacity(state, side, content) && spawn(state, side, def, content)) f.reserves.splice(f.reserves.indexOf(reserve), 1);
  }
}
function processProduction(state: BattleState, side: Side, content: GameContent, dt: number): void {
  const f = state.factions[side];
  if (!main(state, side)) return;
  if (f.autoDeploy) deployReserves(state, side, content);
  for (const line of f.lines) {
    line.blocked = false; const job = line.queue[0]; if (!job) continue;
    job.started = true; job.remaining = Math.max(0, job.remaining - dt);
    if (job.remaining > .00001) continue;
    const def = definition(content, job.unitId);
    if (f.autoDeploy && usage(state, side, content) + def.capacity <= capacity(state, side, content) && spawn(state, side, def, content)) line.queue.shift();
    else if (f.reserves.length < f.reserveCapacity) { f.reserves.push({ id: `r${state.nextId++}`, unitId: def.id }); line.queue.shift(); }
    else line.blocked = true;
  }
}
function addRecruit(state: BattleState, side: Side, id: string, content: GameContent, lineIndex?: number): void {
  if (!main(state, side)) return;
  const def = unlockedUnits(state, side, content).find(u => u.id === id), f = state.factions[side];
  if (!def || f.resources < def.cost) return;
  const line = lineIndex === undefined ? [...f.lines].sort((a, b) => a.queue.reduce((n, j) => n + j.remaining, 0) - b.queue.reduce((n, j) => n + j.remaining, 0))[0] : f.lines[lineIndex];
  if (!line || line.queue.length >= RULES.queueLimit) return;
  const duration = def.training * Math.max(.35, 1 - effect(state, side, content, 'training'));
  line.queue.push({ id: `j${state.nextId++}`, unitId: id, total: duration, remaining: duration, started: false }); f.resources -= def.cost; f.spent += def.cost;
}
function validPoint(mission: MissionDef, p: Vec): boolean { return Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.y >= 0 && p.x < mission.map[0]!.length && p.y < mission.map.length; }
export function applyCommand(state: BattleState, command: Command, content: GameContent): void {
  if (command.type === 'pause') { if (!state.ended) state.paused = command.value; return; }
  if (state.ended) return;
  const side = command.side, f = state.factions[side]; if (!f) return;
  const selected = 'ids' in command ? state.units.filter(u => u.owner === side && u.hp > 0 && command.ids.includes(u.id)) : [];
  switch (command.type) {
    case 'order': {
      if (!validPoint(missionOf(state, content), command.order)) break;
      const group = state.nextId++;
      selected.forEach((u, index) => { const order = cloneOrder(command.order); u.orders = command.append ? [...u.orders, order].slice(0, 32) : [order]; if (!command.append) u.route = []; u.group = group; u.slot = index; delete u.targetId; }); break;
    }
    case 'editOrders': selected.forEach(u => { u.orders = command.orders.filter(o => validPoint(missionOf(state, content), o)).slice(0, 32).map(cloneOrder); u.route = []; delete u.targetId; }); break;
    case 'formation': {
      if (!['line', 'column', 'wedge', 'spread', 'shield'].includes(command.formation)) break;
      if ((command.formation === 'shield' || command.formation === 'wedge' || command.formation === 'spread') && !hasEffect(state, side, content, 'formations')) break;
      const group = state.nextId++; selected.forEach((u, i) => { u.formation = command.formation; u.group = group; u.slot = i; u.route = []; }); break;
    }
    case 'recruit': addRecruit(state, side, command.unitId, content, command.line); break;
    case 'cancelTraining': {
      const line = f.lines[command.line], job = line?.queue.find(j => j.id === command.jobId); if (!line || !job) break;
      const refund = Math.floor(definition(content, job.unitId).cost * (job.started ? RULES.startedRefund : 1));
      f.resources += refund; f.spent -= refund; line.queue.splice(line.queue.indexOf(job), 1); line.blocked = false; break;
    }
    case 'autoDeploy': f.autoDeploy = command.value; break;
    case 'deploy': if (state.paused) f.cooldowns[`deploy:${command.reserveId ?? 'all'}`] = -1; else deployReserves(state, side, content, command.reserveId); break;
    case 'reservePriority': {
      const wanted = [...new Set(command.ids)]; const prior = [...f.reserves];
      f.reserves = wanted.flatMap(id => prior.filter(r => r.id === id)).concat(prior.filter(r => !wanted.includes(r.id))); break;
    }
    case 'ability': {
      if (!validPoint(missionOf(state, content), command)) break;
      if (state.paused) f.cooldowns[`pending:${command.ability}:${command.x},${command.y}`] = -1;
      else globalAbility(state, side, command.ability, command, content); break;
    }
    case 'unitAbility': selected.forEach(u => { if (state.paused) u.orders.unshift({ kind: 'ability', x: u.x, y: u.y }); else unitAbility(state, u, content); }); break;
    case 'build': {
      if (!validPoint(missionOf(state, content), command)) break;
      const engineer = selected.find(u => definition(content, u.defId).role === 'engineer');
      if (engineer) { engineer.orders = [{ kind: 'build', target: command.kind, x: Math.round(command.x), y: Math.round(command.y) }]; engineer.route = []; } break;
    }
  }
}

function takeDamage(state: BattleState, target: Unit, amount: number, attacker: Side, content: GameContent, source: Vec): void {
  if (target.hp <= 0 || target.owner === attacker) return;
  const actual = Math.min(target.hp, Math.max(1, amount)); target.hp -= actual; target.lastHit = state.time; target.status = 'hurt';
  state.factions[attacker].damageDealt += actual;
  emit(state, { kind: 'hit', owner: attacker, x: target.x, y: target.y, target: { x: source.x, y: source.y } });
  if (target.hp <= 0) {
    const def = definition(content, target.defId), f = state.factions[attacker];
    const count = (f.kills[def.id] ?? 0) + 1; f.kills[def.id] = count;
    const reward = Math.max(1, Math.round(def.cost * RULES.killResourceFraction)); f.resources += reward; f.earned += reward;
    f.score += Math.round(def.cost * RULES.killScoreMultiplier / Math.sqrt(1 + (count - 1) / 3));
    state.factions[target.owner].lost++;
    emit(state, { kind: 'death', owner: target.owner, x: target.x, y: target.y, text: def.name });
  }
}
function damageAmount(state: BattleState, attacker: Unit, target: Unit, content: GameContent, multiplier = 1): number {
  const mission = missionOf(state, content), attack = definition(content, attacker.defId), defense = definition(content, target.defId);
  const formation = formationModifiers(attacker.formation), defending = formationModifiers(target.formation);
  const terrain = terrainModifiers(terrainAt(mission.map, target.x, target.y));
  const skillDamage = effect(state, attacker.owner, content, 'damage'), skillArmor = effect(state, target.owner, content, 'armor');
  const highGround = terrainAt(mission.map, attacker.x, attacker.y) === '^' && terrainAt(mission.map, target.x, target.y) !== '^' ? 1.12 : 1;
  const stealth = attack.stealth && attacker.cooldown <= 0 && !unitVisible(state, attacker, target.owner, content) ? 1.35 : 1;
  const armor = defense.armor + defending.armor + skillArmor;
  return Math.max(1, (attack.damage * (attack.counters[defense.role] ?? 1) * formation.damage * (1 + skillDamage) * highGround * multiplier * stealth - armor * .65) * (1 - terrain.cover));
}
function attackUnit(state: BattleState, unit: Unit, target: Unit, content: GameContent): void {
  const def = definition(content, unit.defId); unit.status = 'attack'; unit.facing = Math.atan2(target.y - unit.y, target.x - unit.x); unit.targetId = target.id;
  if (unit.cooldown > 0) return;
  const primaryDamage = damageAmount(state, unit, target, content);
  unit.cooldown = def.attackTime;
  unit.lastHit = state.time; // Attacking breaks concealment for the same brief reveal window as being hit.
  emit(state, { kind: def.range > 1.8 ? 'shot' : 'hit', owner: unit.owner, x: unit.x, y: unit.y, target: { x: target.x, y: target.y } });
  takeDamage(state, target, primaryDamage, unit.owner, content, unit);
  if (def.splash > 0) for (const enemy of state.units) if (enemy.id !== target.id && enemy.owner !== unit.owner && enemy.hp > 0 && distance(enemy, target) <= def.splash) takeDamage(state, enemy, damageAmount(state, unit, enemy, content, .55 * formationModifiers(enemy.formation).splash), unit.owner, content, unit);
}
function visibleCell(state: BattleState, side: Side, p: Vec, content: GameContent): boolean { const mission = missionOf(state, content); return inside(mission, p) && !!state.fog[side].visible[tileIndex(mission, p)]; }
function globalAbility(state: BattleState, side: Side, ability: 'rally' | 'recon' | 'volley', point: Vec, content: GameContent): void {
  const f = state.factions[side], cost = RULES.abilityCosts[ability];
  if ((f.cooldowns[ability] ?? 0) > 0 || f.resources < cost || !hasEffect(state, side, content, ability)) return;
  if (ability !== 'recon' && !visibleCell(state, side, point, content)) return;
  f.resources -= cost; f.spent += cost; f.cooldowns[ability] = RULES.abilityCooldowns[ability];
  if (ability === 'rally') for (const unit of state.units) if (unit.owner === side && distance(unit, point) <= 4) unit.hp = Math.min(definition(content, unit.defId).hp, unit.hp + definition(content, unit.defId).hp * .28);
  if (ability === 'recon') f.cooldowns[`reveal:${point.x},${point.y}`] = 12;
  if (ability === 'volley') for (const unit of state.units) if (unit.owner !== side && unit.hp > 0 && distance(unit, point) <= 2.4 && unitVisible(state, unit, side, content)) takeDamage(state, unit, 45 * formationModifiers(unit.formation).splash, side, content, point);
  emit(state, { kind: 'ability', owner: side, x: point.x, y: point.y, text: ability });
}
function unitAbility(state: BattleState, unit: Unit, content: GameContent): void {
  const def = definition(content, unit.defId), f = state.factions[unit.owner];
  if (unit.abilityCooldown > 0 || f.resources < 4) return;
  const enemies = state.units.filter(e => e.owner !== unit.owner && e.hp > 0 && unitVisible(state, e, unit.owner, content)).sort((a, b) => distance(unit, a) - distance(unit, b));
  const target = enemies[0]; let useful = false;
  if (def.role === 'guard' && unit.hp < def.hp) { unit.hp = Math.min(def.hp, unit.hp + def.hp * .25); useful = true; }
  else if (def.role === 'scout') { f.cooldowns[`reveal:${unit.x},${unit.y}`] = 8; useful = true; }
  else if (def.role === 'engineer') {
    const structure = state.structures.find(s => s.owner === unit.owner && s.hp < s.maxHp && distance(s, unit) < 2.5);
    if (structure) { structure.hp = Math.min(structure.maxHp, structure.hp + 40); useful = true; }
  } else if (target && distance(unit, target) <= Math.max(3, def.range + 1)) {
    const multiplier = def.role === 'stealth' ? 2 : 1.5;
    takeDamage(state, target, damageAmount(state, unit, target, content, multiplier), unit.owner, content, unit); unit.lastHit = state.time; useful = true;
    if (def.role === 'siege' || def.role === 'frontline') for (const enemy of enemies.slice(1)) if (distance(enemy, target) <= (def.role === 'siege' ? 1.8 : 1.1)) takeDamage(state, enemy, def.damage, unit.owner, content, unit);
  }
  if (useful) { f.resources -= 4; f.spent += 4; unit.abilityCooldown = 18; emit(state, { kind: 'ability', owner: unit.owner, x: unit.x, y: unit.y, text: def.role }); }
}

function formationGoal(state: BattleState, unit: Unit, order: Order, content: GameContent): Vec {
  const mission = missionOf(state, content);
  const blocked = obstacles(state);
  if (isNarrow(mission.map, unit.x, unit.y, blocked, unit.owner) || isNarrow(mission.map, order.x, order.y, blocked, unit.owner)) return { x: order.x, y: order.y };
  const count = state.units.filter(u => u.owner === unit.owner && u.group === unit.group).length;
  let offset = unit.group ? formationOffset(unit.slot, count, unit.formation) : { x: 0, y: 0 };
  const home = main(state, unit.owner) ?? unit, angle = Math.atan2(order.y - home.y, order.x - home.x) - Math.PI / 2;
  offset = { x: offset.x * Math.cos(angle) - offset.y * Math.sin(angle), y: offset.x * Math.sin(angle) + offset.y * Math.cos(angle) };
  if (order.kind === 'capture' || order.kind === 'build') { const length = Math.hypot(offset.x, offset.y); if (length > 1.1) offset = { x: offset.x / length * 1.1, y: offset.y / length * 1.1 }; }
  const result = { x: order.x + offset.x, y: order.y + offset.y };
  if (isWalkable(mission.map, result.x, result.y, blocked, unit.owner)) return result;
  const ring = Array.from({ length: 8 }, (_, i) => ({ x: Math.round(order.x) + Math.cos(i * Math.PI / 4), y: Math.round(order.y) + Math.sin(i * Math.PI / 4) }));
  return ring.filter(p => isWalkable(mission.map, p.x, p.y, blocked, unit.owner)).sort((a, b) => distance(a, unit) - distance(b, unit))[0] ?? { x: order.x, y: order.y };
}
function moveUnit(state: BattleState, unit: Unit, goal: Vec, content: GameContent, dt: number): boolean {
  const mission = missionOf(state, content), def = definition(content, unit.defId);
  if (distance(unit, goal) < .4) { unit.route = []; unit.stuck = 0; return true; }
  const blocked = obstacles(state);
  if (!unit.route.length || unit.stuck > 1.2 || !isWalkable(mission.map, unit.route[0]!.x, unit.route[0]!.y, blocked, unit.owner)) {
    unit.route = findPath(mission.map, unit, goal, blocked, unit.owner); unit.stuck = 0;
    if (!unit.route.length && isWalkable(mission.map, goal.x, goal.y, blocked, unit.owner) && distance(unit, goal) < 1.5) unit.route = [{ ...goal }];
  }
  let waypoint = unit.route[0]; if (!waypoint) { unit.status = 'idle'; unit.stuck += dt; return false; }
  if (distance(unit, waypoint) < .24) { unit.route.shift(); waypoint = unit.route[0] ?? goal; }
  const remaining = distance(unit, waypoint); if (remaining < .001) return distance(unit, goal) < .5;
  const terrain = terrainModifiers(terrainAt(mission.map, unit.x, unit.y));
  const speed = def.speed * terrain.speed * (isNarrow(mission.map, unit.x, unit.y, blocked, unit.owner) ? 1 : formationModifiers(unit.formation).speed);
  let velocity = { x: (waypoint.x - unit.x) / remaining * speed, y: (waypoint.y - unit.y) / remaining * speed };
  const nearby = state.units.filter(u => u.id !== unit.id && u.hp > 0 && distance(u, unit) < 1.4);
  velocity = localAvoidance(unit, velocity, nearby, .29);
  const amount = Math.min(dt, remaining / Math.max(.01, Math.hypot(velocity.x, velocity.y)));
  const next = { x: unit.x + velocity.x * amount, y: unit.y + velocity.y * amount };
  if (isWalkable(mission.map, next.x, next.y, blocked, unit.owner) && !nearby.some(u => distance(u, next) < .26 && distance(u, unit) >= .26)) {
    unit.facing = Math.atan2(next.y - unit.y, next.x - unit.x); unit.x = next.x; unit.y = next.y; unit.status = 'walk'; unit.stuck = 0;
  } else { unit.stuck += dt; if (unit.stuck > .6) unit.route = []; }
  return distance(unit, goal) < .45;
}
function construction(state: BattleState, unit: Unit, order: Order, content: GameContent, dt: number): boolean {
  const def = definition(content, unit.defId); if (def.role !== 'engineer') return true;
  let structure = state.structures.find(s => s.id === order.target);
  const kind = order.target === 'tower' ? 'tower' : 'barrier';
  if (!structure) {
    if (order.target !== 'tower' && order.target !== 'barrier') return true;
    const mission = missionOf(state, content), f = state.factions[unit.owner];
    const discount = Math.max(.5, 1 - effect(state, unit.owner, content, 'construction'));
    const cost = Math.round((kind === 'tower' ? RULES.towerCost : RULES.barrierCost) * discount);
    if (f.resources < cost || !isWalkable(mission.map, order.x, order.y, state.structures, unit.owner) || state.structures.some(s => distance(s, order) < 1) || state.strongholds.some(s => distance(s, order) < 2.4)) return true;
    f.resources -= cost; f.spent += cost;
    const hp = kind === 'tower' ? RULES.towerHp : RULES.barrierHp;
    structure = { id: `s${state.nextId++}`, owner: unit.owner, x: order.x, y: order.y, hp, maxHp: hp, kind, built: 0 };
    state.structures.push(structure); order.target = structure.id;
    emit(state, { kind: 'build', owner: unit.owner, x: structure.x, y: structure.y, text: kind });
  }
  structure.built = Math.min(1, structure.built + dt / ((structure.kind === 'tower' ? RULES.towerTime : RULES.barrierTime) * Math.max(.5, 1 - effect(state, unit.owner, content, 'construction'))));
  unit.status = 'defend'; return structure.built >= 1;
}
function updateUnit(state: BattleState, unit: Unit, content: GameContent, dt: number): void {
  if (unit.hp <= 0) return;
  const def = definition(content, unit.defId), mission = missionOf(state, content), order = unit.orders[0];
  unit.cooldown = Math.max(0, unit.cooldown - dt); unit.abilityCooldown = Math.max(0, unit.abilityCooldown - dt); delete unit.targetId;
  if (order?.kind === 'ability') { unitAbility(state, unit, content); unit.orders.shift(); unit.route = []; return; }
  const range = Math.max(.8, def.range + terrainModifiers(terrainAt(mission.map, unit.x, unit.y)).range);
  const enemies = state.units.filter(e => e.owner !== unit.owner && e.hp > 0 && unitVisible(state, e, unit.owner, content));
  let target = order?.target ? enemies.find(e => e.id === order.target) : undefined;
  if (!target) target = enemies.filter(e => distance(e, unit) <= range + (order?.kind === 'attack' ? 3 : 1.1)).sort((a, b) => {
    const aWeight = distance(unit, a) / (def.counters[definition(content, a.defId).role] ?? 1);
    const bWeight = distance(unit, b) / (def.counters[definition(content, b.defId).role] ?? 1); return aWeight - bWeight;
  })[0];
  if (target && distance(unit, target) <= range && lineOfSight(mission.map, unit, target)) { attackUnit(state, unit, target, content); return; }
  // Destructible defenses can be cleared by any combatant, with siege specialization.
  const enemyStructure = state.structures.filter(s => s.owner !== unit.owner && s.hp > 0 && visibleCell(state, unit.owner, s, content) && distance(unit, s) <= range).sort((a, b) => distance(unit, a) - distance(unit, b))[0];
  if (enemyStructure) {
    unit.status = 'attack'; unit.facing = Math.atan2(enemyStructure.y - unit.y, enemyStructure.x - unit.x);
    if (unit.cooldown <= 0) { unit.cooldown = def.attackTime; enemyStructure.hp -= def.damage * (def.role === 'siege' ? 2.4 : 1); emit(state, { kind: 'hit', owner: unit.owner, x: enemyStructure.x, y: enemyStructure.y }); }
    return;
  }
  if (target && (order?.kind === 'attack' || !order) && distance(unit, target) <= def.vision) { moveUnit(state, unit, target, content, dt); return; }
  if (!order) { unit.status = 'idle'; unit.route = []; return; }
  if (order.kind === 'attack' && order.target && !enemies.some(e => e.id === order.target)) {
    // Continue to the last issued position; hidden live coordinates are never followed.
    if (distance(unit, order) < .8) { unit.orders.shift(); unit.route = []; return; }
  }
  if (order.kind === 'capture') {
    const stronghold = state.strongholds.find(s => s.id === order.target) ?? state.strongholds.find(s => distance(s, order) < 1);
    if (!stronghold || stronghold.owner === unit.owner && stronghold.progress === 0) { unit.orders.shift(); unit.route = []; return; }
  }
  const goal = order.kind === 'build' ? { x: order.x - .7, y: order.y } : formationGoal(state, unit, order, content);
  const arrived = moveUnit(state, unit, goal, content, dt);
  if (arrived) {
    unit.status = order.kind === 'defend' || order.kind === 'capture' || order.kind === 'build' ? 'defend' : 'idle';
    if (order.kind === 'build') { if (construction(state, unit, order, content, dt)) { unit.orders.shift(); unit.route = []; } }
    else if (order.kind !== 'defend' && order.kind !== 'capture') { unit.orders.shift(); unit.route = []; }
  }
}
function updateStructures(state: BattleState, content: GameContent, dt: number): void {
  for (const s of state.structures) {
    if (s.hp <= 0 || s.built < 1 || s.kind !== 'tower') continue;
    const f = state.factions[s.owner], key = `tower:${s.id}`;
    f.cooldowns[key] = Math.max(0, (f.cooldowns[key] ?? 0) - dt);
    const target = state.units.filter(u => u.owner !== s.owner && u.hp > 0 && distance(u, s) < 5 && unitVisible(state, u, s.owner, content)).sort((a, b) => distance(a, s) - distance(b, s))[0];
    if (target && f.cooldowns[key] === 0 && lineOfSight(missionOf(state, content).map, s, target)) { f.cooldowns[key] = 1.5; takeDamage(state, target, 12, s.owner, content, s); emit(state, { kind: 'shot', owner: s.owner, x: s.x, y: s.y, target: { x: target.x, y: target.y } }); }
  }
  state.structures = state.structures.filter(s => s.hp > 0);
}
function captures(state: BattleState, content: GameContent, dt: number): void {
  for (const stronghold of state.strongholds) {
    const power: [number, number] = [0, 0];
    for (const unit of state.units) if (unit.hp > 0 && distance(unit, stronghold) <= RULES.captureRadius) power[unit.owner] += definition(content, unit.defId).capture * (1 + effect(state, unit.owner, content, 'capture'));
    const advantage = power[0] - power[1];
    if (Math.abs(advantage) < .01) { if (!power[0] && !power[1]) stronghold.progress = Math.max(0, stronghold.progress - dt * 2); if (!stronghold.progress) stronghold.capturing = null; continue; }
    const side: Side = advantage > 0 ? 0 : 1;
    const rate = Math.min(3.5, Math.abs(advantage)) * (stronghold.kind === 'main' ? RULES.mainCaptureRate : RULES.captureRate) * dt;
    if (stronghold.owner === side) { stronghold.progress = Math.max(0, stronghold.progress - rate * 1.2); if (!stronghold.progress) stronghold.capturing = null; continue; }
    if (stronghold.capturing !== null && stronghold.capturing !== side && stronghold.progress > 0) { stronghold.progress = Math.max(0, stronghold.progress - rate); if (!stronghold.progress) stronghold.capturing = null; continue; }
    stronghold.capturing = side; stronghold.progress = Math.min(100, stronghold.progress + rate);
    if (stronghold.progress < 100) continue;
    const wasMain = stronghold.kind === 'main'; stronghold.owner = side; stronghold.progress = 0; stronghold.capturing = null;
    const f = state.factions[side];
    if (!f.captured.includes(stronghold.id)) { f.captured.push(stronghold.id); f.resources += stronghold.reward; f.earned += stronghold.reward; f.score += Math.round(stronghold.reward * 3 + (wasMain ? 700 : 180)); }
    emit(state, { kind: 'capture', owner: side, x: stronghold.x, y: stronghold.y, text: stronghold.name });
    if (wasMain) { finish(state, side, content); return; }
  }
}
function viable(state: BattleState, side: Side, content: GameContent): boolean {
  if (state.units.some(u => u.owner === side && u.hp > 0)) return true;
  if (!main(state, side)) return false;
  const f = state.factions[side], cap = capacity(state, side, content);
  if (f.reserves.some(r => definition(content, r.unitId).capacity <= cap)) return true;
  if (f.lines.some(l => l.queue.some(j => definition(content, j.unitId).capacity <= cap))) return true;
  return f.lines.length > 0 && unlockedUnits(state, side, content).some(u => u.cost <= f.resources && u.capacity <= cap);
}
function finish(state: BattleState, winner: Side, content: GameContent): void {
  if (state.ended) return;
  state.ended = true; state.winner = winner;
  for (const side of [0, 1] as Side[]) {
    const f = state.factions[side], aliveValue = state.units.filter(u => u.owner === side && u.hp > 0).reduce((n, u) => n + definition(content, u.defId).cost * u.hp / definition(content, u.defId).hp, 0);
    const efficiency = Math.min(250, Math.round(f.damageDealt / Math.max(1, f.spent + f.lost * 10) * 20));
    f.score += Math.round(aliveValue * .7) + efficiency + (side === winner ? 400 + Math.max(0, Math.round((missionOf(state, content).parTime - state.time) * .5)) : 0);
  }
}
function runAI(state: BattleState, side: Side, content: GameContent): void {
  const plan = state.ai[side]; if (state.time + .00001 < plan.nextDecision) return;
  const mission = missionOf(state, content), width = mission.map[0]!.length;
  // Deep copy the complete observation. AI cannot read authoritative hidden objects or mutate state except its own serializable plan.
  const observation = JSON.parse(JSON.stringify({ side, time: state.time, tick: state.tick,
    own: state.units.filter(u => u.owner === side), enemies: state.units.filter(u => u.owner !== side && unitVisible(state, u, side, content)),
    strongholds: state.strongholds.map(s => {
      if (state.fog[side].visible[Math.round(s.y) * width + Math.round(s.x)] || s.owner === side) return s;
      const configured = mission.strongholds.find(initial => initial.id === s.id)!;
      return { ...configured, progress: 0, capturing: null };
    }), faction: state.factions[side], enemyMemory: state.fog[side].memory,
    structures: state.structures.filter(s => s.owner === side || visibleCell(state, side, s, content)), map: mission.map, mission, plan })) as Parameters<typeof decideAI>[0];
  const commands = decideAI(observation, content); state.ai[side] = observation.plan; state.ai[side].nextDecision = state.time + 1;
  for (const command of commands) if ('side' in command && command.side === side) applyCommand(state, command, content);
}
export function stepBattle(state: BattleState, content: GameContent, dt: number = RULES.step): void {
  if (state.paused || state.ended || !Number.isFinite(dt) || dt <= 0) return;
  // Callers use .1 seconds. A larger supplied duration is subdivided, never a giant physics jump.
  if (dt > RULES.step + 1e-8) { let remaining = dt; while (remaining > 1e-8 && !state.ended) { const slice = Math.min(RULES.step, remaining); stepBattle(state, content, slice); remaining -= slice; } return; }
  state.tick++; state.time = Math.round((state.time + dt) * 1e6) / 1e6;
  for (const side of [0, 1] as Side[]) {
    const f = state.factions[side];
    for (const key of Object.keys(f.cooldowns)) {
      if (key.startsWith('deploy:')) {
        delete f.cooldowns[key]; deployReserves(state, side, content, key.slice(7) === 'all' ? undefined : key.slice(7));
      } else if (key.startsWith('pending:')) {
        const [_, ability, coordinates] = key.split(':'); delete f.cooldowns[key];
        const [x, y] = (coordinates ?? '0,0').split(',').map(Number);
        if (ability === 'rally' || ability === 'recon' || ability === 'volley') globalAbility(state, side, ability, { x: x ?? 0, y: y ?? 0 }, content);
      } else if (!key.startsWith('tower:')) { f.cooldowns[key] = Math.max(0, f.cooldowns[key]! - dt); if (!f.cooldowns[key] && key.startsWith('reveal:')) delete f.cooldowns[key]; }
    }
    processProduction(state, side, content, dt);
  }
  updateFog(state, content);
  for (const side of state.aiSides) runAI(state, side, content);
  // Alternate initiative each tick, avoiding permanent first-faction attack priority.
  const units = state.tick % 2 ? [...state.units] : [...state.units].reverse();
  for (const unit of units) updateUnit(state, unit, content, dt);
  updateStructures(state, content, dt); state.units = state.units.filter(u => u.hp > 0);
  captures(state, content, dt); updateFog(state, content);
  if (!state.ended) {
    const first = viable(state, 0, content), second = viable(state, 1, content);
    if (!first || !second) finish(state, first ? 0 : second ? 1 : state.factions[0].score >= state.factions[1].score ? 0 : 1, content);
  }
}
